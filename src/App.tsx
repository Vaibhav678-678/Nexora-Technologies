import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileBarChart2,
  Globe2,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Shield,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  Customer,
  CustomerFeedback,
  ExpenseTransaction,
  FinancialAssumptions,
  Lead,
  MarketingCampaign,
  NavModule,
  PlatformDatabase,
  PlatformUser,
  RevenueTransaction,
  Subscription,
  UserRole,
  ValidationTask,
} from './types/platform';
import { computePlatformMetrics, getRolePermissions } from './utils/formatters';
import { ExecutiveDashboardView } from './views/ExecutiveDashboardView';
import { CustomersView } from './views/CustomersView';
import { SalesPipelineView } from './views/SalesPipelineView';
import { SubscriptionsView } from './views/SubscriptionsView';
import { FinancialManagementView } from './views/FinancialManagementView';
import { BusinessAnalyticsView } from './views/BusinessAnalyticsView';
import { MarketingView } from './views/MarketingView';
import { VentureValidationView } from './views/VentureValidationView';
import { MarketAnalysisView } from './views/MarketAnalysisView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { Modal } from './components/Modal';

const NAV_ITEMS: { id: NavModule; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'pipeline', label: 'Sales Pipeline', icon: Briefcase },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'financials', label: 'Financial Management', icon: Wallet },
  { id: 'analytics', label: 'Business Analytics', icon: BarChart3 },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'validation', label: 'Venture Validation', icon: ClipboardCheck },
  { id: 'market', label: 'Market Analysis', icon: Globe2 },
  { id: 'reports', label: 'Reports', icon: FileBarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [db, setDb] = useState<PlatformDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<NavModule>('dashboard');
  const [currentUserId, setCurrentUserId] = useState<string>('USR-001');
  const [signedOut, setSignedOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  const currentUser: PlatformUser | undefined = useMemo(() => {
    if (!db) return undefined;
    return db.users.find((u) => u.id === currentUserId) || db.users[0];
  }, [db, currentUserId]);

  const activeRole: UserRole = currentUser?.role || 'ADMIN';
  const permissions = useMemo(() => getRolePermissions(activeRole), [activeRole]);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Failed to load platform database');
      const data = (await res.json()) as PlatformDatabase;
      setDb(data);
      setErrorMsg(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (!permissions.allowedModules.includes(activeModule)) {
      setActiveModule('dashboard');
    }
  }, [permissions.allowedModules, activeModule]);

  const apiMutate = async (url: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': activeRole,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      const errText = data?.error || 'Request failed';
      setErrorMsg(errText);
      throw new Error(errText);
    }
    setErrorMsg(null);
    setDb(data as PlatformDatabase);
  };

  const metrics = useMemo(() => {
    if (!db) return null;
    return computePlatformMetrics(db);
  }, [db]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 space-y-3">
          <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-64 bg-slate-100 rounded animate-pulse" />
          <div className="h-24 w-full bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!db || !metrics) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md bg-white border border-red-200 rounded-lg p-6 text-xs space-y-3">
          <h1 className="text-base font-semibold text-slate-900">Unable to Initialize Platform</h1>
          <p className="text-red-700">{errorMsg || 'Database state unavailable.'}</p>
          <button
            type="button"
            onClick={fetchState}
            className="px-4 py-2 bg-[#0B192C] text-white rounded-md font-medium"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Enterprise Sign-In Gate when user explicitly signs out
  if (signedOut) {
    return (
      <div className="min-h-screen bg-[#0B192C] flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-lg border border-slate-200 shadow-xl p-8 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <div className="text-xs font-medium text-blue-700">Apex Global Technologies</div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Apex Tech – Financial Intelligence Platform
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Select an enterprise role profile to authenticate with role-based access controls.
            </p>
          </div>
          <div className="space-y-2.5">
            {db.users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setCurrentUserId(u.id);
                  setSignedOut(false);
                }}
                className="w-full text-left p-3.5 border border-slate-200 hover:border-blue-600 hover:bg-blue-50/40 rounded-md transition-colors flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-500">
                    {u.designation} · {u.email}
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-blue-700 shrink-0">
                  {u.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const unackCount = db.alerts.filter((a) => !a.acknowledged).length;
  const activeNavLabel = NAV_ITEMS.find((n) => n.id === activeModule)?.label || 'Executive Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Enterprise Navy Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-[#0B192C] text-slate-100 flex flex-col shrink-0 transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-white whitespace-nowrap truncate">
              Apex Tech
            </div>
            <div className="text-[11px] text-slate-400 whitespace-nowrap truncate">
              Financial Intelligence
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Primary Navigation">
          {NAV_ITEMS.filter((item) => permissions.allowedModules.includes(item.id)).map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveModule(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Role Footer */}
        <div className="p-3 border-t border-slate-800/80 space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => setRoleModalOpen(true)}
            className="w-full p-2.5 rounded-md bg-slate-900/80 hover:bg-slate-800 text-left transition-colors flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded bg-blue-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {currentUser?.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2) || 'VS'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser?.name || 'Vaibhav Sharma'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {permissions.roleLabel}
              </div>
            </div>
            <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setSignedOut(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-3 h-3" />
            <span>Lock / Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
                Apex Global Technologies
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="text-sm font-semibold text-slate-900 truncate">{activeNavLabel}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setAlertsOpen(true)}
              className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
              aria-label="View workflow alerts"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Alerts</span>
              {unackCount > 0 && (
                <span className="font-mono tabular-nums font-semibold text-red-700">
                  ({unackCount})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setRoleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{permissions.roleLabel}</span>
            </button>
          </div>
        </header>

        {/* Global Error Feedback */}
        {errorMsg && (
          <div className="mx-4 lg:mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-center justify-between gap-4">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-red-700 font-medium hover:underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Module Viewport */}
        <main className="flex-1 p-4 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeModule === 'dashboard' && (
            <ExecutiveDashboardView db={db} metrics={metrics} onNavigate={setActiveModule} />
          )}

          {activeModule === 'customers' && (
            <CustomersView
              db={db}
              canWrite={permissions.canWrite('customers')}
              isAdmin={activeRole === 'ADMIN'}
              onAddCustomer={(p: Omit<Customer, 'id'>) => apiMutate('/api/customers', 'POST', p)}
              onUpdateCustomer={(id, p) => apiMutate(`/api/customers/${id}`, 'PUT', p)}
              onDeleteCustomer={(id) => apiMutate(`/api/customers/${id}`, 'DELETE')}
            />
          )}

          {activeModule === 'pipeline' && (
            <SalesPipelineView
              db={db}
              metrics={metrics}
              canWrite={permissions.canWrite('pipeline')}
              onAddLead={(p: Omit<Lead, 'id'>) => apiMutate('/api/leads', 'POST', p)}
              onUpdateLead={(id, p) => apiMutate(`/api/leads/${id}`, 'PUT', p)}
            />
          )}

          {activeModule === 'subscriptions' && (
            <SubscriptionsView
              db={db}
              metrics={metrics}
              canWrite={permissions.canWrite('subscriptions')}
              onAddSubscription={(p: Omit<Subscription, 'id'>) =>
                apiMutate('/api/subscriptions', 'POST', p)
              }
              onUpdateSubscription={(id, p) => apiMutate(`/api/subscriptions/${id}`, 'PUT', p)}
            />
          )}

          {activeModule === 'financials' && (
            <FinancialManagementView
              db={db}
              metrics={metrics}
              canWrite={permissions.canWrite('financials')}
              onAddRevenue={(p: Omit<RevenueTransaction, 'id' | 'monthKey'>) =>
                apiMutate('/api/revenue', 'POST', p)
              }
              onDeleteRevenue={(id) => apiMutate(`/api/revenue/${id}`, 'DELETE')}
              onAddExpense={(p: Omit<ExpenseTransaction, 'id' | 'monthKey'>) =>
                apiMutate('/api/expenses', 'POST', p)
              }
              onDeleteExpense={(id) => apiMutate(`/api/expenses/${id}`, 'DELETE')}
            />
          )}

          {activeModule === 'analytics' && <BusinessAnalyticsView db={db} metrics={metrics} />}

          {activeModule === 'marketing' && (
            <MarketingView
              db={db}
              canWrite={permissions.canWrite('marketing')}
              onAddCampaign={(p: Omit<MarketingCampaign, 'id'>) =>
                apiMutate('/api/campaigns', 'POST', p)
              }
            />
          )}

          {activeModule === 'validation' && (
            <VentureValidationView
              db={db}
              canWrite={permissions.canWrite('validation')}
              onUpdateTask={(id, p: Partial<ValidationTask>) =>
                apiMutate(`/api/validation-tasks/${id}`, 'PUT', p)
              }
              onAddFeedback={(p: Omit<CustomerFeedback, 'id'>) =>
                apiMutate('/api/feedback', 'POST', p)
              }
            />
          )}

          {activeModule === 'market' && <MarketAnalysisView db={db} metrics={metrics} />}

          {activeModule === 'reports' && (
            <ReportsView
              db={db}
              metrics={metrics}
              canGenerate={permissions.canWrite('reports')}
              onGenerateReport={(periodType) =>
                apiMutate('/api/reports/generate', 'POST', {
                  periodType,
                  generatedBy: currentUser?.name,
                })
              }
            />
          )}

          {activeModule === 'settings' && (
            <SettingsView
              db={db}
              isAdmin={activeRole === 'ADMIN'}
              onSaveAssumptions={(p: FinancialAssumptions) =>
                apiMutate('/api/assumptions', 'PUT', p)
              }
              onUpdateUserRole={(userId, role) =>
                apiMutate(`/api/users/${userId}`, 'PUT', { role })
              }
              onToggleAutomation={(ruleId, enabled) =>
                apiMutate(`/api/automations/${ruleId}`, 'PUT', { enabled })
              }
              onRunAutomations={() => apiMutate('/api/automations/run', 'POST')}
              onResetDemo={() => apiMutate('/api/reset-demo', 'POST')}
            />
          )}
        </main>
      </div>

      {/* Role Switcher Modal */}
      <Modal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Switch Active User Role"
        subtitle="Test enterprise Role-Based Access Control across Admin, Finance Manager, Sales Manager, and Executive views."
      >
        <div className="space-y-2.5 text-xs">
          {db.users.map((u) => {
            const active = u.id === currentUser?.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setCurrentUserId(u.id);
                  setRoleModalOpen(false);
                }}
                className={`w-full text-left p-3.5 rounded-md border transition-colors flex items-center justify-between gap-4 ${
                  active
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-900">{u.name}</div>
                  <div className="text-slate-500 mt-0.5">
                    {u.designation} · {u.department}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-semibold text-blue-700">{u.role}</div>
                  {active && <div className="text-[11px] text-emerald-700">Active Session</div>}
                </div>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Automated Workflow Alerts Modal */}
      <Modal
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        title="Automated Workflow Alerts & Reminders"
        subtitle="Triggered by renewal schedules, overdue payments, sales follow-ups, and validation task deadlines."
      >
        <div className="space-y-3 text-xs">
          {db.alerts.length === 0 ? (
            <div className="py-8 text-center text-slate-500">No workflow alerts recorded.</div>
          ) : (
            db.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-md border ${
                  alert.acknowledged
                    ? 'border-slate-200 bg-slate-50 opacity-70'
                    : 'border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
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
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="font-semibold text-slate-900">{alert.title}</span>
                    </div>
                    <p className="text-slate-600 mt-1">{alert.message}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {permissions.allowedModules.includes(alert.targetModule) && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModule(alert.targetModule);
                          setAlertsOpen(false);
                        }}
                        className="text-blue-700 font-medium hover:underline"
                      >
                        View
                      </button>
                    )}
                    {!alert.acknowledged && (
                      <button
                        type="button"
                        onClick={() => apiMutate(`/api/alerts/${alert.id}/acknowledge`, 'POST')}
                        className="inline-flex items-center gap-1 text-emerald-700 font-medium hover:underline"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
