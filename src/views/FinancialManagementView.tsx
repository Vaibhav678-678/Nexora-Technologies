import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  ComputedMetrics,
  ExpenseCategory,
  ExpenseTransaction,
  PlatformDatabase,
  RevenueTransaction,
} from '../types/platform';
import { formatINR } from '../utils/formatters';
import { StatusText } from '../components/StatusText';
import { Modal } from '../components/Modal';
import { DatasetWorkbench } from '../components/DatasetWorkbench';

interface Props {
  db: PlatformDatabase;
  metrics: ComputedMetrics;
  canWrite: boolean;
  onAddRevenue: (payload: Omit<RevenueTransaction, 'id' | 'monthKey'>) => Promise<void>;
  onDeleteRevenue: (id: string) => Promise<void>;
  onAddExpense: (payload: Omit<ExpenseTransaction, 'id' | 'monthKey'>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Fixed Expenses',
  'Variable Expenses',
  'Employee Salaries',
  'Cloud Hosting',
  'API Integration Costs',
  'Marketing Expenses',
  'Administrative Expenses',
  'Other Operational Expenses',
];

export const FinancialManagementView: React.FC<Props> = ({
  db,
  metrics,
  canWrite,
  onAddRevenue,
  onDeleteRevenue,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [activeTab, setActiveTab] = useState<'profitability' | 'revenue' | 'expenses' | 'csv-ai'>(
    'profitability'
  );
  const [showRevModal, setShowRevModal] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);

  const [revForm, setRevForm] = useState<Omit<RevenueTransaction, 'id' | 'monthKey'>>({
    date: '2026-11-19',
    category: 'Subscription Revenue',
    description: '',
    amount: 25000,
    status: 'Received',
  });

  const [expForm, setExpForm] = useState<Omit<ExpenseTransaction, 'id' | 'monthKey'>>({
    date: '2026-11-19',
    category: 'Cloud Hosting',
    costType: 'Fixed',
    vendor: '',
    description: '',
    amount: 10000,
    approvedBy: 'Ananya Deshmukh',
  });

  const subscriptionRevenueTotal = useMemo(
    () =>
      db.revenueTransactions
        .filter((r) => r.category === 'Subscription Revenue')
        .reduce((s, r) => s + r.amount, 0),
    [db.revenueTransactions]
  );

  const otherRevenueTotal = useMemo(
    () =>
      db.revenueTransactions
        .filter((r) => r.category === 'Other Revenue')
        .reduce((s, r) => s + r.amount, 0),
    [db.revenueTransactions]
  );

  const handleSaveRev = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddRevenue(revForm);
    setShowRevModal(false);
    setRevForm({
      date: '2026-11-19',
      category: 'Subscription Revenue',
      description: '',
      amount: 25000,
      status: 'Received',
    });
  };

  const handleSaveExp = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddExpense(expForm);
    setShowExpModal(false);
    setExpForm({
      date: '2026-11-19',
      category: 'Cloud Hosting',
      costType: 'Fixed',
      vendor: '',
      description: '',
      amount: 10000,
      approvedBy: 'Ananya Deshmukh',
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: 'profitability', label: 'Profitability & Unit Economics' },
              { id: 'revenue', label: 'Revenue Ledger' },
              { id: 'expenses', label: 'Expense Ledger' },
              { id: 'csv-ai', label: 'CSV Upload & AI Analysis' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === t.id
                  ? 'bg-[#0B192C] text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {canWrite && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowRevModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Revenue</span>
            </button>
            <button
              type="button"
              onClick={() => setShowExpModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 rounded-md whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Expense</span>
            </button>
          </div>
        )}
      </div>

      {activeTab === 'profitability' && (
        <div className="space-y-6">
          {/* Automated Calculation Engine Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Monthly Revenue ({metrics.currentMonthKey})</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
                {formatINR(metrics.monthlyRevenue)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Sum of current month revenue transactions
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Monthly Operating Expenses</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
                {formatINR(metrics.monthlyOperatingExpenses)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                Fixed {formatINR(metrics.monthlyFixedExpenses)} + Var {formatINR(metrics.monthlyVariableExpenses)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Operating Surplus</div>
              <div
                className={`text-xl font-semibold font-mono tabular-nums mt-1 ${
                  metrics.operatingSurplus >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {formatINR(metrics.operatingSurplus)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Total Revenue − Total Expenses
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Break-Even Customers</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-blue-700 mt-1">
                {metrics.breakEvenCustomers} customers
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                Contribution: {formatINR(metrics.contributionPerCustomer)} ({metrics.contributionMarginPct.toFixed(1)}%)
              </div>
            </div>
          </div>

          {/* Formula Audit Table */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Automated Financial Validation & Formula Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Metric</th>
                    <th className="py-2.5 px-4 font-medium">Formula Definition</th>
                    <th className="py-2.5 px-4 font-medium text-right">Live Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-slate-900">Contribution Per Customer</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      Average Selling Price ({formatINR(db.assumptions.sellingPriceStandard)}) − Variable Cost ({formatINR(db.assumptions.variableCostPerCustomer)})
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(metrics.contributionPerCustomer)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-slate-900">Contribution Margin (%)</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      (Contribution Per Customer / Selling Price) × 100
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      {metrics.contributionMarginPct.toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-slate-900">Break-Even Customers</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      Monthly Fixed Costs ({formatINR(metrics.monthlyFixedExpenses)}) / Contribution Per Customer
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-blue-700">
                      ~{metrics.breakEvenCustomers} customers
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-slate-900">Monthly Operating Surplus</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      Monthly Revenue ({formatINR(metrics.monthlyRevenue)}) − Monthly Operating Expenses ({formatINR(metrics.monthlyOperatingExpenses)})
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      {formatINR(metrics.operatingSurplus)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-slate-900">YTD Cumulative Revenue Split</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      Subscription ({formatINR(subscriptionRevenueTotal)}) + Other ({formatINR(otherRevenueTotal)})
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(metrics.totalRevenueAllTime)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly & Quarterly Financial Statements */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Monthly Financial Statement Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">Month</th>
                      <th className="py-2.5 px-3 font-medium text-right">Revenue</th>
                      <th className="py-2.5 px-3 font-medium text-right">Fixed</th>
                      <th className="py-2.5 px-3 font-medium text-right">Variable</th>
                      <th className="py-2.5 px-3 font-medium text-right">Total Cost</th>
                      <th className="py-2.5 px-3 font-medium text-right">Surplus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {metrics.monthlySeries.map((m) => (
                      <tr key={m.monthKey} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{m.label}</td>
                        <td className="py-2.5 px-3 text-right text-slate-900">{formatINR(m.revenue)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{formatINR(m.fixedExpenses)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{formatINR(m.variableExpenses)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">{formatINR(m.totalExpenses)}</td>
                        <td
                          className={`py-2.5 px-3 text-right font-semibold ${
                            m.profitability >= 0 ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {formatINR(m.profitability)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Quarterly & Annual Rollup
              </h3>
              <div className="space-y-3">
                {metrics.quarterlySummary.map((q) => (
                  <div key={q.quarter} className="p-3.5 border border-slate-200 rounded-md">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                      <span>{q.quarter}</span>
                      <span className="font-mono tabular-nums text-emerald-700">
                        {formatINR(q.surplus)} surplus
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                      <span>Rev: {formatINR(q.revenue)}</span>
                      <span>Exp: {formatINR(q.expenses)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 px-4 font-medium">Transaction ID</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium">Description</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Amount</th>
                  {canWrite && <th className="py-3 px-4 font-medium text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.revenueTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{t.id}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">{t.date}</td>
                    <td className="py-3 px-4 text-slate-800 whitespace-nowrap">{t.category}</td>
                    <td className="py-3 px-4 text-slate-700">{t.description}</td>
                    <td className="py-3 px-4">
                      <StatusText label={t.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-emerald-700 whitespace-nowrap">
                      {formatINR(t.amount)}
                    </td>
                    {canWrite && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onDeleteRevenue(t.id)}
                          className="p-1.5 text-slate-400 hover:text-red-700 rounded"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 px-4 font-medium">Expense ID</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium">Cost Type</th>
                  <th className="py-3 px-4 font-medium">Vendor & Description</th>
                  <th className="py-3 px-4 font-medium">Approved By</th>
                  <th className="py-3 px-4 font-medium text-right">Amount</th>
                  {canWrite && <th className="py-3 px-4 font-medium text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.expenseTransactions.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{e.id}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">{e.date}</td>
                    <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">{e.category}</td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{e.costType}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{e.vendor}</div>
                      <div className="text-[11px] text-slate-500">{e.description}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{e.approvedBy}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                      {formatINR(e.amount)}
                    </td>
                    {canWrite && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(e.id)}
                          className="p-1.5 text-slate-400 hover:text-red-700 rounded"
                          title="Delete expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'csv-ai' && <DatasetWorkbench />}

      {/* Add Revenue Modal */}
      <Modal
        open={showRevModal}
        onClose={() => setShowRevModal(false)}
        title="Log Revenue Transaction"
      >
        <form onSubmit={handleSaveRev} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Date *</label>
              <input
                required
                type="date"
                value={revForm.date}
                onChange={(e) => setRevForm({ ...revForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Category</label>
              <select
                value={revForm.category}
                onChange={(e) =>
                  setRevForm({
                    ...revForm,
                    category: e.target.value as 'Subscription Revenue' | 'Other Revenue',
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                <option value="Subscription Revenue">Subscription Revenue</option>
                <option value="Other Revenue">Other Revenue</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Amount (₹) *</label>
              <input
                required
                type="number"
                min={1}
                value={revForm.amount}
                onChange={(e) => setRevForm({ ...revForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Status</label>
              <select
                value={revForm.status}
                onChange={(e) =>
                  setRevForm({
                    ...revForm,
                    status: e.target.value as 'Received' | 'Pending' | 'Overdue',
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                <option value="Received">Received</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Description *</label>
            <input
              required
              type="text"
              value={revForm.description}
              onChange={(e) => setRevForm({ ...revForm, description: e.target.value })}
              placeholder="e.g. Monthly subscription settlement or custom integration"
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowRevModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 text-white rounded-md font-medium"
            >
              Save Revenue
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Expense Modal */}
      <Modal
        open={showExpModal}
        onClose={() => setShowExpModal(false)}
        title="Log Expense Transaction"
      >
        <form onSubmit={handleSaveExp} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Date *</label>
              <input
                required
                type="date"
                value={expForm.date}
                onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Category</label>
              <select
                value={expForm.category}
                onChange={(e) =>
                  setExpForm({ ...expForm, category: e.target.value as ExpenseCategory })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Cost Type</label>
              <select
                value={expForm.costType}
                onChange={(e) =>
                  setExpForm({
                    ...expForm,
                    costType: e.target.value as 'Fixed' | 'Variable' | 'Other',
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                <option value="Fixed">Fixed</option>
                <option value="Variable">Variable</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Amount (₹) *</label>
              <input
                required
                type="number"
                min={1}
                value={expForm.amount}
                onChange={(e) => setExpForm({ ...expForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Vendor *</label>
              <input
                required
                type="text"
                value={expForm.vendor}
                onChange={(e) => setExpForm({ ...expForm, vendor: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Approved By</label>
              <input
                type="text"
                value={expForm.approvedBy}
                onChange={(e) => setExpForm({ ...expForm, approvedBy: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Description *</label>
            <input
              required
              type="text"
              value={expForm.description}
              onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowExpModal(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0B192C] text-white rounded-md font-medium"
            >
              Save Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
