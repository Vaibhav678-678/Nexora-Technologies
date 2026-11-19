import React, { useMemo, useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import {
  CustomerFeedback,
  PlatformDatabase,
  ValidationTask,
} from '../types/platform';
import { StatusText } from '../components/StatusText';
import { Modal } from '../components/Modal';

interface Props {
  db: PlatformDatabase;
  canWrite: boolean;
  onUpdateTask: (id: string, payload: Partial<ValidationTask>) => Promise<void>;
  onAddFeedback: (payload: Omit<CustomerFeedback, 'id'>) => Promise<void>;
}

export const VentureValidationView: React.FC<Props> = ({
  db,
  canWrite,
  onUpdateTask,
  onAddFeedback,
}) => {
  const [activeWeek, setActiveWeek] = useState<'All' | 1 | 2 | 3 | 4>('All');
  const [showFbModal, setShowFbModal] = useState(false);

  const [fbForm, setFbForm] = useState<Omit<CustomerFeedback, 'id'>>({
    customerName: '',
    company: '',
    designation: 'Chief Financial Officer',
    interviewDate: '2026-11-19',
    majorPainPoints: '',
    dataSecurityConcerns: '',
    trustsDataSecurity: true,
    productFeedback: '',
    willingnessToPay: 'Yes (₹25,000+)',
    hoursSavedPerWeek: 16,
    pricingFeedback: '',
    suggestions: '',
    validationStatus: 'Validated',
  });

  const filteredTasks = useMemo(() => {
    if (activeWeek === 'All') return db.validationTasks;
    return db.validationTasks.filter((t) => t.week === activeWeek);
  }, [db.validationTasks, activeWeek]);

  // Three major venture assumptions calculated dynamically from Customer Feedback
  const assumptionStats = useMemo(() => {
    const total = db.feedback.length || 1;
    const securityTrusted = db.feedback.filter((f) => f.trustsDataSecurity).length;
    const wtp25k = db.feedback.filter((f) => f.willingnessToPay === 'Yes (₹25,000+)').length;
    const timeSaved15Plus = db.feedback.filter((f) => f.hoursSavedPerWeek >= 15).length;
    const avgHoursSaved =
      db.feedback.reduce((s, f) => s + f.hoursSavedPerWeek, 0) / total;

    return {
      total: db.feedback.length,
      securityPct: Math.round((securityTrusted / total) * 100),
      wtpPct: Math.round((wtp25k / total) * 100),
      timeSavedPct: Math.round((timeSaved15Plus / total) * 100),
      avgHoursSaved: avgHoursSaved.toFixed(1),
    };
  }, [db.feedback]);

  const overdueTasks = db.validationTasks.filter((t) => t.status === 'Overdue');

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddFeedback(fbForm);
    setShowFbModal(false);
    setFbForm({
      customerName: '',
      company: '',
      designation: 'Chief Financial Officer',
      interviewDate: '2026-11-19',
      majorPainPoints: '',
      dataSecurityConcerns: '',
      trustsDataSecurity: true,
      productFeedback: '',
      willingnessToPay: 'Yes (₹25,000+)',
      hoursSavedPerWeek: 16,
      pricingFeedback: '',
      suggestions: '',
      validationStatus: 'Validated',
    });
  };

  return (
    <div className="space-y-6">
      {/* Three Major Venture Assumptions Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs text-slate-500">Assumption 1 · Financial Data Security</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {assumptionStats.securityPct}% Validated
          </div>
          <p className="text-xs text-slate-600 mt-1.5">
            Customer trust in Apex Tech RBAC & encrypted data architecture ({assumptionStats.total} CFO interviews).
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs text-slate-500">Assumption 2 · ₹25,000/mo Willingness to Pay</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-blue-700 mt-1">
            {assumptionStats.wtpPct}% Confirmed
          </div>
          <p className="text-xs text-slate-600 mt-1.5">
            Mid-market finance leaders validating ₹25,000/month Standard subscription pricing.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs text-slate-500">Assumption 3 · 15–20 Hrs/Week Time Reduction</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {assumptionStats.avgHoursSaved} hrs/wk avg
          </div>
          <p className="text-xs text-slate-600 mt-1.5">
            {assumptionStats.timeSavedPct}% of interviewed teams achieved ≥15 hours/week reporting reduction.
          </p>
        </div>
      </div>

      {/* Overdue Alert Banner if any */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-xs text-red-900">
          <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">
              {overdueTasks.length} Overdue Validation Milestone(s) Require Attention
            </div>
            <div className="mt-1 text-red-800">
              {overdueTasks.map((t) => `${t.title} (Due ${t.dueDate})`).join(' · ')}
            </div>
          </div>
        </div>
      )}

      {/* 30-Day 4-Week Execution Tracker */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              30-Day Venture Validation Tracker (Weeks 1–4)
            </h3>
            <p className="text-xs text-slate-500">
              Tracks 200 CFO targets, 100 outreach messages (&gt;45% open / &gt;8% reply), 8–10 demos, and 2–3 paid pilots.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md shrink-0">
            {(['All', 1, 2, 3, 4] as const).map((w) => (
              <button
                key={String(w)}
                type="button"
                onClick={() => setActiveWeek(w)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  activeWeek === w
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {w === 'All' ? 'All Weeks' : `Week ${w}`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredTasks.map((t) => {
            const pct = Math.min(100, Math.round((t.actual / Math.max(1, t.target)) * 100));
            return (
              <div
                key={t.id}
                className="border border-slate-200 rounded-md p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-slate-700">Week {t.week}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="font-semibold text-slate-900">{t.title}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <StatusText label={t.status} />
                  </div>
                  <p className="text-xs text-slate-600">{t.description}</p>
                  <div className="text-[11px] text-slate-500">
                    Owner: {t.assignedPerson} · Window: {t.startDate} to {t.dueDate} · {t.remarks}
                  </div>
                </div>

                <div className="w-full lg:w-72 shrink-0 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="text-slate-600">
                      {t.actual} / {t.target} {t.unit}
                    </span>
                    <span className="font-semibold text-slate-900">{pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-xs overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        t.status === 'Overdue'
                          ? 'bg-red-600'
                          : pct >= 100
                            ? 'bg-emerald-600'
                            : 'bg-blue-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {canWrite && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const nextActual = Math.min(t.target, t.actual + 1);
                          onUpdateTask(t.id, {
                            actual: nextActual,
                            status: nextActual >= t.target ? 'Completed' : 'In Progress',
                          });
                        }}
                        className="text-[11px] font-medium text-blue-700 hover:text-blue-900"
                      >
                        +1 Progress
                      </button>
                      {t.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTask(t.id, { actual: t.target, status: 'Completed' })
                          }
                          className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer Feedback & Discovery Interviews */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Customer Feedback & Discovery Validation Log
            </h3>
            <p className="text-xs text-slate-500">
              Structured CFO/Controller interview records testing pain points, security trust, and pricing acceptance
            </p>
          </div>
          {canWrite && (
            <button
              type="button"
              onClick={() => setShowFbModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 rounded-md whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Interview</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-3 font-medium">Interview</th>
                <th className="py-2.5 px-3 font-medium">Pain Points & Feedback</th>
                <th className="py-2.5 px-3 font-medium">Security Trust</th>
                <th className="py-2.5 px-3 font-medium">Willingness to Pay</th>
                <th className="py-2.5 px-3 font-medium text-right">Hrs Saved/Wk</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.feedback.map((fb) => (
                <tr key={fb.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-900">{fb.customerName}</div>
                    <div className="text-[11px] text-slate-500">
                      {fb.company} · {fb.designation}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">{fb.interviewDate}</div>
                  </td>
                  <td className="py-3 px-3 max-w-md">
                    <div className="text-slate-800">{fb.majorPainPoints}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{fb.productFeedback}</div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <StatusText
                      label={fb.trustsDataSecurity ? 'Trusted' : 'Evaluating'}
                      tone={fb.trustsDataSecurity ? 'success' : 'warning'}
                    />
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <StatusText label={fb.willingnessToPay} />
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                    {fb.hoursSavedPerWeek} hrs
                  </td>
                  <td className="py-3 px-3">
                    <StatusText label={fb.validationStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Feedback Modal */}
      <Modal
        open={showFbModal}
        onClose={() => setShowFbModal(false)}
        title="Log Customer Discovery Interview"
      >
        <form onSubmit={handleAddFeedback} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Customer Name *</label>
              <input
                required
                type="text"
                value={fbForm.customerName}
                onChange={(e) => setFbForm({ ...fbForm, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Company *</label>
              <input
                required
                type="text"
                value={fbForm.company}
                onChange={(e) => setFbForm({ ...fbForm, company: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Willingness to Pay</label>
              <select
                value={fbForm.willingnessToPay}
                onChange={(e) =>
                  setFbForm({
                    ...fbForm,
                    willingnessToPay: e.target.value as CustomerFeedback['willingnessToPay'],
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                <option value="Yes (₹25,000+)">Yes (₹25,000+)</option>
                <option value="Yes (₹20,000)">Yes (₹20,000)</option>
                <option value="Needs Discount">Needs Discount</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Hours Saved / Week</label>
              <input
                type="number"
                min={0}
                max={40}
                value={fbForm.hoursSavedPerWeek}
                onChange={(e) =>
                  setFbForm({ ...fbForm, hoursSavedPerWeek: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Major Pain Points *</label>
            <input
              required
              type="text"
              value={fbForm.majorPainPoints}
              onChange={(e) => setFbForm({ ...fbForm, majorPainPoints: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Product & Pricing Feedback</label>
            <input
              type="text"
              value={fbForm.productFeedback}
              onChange={(e) => setFbForm({ ...fbForm, productFeedback: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={fbForm.trustsDataSecurity}
              onChange={(e) => setFbForm({ ...fbForm, trustsDataSecurity: e.target.checked })}
            />
            <span>Customer confirmed trust in financial data security architecture</span>
          </label>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowFbModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0B192C] text-white rounded-md font-medium"
            >
              Save Interview
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
