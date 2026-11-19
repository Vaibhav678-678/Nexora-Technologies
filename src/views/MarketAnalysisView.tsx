import React from 'react';
import { ComputedMetrics, PlatformDatabase } from '../types/platform';
import { formatCompactINR, formatINR } from '../utils/formatters';
import { HorizontalBarBreakdown } from '../components/Charts';

interface Props {
  db: PlatformDatabase;
  metrics: ComputedMetrics;
}

export const MarketAnalysisView: React.FC<Props> = ({ db, metrics }) => {
  const { assumptions } = db;
  const currentArrCapturePct = metrics.som > 0 ? (metrics.arr / metrics.som) * 100 : 0;

  const competitors = [
    {
      name: 'Apex Tech (Target Position)',
      automation: 9,
      breadth: 9,
      offer: 'AI-powered FP&A, CSV/Excel auto-validation, executive dashboards, and unit economics in one place.',
      weakness: 'Early-stage brand validation underway across Indian mid-market hubs.',
      isSelf: true,
    },
    {
      name: 'Microsoft Power BI',
      automation: 10,
      breadth: 8,
      offer: 'Enterprise BI data visualization and multi-source connectors.',
      weakness: 'Requires SQL/DAX engineering expertise and dedicated analyst setup.',
      isSelf: false,
    },
    {
      name: 'Microsoft Excel',
      automation: 6,
      breadth: 5,
      offer: 'Flexible manual modeling, pivot tables, and ad-hoc financial reporting.',
      weakness: 'Consumes 15–20 hours/week manually; high version-control error risk.',
      isSelf: false,
    },
    {
      name: 'Manual Spreadsheet Workflows',
      automation: 3,
      breadth: 2,
      offer: 'Status-quo accounting exports and static monthly management packs.',
      weakness: 'Slow, repetitive, lacks root-cause diagnostics and predictive forecasting.',
      isSelf: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* TAM / SAM / SOM Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs text-slate-500">Total Addressable Market (TAM)</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-[#0B192C] mt-1">
            {formatINR(metrics.tam)}
          </div>
          <div className="text-xs text-slate-600 mt-1.5 font-mono tabular-nums">
            {formatCompactINR(metrics.tam)} · {assumptions.potentialCustomersTAM.toLocaleString('en-IN')} potential customers
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs text-slate-500">Serviceable Available Market (SAM)</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-blue-700 mt-1">
            {formatINR(metrics.sam)}
          </div>
          <div className="text-xs text-slate-600 mt-1.5 font-mono tabular-nums">
            {formatCompactINR(metrics.sam)} · {assumptions.serviceableCustomersSAM.toLocaleString('en-IN')} serviceable firms
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs text-slate-500">Serviceable Obtainable Market (SOM)</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {formatINR(metrics.som)}
          </div>
          <div className="text-xs text-slate-600 mt-1.5 font-mono tabular-nums">
            {formatCompactINR(metrics.som)} · {assumptions.obtainableCustomersSOM.toLocaleString('en-IN')} obtainable accounts
          </div>
        </div>
      </div>

      {/* Visual Funnel & Market Assumptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Market Opportunity Sizing & Penetration
            </h3>
            <p className="text-xs text-slate-500">
              Bottom-up sizing anchored at {formatINR(assumptions.annualSpendPerCustomer)} annual spending per customer
            </p>
          </div>
          <HorizontalBarBreakdown
            items={[
              {
                label: 'TAM · Pan-India Mid-Market & SMEs',
                value: metrics.tam,
                formattedValue: formatCompactINR(metrics.tam),
                sublabel: `${assumptions.potentialCustomersTAM.toLocaleString('en-IN')} firms`,
                color: '#0B192C',
              },
              {
                label: 'SAM · Target Metro Hubs (BLR, BOM, DEL)',
                value: metrics.sam,
                formattedValue: formatCompactINR(metrics.sam),
                sublabel: `${assumptions.serviceableCustomersSAM.toLocaleString('en-IN')} firms`,
                color: '#1d4ed8',
              },
              {
                label: 'SOM · 24-Month Target Capture',
                value: metrics.som,
                formattedValue: formatCompactINR(metrics.som),
                sublabel: `${assumptions.obtainableCustomersSOM.toLocaleString('en-IN')} firms`,
                color: '#16a34a',
              },
              {
                label: 'Current Annualized Run-Rate (ARR)',
                value: metrics.arr,
                formattedValue: formatCompactINR(metrics.arr),
                sublabel: `${currentArrCapturePct.toFixed(1)}% of SOM`,
                color: '#0ea5e9',
              },
            ]}
          />
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-slate-500">Target Customer Roles</div>
              <div className="font-medium text-slate-900 mt-0.5">
                CFOs, Controllers, Heads of FP&A, Senior Financial Analysts
              </div>
            </div>
            <div>
              <div className="text-slate-500">Geographic Rollout</div>
              <div className="font-medium text-slate-900 mt-0.5">
                Bengaluru, Mumbai, Delhi-NCR → US Expansion
              </div>
            </div>
          </div>
        </div>

        {/* Competitive Positioning Matrix (from Venture Quest PDF) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Competitive Battlefield & Positioning
            </h3>
            <p className="text-xs text-slate-500">
              Automation level vs breadth of financial analytics & decision support
            </p>
          </div>
          <div className="space-y-3">
            {competitors.map((comp) => (
              <div
                key={comp.name}
                className={`p-3.5 rounded-md border text-xs ${
                  comp.isSelf
                    ? 'border-blue-300 bg-blue-50/40'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{comp.name}</span>
                  <span className="font-mono tabular-nums text-[11px] text-slate-600">
                    Automation {comp.automation}/10 · Analytics {comp.breadth}/10
                  </span>
                </div>
                <p className="text-slate-700 mt-1">{comp.offer}</p>
                <p className="text-slate-500 mt-0.5">Limitation: {comp.weakness}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
