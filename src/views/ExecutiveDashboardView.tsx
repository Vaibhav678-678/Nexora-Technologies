import React, { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { ComputedMetrics, NavModule, PlatformDatabase } from '../types/platform';
import { formatCompactINR, formatINR } from '../utils/formatters';
import {
  HorizontalBarBreakdown,
  RevenueExpenseChart,
  TrendLineChart,
} from '../components/Charts';

interface ExecutiveBrief {
  descriptive: string;
  diagnostic: string;
  predictive: string;
  prescriptive: string;
  actionItems: string[];
}

interface Props {
  db: PlatformDatabase;
  metrics: ComputedMetrics;
  onNavigate: (module: NavModule) => void;
}

export const ExecutiveDashboardView: React.FC<Props> = ({ db, metrics, onNavigate }) => {
  const [aiBrief, setAiBrief] = useState<ExecutiveBrief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  const generateBrief = async () => {
    setLoadingBrief(true);
    setBriefError(null);
    try {
      const res = await fetch('/api/ai/executive-brief', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate AI brief');
      setAiBrief(data);
    } catch (err: unknown) {
      setBriefError(err instanceof Error ? err.message : 'Unable to generate AI brief');
    } finally {
      setLoadingBrief(false);
    }
  };

  // Current month expense breakdown by category
  const currentMonthExps = db.expenseTransactions.filter(
    (e) => e.monthKey === metrics.currentMonthKey
  );
  const expByCat = new Map<string, number>();
  currentMonthExps.forEach((e) => {
    expByCat.set(e.category, (expByCat.get(e.category) ?? 0) + e.amount);
  });
  const expenseCategories = Array.from(expByCat.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], idx) => ({
      label,
      value,
      color: idx === 0 ? '#0B192C' : idx === 1 ? '#1d4ed8' : idx === 2 ? '#3b82f6' : '#64748b',
    }));

  const kpis: {
    label: string;
    value: string;
    subtext: string;
    tone?: 'positive' | 'negative' | 'neutral';
  }[] = [
    {
      label: 'Total Revenue (YTD)',
      value: formatINR(metrics.totalRevenueAllTime),
      subtext: `Monthly: ${formatINR(metrics.monthlyRevenue)}`,
      tone: 'positive',
    },
    {
      label: 'Monthly Recurring Revenue',
      value: formatINR(metrics.mrr),
      subtext: `${metrics.revenueGrowthRatePct >= 0 ? '+' : ''}${metrics.revenueGrowthRatePct.toFixed(1)}% MoM`,
      tone: 'positive',
    },
    {
      label: 'Annual Recurring Revenue',
      value: formatCompactINR(metrics.arr),
      subtext: '12x active MRR run-rate',
      tone: 'neutral',
    },
    {
      label: 'Total Customers (CRM)',
      value: `${metrics.totalCustomers}`,
      subtext: `${metrics.paidCustomers} paid · ${metrics.totalCustomers - metrics.paidCustomers} pipeline`,
      tone: 'neutral',
    },
    {
      label: 'Active Subscriptions',
      value: `${metrics.activeSubscriptions}`,
      subtext: `${metrics.overdueSubscriptions} overdue · ${metrics.upcomingRenewalsCount} renewals soon`,
      tone: metrics.overdueSubscriptions > 0 ? 'negative' : 'positive',
    },
    {
      label: 'Monthly Operating Expenses',
      value: formatINR(metrics.monthlyOperatingExpenses),
      subtext: `Fixed ${formatCompactINR(metrics.monthlyFixedExpenses)} · Var ${formatCompactINR(metrics.monthlyVariableExpenses)}`,
      tone: 'neutral',
    },
    {
      label: 'Total Variable Costs',
      value: formatINR(metrics.totalVariableCostsAssumed),
      subtext: `${formatINR(db.assumptions.variableCostPerCustomer)} / active customer`,
      tone: 'neutral',
    },
    {
      label: 'Contribution Margin',
      value: `${metrics.contributionMarginPct.toFixed(1)}%`,
      subtext: `${formatINR(metrics.contributionPerCustomer)} per customer`,
      tone: 'positive',
    },
    {
      label: 'Operating Surplus',
      value: formatINR(metrics.operatingSurplus),
      subtext: `Break-even at ${metrics.breakEvenCustomers} customers`,
      tone: metrics.operatingSurplus >= 0 ? 'positive' : 'negative',
    },
    {
      label: 'Customer Acquisition Cost',
      value: formatINR(metrics.cac),
      subtext: 'Blended GTM spend / customer',
      tone: 'neutral',
    },
    {
      label: 'Customer Growth Rate',
      value: `${metrics.customerGrowthRatePct >= 0 ? '+' : ''}${metrics.customerGrowthRatePct.toFixed(1)}%`,
      subtext: 'Month-over-month paid base',
      tone: metrics.customerGrowthRatePct >= 0 ? 'positive' : 'negative',
    },
    {
      label: 'Monthly Profitability',
      value: formatINR(metrics.monthlyProfitability),
      subtext: `${metrics.monthlyRevenue > 0 ? ((metrics.monthlyProfitability / metrics.monthlyRevenue) * 100).toFixed(1) : '0.0'}% net operating margin`,
      tone: metrics.monthlyProfitability >= 0 ? 'positive' : 'negative',
    },
  ];

  const unacknowledgedAlerts = db.alerts.filter((a) => !a.acknowledged);

  return (
    <div className="space-y-6">
      {/* Executive Header Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">
            Apex Global Technologies · Financial Intelligence Overview · DEMO DATA
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
            November 2026 Financial & Venture Performance
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            All metrics compute dynamically from underlying CRM, Subscription, Revenue, Expense, and Campaign tables.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('financials')}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
          >
            Upload CSV & Analyze
          </button>
          <button
            type="button"
            onClick={generateBrief}
            disabled={loadingBrief}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
          >
            {loadingBrief ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{loadingBrief ? 'Generating CFO Brief...' : 'Generate AI CFO Brief'}</span>
          </button>
        </div>
      </div>

      {/* Gemini AI Executive Brief (when triggered) */}
      {briefError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {briefError}
        </div>
      )}
      {aiBrief && (
        <div className="bg-white border border-blue-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                AI-Powered Executive Financial Intelligence Brief
              </h3>
              <p className="text-xs text-slate-500">
                Descriptive, Diagnostic, Predictive & Prescriptive analysis synthesized from live ledger data
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAiBrief(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
              <div className="font-semibold text-slate-900 mb-1">1. Descriptive</div>
              <p className="text-slate-600 leading-relaxed">{aiBrief.descriptive}</p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
              <div className="font-semibold text-slate-900 mb-1">2. Diagnostic</div>
              <p className="text-slate-600 leading-relaxed">{aiBrief.diagnostic}</p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
              <div className="font-semibold text-slate-900 mb-1">3. Predictive</div>
              <p className="text-slate-600 leading-relaxed">{aiBrief.predictive}</p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
              <div className="font-semibold text-slate-900 mb-1">4. Prescriptive</div>
              <p className="text-slate-600 leading-relaxed">{aiBrief.prescriptive}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-900 mb-1.5">
              Prioritized CFO Action Plan
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
              {aiBrief.actionItems.map((item, i) => (
                <div key={i} className="p-2.5 bg-blue-50/60 border border-blue-100 rounded">
                  <span className="font-mono font-semibold text-blue-800 mr-1.5">0{i + 1}.</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 12 Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between"
          >
            <div className="text-xs font-medium text-slate-500">{kpi.label}</div>
            <div
              className={`text-xl font-semibold font-mono tabular-nums mt-2 ${
                kpi.tone === 'positive'
                  ? 'text-emerald-700'
                  : kpi.tone === 'negative'
                    ? 'text-red-700'
                    : 'text-slate-900'
              }`}
            >
              {kpi.value}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5 font-mono tabular-nums">
              {kpi.subtext}
            </div>
          </div>
        ))}
      </div>

      {/* Primary Charts Row: Revenue vs Expense + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Revenue vs Operating Expenses & Monthly Profitability
              </h3>
              <p className="text-xs text-slate-500">
                6-month P&L performance trend across all transaction tables
              </p>
            </div>
          </div>
          <RevenueExpenseChart
            data={metrics.monthlySeries.map((m) => ({
              label: m.label,
              primary: m.revenue,
              secondary: m.totalExpenses,
              tertiary: m.profitability,
            }))}
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Current Month Expense Analysis
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {metrics.currentMonthKey} breakdown ({formatINR(metrics.monthlyOperatingExpenses)})
            </p>
            <HorizontalBarBreakdown items={expenseCategories} />
          </div>
          <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Fixed / Variable Split</span>
            <span className="font-mono tabular-nums font-medium text-slate-900">
              {formatCompactINR(metrics.monthlyFixedExpenses)} /{' '}
              {formatCompactINR(metrics.monthlyVariableExpenses)}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row: Revenue Trend + Subscription & Customer Acquisition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">Monthly Revenue Trend</h3>
          <p className="text-xs text-slate-500 mb-3">
            Scaling from ₹2.15L (Jun) to ₹5.00L (Nov)
          </p>
          <TrendLineChart
            data={metrics.monthlySeries.map((m) => ({
              label: m.label,
              value: m.revenue,
              secondaryValue: m.profitability,
            }))}
            color="#1d4ed8"
            primaryName="Monthly Revenue"
            secondaryName="Monthly Surplus"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Subscription Growth & Customer Acquisition
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Active paying subscriptions vs net new customers acquired monthly
          </p>
          <TrendLineChart
            data={metrics.monthlySeries.map((m) => ({
              label: m.label,
              value: m.activeSubscriptions,
              secondaryValue: m.newCustomers,
            }))}
            color="#0B192C"
            isCurrency={false}
            unitSuffix=" accts"
            primaryName="Active Subscriptions"
            secondaryName="New Customers"
          />
        </div>
      </div>

      {/* Active Automation Alerts Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Automated Workflow & Exception Alerts
            </h3>
            <p className="text-xs text-slate-500">
              Real-time monitoring of overdue payments, upcoming renewals, sales follow-ups, and validation deadlines
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-600">
            {unacknowledgedAlerts.length} active alert(s)
          </span>
        </div>
        {unacknowledgedAlerts.length === 0 ? (
          <div className="text-xs text-slate-500 py-4">
            All automated exception alerts have been acknowledged.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {unacknowledgedAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <span
                    className={`font-medium shrink-0 ${
                      alert.severity === 'critical'
                        ? 'text-red-700'
                        : alert.severity === 'warning'
                          ? 'text-amber-700'
                          : alert.severity === 'success'
                            ? 'text-emerald-700'
                            : 'text-blue-700'
                    }`}
                  >
                    {alert.type}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-medium text-slate-900">{alert.title}</span>
                  <span className="text-slate-500 hidden md:inline">{alert.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate(alert.targetModule)}
                  className="text-xs font-medium text-blue-700 hover:text-blue-900 shrink-0 text-left sm:text-right whitespace-nowrap"
                >
                  Open Module
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
