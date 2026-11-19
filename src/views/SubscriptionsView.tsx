import React, { useMemo, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import {
  ComputedMetrics,
  PlatformDatabase,
  Subscription,
  SubscriptionPlanName,
} from '../types/platform';
import { formatINR } from '../utils/formatters';
import { StatusText } from '../components/StatusText';
import { Modal } from '../components/Modal';

interface Props {
  db: PlatformDatabase;
  metrics: ComputedMetrics;
  canWrite: boolean;
  onAddSubscription: (payload: Omit<Subscription, 'id'>) => Promise<void>;
  onUpdateSubscription: (id: string, payload: Partial<Subscription>) => Promise<void>;
}

export const SubscriptionsView: React.FC<Props> = ({
  db,
  metrics,
  canWrite,
  onAddSubscription,
  onUpdateSubscription,
}) => {
  const [filter, setFilter] = useState<'All' | 'Active' | 'Expiring Soon' | 'Overdue'>('All');
  const [showAdd, setShowAdd] = useState(false);

  const customerMap = useMemo(
    () => new Map(db.customers.map((c) => [c.id, c])),
    [db.customers]
  );

  const [form, setForm] = useState<Omit<Subscription, 'id'>>({
    customerId: db.customers[0]?.id || '',
    planName: 'Standard',
    startDate: '2026-11-19',
    endDate: '2027-11-18',
    billingFrequency: 'Monthly',
    amount: db.assumptions.sellingPriceStandard,
    paymentStatus: 'Paid',
    renewalDate: '2026-12-19',
    status: 'Active',
  });

  const filtered = useMemo(() => {
    return db.subscriptions.filter((s) => {
      if (filter === 'Active') return s.status === 'Active';
      if (filter === 'Expiring Soon') return s.status === 'Expiring Soon';
      if (filter === 'Overdue') return s.paymentStatus === 'Overdue';
      return true;
    });
  }, [db.subscriptions, filter]);

  const planSummary = useMemo(() => {
    const tiers: {
      name: SubscriptionPlanName;
      audience: string;
      price: number;
      count: number;
      mrr: number;
    }[] = [
      {
        name: 'Conservative',
        audience: 'For early-stage finance teams',
        price: db.assumptions.sellingPriceConservative,
        count: 0,
        mrr: 0,
      },
      {
        name: 'Standard',
        audience: 'For mid-market B2B SaaS CFOs',
        price: db.assumptions.sellingPriceStandard,
        count: 0,
        mrr: 0,
      },
      {
        name: 'Premium',
        audience: 'For multi-entity scaling enterprises',
        price: db.assumptions.sellingPricePremium,
        count: 0,
        mrr: 0,
      },
    ];
    db.subscriptions.forEach((s) => {
      const t = tiers.find((x) => x.name === s.planName);
      if (t && (s.status === 'Active' || s.status === 'Expiring Soon')) {
        t.count += 1;
        t.mrr += s.amount;
      }
    });
    return tiers;
  }, [db.subscriptions, db.assumptions]);

  const handlePlanSelect = (plan: SubscriptionPlanName) => {
    const amount =
      plan === 'Premium'
        ? db.assumptions.sellingPricePremium
        : plan === 'Conservative'
          ? db.assumptions.sellingPriceConservative
          : db.assumptions.sellingPriceStandard;
    setForm((prev) => ({ ...prev, planName: plan, amount }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddSubscription(form);
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Monthly Recurring Revenue</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {formatINR(metrics.mrr)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            ARR: {formatINR(metrics.arr)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Active Subscriptions</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {metrics.activeSubscriptions}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            Variable Cost: {formatINR(db.assumptions.variableCostPerCustomer)}/cust
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Upcoming Renewals (15d)</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-amber-700 mt-1">
            {metrics.upcomingRenewalsCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Overdue Payments</div>
          <div
            className={`text-xl font-semibold font-mono tabular-nums mt-1 ${
              metrics.overdueSubscriptions > 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {metrics.overdueSubscriptions}
          </div>
        </div>
      </div>

      {/* Pricing Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {planSummary.map((tier) => (
          <div key={tier.name} className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{tier.name} Plan</h3>
              <span className="font-mono tabular-nums text-sm font-semibold text-blue-700">
                {formatINR(tier.price)}/mo
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{tier.audience}</p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Active Accounts:{' '}
                <strong className="font-mono tabular-nums text-slate-900">{tier.count}</strong>
              </span>
              <span className="font-mono tabular-nums font-medium text-slate-900">
                {formatINR(tier.mrr)} MRR
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar & Action */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {(['All', 'Active', 'Expiring Soon', 'Overdue'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tab
                  ? 'bg-[#0B192C] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Subscription</span>
          </button>
        )}
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-medium">Subscription ID</th>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Plan</th>
                <th className="py-3 px-4 font-medium">Frequency</th>
                <th className="py-3 px-4 font-medium">Renewal Date</th>
                <th className="py-3 px-4 font-medium">Payment Status</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Amount</th>
                {canWrite && <th className="py-3 px-4 font-medium text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => {
                const cust = customerMap.get(s.customerId);
                return (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{s.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">
                        {cust?.companyName ?? s.customerId}
                      </div>
                      <div className="text-[11px] text-slate-500">{s.customerId}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{s.planName}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{s.billingFrequency}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {s.renewalDate}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText label={s.paymentStatus} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusText label={s.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                      {formatINR(s.amount)}
                    </td>
                    {canWrite && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {s.paymentStatus !== 'Paid' ? (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSubscription(s.id, {
                                paymentStatus: 'Paid',
                                status: 'Active',
                              })
                            }
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Paid</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSubscription(s.id, {
                                paymentStatus: 'Overdue',
                              })
                            }
                            className="text-xs text-slate-500 hover:text-red-700"
                          >
                            Flag Overdue
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Subscription Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Provision New Subscription"
        subtitle="Links directly to Customer CRM and recalculates live MRR/ARR."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Customer *</label>
              <select
                required
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                {db.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Subscription Plan</label>
              <select
                value={form.planName}
                onChange={(e) => handlePlanSelect(e.target.value as SubscriptionPlanName)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                <option value="Conservative">Conservative (₹20,000/mo)</option>
                <option value="Standard">Standard (₹25,000/mo)</option>
                <option value="Premium">Premium (₹30,000/mo)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Monthly Amount (₹)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Billing Frequency</label>
              <select
                value={form.billingFrequency}
                onChange={(e) =>
                  setForm({ ...form, billingFrequency: e.target.value as 'Monthly' | 'Annual' })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Next Renewal Date</label>
              <input
                type="date"
                value={form.renewalDate}
                onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
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
              Create Subscription
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
