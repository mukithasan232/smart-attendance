"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Loader2, CheckCircle2, XCircle, Trash2, Mail, Key } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthContext';

type AdminData = {
  id: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  isVerified: boolean;
  createdAt: string;
};

export default function TeamManagementPage() {
  const { role, user } = useAuth();
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', role: 'ADMIN' });

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/team');
      if (res.ok) {
        setAdmins(await res.json());
      } else {
        throw new Error('Failed to fetch team');
      }
    } catch (error) {
      console.error(error);
      showToast('Error loading team members', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.email || !newAdmin.password) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create admin');
      
      showToast('Admin created successfully', 'success');
      setShowAddModal(false);
      setNewAdmin({ email: '', password: '', role: 'ADMIN' });
      fetchAdmins();
    } catch (err: any) {
      showToast(err.message || 'Error creating admin', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, adminRole: string) => {
    if (adminRole === 'SUPER_ADMIN') {
      showToast('Cannot delete a SUPER_ADMIN from this UI.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to remove this admin?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Admin removed', 'success');
        fetchAdmins();
      } else {
        throw new Error('Deletion failed');
      }
    } catch (err) {
      showToast('Failed to delete admin', 'error');
    }
  };

  if (!role || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
    return null;
  }

  const isSuperAdmin = role === 'SUPER_ADMIN';

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="text-indigo-600" size={32} />
            Admin Team Management
          </h1>
          <p className="text-slate-500 mt-2">Manage administrators and their access levels.</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add New Admin
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative min-h-[300px]">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          </div>
        ) : admins.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Shield size={48} className="text-slate-300 mb-4" />
            <p className="text-lg font-medium">No records found. Click here to add one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-semibold uppercase">
                  <th className="p-5 pl-6">Admin</th>
                  <th className="p-5">Role</th>
                  <th className="p-5">Joined</th>
                  {isSuperAdmin && <th className="p-5 text-right pr-6">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map(admin => (
                  <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 pl-6 font-semibold text-slate-900">{admin.email}</td>
                    <td className="p-5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        admin.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="p-5 text-sm text-slate-600">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    {isSuperAdmin && (
                      <td className="p-5 text-right pr-6">
                        {admin.id !== user?.id && admin.role !== 'SUPER_ADMIN' && (
                          <button onClick={() => handleDelete(admin.id, admin.role)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200 fade-in">
            <h3 className="text-xl font-bold mb-4 text-slate-900">Add New Admin</h3>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input type="email" required className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input type="password" required className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})}>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary" disabled={isSaving}>Cancel</button>
                <button type="submit" className="flex-1 btn-primary flex justify-center items-center gap-2" disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-white z-[9999] ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <span className="font-semibold">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
