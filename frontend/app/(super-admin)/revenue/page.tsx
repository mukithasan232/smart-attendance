"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, CheckCircle2, XCircle, Download, Clock, Plus, Loader2, X } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthContext';

type UserData = {
  id: string;
  email: string;
};

type BillData = {
  id: string;
  userId: string;
  user: { email: string };
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  createdAt: string;
};

export default function RevenuePage() {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [bills, setBills] = useState<BillData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ userId: '', amount: '', currency: 'USD', description: '', dueDate: '' });

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/revenue');
      if (res.ok) {
        const data = await res.json();
        setBills(data);
      }
    } catch (error) {
      console.error(error);
      showToast('Error loading revenue data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, userId: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error loading users', error);
    }
  }, []);

  useEffect(() => {
    fetchRevenue();
    fetchUsers();
  }, [fetchRevenue, fetchUsers]);

  const handleGenerateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.amount) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate bill');
      }

      showToast('Invoice generated successfully!', 'success');
      setShowAddModal(false);
      setFormData({ ...formData, amount: '', description: '', dueDate: '' });
      fetchRevenue();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const totalProcessed = bills.filter(b => b.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingAmount = bills.filter(b => b.status === 'PENDING').reduce((acc, curr) => acc + curr.amount, 0);
  const failedAmount = bills.filter(b => b.status === 'FAILED').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="w-full flex flex-col gap-6 lg:gap-8 relative pb-20">
      
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2 animate-in slide-in-from-bottom-5 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Receipt className="text-indigo-600 dark:text-indigo-400" size={28} />
            Revenue & Billing
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Master transaction log across all tenants and subscriptions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Download size={18} /> Export CSV
          </button>
          {isAdmin && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 shadow-md">
              <Plus size={18} /> Generate Bill
            </button>
          )}
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Processed (YTD)</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">${totalProcessed.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pending Invoices</p>
          <p className="text-3xl font-extrabold text-amber-500">${pendingAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Failed</p>
          <p className="text-3xl font-extrabold text-red-500">${failedAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col w-full overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20 text-indigo-600">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p className="text-slate-500 font-medium text-sm">Loading bills...</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Client / User</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-500">
                      No invoices generated yet.
                    </td>
                  </tr>
                ) : (
                  bills.map((bill) => (
                    <tr key={bill.id} className="table-row border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{bill.id.split('-')[0]}...</td>
                      <td className="font-bold text-slate-800 dark:text-slate-200">{bill.user.email}</td>
                      <td className="text-slate-500 dark:text-slate-400">{bill.description || 'N/A'}</td>
                      <td className="font-medium tabular-nums text-slate-700 dark:text-slate-300">{bill.amount.toFixed(2)} {bill.currency}</td>
                      <td>
                        {bill.status === 'PAID' ? (
                          <span className="badge badge-green flex w-fit items-center gap-1">
                            <CheckCircle2 size={12} /> Paid
                          </span>
                        ) : bill.status === 'PENDING' ? (
                          <span className="badge flex w-fit items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                            <Clock size={12} /> Pending
                          </span>
                        ) : (
                          <span className="badge badge-red flex w-fit items-center gap-1">
                            <XCircle size={12} /> Failed
                          </span>
                        )}
                      </td>
                      <td className="text-slate-500 dark:text-slate-400 text-sm">{new Date(bill.createdAt).toLocaleDateString()}</td>
                      <td className="text-right">
                        <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                          <Download size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Bill Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Generate Invoice
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleGenerateBill} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Target User *</label>
                <select 
                  required
                  value={formData.userId} onChange={e => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white text-sm cursor-pointer"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.email}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Amount *</label>
                  <input 
                    type="number" step="0.01" required
                    value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Currency</label>
                  <select 
                    value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white text-sm cursor-pointer"
                  >
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description (Optional)</label>
                <input 
                  type="text"
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white text-sm"
                  placeholder="e.g. Enterprise SLA - Oct 2026"
                />
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving || !formData.userId || !formData.amount}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSaving && <Loader2 size={16} className="animate-spin" />}
                  Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
