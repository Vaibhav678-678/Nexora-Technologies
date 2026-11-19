import React, { useState } from 'react';
import { ComputedMetrics, PlatformDatabase } from '../types/platform';
import { formatINR } from '../utils/formatters';
import { BreakEvenChart, HorizontalBarBreakdown, TrendLineChart } from '../components/Charts';

interface Props {
  db: PlatformDatabase;
  metrics: ComputedMetrics;
}

export const BusinessAnalyticsView: React.FC<Props> = ({ db, metrics }) => {
  const [scenario, setScenario] = useState<'Conservative' | 'Base' | 'Ambitious'>('Base');

  const scenarioConfig =
    scenario === 'Conservative'
      ? {
          customers: 10,
          price: db.assumptions.sellingPriceConservative,
          fixed: db.assumptions.monthlyFixedCost,
          variable: db.assumptions.variableCostPerCustomer,
          notes: 'Conservative early-adopter ramp: 10 customers @ ₹20,000/mo.',
        }
      : scenario === 'Ambitious'
        ? {
            customers: 40,
            price: db.assumptions.sellingPricePremium,
            fixed: Math.round(db.assumptions.monthlyFixedCost * 1.35),
            variable: db.assumptions.variableCostPerCustomer,
            notes: 'Ambitious scale-up: 40 customers @ ₹30,000/mo with expanded infrastructure.',
          }
        : {
            customers: db.assumptions.expectedBaseCustomers,
            price: db.assumptions.sellingPriceStandard,
            fixed: db.assumptions.monthlyFixedCost,
            variable: db.assumptions.variableCostPerCustomer,
            notes: 'Venture Base Plan: 20 customers @ ₹25,000/mo Standard pricing.',
          };

  const scenRev = scenarioConfig.customers * scenarioConfig.price;
  const scenVar = scenarioConfig.customers * scenarioConfig.variable;
  const scenTotalCost = scenarioConfig.fixed + scenVar;
  const scenSurplus = scenRev - scenTotalCost;
  const scenContrib = scenarioConfig.price - scenarioConfig.variable;
  const scenBEP = scenContrib > 0 ? Math.ceil(scenarioConfig.fixed / scenContrib) : 0;

  const cityMap = new Map<string, number>();
  db.customers
    .filter((c) => c.status === 'Paid Customer')
    .forEach((c) => cityMap.set(c.city, (cityMap.get(c.city) ?? 0) + c.monthlyValue));
  const cityItems = Array.from(cityMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label,
      value,
      formattedValue: `${formatINR(value)}/mo`,
      color: '#1d4ed8',
    }));

  const kpis = [
    {
      label: 'Revenue Growth (MoM)',
      value: `${metrics.revenueGrowthRatePct >= 0 ? '+' : ''}${metrics.revenueGrowthRatePct.toFixed(1)}%`,
      tone: 'text-emerald-700',
    },
    {
      label: 'Customer Growth (MoM)',
      value: `${metrics.customerGrowthRatePct >= 0 ? '+' : ''}${metrics.customerGrowthRatePct.toFixed(1)}%`,
      tone: 'text-emerald-700',
    },
    {
      label: 'Expense Growth (MoM)',
      value: `${metrics.expenseGrowthRatePct >= 0 ? '+' : ''}${metrics.expenseGrowthRatePct.toFixed(1)}%`,
      tone: 'text-slate-900',
    },
    {
      label: 'Contribution Margin',
      value: `${metrics.contributionMarginPct.toFixed(1)}%`,
      tone: 'text-emerald-700',
    },
    {
      label: 'Sales Conversion Rate',
      value: `${metrics.leadToCustomerRatePct.toFixed(1)}%`,
      tone: 'text-blue-700',
    },
    {
      label: 'Customer Retention',
      value: `${metrics.retentionRatePct.toFixed(1)}%`,
      tone: 'text-emerald-700',
    },
    {
      label: 'Blended CAC',
      value: formatINR(metrics.cac),
      tone: 'text-slate-900',
    },
    {
      label: 'LTV : CAC Ratio (12m)',
      value: `${metrics.cac > 0 ? ((db.assumptions.sellingPriceStandard * 12) / metrics.cac).toFixed(1) : '0.0'}x`,
      tone: 'text-emerald-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className={`text-xl font-semibold font-mono tabular-nums mt-1.5 ${k.tone}`}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Break-Even & Scenario Modeling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Break-Even & Unit Economics Curve
              </h3>
              <p className="text-xs text-slate-500">{scenarioConfig.notes}</p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md shrink-0">
              {(['Conservative', 'Base', 'Ambitious'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setScenario(sc)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    scenario === sc
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
          </div>

          <BreakEvenChart
            fixedCost={scenarioConfig.fixed}
            sellingPrice={scenarioConfig.price}
            variableCost={scenarioConfig.variable}
            currentCustomers={scenarioConfig.customers}
            maxCustomers={scenario === 'Ambitious' ? 50 : 30}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
            <div>
              <div className="text-slate-500">Scenario Revenue</div>
              <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                {formatINR(scenRev)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Total Cost</div>
              <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                {formatINR(scenTotalCost)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Operating Surplus</div>
              <div
                className={`font-mono tabular-nums font-semibold mt-0.5 ${
                  scenSurplus >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {formatINR(scenSurplus)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Break-Even Point</div>
              <div className="font-mono tabular-nums font-semibold text-blue-700 mt-0.5">
                {scenBEP} customers
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">MRR by Target Geography</h3>
          <p className="text-xs text-slate-500 mb-4">
            Active recurring revenue across Bengaluru, Mumbai & Delhi-NCR
          </p>
          <HorizontalBarBreakdown items={cityItems} />
        </div>
      </div>

      {/* Profitability vs Expense Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">Monthly Profitability Trajectory</h3>
          <p className="text-xs text-slate-500 mb-3">
            Operating surplus expansion over 6-month launch window
          </p>
          <TrendLineChart
            data={metrics.monthlySeries.map((m) => ({
              label: m.label,
              value: m.profitability,
            }))}
            color="#16a34a"
            primaryName="Operating Surplus"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900">Operating Cost Structure Trend</h3>
          <p className="text-xs text-slate-500 mb-3">
            Fixed overhead discipline vs variable AI/API usage scaling
          </p>
          <TrendLineChart
            data={metrics.monthlySeries.map((m) => ({
              label: m.label,
              value: m.fixedExpenses,
              secondaryValue: m.variableExpenses,
            }))}
            color="#0B192C"
            primaryName="Fixed Expenses"
            secondaryName="Variable Expenses"
          />
        </div>
      </div>
    </div>
  );
};
