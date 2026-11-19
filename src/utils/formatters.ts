import {
  ComputedMetrics,
  MonthlyPerformancePoint,
  PlatformDatabase,
  UserRole,
  NavModule,
} from '../types/platform';

export function formatINR(value: number, showDecimals = false): string {
  if (!Number.isFinite(value)) return '₹0';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}₹${abs.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })}`;
}

export function formatCompactINR(value: number): string {
  if (!Number.isFinite(value)) return '₹0';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) {
    return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (abs >= 1_00_000) {
    return `${sign}₹${(abs / 1_00_000).toFixed(2)} L`;
  }
  if (abs >= 1_000) {
    return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}₹${abs.toLocaleString('en-IN')}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export function getRolePermissions(role: UserRole): {
  allowedModules: NavModule[];
  canWrite: (module: NavModule) => boolean;
  canEditAssumptions: boolean;
  canManageUsers: boolean;
  roleLabel: string;
} {
  switch (role) {
    case 'ADMIN':
      return {
        allowedModules: [
          'dashboard',
          'customers',
          'pipeline',
          'subscriptions',
          'financials',
          'analytics',
          'marketing',
          'validation',
          'market',
          'reports',
          'settings',
        ],
        canWrite: () => true,
        canEditAssumptions: true,
        canManageUsers: true,
        roleLabel: 'Administrator',
      };
    case 'FINANCE_MANAGER':
      return {
        allowedModules: [
          'dashboard',
          'subscriptions',
          'financials',
          'analytics',
          'market',
          'reports',
        ],
        canWrite: (m) => ['subscriptions', 'financials', 'reports'].includes(m),
        canEditAssumptions: false,
        canManageUsers: false,
        roleLabel: 'Finance Manager',
      };
    case 'SALES_MANAGER':
      return {
        allowedModules: [
          'dashboard',
          'customers',
          'pipeline',
          'marketing',
          'validation',
          'market',
        ],
        canWrite: (m) => ['customers', 'pipeline', 'marketing', 'validation'].includes(m),
        canEditAssumptions: false,
        canManageUsers: false,
        roleLabel: 'Sales Manager',
      };
    case 'EXECUTIVE':
      return {
        allowedModules: ['dashboard', 'analytics', 'market', 'reports'],
        canWrite: () => false,
        canEditAssumptions: false,
        canManageUsers: false,
        roleLabel: 'Executive (Read-Only)',
      };
  }
}

export function computePlatformMetrics(db: PlatformDatabase): ComputedMetrics {
  const { assumptions } = db;
  const currentMonthKey = assumptions.currentMonthKey || '2026-11';

  // Build unique sorted month keys from transactions
  const monthSet = new Set<string>();
  db.revenueTransactions.forEach((t) => monthSet.add(t.monthKey));
  db.expenseTransactions.forEach((e) => monthSet.add(e.monthKey));
  monthSet.add(currentMonthKey);
  const sortedMonths = Array.from(monthSet).sort();

  const activeSubs = db.subscriptions.filter(
    (s) => s.status === 'Active' || s.status === 'Expiring Soon'
  );
  const mrr = activeSubs.reduce((sum, s) => sum + s.amount, 0);
  const arr = mrr * 12;

  const overdueSubscriptions = db.subscriptions.filter(
    (s) => s.paymentStatus === 'Overdue'
  ).length;

  const now = new Date('2026-11-19T00:00:00Z');
  const upcomingRenewalsCount = db.subscriptions.filter((s) => {
    if (s.status !== 'Active' && s.status !== 'Expiring Soon') return false;
    const renewal = new Date(s.renewalDate);
    const diffDays = (renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= -2 && diffDays <= 15;
  }).length;

  // Monthly series
  const monthlySeries: MonthlyPerformancePoint[] = sortedMonths.map((mk, idx) => {
    const rev = db.revenueTransactions
      .filter((t) => t.monthKey === mk)
      .reduce((s, t) => s + t.amount, 0);

    const monthExps = db.expenseTransactions.filter((e) => e.monthKey === mk);
    const fixedExpenses = monthExps
      .filter((e) => e.costType === 'Fixed')
      .reduce((s, e) => s + e.amount, 0);
    const variableExpenses = monthExps
      .filter((e) => e.costType === 'Variable')
      .reduce((s, e) => s + e.amount, 0);
    const otherExpenses = monthExps
      .filter((e) => e.costType === 'Other')
      .reduce((s, e) => s + e.amount, 0);
    const totalExpenses = fixedExpenses + variableExpenses + otherExpenses;

    const acqUpToMonth = db.customers.filter(
      (c) => c.status === 'Paid Customer' && c.acquisitionDate.slice(0, 7) <= mk
    ).length;

    const newInMonth = db.customers.filter(
      (c) => c.status === 'Paid Customer' && c.acquisitionDate.slice(0, 7) === mk
    ).length;

    const subsInMonth =
      mk === currentMonthKey
        ? activeSubs.length
        : Math.max(acqUpToMonth, idx === 0 ? 8 : Math.round(rev / assumptions.sellingPriceStandard));

    return {
      monthKey: mk,
      label: formatMonthLabel(mk),
      revenue: rev,
      fixedExpenses,
      variableExpenses,
      otherExpenses,
      totalExpenses,
      profitability: rev - totalExpenses,
      activeCustomers: mk === currentMonthKey ? db.customers.filter((c) => c.status === 'Paid Customer').length : subsInMonth,
      activeSubscriptions: subsInMonth,
      newCustomers: newInMonth,
    };
  });

  const currentPoint =
    monthlySeries.find((m) => m.monthKey === currentMonthKey) ||
    monthlySeries[monthlySeries.length - 1];
  const prevPoint =
    monthlySeries.length >= 2 ? monthlySeries[monthlySeries.length - 2] : currentPoint;

  const totalRevenueAllTime = db.revenueTransactions.reduce((s, t) => s + t.amount, 0);
  const monthlyRevenue = currentPoint ? currentPoint.revenue : 0;
  const monthlyFixedExpenses = currentPoint ? currentPoint.fixedExpenses : assumptions.monthlyFixedCost;
  const monthlyVariableExpenses = currentPoint
    ? currentPoint.variableExpenses
    : activeSubs.length * assumptions.variableCostPerCustomer;
  const monthlyOperatingExpenses = currentPoint ? currentPoint.totalExpenses : 0;

  const paidCustomersCount = db.customers.filter((c) => c.status === 'Paid Customer').length;
  const inactiveCustomersCount = db.customers.filter((c) => c.status === 'Inactive Customer').length;

  const effectiveARPU = activeSubs.length > 0 ? mrr / activeSubs.length : assumptions.sellingPriceStandard;
  const contributionPerCustomer = effectiveARPU - assumptions.variableCostPerCustomer;
  const contributionMarginPct =
    effectiveARPU > 0 ? (contributionPerCustomer / effectiveARPU) * 100 : 0;

  const operatingSurplus = monthlyRevenue - monthlyOperatingExpenses;
  const monthlyProfitability = operatingSurplus;
  const breakEvenCustomers =
    contributionPerCustomer > 0
      ? Math.ceil((monthlyFixedExpenses || assumptions.monthlyFixedCost) / contributionPerCustomer)
      : 0;

  // CAC = Total Marketing Spend / Total Paid Customers acquired via Marketing (or active paid customers)
  const totalMarketingSpend = db.campaigns.reduce((s, c) => s + c.budget, 0);
  const marketingPaidCustomers = db.campaigns.reduce((s, c) => s + c.paidCustomers, 0);
  const cac =
    marketingPaidCustomers > 0
      ? Math.round(totalMarketingSpend / marketingPaidCustomers)
      : paidCustomersCount > 0
        ? Math.round(totalMarketingSpend / paidCustomersCount)
        : 0;

  const customerGrowthRatePct =
    prevPoint && prevPoint.activeCustomers > 0
      ? ((paidCustomersCount - prevPoint.activeCustomers) / prevPoint.activeCustomers) * 100
      : 0;

  const revenueGrowthRatePct =
    prevPoint && prevPoint.revenue > 0
      ? ((monthlyRevenue - prevPoint.revenue) / prevPoint.revenue) * 100
      : 0;

  const expenseGrowthRatePct =
    prevPoint && prevPoint.totalExpenses > 0
      ? ((monthlyOperatingExpenses - prevPoint.totalExpenses) / prevPoint.totalExpenses) * 100
      : 0;

  const retentionBase = paidCustomersCount + inactiveCustomersCount;
  const retentionRatePct = retentionBase > 0 ? (paidCustomersCount / retentionBase) * 100 : 100;

  // Pipeline KPIs
  const totalLeads = db.leads.length;
  const qualifiedLeads = db.leads.filter((l) =>
    ['Interested', 'Demo Scheduled', 'Demo Completed', 'Trial Started', 'Negotiation', 'Converted'].includes(
      l.salesStage
    )
  ).length;
  const upcomingFollowUps = db.leads.filter(
    (l) => !['Converted', 'Lost'].includes(l.salesStage) && l.followUpDate >= '2026-11-19'
  ).length;
  const demoCompletedOrLater = db.leads.filter((l) =>
    ['Demo Completed', 'Trial Started', 'Negotiation', 'Converted'].includes(l.salesStage)
  ).length;
  const convertedLeads = db.leads.filter((l) => l.salesStage === 'Converted').length;
  const demoConversionRatePct =
    demoCompletedOrLater > 0 ? (convertedLeads / demoCompletedOrLater) * 100 : 0;
  const leadToCustomerRatePct = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  const expectedSalesRevenue = db.leads
    .filter((l) => !['Converted', 'Lost'].includes(l.salesStage))
    .reduce((sum, l) => sum + (l.expectedDealValue * l.conversionProbability) / 100, 0);

  // Market size
  const tam = assumptions.potentialCustomersTAM * assumptions.annualSpendPerCustomer;
  const sam = assumptions.serviceableCustomersSAM * assumptions.annualSpendPerCustomer;
  const som = assumptions.obtainableCustomersSOM * assumptions.annualSpendPerCustomer;

  // Quarterly summary
  const quarterMap = new Map<string, { revenue: number; expenses: number }>();
  monthlySeries.forEach((m) => {
    const [yr, moStr] = m.monthKey.split('-');
    const mo = Number(moStr);
    const q = Math.ceil(mo / 3);
    const qKey = `Q${q} ${yr}`;
    const existing = quarterMap.get(qKey) || { revenue: 0, expenses: 0 };
    existing.revenue += m.revenue;
    existing.expenses += m.totalExpenses;
    quarterMap.set(qKey, existing);
  });

  const quarterlySummary = Array.from(quarterMap.entries()).map(([quarter, vals]) => ({
    quarter,
    revenue: vals.revenue,
    expenses: vals.expenses,
    surplus: vals.revenue - vals.expenses,
  }));

  return {
    currentMonthKey,
    totalRevenueAllTime,
    monthlyRevenue,
    mrr,
    arr,
    totalCustomers: db.customers.length,
    paidCustomers: paidCustomersCount,
    activeSubscriptions: activeSubs.length,
    overdueSubscriptions,
    upcomingRenewalsCount,
    monthlyOperatingExpenses,
    monthlyFixedExpenses,
    monthlyVariableExpenses,
    totalVariableCostsAssumed: activeSubs.length * assumptions.variableCostPerCustomer,
    contributionPerCustomer,
    contributionMarginPct,
    operatingSurplus,
    monthlyProfitability,
    breakEvenCustomers,
    cac,
    customerGrowthRatePct,
    revenueGrowthRatePct,
    expenseGrowthRatePct,
    retentionRatePct,
    totalLeads,
    qualifiedLeads,
    upcomingFollowUps,
    demoConversionRatePct,
    leadToCustomerRatePct,
    expectedSalesRevenue,
    tam,
    sam,
    som,
    monthlySeries,
    quarterlySummary,
  };
}

export interface ParsedCsvValidation {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  columnCount: number;
  missingValuesCount: number;
  emptyColumns: string[];
  numericColumns: string[];
  columnStats: {
    column: string;
    type: 'numeric' | 'text' | 'date';
    missingCount: number;
    sum?: number;
    avg?: number;
    min?: number;
    max?: number;
  }[];
  issues: string[];
}

export function parseAndValidateCsv(csvText: string): ParsedCsvValidation {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
      missingValuesCount: 0,
      emptyColumns: [],
      numericColumns: [],
      columnStats: [],
      issues: ['Uploaded file is empty.'],
    };
  }

  const splitCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitCsvLine(lines[0]).map((h, i) => h || `Column_${i + 1}`);
  const rows: Record<string, string>[] = [];
  let missingValuesCount = 0;
  const issues: string[] = [];

  for (let r = 1; r < lines.length; r++) {
    const values = splitCsvLine(lines[r]);
    if (values.length !== headers.length) {
      issues.push(`Row ${r} has ${values.length} columns (expected ${headers.length}).`);
    }
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const val = (values[idx] ?? '').trim();
      rowObj[h] = val;
      if (!val) missingValuesCount++;
    });
    rows.push(rowObj);
  }

  const emptyColumns: string[] = [];
  const numericColumns: string[] = [];
  const columnStats: ParsedCsvValidation['columnStats'] = [];

  headers.forEach((col) => {
    const vals = rows.map((r) => r[col]);
    const nonEmpty = vals.filter((v) => v !== '');
    const missingCount = vals.length - nonEmpty.length;
    if (nonEmpty.length === 0) {
      emptyColumns.push(col);
      columnStats.push({ column: col, type: 'text', missingCount });
      return;
    }

    const parsedNums = nonEmpty
      .map((v) => Number(v.replace(/[₹$,\s]/g, '')))
      .filter((n) => !Number.isNaN(n) && Number.isFinite(n));

    if (parsedNums.length >= nonEmpty.length * 0.8 && nonEmpty.length > 0) {
      numericColumns.push(col);
      const sum = parsedNums.reduce((a, b) => a + b, 0);
      const avg = sum / parsedNums.length;
      const min = Math.min(...parsedNums);
      const max = Math.max(...parsedNums);
      columnStats.push({ column: col, type: 'numeric', missingCount, sum, avg, min, max });
    } else {
      const isDate = nonEmpty.every((v) => !Number.isNaN(Date.parse(v)));
      columnStats.push({ column: col, type: isDate ? 'date' : 'text', missingCount });
    }
  });

  if (missingValuesCount > 0) {
    issues.push(`Detected ${missingValuesCount} missing cell value(s) across dataset.`);
  }
  if (emptyColumns.length > 0) {
    issues.push(`Empty columns found: ${emptyColumns.join(', ')}.`);
  }

  return {
    headers,
    rows,
    rowCount: rows.length,
    columnCount: headers.length,
    missingValuesCount,
    emptyColumns,
    numericColumns,
    columnStats,
    issues,
  };
}
