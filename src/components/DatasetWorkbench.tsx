import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Play, Upload } from 'lucide-react';
import { ParsedCsvValidation, formatINR, parseAndValidateCsv } from '../utils/formatters';

interface AiDatasetReport {
  executiveSummary: string;
  descriptiveInsights: string;
  diagnosticDrivers: string;
  predictiveOutlook: string;
  prescriptiveRecommendations: string[];
  suggestedSqlQuery: string;
}

const SAMPLE_FINANCIAL_CSV = `Month,Business_Unit,Revenue_INR,Fixed_Cost_INR,Variable_Cost_INR,Active_Accounts,Receivables_Days
2026-06,Bengaluru SaaS,215000,135000,24000,8,28
2026-07,Bengaluru SaaS,270000,140000,30000,10,24
2026-08,Mumbai FinOps,335000,145000,39000,13,22
2026-09,Delhi-NCR Enterprise,405000,150000,48000,16,19
2026-10,Pan-India SaaS,455000,150000,54000,18,18
2026-11,Pan-India SaaS,500000,150000,60000,20,16`;

export const DatasetWorkbench: React.FC = () => {
  const [fileName, setFileName] = useState<string>('');
  const [validation, setValidation] = useState<ParsedCsvValidation | null>(null);
  const [aiReport, setAiReport] = useState<AiDatasetReport | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleLoadText = (name: string, text: string) => {
    setFileName(name);
    setValidation(parseAndValidateCsv(text));
    setAiReport(null);
    setAiError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      handleLoadText(file.name, content);
    };
    reader.readAsText(file);
  };

  const runAiDatasetAnalysis = async () => {
    if (!validation) return;
    setLoadingAi(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/analyze-dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          validation: {
            rowCount: validation.rowCount,
            columnCount: validation.columnCount,
            missingValuesCount: validation.missingValuesCount,
            columnStats: validation.columnStats,
            issues: validation.issues,
          },
          sampleRows: validation.rows.slice(0, 40),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze dataset');
      }
      setAiReport(data);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Unable to complete AI analysis');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            CSV Financial Data Upload & AI Diagnostic Workbench
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Upload raw CSV financial spreadsheets to validate schema integrity, inspect summary ratios, and generate AI-powered CFO analytics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleLoadText('apex_demo_ledger_2026.csv', SAMPLE_FINANCIAL_CSV)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
          >
            Load Sample CSV
          </button>
          <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 rounded-md cursor-pointer transition-colors whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV File</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {!validation ? (
        <div className="py-10 text-center border border-dashed border-slate-300 rounded-md bg-slate-50/50">
          <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">
            No spreadsheet loaded yet
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Upload a CSV export from Tally, Zoho Books, or Excel—or load the sample dataset above to preview validation and AI analytics.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Validation Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 border border-slate-200 rounded-md">
              <div className="text-xs text-slate-500">Dataset File</div>
              <div className="text-sm font-semibold text-slate-900 truncate mt-1">{fileName}</div>
            </div>
            <div className="p-3.5 border border-slate-200 rounded-md">
              <div className="text-xs text-slate-500">Rows / Columns</div>
              <div className="text-sm font-semibold font-mono tabular-nums text-slate-900 mt-1">
                {validation.rowCount} rows · {validation.columnCount} cols
              </div>
            </div>
            <div className="p-3.5 border border-slate-200 rounded-md">
              <div className="text-xs text-slate-500">Missing Values</div>
              <div className={`text-sm font-semibold font-mono tabular-nums mt-1 ${validation.missingValuesCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {validation.missingValuesCount} cells
              </div>
            </div>
            <div className="p-3.5 border border-slate-200 rounded-md flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-slate-500">Validation Check</div>
                <div className="text-sm font-semibold mt-1 flex items-center gap-1.5">
                  {validation.issues.length === 0 ? (
                    <span className="text-emerald-700 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Clean Schema
                    </span>
                  ) : (
                    <span className="text-amber-700 inline-flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {validation.issues.length} Issue(s)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {validation.issues.length > 0 && (
            <div className="p-3.5 border border-amber-200 bg-amber-50/70 rounded-md text-xs text-amber-900 space-y-1">
              {validation.issues.map((issue, idx) => (
                <div key={idx}>• {issue}</div>
              ))}
            </div>
          )}

          {/* Numeric Column Quick Summary */}
          {validation.columnStats.filter((c) => c.type === 'numeric').length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                Automated Numeric Summary
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2 px-3 font-medium">Column</th>
                      <th className="py-2 px-3 font-medium text-right">Sum</th>
                      <th className="py-2 px-3 font-medium text-right">Average</th>
                      <th className="py-2 px-3 font-medium text-right">Min</th>
                      <th className="py-2 px-3 font-medium text-right">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {validation.columnStats
                      .filter((c) => c.type === 'numeric')
                      .map((c) => (
                        <tr key={c.column} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-sans font-medium text-slate-800">{c.column}</td>
                          <td className="py-2 px-3 text-right text-slate-900">
                            {c.column.toLowerCase().includes('inr') || c.column.toLowerCase().includes('rev') || c.column.toLowerCase().includes('cost')
                              ? formatINR(c.sum ?? 0)
                              : (c.sum ?? 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700">
                            {Math.round(c.avg ?? 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {(c.min ?? 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {(c.max ?? 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Data Preview Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-700">
                Data Preview (First {Math.min(8, validation.rows.length)} Rows)
              </h4>
              <button
                type="button"
                onClick={runAiDatasetAnalysis}
                disabled={loadingAi}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{loadingAi ? 'Analyzing Dataset...' : 'Run Gemini AI Analytics'}</span>
              </button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    {validation.headers.map((h) => (
                      <th key={h} className="py-2 px-3 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validation.rows.slice(0, 8).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      {validation.headers.map((h) => (
                        <td
                          key={h}
                          className={`py-2 px-3 whitespace-nowrap ${
                            validation.numericColumns.includes(h)
                              ? 'font-mono tabular-nums text-slate-900'
                              : 'text-slate-700'
                          }`}
                        >
                          {row[h] || <span className="text-amber-600 italic">missing</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {aiError && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-md text-xs text-red-800">
              {aiError}
            </div>
          )}

          {aiReport && (
            <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/60 space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  AI Financial Intelligence Report
                </h4>
                <p className="text-xs text-slate-600 mt-1">{aiReport.executiveSummary}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-white border border-slate-200 rounded-md p-3.5">
                  <div className="font-semibold text-slate-900 mb-1">Descriptive Analytics</div>
                  <p className="text-slate-600 leading-relaxed">{aiReport.descriptiveInsights}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-md p-3.5">
                  <div className="font-semibold text-slate-900 mb-1">Diagnostic Drivers</div>
                  <p className="text-slate-600 leading-relaxed">{aiReport.diagnosticDrivers}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-md p-3.5">
                  <div className="font-semibold text-slate-900 mb-1">Predictive Outlook</div>
                  <p className="text-slate-600 leading-relaxed">{aiReport.predictiveOutlook}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white border border-slate-200 rounded-md p-3.5">
                  <div className="font-semibold text-slate-900 mb-1.5">
                    Prescriptive Recommendations
                  </div>
                  <ul className="space-y-1.5 text-slate-700">
                    {aiReport.prescriptiveRecommendations.map((rec, i) => (
                      <li key={i}>• {rec}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white border border-slate-200 rounded-md p-3.5">
                  <div className="font-semibold text-slate-900 mb-1.5">Generated SQL Query</div>
                  <pre className="font-mono text-[11px] bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto">
                    {aiReport.suggestedSqlQuery}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
