import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  MarketingCampaign,
  MarketingChannel,
  PlatformDatabase,
} from '../types/platform';
import { formatINR } from '../utils/formatters';
import { StatusText } from '../components/StatusText';
import { Modal } from '../components/Modal';
import { HorizontalBarBreakdown } from '../components/Charts';

interface Props {
  db: PlatformDatabase;
  canWrite: boolean;
  onAddCampaign: (payload: Omit<MarketingCampaign, 'id'>) => Promise<void>;
}

const CHANNELS: MarketingChannel[] = [
  'LinkedIn Sales Navigator',
  'Direct Email Campaigns',
  'CFO Networks',
  'Accounting Consultants',
  'B2B SaaS Communities',
];

export const MarketingView: React.FC<Props> = ({ db, canWrite, onAddCampaign }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Omit<MarketingCampaign, 'id'>>({
    name: '',
    channel: 'LinkedIn Sales Navigator',
    budget: 15000,
    leadsGenerated: 20,
    demoBookings: 6,
    paidCustomers: 2,
    status: 'Active',
    weekLabel: 'Week 4',
    startDate: '2026-11-19',
  });

  const totals = useMemo(() => {
    const budget = db.campaigns.reduce((s, c) => s + c.budget, 0);
    const leads = db.campaigns.reduce((s, c) => s + c.leadsGenerated, 0);
    const demos = db.campaigns.reduce((s, c) => s + c.demoBookings, 0);
    const paid = db.campaigns.reduce((s, c) => s + c.paidCustomers, 0);
    const conv = leads > 0 ? (paid / leads) * 100 : 0;
    const annualRevAttributed = paid * db.assumptions.sellingPriceStandard * 12;
    const roi = budget > 0 ? ((annualRevAttributed - budget) / budget) * 100 : 0;
    return { budget, leads, demos, paid, conv, roi };
  }, [db.campaigns, db.assumptions.sellingPriceStandard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddCampaign(form);
    setShowAdd(false);
    setForm({
      name: '',
      channel: 'LinkedIn Sales Navigator',
      budget: 15000,
      leadsGenerated: 20,
      demoBookings: 6,
      paidCustomers: 2,
      status: 'Active',
      weekLabel: 'Week 4',
      startDate: '2026-11-19',
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Total GTM Budget</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {formatINR(totals.budget)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Leads Generated</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-blue-700 mt-1">
            {totals.leads}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Demo Bookings</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {totals.demos}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Paid Customers</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {totals.paid}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Lead-to-Paid Rate</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {totals.conv.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Annualized GTM ROI</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {Math.round(totals.roi).toLocaleString('en-IN')}%
          </div>
        </div>
      </div>

      {/* Channel Performance & Weekly GTM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">Leads by GTM Channel</h3>
          <p className="text-xs text-slate-500 mb-4">
            30-Day Go-To-Market channel attribution
          </p>
          <HorizontalBarBreakdown
            items={db.campaigns.map((c) => ({
              label: c.channel,
              value: c.leadsGenerated,
              formattedValue: `${c.leadsGenerated} leads (${c.paidCustomers} paid)`,
              color: '#1d4ed8',
            }))}
          />
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Marketing Campaigns & ROI Tracker
              </h3>
              <p className="text-xs text-slate-500">
                Weekly monitoring of GTM acquisition experiments
              </p>
            </div>
            {canWrite && (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 rounded-md whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Campaign</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Campaign</th>
                  <th className="py-2.5 px-3 font-medium">Channel</th>
                  <th className="py-2.5 px-3 font-medium text-right">Budget</th>
                  <th className="py-2.5 px-3 font-medium text-right">Leads</th>
                  <th className="py-2.5 px-3 font-medium text-right">Demos</th>
                  <th className="py-2.5 px-3 font-medium text-right">Paid</th>
                  <th className="py-2.5 px-3 font-medium text-right">Conv %</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.campaigns.map((c) => {
                  const convRate = c.leadsGenerated > 0 ? (c.paidCustomers / c.leadsGenerated) * 100 : 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {c.id} · {c.weekLabel}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{c.channel}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                        {formatINR(c.budget)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {c.leadsGenerated}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {c.demoBookings}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        {c.paidCustomers}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {convRate.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusText label={c.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Launch Marketing Campaign"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Campaign Name *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Marketing Channel</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as MarketingChannel })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Budget (₹)</label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Leads Generated</label>
              <input
                type="number"
                value={form.leadsGenerated}
                onChange={(e) => setForm({ ...form, leadsGenerated: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Demo Bookings</label>
              <input
                type="number"
                value={form.demoBookings}
                onChange={(e) => setForm({ ...form, demoBookings: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Paid Customers</label>
              <input
                type="number"
                value={form.paidCustomers}
                onChange={(e) => setForm({ ...form, paidCustomers: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Week / Sprint</label>
              <input
                type="text"
                value={form.weekLabel}
                onChange={(e) => setForm({ ...form, weekLabel: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0B192C] text-white rounded-md font-medium"
            >
              Save Campaign
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
