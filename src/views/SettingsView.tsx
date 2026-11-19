import React, { useState } from 'react';
import { Play, RotateCcw, Save } from 'lucide-react';
import {
  FinancialAssumptions,
  PlatformDatabase,
  UserRole,
} from '../types/platform';
import { formatINR } from '../utils/formatters';
import { StatusText } from '../components/StatusText';

interface Props {
  db: PlatformDatabase;
  isAdmin: boolean;
  onSaveAssumptions: (payload: FinancialAssumptions) => Promise<void>;
  onUpdateUserRole: (userId: string, role: UserRole) => Promise<void>;
  onToggleAutomation: (ruleId: string, enabled: boolean) => Promise<void>;
  onRunAutomations: () => Promise<void>;
  onResetDemo: () => Promise<void>;
}

export const SettingsView: React.FC<Props> = ({
  db,
  isAdmin,
  onSaveAssumptions,
  onUpdateUserRole,
  onToggleAutomation,
  onRunAutomations,
  onResetDemo,
}) => {
  const [assumptions, setAssumptions] = useState<FinancialAssumptions>(db.assumptions);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [runningBots, setRunningBots] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAssumptions(assumptions);
    setSavedMsg('Financial assumptions updated and all KPIs recalculated.');
    setTimeout(() => setSavedMsg(null), 4000);
  };

  const handleRunBots = async () => {
    setRunningBots(true);
    try {
      await onRunAutomations();
      setSavedMsg('Automation bots executed successfully; alerts refreshed.');
      setTimeout(() => setSavedMsg(null), 4000);
    } finally {
      setRunningBots(false);
    }
  };

  const contrib = assumptions.sellingPriceStandard - assumptions.variableCostPerCustomer;
  const marginPct = assumptions.sellingPriceStandard > 0 ? (contrib / assumptions.sellingPriceStandard) * 100 : 0;
  const bep = contrib > 0 ? Math.ceil(assumptions.monthlyFixedCost / contrib) : 0;

  return (
    <div className="space-y-6">
      {savedMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
          {savedMsg}
        </div>
      )}

      {/* Venture Financial Assumptions Engine */}
      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Venture Financial Calculation Engine Assumptions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Base pricing, unit cost, and market sizing parameters driving break-even and scenario calculations.
            </p>
          </div>
          {isAdmin && (
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 rounded-md whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Assumptions</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Standard Monthly Price (₹)
            </label>
            <input
              type="number"
              disabled={!isAdmin}
              value={assumptions.sellingPriceStandard}
              onChange={(e) =>
                setAssumptions({ ...assumptions, sellingPriceStandard: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Conservative Monthly Price (₹)
            </label>
            <input
              type="number"
              disabled={!isAdmin}
              value={assumptions.sellingPriceConservative}
              onChange={(e) =>
                setAssumptions({
                  ...assumptions,
                  sellingPriceConservative: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Premium Monthly Price (₹)
            </label>
            <input
              type="number"
              disabled={!isAdmin}
              value={assumptions.sellingPricePremium}
              onChange={(e) =>
                setAssumptions({ ...assumptions, sellingPricePremium: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Variable Cost Per Customer (₹/mo)
            </label>
            <input
              type="number"
              disabled={!isAdmin}
              value={assumptions.variableCostPerCustomer}
              onChange={(e) =>
                setAssumptions({
                  ...assumptions,
                  variableCostPerCustomer: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Monthly Fixed Cost Budget (₹)
            </label>
            <input
              type="number"
              disabled={!isAdmin}
              value={assumptions.monthlyFixedCost}
              onChange={(e) =>
                setAssumptions({ ...assumptions, monthlyFixedCost: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Expected Base Customers
            </label>
            <input
              type="number"
              disabled={!isAdmin}
              value={assumptions.expectedBaseCustomers}
              onChange={(e) =>
                setAssumptions({ ...assumptions, expectedBaseCustomers: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono disabled:bg-slate-50"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500">Contribution / Customer:</span>{' '}
            <strong className="font-mono tabular-nums text-slate-900">{formatINR(contrib)}</strong>
          </div>
          <div>
            <span className="text-slate-500">Contribution Margin:</span>{' '}
            <strong className="font-mono tabular-nums text-emerald-700">
              {marginPct.toFixed(1)}%
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Break-Even Threshold:</span>{' '}
            <strong className="font-mono tabular-nums text-blue-700">{bep} customers</strong>
          </div>
        </div>
      </form>

      {/* Workflow Automation Bots */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Workflow Automation Bots & Scheduled Alerts
            </h3>
            <p className="text-xs text-slate-500">
              Automated triggers for renewals, overdue collections, sales follow-ups, task deadlines, and financial rollups.
            </p>
          </div>
          <button
            type="button"
            disabled={runningBots}
            onClick={handleRunBots}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-md whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningBots ? 'Running Sweep...' : 'Run Automation Sweep'}</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
          {db.automationRules.map((rule) => (
            <div
              key={rule.id}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="font-semibold text-slate-900">{rule.name}</div>
                <div className="text-slate-500 mt-0.5">
                  {rule.trigger} · {rule.channel}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <StatusText
                  label={rule.enabled ? 'Active' : 'Paused'}
                  tone={rule.enabled ? 'success' : 'neutral'}
                />
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onToggleAutomation(rule.id, !rule.enabled)}
                    className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role-Based Access Control Directory */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Users & Role-Based Access Control (RBAC)
            </h3>
            <p className="text-xs text-slate-500">
              Admin, Finance Manager, Sales Manager, and Executive read-only access controls
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={onResetDemo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Data</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-4 font-medium">User</th>
                <th className="py-2.5 px-4 font-medium">Department</th>
                <th className="py-2.5 px-4 font-medium">Role</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5 px-4">
                    <div className="font-medium text-slate-900">{u.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {u.email} · {u.designation}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">{u.department}</td>
                  <td className="py-2.5 px-4">
                    {isAdmin ? (
                      <select
                        value={u.role}
                        onChange={(e) => onUpdateUserRole(u.id, e.target.value as UserRole)}
                        className="px-2.5 py-1 border border-slate-300 rounded bg-white text-xs"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="FINANCE_MANAGER">FINANCE_MANAGER</option>
                        <option value="SALES_MANAGER">SALES_MANAGER</option>
                        <option value="EXECUTIVE">EXECUTIVE</option>
                      </select>
                    ) : (
                      <span className="font-mono text-slate-800">{u.role}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <StatusText label={u.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
