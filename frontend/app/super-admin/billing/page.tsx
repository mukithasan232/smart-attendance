"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, Search, Plus, Loader2, CheckCircle2, XCircle, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthContext';

type UserData = {
  id: string;
  email: string;
  role: string;
};

type BillData = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  dueDate: string | null;
  description: string | null;
  createdAt: string;
  user: {
    email: string;
    id: string;
  };
};

export default function AdminBillingPage() {
  const { role } = useAuth();
  const [bills, setBills] = useState<BillData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    amount: '',
    currency: 'USD',
    dueDate: '',
    description: ''
  });

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [billsRes, usersRes] = await Promise.all([
        fetch('/api/admin/billing'),
        fetch('/api/admin/users')
      ]);

      if (billsRes.ok && usersRes.ok) {
        const billsData = await billsRes.json();
        const usersData = await usersRes.json();
        
        setBills(billsData);
        setUsers(usersData.filter((u: UserData) => u.role === 'USER'));
      } else {
        throw new Error('Failed to fetch data');
      }
    } catch (error) {
      console.error(error);
      showToast('Error loading billing data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.amount) {
      showToast('User and Amount are required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        showToast('Invoice generated successfully', 'success');
        setIsModalOpen(false);
        setFormData({ userId: '', amount: '', currency: 'USD', dueDate: '', description: '' });
        fetchData();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate invoice');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBills = bills.filter(b => 
    b.user.email.toLowerCase().includes(search.toLowerCase()) ||
    b.id.toLowerCase().includes(search.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (!role || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/50 flex items-center w-max gap-1.5"><CheckCircle2 size={12} /> PAID</span>;
      case 'PENDING':
        return <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200/50 flex items-center w-max gap-1.5"><AlertCircle size={12} /> PENDING</span>;
      case 'FAILED':
        return <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-200/50 flex items-center w-max gap-1.5"><XCircle size={12} /> FAILED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200/50 flex items-center w-max gap-1.5">{status}</span>;
    }
  };

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Receipt className="text-indigo-600" size={32} />
            Billing & Invoices
          </h1>
          <p className="text-slate-500 mt-2">Manage client subscriptions, generate invoices, and track payments.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Generate New Invoice
        </button>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-8 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search invoices by email or ID..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-sm text-slate-500 font-medium">
          Total Invoices: <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{filteredBills.length}</span>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative min-h-[400px]">
        {loading ? (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-600 font-medium animate-pulse">Loading billing records...</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-slate-500">
            <FileText size={48} className="text-slate-300 mb-4" />
            <p className="text-lg font-medium">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                  <th className="p-5 pl-6 rounded-tl-2xl">Invoice ID</th>
                  <th className="p-5">Client / User</th>
                  <th className="p-5">Amount</th>
                  <th className="p-5">Due Date</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-right pr-6 rounded-tr-2xl">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map(bill => (
                  <tr key={bill.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="p-5 pl-6">
                      <div className="font-mono text-sm text-slate-900">{bill.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-[150px]" title={bill.description || ''}>
                        {bill.description || 'Standard Invoice'}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {bill.user?.email.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="font-semibold text-slate-900 text-sm">{bill.user?.email || 'Unknown User'}</div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="font-bold text-slate-900">
                        {bill.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">{bill.currency}</span>
                      </div>
                    </td>
                    <td className="p-5 text-sm text-slate-600 font-medium">
                      {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                    </td>
                    <td className="p-5">
                      {getStatusBadge(bill.status)}
                    </td>
                    <td className="p-5 text-right pr-6 text-sm text-slate-500">
                      {new Date(bill.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="text-indigo-600" size={24} />
                Generate Invoice
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors bg-white hover:bg-slate-100 rounded-full p-1 border border-slate-200"
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={handleGenerateInvoice} className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Client / User</label>
                <select 
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                  value={formData.userId}
                  onChange={e => setFormData({...formData, userId: e.target.value})}
                  required
                >
                  <option value="" disabled>-- Select a user --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.email}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                    value={formData.currency}
                    onChange={e => setFormData({...formData, currency: e.target.value})}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="BDT">BDT (৳)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date (Optional)</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                  value={formData.dueDate}
                  onChange={e => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea 
                  placeholder="e.g. Monthly Enterprise Subscription"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 resize-none h-24"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-3 mt-2">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Receipt size={18} />}
                  {isSubmitting ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-white animate-in slide-in-from-bottom-5 z-[99999] ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <span className="font-semibold">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
