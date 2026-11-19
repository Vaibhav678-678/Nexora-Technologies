import React, { useMemo, useState } from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import { ComputedMetrics, Lead, PlatformDatabase, SalesStage } from '../types/platform';
import { formatINR } from '../utils/formatters';
import { StatusText } from '../components/StatusText';
import { Modal } from '../components/Modal';

interface Props {
  db: PlatformDatabase;
  metrics: ComputedMetrics;
  canWrite: boolean;
  onAddLead: (payload: Omit<Lead, 'id'>) => Promise<void>;
  onUpdateLead: (id: string, payload: Partial<Lead>) => Promise<void>;
}

const SALES_STAGES: SalesStage[] = [
  'New Lead',
  'Contacted',
  'Interested',
  'Demo Scheduled',
  'Demo Completed',
  'Trial Started',
  'Negotiation',
  'Converted',
  'Lost',
];

export const SalesPipelineView: React.FC<Props> = ({
  db,
  metrics,
  canWrite,
  onAddLead,
  onUpdateLead,
}) => {
  const [stageFilter, setStageFilter] = useState<'All' | SalesStage>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Omit<Lead, 'id'>>({
    companyName: '',
    contactPerson: '',
    jobDesignation: 'Chief Financial Officer',
    email: '',
    leadSource: 'LinkedIn Sales Navigator',
    expectedDealValue: 25000,
    salesStage: 'New Lead',
    followUpDate: '2026-11-22',
    demoStatus: 'Pending',
    conversionProbability: 20,
    assignedEmployee: 'Rohan Malhotra',
    notes: '',
  });

  const filteredLeads = useMemo(() => {
    if (stageFilter === 'All') return db.leads;
    return db.leads.filter((l) => l.salesStage === stageFilter);
  }, [db.leads, stageFilter]);

  const stageCounts = useMemo(() => {
    const map = new Map<SalesStage, number>();
    SALES_STAGES.forEach((s) => map.set(s, 0));
    db.leads.forEach((l) => map.set(l.salesStage, (map.get(l.salesStage) ?? 0) + 1));
    return map;
  }, [db.leads]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddLead(form);
    setShowAdd(false);
    setForm({
      companyName: '',
      contactPerson: '',
      jobDesignation: 'Chief Financial Officer',
      email: '',
      leadSource: 'LinkedIn Sales Navigator',
      expectedDealValue: 25000,
      salesStage: 'New Lead',
      followUpDate: '2026-11-22',
      demoStatus: 'Pending',
      conversionProbability: 20,
      assignedEmployee: 'Rohan Malhotra',
      notes: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Pipeline KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Total Leads</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {metrics.totalLeads}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Qualified Leads</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-blue-700 mt-1">
            {metrics.qualifiedLeads}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Upcoming Follow-Ups</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-amber-700 mt-1">
            {metrics.upcomingFollowUps}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Demo Conversion</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {metrics.demoConversionRatePct.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Lead-to-Customer</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {metrics.leadToCustomerRatePct.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Weighted Pipeline MRR</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {formatINR(Math.round(metrics.expectedSalesRevenue))}
          </div>
        </div>
      </div>

      {/* Stage Funnel Breakdown */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">9-Stage Sales Pipeline Funnel</h3>
            <p className="text-xs text-slate-500">
              Click any stage to filter leads; moving a lead to Converted automatically provisions a customer & subscription.
            </p>
          </div>
          {canWrite && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Lead</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          <button
            type="button"
            onClick={() => setStageFilter('All')}
            className={`p-2.5 rounded-md border text-left transition-colors ${
              stageFilter === 'All'
                ? 'bg-[#0B192C] text-white border-[#0B192C]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="text-[11px] opacity-80 truncate">All Stages</div>
            <div className="text-base font-semibold font-mono tabular-nums mt-0.5">
              {db.leads.length}
            </div>
          </button>
          {SALES_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setStageFilter(stage)}
              className={`p-2.5 rounded-md border text-left transition-colors ${
                stageFilter === stage
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-[11px] opacity-80 truncate" title={stage}>
                {stage}
              </div>
              <div className="text-base font-semibold font-mono tabular-nums mt-0.5">
                {stageCounts.get(stage) ?? 0}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-medium">Lead ID</th>
                <th className="py-3 px-4 font-medium">Company & Contact</th>
                <th className="py-3 px-4 font-medium">Source</th>
                <th className="py-3 px-4 font-medium">Sales Stage</th>
                <th className="py-3 px-4 font-medium">Demo Status</th>
                <th className="py-3 px-4 font-medium">Follow-Up</th>
                <th className="py-3 px-4 font-medium text-right">Deal Value</th>
                <th className="py-3 px-4 font-medium text-right">Prob %</th>
                {canWrite && <th className="py-3 px-4 font-medium text-right">Stage Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{lead.id}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{lead.companyName}</div>
                    <div className="text-[11px] text-slate-500">
                      {lead.contactPerson} · {lead.jobDesignation}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{lead.leadSource}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {canWrite ? (
                      <select
                        value={lead.salesStage}
                        onChange={(e) => {
                          const nextStage = e.target.value as SalesStage;
                          const prob =
                            nextStage === 'Converted'
                              ? 100
                              : nextStage === 'Lost'
                                ? 0
                                : nextStage === 'Negotiation'
                                  ? 85
                                  : nextStage === 'Trial Started'
                                    ? 75
                                    : nextStage === 'Demo Completed'
                                      ? 60
                                      : lead.conversionProbability;
                          onUpdateLead(lead.id, {
                            salesStage: nextStage,
                            conversionProbability: prob,
                            demoStatus:
                              nextStage === 'Demo Completed' ||
                              nextStage === 'Trial Started' ||
                              nextStage === 'Negotiation' ||
                              nextStage === 'Converted'
                                ? 'Completed'
                                : nextStage === 'Demo Scheduled'
                                  ? 'Scheduled'
                                  : lead.demoStatus,
                          });
                        }}
                        className="px-2 py-1 border border-slate-300 rounded bg-white text-xs text-slate-800"
                      >
                        {SALES_STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium text-slate-800">{lead.salesStage}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText label={lead.demoStatus} />
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {lead.followUpDate}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                    {formatINR(lead.expectedDealValue)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {lead.conversionProbability}%
                  </td>
                  {canWrite && (
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {lead.salesStage !== 'Converted' && lead.salesStage !== 'Lost' ? (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateLead(lead.id, {
                              salesStage: 'Converted',
                              conversionProbability: 100,
                              demoStatus: 'Completed',
                            })
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900"
                        >
                          <span>Convert</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add New Sales Lead"
        subtitle="Track prospect progression through the 9-stage enterprise sales funnel."
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Company Name *</label>
              <input
                required
                type="text"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Person *</label>
              <input
                required
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Job Designation</label>
              <input
                type="text"
                value={form.jobDesignation}
                onChange={(e) => setForm({ ...form, jobDesignation: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Expected Deal Value (₹/mo)</label>
              <input
                type="number"
                value={form.expectedDealValue}
                onChange={(e) => setForm({ ...form, expectedDealValue: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Conversion Probability (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.conversionProbability}
                onChange={(e) => setForm({ ...form, conversionProbability: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Sales Stage</label>
              <select
                value={form.salesStage}
                onChange={(e) => setForm({ ...form, salesStage: e.target.value as SalesStage })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                {SALES_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Follow-Up Date</label>
              <input
                type="date"
                value={form.followUpDate}
                onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-[#0B192C] hover:bg-slate-800 rounded-md font-medium"
            >
              Save Lead
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
