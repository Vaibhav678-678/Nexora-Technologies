import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createInitialDatabase } from './server/seedData.js';
import { computePlatformMetrics, formatINR } from './src/utils/formatters.js';
import {
  PlatformDatabase,
  UserRole,
  WorkflowAlert,
} from './src/types/platform.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.VERCEL ? '/tmp/apex-tech-data' : path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'apex_db.json');

function ensureDbFile(): PlatformDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDatabase();
    initial.alerts = evaluateWorkflowAlerts(initial);
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as PlatformDatabase;
    return parsed;
  } catch {
    const fallback = createInitialDatabase();
    fallback.alerts = evaluateWorkflowAlerts(fallback);
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

function saveDb(db: PlatformDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function evaluateWorkflowAlerts(db: PlatformDatabase): WorkflowAlert[] {
  const existingAck = new Map(db.alerts.map((a) => [a.id, a.acknowledged]));
  const alerts: WorkflowAlert[] = [];
  const ruleEnabled = (id: string) =>
    db.automationRules.find((r) => r.id === id)?.enabled ?? true;

  const customerMap = new Map(db.customers.map((c) => [c.id, c]));
  const nowIso = new Date().toISOString();

  // Overdue payments
  if (ruleEnabled('BOT-03')) {
    db.subscriptions
      .filter((s) => s.paymentStatus === 'Overdue')
      .forEach((s) => {
        const cust = customerMap.get(s.customerId);
        const id = `ALERT-OVERDUE-${s.id}`;
        alerts.push({
          id,
          type: 'Overdue Payment',
          severity: 'critical',
          title: `Overdue Payment · ${cust?.companyName ?? s.customerId}`,
          message: `Subscription ${s.id} (${s.planName}) for ${formatINR(s.amount)} is marked Overdue.`,
          timestamp: nowIso,
          targetModule: 'subscriptions',
          acknowledged: existingAck.get(id) ?? false,
        });
      });
  }

  // Upcoming renewals
  if (ruleEnabled('BOT-02')) {
    const refDate = new Date('2026-11-19T00:00:00Z');
    db.subscriptions
      .filter((s) => s.status === 'Active' || s.status === 'Expiring Soon')
      .forEach((s) => {
        const ren = new Date(s.renewalDate);
        const days = Math.round((ren.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= -1 && days <= 7) {
          const cust = customerMap.get(s.customerId);
          const id = `ALERT-RENEWAL-${s.id}`;
          alerts.push({
            id,
            type: 'Renewal',
            severity: 'warning',
            title: `Upcoming Renewal · ${cust?.companyName ?? s.customerId}`,
            message: `Renewal scheduled for ${s.renewalDate} (${formatINR(s.amount)}/mo).`,
            timestamp: nowIso,
            targetModule: 'subscriptions',
            acknowledged: existingAck.get(id) ?? false,
          });
        }
      });
  }

  // Sales follow-ups due within 48h
  if (ruleEnabled('BOT-04')) {
    db.leads
      .filter((l) => !['Converted', 'Lost'].includes(l.salesStage) && l.followUpDate <= '2026-11-21')
      .forEach((l) => {
        const id = `ALERT-LEAD-${l.id}`;
        alerts.push({
          id,
          type: 'Sales Follow-up',
          severity: 'info',
          title: `Follow-up Due · ${l.companyName}`,
          message: `${l.contactPerson} (${l.salesStage}) follow-up scheduled on ${l.followUpDate}.`,
          timestamp: nowIso,
          targetModule: 'pipeline',
          acknowledged: existingAck.get(id) ?? false,
        });
      });
  }

  // Validation task deadlines & overdue
  if (ruleEnabled('BOT-05')) {
    db.validationTasks
      .filter((t) => t.status === 'Overdue' || (t.status === 'In Progress' && t.dueDate <= '2026-11-21'))
      .forEach((t) => {
        const id = `ALERT-TASK-${t.id}`;
        alerts.push({
          id,
          type: 'Task Deadline',
          severity: t.status === 'Overdue' ? 'critical' : 'warning',
          title: `${t.status === 'Overdue' ? 'Overdue Task' : 'Deadline Approaching'} · Week ${t.week}`,
          message: `${t.title} (${t.actual}/${t.target} ${t.unit}) due ${t.dueDate}.`,
          timestamp: nowIso,
          targetModule: 'validation',
          acknowledged: existingAck.get(id) ?? false,
        });
      });
  }

  // Keep manually triggered / event-based alerts (New Customer, Financial Summary, Campaign)
  db.alerts
    .filter((a) => ['New Customer', 'Financial Summary', 'Campaign'].includes(a.type))
    .slice(0, 10)
    .forEach((a) => alerts.push(a));

  return alerts;
}

function getRoleFromReq(req: Request): UserRole {
  const headerRole = (req.headers['x-user-role'] as string | undefined)?.toUpperCase();
  if (
    headerRole === 'ADMIN' ||
    headerRole === 'FINANCE_MANAGER' ||
    headerRole === 'SALES_MANAGER' ||
    headerRole === 'EXECUTIVE'
  ) {
    return headerRole;
  }
  return 'ADMIN';
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function createApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  let db = ensureDbFile();

  const persistAndRefreshAlerts = () => {
    db.alerts = evaluateWorkflowAlerts(db);
    saveDb(db);
  };

  // GET full state
  app.get('/api/state', (_req: Request, res: Response) => {
    db.alerts = evaluateWorkflowAlerts(db);
    res.json(db);
  });

  // Reset demo data
  app.post('/api/reset-demo', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Only Administrators can reset demo data.' });
      return;
    }
    db = createInitialDatabase();
    persistAndRefreshAlerts();
    res.json(db);
  });

  // CUSTOMERS CRUD
  app.post('/api/customers', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'SALES_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient role permissions to create customers.' });
      return;
    }
    const payload = req.body;
    if (!payload.companyName || !payload.email || !payload.contactPerson) {
      res.status(400).json({ error: 'Company Name, Contact Person, and Email are required.' });
      return;
    }
    const duplicate = db.customers.find(
      (c) =>
        c.email.toLowerCase() === String(payload.email).toLowerCase() ||
        c.companyName.toLowerCase() === String(payload.companyName).toLowerCase()
    );
    if (duplicate) {
      res.status(409).json({
        error: `Duplicate customer prevented: ${duplicate.companyName} (${duplicate.email}) already exists (${duplicate.id}).`,
      });
      return;
    }

    const nextNum = db.customers.length + 1;
    const id = `CUST-${String(nextNum).padStart(3, '0')}`;
    const newCustomer = {
      ...payload,
      id,
      monthlyValue: Number(payload.monthlyValue) || 0,
      employeeCount: Number(payload.employeeCount) || 50,
    };
    db.customers.unshift(newCustomer);

    // If Paid Customer with plan, auto-create subscription & revenue entry if requested
    if (newCustomer.status === 'Paid Customer' && newCustomer.monthlyValue > 0) {
      const subId = `SUB-${String(db.subscriptions.length + 1).padStart(3, '0')}`;
      db.subscriptions.unshift({
        id: subId,
        customerId: newCustomer.id,
        planName:
          newCustomer.subscriptionPlan && newCustomer.subscriptionPlan !== 'None'
            ? newCustomer.subscriptionPlan
            : 'Standard',
        startDate: newCustomer.acquisitionDate || '2026-11-19',
        endDate: '2027-11-18',
        billingFrequency: 'Monthly',
        amount: newCustomer.monthlyValue,
        paymentStatus: 'Paid',
        renewalDate: '2026-12-19',
        status: 'Active',
      });
      db.revenueTransactions.unshift({
        id: `REV-${Date.now().toString().slice(-6)}`,
        date: newCustomer.acquisitionDate || '2026-11-19',
        monthKey: (newCustomer.acquisitionDate || '2026-11-19').slice(0, 7),
        customerId: newCustomer.id,
        subscriptionId: subId,
        category: 'Subscription Revenue',
        description: `New customer subscription · ${newCustomer.companyName}`,
        amount: newCustomer.monthlyValue,
        status: 'Received',
      });
    }

    // Trigger BOT-01 notification
    if (db.automationRules.find((r) => r.id === 'BOT-01')?.enabled) {
      db.alerts.unshift({
        id: `ALERT-NEWCUST-${newCustomer.id}`,
        type: 'New Customer',
        severity: 'success',
        title: `New Customer Registered · ${newCustomer.companyName}`,
        message: `${newCustomer.contactPerson} (${newCustomer.status}) onboarded by ${newCustomer.assignedExecutive}.`,
        timestamp: new Date().toISOString(),
        targetModule: 'customers',
        acknowledged: false,
      });
    }

    persistAndRefreshAlerts();
    res.status(201).json(db);
  });

  app.put('/api/customers/:id', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'SALES_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions to update customers.' });
      return;
    }
    const idx = db.customers.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }
    db.customers[idx] = { ...db.customers[idx], ...req.body, id: req.params.id };
    persistAndRefreshAlerts();
    res.json(db);
  });

  app.delete('/api/customers/:id', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Only Administrators can delete customer records.' });
      return;
    }
    db.customers = db.customers.filter((c) => c.id !== req.params.id);
    db.subscriptions = db.subscriptions.filter((s) => s.customerId !== req.params.id);
    persistAndRefreshAlerts();
    res.json(db);
  });

  // LEADS CRUD
  app.post('/api/leads', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'SALES_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions to manage leads.' });
      return;
    }
    const payload = req.body;
    const id = `LEAD-${100 + db.leads.length + 1}`;
    db.leads.unshift({
      ...payload,
      id,
      expectedDealValue: Number(payload.expectedDealValue) || 25000,
      conversionProbability: Number(payload.conversionProbability) || 20,
    });
    persistAndRefreshAlerts();
    res.status(201).json(db);
  });

  app.put('/api/leads/:id', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'SALES_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions to update leads.' });
      return;
    }
    const idx = db.leads.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Lead not found.' });
      return;
    }
    const prevStage = db.leads[idx].salesStage;
    const updated = { ...db.leads[idx], ...req.body, id: req.params.id };
    db.leads[idx] = updated;

    // Auto-create customer + subscription when converted if not already present
    if (prevStage !== 'Converted' && updated.salesStage === 'Converted') {
      const exists = db.customers.some(
        (c) =>
          c.email.toLowerCase() === updated.email.toLowerCase() ||
          c.companyName.toLowerCase() === updated.companyName.toLowerCase()
      );
      if (!exists) {
        const custId = `CUST-${String(db.customers.length + 1).padStart(3, '0')}`;
        const plan =
          updated.expectedDealValue >= 30000
            ? 'Premium'
            : updated.expectedDealValue <= 20000
              ? 'Conservative'
              : 'Standard';
        db.customers.unshift({
          id: custId,
          companyName: updated.companyName,
          contactPerson: updated.contactPerson,
          designation: updated.jobDesignation,
          email: updated.email,
          phone: '+91 98000 00000',
          industry: 'B2B SaaS',
          companyRevenueRange: '₹25 Cr – ₹50 Cr',
          employeeCount: 85,
          city: 'Bengaluru',
          leadSource: updated.leadSource,
          acquisitionDate: '2026-11-19',
          subscriptionPlan: plan,
          status: 'Paid Customer',
          monthlyValue: updated.expectedDealValue,
          assignedExecutive: updated.assignedEmployee,
          remarks: `Converted from Pipeline (${updated.id}).`,
        });
        const subId = `SUB-${String(db.subscriptions.length + 1).padStart(3, '0')}`;
        db.subscriptions.unshift({
          id: subId,
          customerId: custId,
          planName: plan,
          startDate: '2026-11-19',
          endDate: '2027-11-18',
          billingFrequency: 'Monthly',
          amount: updated.expectedDealValue,
          paymentStatus: 'Paid',
          renewalDate: '2026-12-19',
          status: 'Active',
        });
        db.revenueTransactions.unshift({
          id: `REV-${Date.now().toString().slice(-6)}`,
          date: '2026-11-19',
          monthKey: db.assumptions.currentMonthKey,
          customerId: custId,
          subscriptionId: subId,
          category: 'Subscription Revenue',
          description: `Pipeline conversion · ${updated.companyName} (${plan} Plan)`,
          amount: updated.expectedDealValue,
          status: 'Received',
        });
      }
    }

    persistAndRefreshAlerts();
    res.json(db);
  });

  app.delete('/api/leads/:id', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'SALES_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }
    db.leads = db.leads.filter((l) => l.id !== req.params.id);
    persistAndRefreshAlerts();
    res.json(db);
  });

  // SUBSCRIPTIONS CRUD
  app.post('/api/subscriptions', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'FINANCE_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions to create subscriptions.' });
      return;
    }
    const payload = req.body;
    const id = `SUB-${String(db.subscriptions.length + 1).padStart(3, '0')}`;
    const newSub = {
      ...payload,
      id,
      amount: Number(payload.amount) || 25000,
    };
    db.subscriptions.unshift(newSub);

    // Sync customer status & monthlyValue
    const cust = db.customers.find((c) => c.id === newSub.customerId);
    if (cust) {
      cust.status = 'Paid Customer';
      cust.subscriptionPlan = newSub.planName;
      cust.monthlyValue = newSub.amount;
    }
    persistAndRefreshAlerts();
    res.status(201).json(db);
  });

  app.put('/api/subscriptions/:id', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'FINANCE_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions to update subscriptions.' });
      return;
    }
    const idx = db.subscriptions.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Subscription not found.' });
      return;
    }
    db.subscriptions[idx] = { ...db.subscriptions[idx], ...req.body, id: req.params.id };
    persistAndRefreshAlerts();
    res.json(db);
  });

  // REVENUE & EXPENSE TRANSACTIONS
  app.post('/api/revenue', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'FINANCE_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions to log revenue.' });
      return;
    }
    const payload = req.body;
    const date = payload.date || '2026-11-19';
    db.revenueTransactions.unshift({
      ...payload,
      id: `REV-${Date.now().toString().slice(-6)}`,
      date,
      monthKey: date.slice(0, 7),
      amount: Number(payload.amount) || 0,
    });
    persistAndRefreshAlerts();
    res.status(201).json(db);
  });

  app.delete('/api/revenue/:id', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'FINANCE_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }
    db.revenueTransactions = db.revenueTransactions.filter((r) => r.id !== req.params.id);
    persistAndRefreshAlerts();
    res.json(db);
  });

  app.post('/api/expenses', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'FINANCE_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions to log expenses.' });
      return;
    }
    const payload = req.body;
    const date = payload.date || '2026-11-19';
    db.expenseTransactions.unshift({
      ...payload,
      id: `EXP-${Date.now().toString().slice(-6)}`,
      date,
      monthKey: date.slice(0, 7),
      amount: Number(payload.amount) || 0,
    });
    persistAndRefreshAlerts();
    res.status(201).json(db);
  });

  app.delete('/api/expenses/:id', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'FINANCE_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }
    db.expenseTransactions = db.expenseTransactions.filter((e) => e.id !== req.params.id);
    persistAndRefreshAlerts();
    res.json(db);
  });

  // MARKETING CAMPAIGNS
  app.post('/api/campaigns', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'SALES_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }
    const payload = req.body;
    db.campaigns.unshift({
      ...payload,
      id: `CMP-${String(db.campaigns.length + 1).padStart(2, '0')}`,
      budget: Number(payload.budget) || 0,
      leadsGenerated: Number(payload.leadsGenerated) || 0,
      demoBookings: Number(payload.demoBookings) || 0,
      paidCustomers: Number(payload.paidCustomers) || 0,
    });
    persistAndRefreshAlerts();
    res.status(201).json(db);
  });

  app.put('/api/campaigns/:id', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'SALES_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }
    const idx = db.campaigns.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Campaign not found.' });
      return;
    }
    db.campaigns[idx] = { ...db.campaigns[idx], ...req.body, id: req.params.id };
    persistAndRefreshAlerts();
    res.json(db);
  });

  // VALIDATION TASKS
  app.post('/api/validation-tasks', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'SALES_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }
    const payload = req.body;
    db.validationTasks.push({
      ...payload,
      id: `VAL-W${payload.week || 1}-${Date.now().toString().slice(-3)}`,
      week: Number(payload.week) as 1 | 2 | 3 | 4,
      target: Number(payload.target) || 1,
      actual: Number(payload.actual) || 0,
    });
    persistAndRefreshAlerts();
    res.status(201).json(db);
  });

  app.put('/api/validation-tasks/:id', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'SALES_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }
    const idx = db.validationTasks.findIndex((t) => t.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Validation task not found.' });
      return;
    }
    db.validationTasks[idx] = { ...db.validationTasks[idx], ...req.body, id: req.params.id };
    persistAndRefreshAlerts();
    res.json(db);
  });

  // CUSTOMER FEEDBACK
  app.post('/api/feedback', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'SALES_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }
    const payload = req.body;
    db.feedback.unshift({
      ...payload,
      id: `FB-${String(db.feedback.length + 1).padStart(3, '0')}`,
      hoursSavedPerWeek: Number(payload.hoursSavedPerWeek) || 15,
    });
    persistAndRefreshAlerts();
    res.status(201).json(db);
  });

  // REPORTS GENERATION
  app.post('/api/reports/generate', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (!['ADMIN', 'FINANCE_MANAGER'].includes(role)) {
      res.status(403).json({ error: 'Only Admin or Finance Manager can generate official reports.' });
      return;
    }
    const { periodType, generatedBy } = req.body as {
      periodType: 'Monthly' | 'Quarterly' | 'Annual';
      generatedBy?: string;
    };
    const metrics = computePlatformMetrics(db);
    let totalRevenue = metrics.monthlyRevenue;
    let totalExpenses = metrics.monthlyOperatingExpenses;
    let periodLabel = 'November 2026';

    if (periodType === 'Quarterly') {
      const latestQ = metrics.quarterlySummary[metrics.quarterlySummary.length - 1];
      totalRevenue = latestQ?.revenue ?? metrics.monthlyRevenue;
      totalExpenses = latestQ?.expenses ?? metrics.monthlyOperatingExpenses;
      periodLabel = latestQ?.quarter ?? 'Q4 2026';
    } else if (periodType === 'Annual') {
      totalRevenue = metrics.totalRevenueAllTime;
      totalExpenses = db.expenseTransactions.reduce((s, e) => s + e.amount, 0);
      periodLabel = 'FY 2026-27 YTD';
    }

    const report = {
      id: `RPT-${Date.now().toString().slice(-6)}`,
      title: `${periodType} Financial Intelligence Report — ${periodLabel}`,
      periodType: periodType || 'Monthly',
      periodLabel,
      generatedAt: new Date().toISOString(),
      generatedBy: generatedBy || 'System Finance Bot',
      totalRevenue,
      totalExpenses,
      operatingSurplus: totalRevenue - totalExpenses,
      activeCustomers: metrics.paidCustomers,
      contributionMarginPct: Number(metrics.contributionMarginPct.toFixed(1)),
      summaryNotes: `Generated dynamically from ${db.revenueTransactions.length} revenue & ${db.expenseTransactions.length} expense entries. Operating surplus: ${formatINR(totalRevenue - totalExpenses)}.`,
    };
    db.reports.unshift(report);
    db.alerts.unshift({
      id: `ALERT-RPT-${report.id}`,
      type: 'Financial Summary',
      severity: 'info',
      title: `Financial Report Generated · ${periodLabel}`,
      message: `${report.title} ready for executive review.`,
      timestamp: new Date().toISOString(),
      targetModule: 'reports',
      acknowledged: false,
    });
    persistAndRefreshAlerts();
    res.status(201).json(db);
  });

  // ASSUMPTIONS & USERS & AUTOMATIONS (ADMIN)
  app.put('/api/assumptions', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Only Administrators can modify venture financial assumptions.' });
      return;
    }
    db.assumptions = {
      ...db.assumptions,
      ...req.body,
      sellingPriceStandard: Number(req.body.sellingPriceStandard) || db.assumptions.sellingPriceStandard,
      sellingPriceConservative:
        Number(req.body.sellingPriceConservative) || db.assumptions.sellingPriceConservative,
      sellingPricePremium: Number(req.body.sellingPricePremium) || db.assumptions.sellingPricePremium,
      variableCostPerCustomer:
        Number(req.body.variableCostPerCustomer) || db.assumptions.variableCostPerCustomer,
      expectedBaseCustomers:
        Number(req.body.expectedBaseCustomers) || db.assumptions.expectedBaseCustomers,
      monthlyFixedCost: Number(req.body.monthlyFixedCost) || db.assumptions.monthlyFixedCost,
    };
    persistAndRefreshAlerts();
    res.json(db);
  });

  app.post('/api/users', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Only Administrators can manage users.' });
      return;
    }
    const payload = req.body;
    db.users.push({
      ...payload,
      id: `USR-${String(db.users.length + 1).padStart(3, '0')}`,
      lastActive: new Date().toISOString(),
    });
    persistAndRefreshAlerts();
    res.status(201).json(db);
  });

  app.put('/api/users/:id', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Only Administrators can update user roles.' });
      return;
    }
    const idx = db.users.findIndex((u) => u.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    db.users[idx] = { ...db.users[idx], ...req.body, id: req.params.id };
    persistAndRefreshAlerts();
    res.json(db);
  });

  app.put('/api/automations/:id', (req: Request, res: Response) => {
    const role = getRoleFromReq(req);
    if (role !== 'ADMIN') {
      res.status(403).json({ error: 'Only Administrators can configure automation bots.' });
      return;
    }
    const rule = db.automationRules.find((r) => r.id === req.params.id);
    if (!rule) {
      res.status(404).json({ error: 'Automation rule not found.' });
      return;
    }
    rule.enabled = Boolean(req.body.enabled);
    persistAndRefreshAlerts();
    res.json(db);
  });

  app.post('/api/automations/run', (_req: Request, res: Response) => {
    const now = new Date().toISOString();
    db.automationRules.forEach((r) => {
      if (r.enabled) r.lastRunAt = now;
    });
    const metrics = computePlatformMetrics(db);
    if (db.automationRules.find((r) => r.id === 'BOT-07')?.enabled) {
      const totalLeads = db.campaigns.reduce((s, c) => s + c.leadsGenerated, 0);
      const totalPaid = db.campaigns.reduce((s, c) => s + c.paidCustomers, 0);
      db.alerts.unshift({
        id: `ALERT-BOT-RUN-${Date.now()}`,
        type: 'Campaign',
        severity: 'info',
        title: 'Scheduled Automation Sweep Completed',
        message: `Evaluated ${metrics.upcomingRenewalsCount} renewals, ${metrics.overdueSubscriptions} overdue accounts, ${totalLeads} campaign leads (${totalPaid} paid).`,
        timestamp: now,
        targetModule: 'marketing',
        acknowledged: false,
      });
    }
    persistAndRefreshAlerts();
    res.json(db);
  });

  app.post('/api/alerts/:id/acknowledge', (req: Request, res: Response) => {
    const alert = db.alerts.find((a) => a.id === req.params.id);
    if (alert) {
      alert.acknowledged = true;
      saveDb(db);
    }
    res.json(db);
  });

  // SERVER-SIDE GEMINI AI: Executive Financial Brief (Descriptive, Diagnostic, Predictive, Prescriptive)
  app.post('/api/ai/executive-brief', async (_req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets to enable live AI financial analysis.',
      });
      return;
    }

    try {
      const metrics = computePlatformMetrics(db);
      const promptPayload = {
        company: 'Apex Global Technologies (Apex Tech)',
        month: metrics.currentMonthKey,
        mrr: metrics.mrr,
        arr: metrics.arr,
        monthlyRevenue: metrics.monthlyRevenue,
        monthlyOperatingExpenses: metrics.monthlyOperatingExpenses,
        monthlyFixedExpenses: metrics.monthlyFixedExpenses,
        monthlyVariableExpenses: metrics.monthlyVariableExpenses,
        operatingSurplus: metrics.operatingSurplus,
        activeSubscriptions: metrics.activeSubscriptions,
        overdueSubscriptions: metrics.overdueSubscriptions,
        contributionPerCustomer: metrics.contributionPerCustomer,
        contributionMarginPct: Number(metrics.contributionMarginPct.toFixed(1)),
        breakEvenCustomers: metrics.breakEvenCustomers,
        cac: metrics.cac,
        revenueGrowthRatePct: Number(metrics.revenueGrowthRatePct.toFixed(1)),
        pipelineExpectedRevenue: metrics.expectedSalesRevenue,
        demoConversionRatePct: Number(metrics.demoConversionRatePct.toFixed(1)),
        monthlyTrend: metrics.monthlySeries.map((m) => ({
          month: m.label,
          revenue: m.revenue,
          expenses: m.totalExpenses,
          surplus: m.profitability,
        })),
      };

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze the following live SaaS financial performance telemetry for Apex Tech (Indian B2B FinTech SaaS, INR currency) and produce an executive CFO intelligence brief:\n${JSON.stringify(
          promptPayload,
          null,
          2
        )}`,
        config: {
          systemInstruction:
            'You are an expert Chief Financial Officer and FP&A Intelligence Engine for Apex Global Technologies. Provide concise, quantitatively grounded financial commentary using Indian Rupees (₹) and Lakhs/Crores formatting. Never invent numbers outside the provided JSON.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              descriptive: {
                type: Type.STRING,
                description: 'What happened financially this month and across the 6-month trend.',
              },
              diagnostic: {
                type: Type.STRING,
                description: 'Why margins, surplus, CAC, or overdue accounts moved the way they did.',
              },
              predictive: {
                type: Type.STRING,
                description: 'Near-term 90-day trajectory for MRR, break-even cushion, and cash flow.',
              },
              prescriptive: {
                type: Type.STRING,
                description: 'Concrete CFO action plan to optimize collections, conversion, and unit economics.',
              },
              actionItems: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 prioritized executive action items.',
              },
            },
            required: ['descriptive', 'diagnostic', 'predictive', 'prescriptive', 'actionItems'],
          },
        },
      });

      const text = (response.text ?? '{}').trim();
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error calling Gemini API';
      res.status(500).json({ error: `Gemini AI brief failed: ${message}` });
    }
  });

  // SERVER-SIDE GEMINI AI: Uploaded CSV/Excel Dataset Analysis (DGU Venture Quest Mission 10 MVP)
  app.post('/api/ai/analyze-dataset', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets to run AI dataset analytics.',
      });
      return;
    }

    try {
      const { fileName, validation, sampleRows } = req.body;
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze this uploaded financial/business CSV dataset "${fileName}" and provide Descriptive, Diagnostic, Predictive, and Prescriptive Analytics plus a recommended SQL summary query.\nValidation Summary:\n${JSON.stringify(
          validation,
          null,
          2
        )}\nSample Rows (first 40 rows):\n${JSON.stringify(sampleRows, null, 2)}`,
        config: {
          systemInstruction:
            'You are the Apex Tech AI Financial Analytics Engine. Analyze uploaded business spreadsheets accurately. Highlight data quality issues if any, summarize financial trends, identify risks, and provide a clean SQL query for the dataset.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              descriptiveInsights: { type: Type.STRING },
              diagnosticDrivers: { type: Type.STRING },
              predictiveOutlook: { type: Type.STRING },
              prescriptiveRecommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suggestedSqlQuery: { type: Type.STRING },
            },
            required: [
              'executiveSummary',
              'descriptiveInsights',
              'diagnosticDrivers',
              'predictiveOutlook',
              'prescriptiveRecommendations',
              'suggestedSqlQuery',
            ],
          },
        },
      });

      const text = (response.text ?? '{}').trim();
      res.json(JSON.parse(text));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error analyzing dataset';
      res.status(500).json({ error: `AI dataset analysis failed: ${message}` });
    }
  });

  // Serve Vite in dev or dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

if (!process.env.VERCEL) {
  createApp()
    .then((app) => {
      const PORT = Number(process.env.PORT) || 3000;
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Apex Tech server running on http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start Apex Tech server:', err);
      process.exit(1);
    });
}
