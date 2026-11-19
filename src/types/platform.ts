export type UserRole = 'ADMIN' | 'FINANCE_MANAGER' | 'SALES_MANAGER' | 'EXECUTIVE';

export type NavModule =
  | 'dashboard'
  | 'customers'
  | 'pipeline'
  | 'subscriptions'
  | 'financials'
  | 'analytics'
  | 'marketing'
  | 'validation'
  | 'market'
  | 'reports'
  | 'settings';

export type CustomerStatus =
  | 'Prospect'
  | 'Qualified Lead'
  | 'Demo Scheduled'
  | 'Trial Customer'
  | 'Paid Customer'
  | 'Inactive Customer';

export type SubscriptionPlanName = 'Conservative' | 'Standard' | 'Premium';

export type SalesStage =
  | 'New Lead'
  | 'Contacted'
  | 'Interested'
  | 'Demo Scheduled'
  | 'Demo Completed'
  | 'Trial Started'
  | 'Negotiation'
  | 'Converted'
  | 'Lost';

export type ExpenseCategory =
  | 'Fixed Expenses'
  | 'Variable Expenses'
  | 'Employee Salaries'
  | 'Cloud Hosting'
  | 'API Integration Costs'
  | 'Marketing Expenses'
  | 'Administrative Expenses'
  | 'Other Operational Expenses';

export type MarketingChannel =
  | 'LinkedIn Sales Navigator'
  | 'Direct Email Campaigns'
  | 'CFO Networks'
  | 'Accounting Consultants'
  | 'B2B SaaS Communities';

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  department: string;
  status: 'Active' | 'Inactive';
  lastActive: string;
}

export interface Customer {
  id: string;
  companyName: string;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  industry: string;
  companyRevenueRange: string;
  employeeCount: number;
  city: 'Bengaluru' | 'Mumbai' | 'Delhi-NCR' | 'Pune' | 'Hyderabad' | 'US Expansion' | string;
  leadSource: string;
  acquisitionDate: string;
  subscriptionPlan: SubscriptionPlanName | 'None';
  status: CustomerStatus;
  monthlyValue: number;
  assignedExecutive: string;
  nextFollowUpDate?: string;
  remarks: string;
}

export interface Lead {
  id: string;
  companyName: string;
  contactPerson: string;
  jobDesignation: string;
  email: string;
  leadSource: string;
  expectedDealValue: number;
  salesStage: SalesStage;
  followUpDate: string;
  demoStatus: 'Pending' | 'Scheduled' | 'Completed' | 'No-Show';
  conversionProbability: number;
  assignedEmployee: string;
  notes: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  planName: SubscriptionPlanName;
  startDate: string;
  endDate: string;
  billingFrequency: 'Monthly' | 'Annual';
  amount: number;
  paymentStatus: 'Paid' | 'Pending' | 'Overdue';
  renewalDate: string;
  status: 'Active' | 'Expiring Soon' | 'Suspended' | 'Cancelled';
}

export interface RevenueTransaction {
  id: string;
  date: string;
  monthKey: string; // YYYY-MM
  customerId?: string;
  subscriptionId?: string;
  category: 'Subscription Revenue' | 'Other Revenue';
  description: string;
  amount: number;
  status: 'Received' | 'Pending' | 'Overdue';
}

export interface ExpenseTransaction {
  id: string;
  date: string;
  monthKey: string; // YYYY-MM
  category: ExpenseCategory;
  costType: 'Fixed' | 'Variable' | 'Other';
  vendor: string;
  description: string;
  amount: number;
  approvedBy: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  channel: MarketingChannel;
  budget: number;
  leadsGenerated: number;
  demoBookings: number;
  paidCustomers: number;
  status: 'Active' | 'Planned' | 'Completed' | 'Paused';
  weekLabel: string;
  startDate: string;
}

export interface ValidationTask {
  id: string;
  week: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  assignedPerson: string;
  startDate: string;
  dueDate: string;
  target: number;
  actual: number;
  unit: string;
  status: 'Completed' | 'In Progress' | 'Overdue' | 'Not Started';
  remarks: string;
}

export interface CustomerFeedback {
  id: string;
  customerName: string;
  company: string;
  designation: string;
  interviewDate: string;
  majorPainPoints: string;
  dataSecurityConcerns: string;
  trustsDataSecurity: boolean;
  productFeedback: string;
  willingnessToPay: 'Yes (₹25,000+)' | 'Yes (₹20,000)' | 'Needs Discount' | 'No';
  hoursSavedPerWeek: number;
  pricingFeedback: string;
  suggestions: string;
  validationStatus: 'Validated' | 'Partial' | 'Needs Follow-up';
}

export interface FinancialReport {
  id: string;
  title: string;
  periodType: 'Monthly' | 'Quarterly' | 'Annual';
  periodLabel: string;
  generatedAt: string;
  generatedBy: string;
  totalRevenue: number;
  totalExpenses: number;
  operatingSurplus: number;
  activeCustomers: number;
  contributionMarginPct: number;
  summaryNotes: string;
}

export interface FinancialAssumptions {
  sellingPriceStandard: number;
  sellingPriceConservative: number;
  sellingPricePremium: number;
  variableCostPerCustomer: number;
  expectedBaseCustomers: number;
  monthlyFixedCost: number;
  potentialCustomersTAM: number;
  serviceableCustomersSAM: number;
  obtainableCustomersSOM: number;
  annualSpendPerCustomer: number;
  currentMonthKey: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  channel: 'In-App Alert' | 'Scheduled Digest' | 'Email Bot';
  enabled: boolean;
  lastRunAt: string;
}

export interface WorkflowAlert {
  id: string;
  type: 'Renewal' | 'Overdue Payment' | 'Sales Follow-up' | 'Task Deadline' | 'New Customer' | 'Financial Summary' | 'Campaign';
  severity: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  message: string;
  timestamp: string;
  targetModule: NavModule;
  acknowledged: boolean;
}

export interface PlatformDatabase {
  users: PlatformUser[];
  customers: Customer[];
  leads: Lead[];
  subscriptions: Subscription[];
  revenueTransactions: RevenueTransaction[];
  expenseTransactions: ExpenseTransaction[];
  campaigns: MarketingCampaign[];
  validationTasks: ValidationTask[];
  feedback: CustomerFeedback[];
  reports: FinancialReport[];
  assumptions: FinancialAssumptions;
  automationRules: AutomationRule[];
  alerts: WorkflowAlert[];
}

export interface MonthlyPerformancePoint {
  monthKey: string;
  label: string;
  revenue: number;
  fixedExpenses: number;
  variableExpenses: number;
  otherExpenses: number;
  totalExpenses: number;
  profitability: number;
  activeCustomers: number;
  activeSubscriptions: number;
  newCustomers: number;
}

export interface ComputedMetrics {
  currentMonthKey: string;
  totalRevenueAllTime: number;
  monthlyRevenue: number;
  mrr: number;
  arr: number;
  totalCustomers: number;
  paidCustomers: number;
  activeSubscriptions: number;
  overdueSubscriptions: number;
  upcomingRenewalsCount: number;
  monthlyOperatingExpenses: number;
  monthlyFixedExpenses: number;
  monthlyVariableExpenses: number;
  totalVariableCostsAssumed: number;
  contributionPerCustomer: number;
  contributionMarginPct: number;
  operatingSurplus: number;
  monthlyProfitability: number;
  breakEvenCustomers: number;
  cac: number;
  customerGrowthRatePct: number;
  revenueGrowthRatePct: number;
  expenseGrowthRatePct: number;
  retentionRatePct: number;
  totalLeads: number;
  qualifiedLeads: number;
  upcomingFollowUps: number;
  demoConversionRatePct: number;
  leadToCustomerRatePct: number;
  expectedSalesRevenue: number;
  tam: number;
  sam: number;
  som: number;
  monthlySeries: MonthlyPerformancePoint[];
  quarterlySummary: {
    quarter: string;
    revenue: number;
    expenses: number;
    surplus: number;
  }[];
}
