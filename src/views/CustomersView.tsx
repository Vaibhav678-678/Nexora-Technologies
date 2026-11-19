import React, { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Eye } from 'lucide-react';
import {
  Customer,
  CustomerStatus,
  PlatformDatabase,
  SubscriptionPlanName,
} from '../types/platform';
import { formatINR } from '../utils/formatters';
import { StatusText } from '../components/StatusText';
import { Modal } from '../components/Modal';

interface Props {
  db: PlatformDatabase;
  canWrite: boolean;
  isAdmin: boolean;
  onAddCustomer: (payload: Omit<Customer, 'id'>) => Promise<void>;
  onUpdateCustomer: (id: string, payload: Partial<Customer>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
}

const STATUS_OPTIONS: ('All' | CustomerStatus)[] = [
  'All',
  'Paid Customer',
  'Trial Customer',
  'Demo Scheduled',
  'Qualified Lead',
  'Prospect',
  'Inactive Customer',
];

export const CustomersView: React.FC<Props> = ({
  db,
  canWrite,
  isAdmin,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | CustomerStatus>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<Omit<Customer, 'id'>>({
    companyName: '',
    contactPerson: '',
    designation: 'Chief Financial Officer',
    email: '',
    phone: '+91 ',
    industry: 'B2B SaaS',
    companyRevenueRange: '₹25 Cr – ₹50 Cr',
    employeeCount: 90,
    city: 'Bengaluru',
    leadSource: 'LinkedIn Sales Navigator',
    acquisitionDate: '2026-11-19',
    subscriptionPlan: 'Standard',
    status: 'Paid Customer',
    monthlyValue: 25000,
    assignedExecutive: 'Rohan Malhotra',
    nextFollowUpDate: '2026-11-25',
    remarks: '',
  });

  const cities = useMemo(
    () => ['All', ...Array.from(new Set(db.customers.map((c) => c.city)))],
    [db.customers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.customers.filter((c) => {
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (cityFilter !== 'All' && c.city !== cityFilter) return false;
      if (!q) return true;
      return (
        c.companyName.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q)
      );
    });
  }, [db.customers, search, statusFilter, cityFilter]);

  const handlePlanChange = (plan: SubscriptionPlanName | 'None') => {
    const price =
      plan === 'Premium'
        ? db.assumptions.sellingPricePremium
        : plan === 'Standard'
          ? db.assumptions.sellingPriceStandard
          : plan === 'Conservative'
            ? db.assumptions.sellingPriceConservative
            : 0;
    setForm((prev) => ({
      ...prev,
      subscriptionPlan: plan,
      monthlyValue: prev.status === 'Paid Customer' ? price : 0,
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await onAddCustomer(form);
      setShowAddModal(false);
      setForm({
        companyName: '',
        contactPerson: '',
        designation: 'Chief Financial Officer',
        email: '',
        phone: '+91 ',
        industry: 'B2B SaaS',
        companyRevenueRange: '₹25 Cr – ₹50 Cr',
        employeeCount: 90,
        city: 'Bengaluru',
        leadSource: 'LinkedIn Sales Navigator',
        acquisitionDate: '2026-11-19',
        subscriptionPlan: 'Standard',
        status: 'Paid Customer',
        monthlyValue: db.assumptions.sellingPriceStandard,
        assignedExecutive: 'Rohan Malhotra',
        nextFollowUpDate: '2026-11-25',
        remarks: '',
      });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Unable to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  const paidTotal = db.customers.filter((c) => c.status === 'Paid Customer').length;
  const trialTotal = db.customers.filter((c) => c.status === 'Trial Customer').length;
  const mrrTotal = db.customers.reduce((s, c) => s + (c.status === 'Paid Customer' ? c.monthlyValue : 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Total CRM Accounts</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {db.customers.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Paid Customers</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-emerald-700 mt-1">
            {paidTotal}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Active Trials</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-blue-700 mt-1">
            {trialTotal}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Monthly Contracted Value</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
            {formatINR(mrrTotal)}
          </div>
        </div>
      </div>

      {/* Filters & Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, contact, email, or customer ID..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              aria-label="Filter by city"
              className="px-3 py-2 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  City: {c}
                </option>
              ))}
            </select>

            {canWrite && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Customer</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === status
                  ? 'bg-[#0B192C] text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-medium">ID</th>
                <th className="py-3 px-4 font-medium">Company & Industry</th>
                <th className="py-3 px-4 font-medium">Decision Maker</th>
                <th className="py-3 px-4 font-medium">City</th>
                <th className="py-3 px-4 font-medium">Plan</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">MRR</th>
                <th className="py-3 px-4 font-medium">Owner</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    No customer records match your current search or filter.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{c.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{c.companyName}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.industry} · {c.employeeCount} employees
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{c.contactPerson}</div>
                      <div className="text-[11px] text-slate-500">{c.designation}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{c.city}</td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{c.subscriptionPlan}</td>
                    <td className="py-3 px-4">
                      <StatusText label={c.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                      {c.monthlyValue > 0 ? formatINR(c.monthlyValue) : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{c.assignedExecutive}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(c)}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                          title="View Customer Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => onDeleteCustomer(c.id)}
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Profile & Follow-up Drawer/Modal */}
      <Modal
        open={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.companyName || ''}
        subtitle={
          selectedCustomer
            ? `${selectedCustomer.id} · ${selectedCustomer.industry} · ${selectedCustomer.city}`
            : undefined
        }
      >
        {selectedCustomer && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="text-slate-500">Primary Contact</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {selectedCustomer.contactPerson}
                </div>
                <div className="text-slate-600">{selectedCustomer.designation}</div>
              </div>
              <div>
                <div className="text-slate-500">Email & Phone</div>
                <div className="font-medium text-slate-900 mt-0.5">{selectedCustomer.email}</div>
                <div className="font-mono text-slate-600">{selectedCustomer.phone}</div>
              </div>
              <div>
                <div className="text-slate-500">Company Revenue & Size</div>
                <div className="font-medium text-slate-900 mt-0.5">
                  {selectedCustomer.companyRevenueRange} · {selectedCustomer.employeeCount} staff
                </div>
              </div>
              <div>
                <div className="text-slate-500">Acquisition & Lead Source</div>
                <div className="font-medium text-slate-900 mt-0.5">
                  {selectedCustomer.acquisitionDate} · {selectedCustomer.leadSource}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Subscription Plan & Value</div>
                <div className="font-semibold font-mono tabular-nums text-slate-900 mt-0.5">
                  {selectedCustomer.subscriptionPlan} ({formatINR(selectedCustomer.monthlyValue)}/mo)
                </div>
              </div>
              <div>
                <div className="text-slate-500">Current Status</div>
                <div className="mt-1">
                  <StatusText label={selectedCustomer.status} />
                </div>
              </div>
            </div>

            <div>
              <div className="text-slate-500 mb-1">Remarks & Engagement History</div>
              <p className="text-slate-800 bg-slate-50 border border-slate-200 rounded p-3">
                {selectedCustomer.remarks || 'No additional remarks recorded.'}
              </p>
            </div>

            {canWrite && (
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-slate-600 font-medium">Update Status:</label>
                  <select
                    value={selectedCustomer.status}
                    onChange={async (e) => {
                      const nextStatus = e.target.value as CustomerStatus;
                      await onUpdateCustomer(selectedCustomer.id, { status: nextStatus });
                      setSelectedCustomer({ ...selectedCustomer, status: nextStatus });
                    }}
                    className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  >
                    {STATUS_OPTIONS.filter((s) => s !== 'All').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2 bg-[#0B192C] text-white rounded-md font-medium"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Customer Account"
        subtitle="Duplicate company names and email addresses are automatically prevented."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Company Name *</label>
              <input
                required
                type="text"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="e.g. Horizon FinOps India Pvt Ltd"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Person *</label>
              <input
                required
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="e.g. Rajesh Nair"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="cfo@company.in"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">City</label>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                <option value="Bengaluru">Bengaluru</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi-NCR">Delhi-NCR</option>
                <option value="Pune">Pune</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="US Expansion">US Expansion</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Employee Count</label>
              <input
                type="number"
                min={1}
                value={form.employeeCount}
                onChange={(e) => setForm({ ...form, employeeCount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Customer Status</label>
              <select
                value={form.status}
                onChange={(e) => {
                  const status = e.target.value as CustomerStatus;
                  setForm({
                    ...form,
                    status,
                    monthlyValue:
                      status === 'Paid Customer'
                        ? form.subscriptionPlan === 'Premium'
                          ? db.assumptions.sellingPricePremium
                          : form.subscriptionPlan === 'Conservative'
                            ? db.assumptions.sellingPriceConservative
                            : db.assumptions.sellingPriceStandard
                        : 0,
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                {STATUS_OPTIONS.filter((s) => s !== 'All').map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Subscription Plan</label>
              <select
                value={form.subscriptionPlan}
                onChange={(e) => handlePlanChange(e.target.value as SubscriptionPlanName | 'None')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                <option value="Conservative">Conservative (₹20,000/mo)</option>
                <option value="Standard">Standard (₹25,000/mo)</option>
                <option value="Premium">Premium (₹30,000/mo)</option>
                <option value="None">None (Pre-Subscription)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Monthly Value (₹)</label>
              <input
                type="number"
                min={0}
                value={form.monthlyValue}
                onChange={(e) => setForm({ ...form, monthlyValue: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Lead Source</label>
              <select
                value={form.leadSource}
                onChange={(e) => setForm({ ...form, leadSource: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                <option value="LinkedIn Sales Navigator">LinkedIn Sales Navigator</option>
                <option value="Direct Email Campaigns">Direct Email Campaigns</option>
                <option value="CFO Networks">CFO Networks</option>
                <option value="Accounting Consultants">Accounting Consultants</option>
                <option value="B2B SaaS Communities">B2B SaaS Communities</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Remarks</label>
            <textarea
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-white bg-[#0B192C] hover:bg-slate-800 disabled:opacity-60 rounded-md font-medium"
            >
              {submitting ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
