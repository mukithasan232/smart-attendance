"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, Building2, CheckCircle2, XCircle, MoreVertical, Edit2, Trash2, Loader2, X } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthContext';
import { createPortal } from 'react-dom';

// --- Types ---
type ClientData = {
  id: string;
  name: string;
  subdomain: string;
  plan: string;
  status: string;
  users: number;
  adminEmail: string | null;
  joinedAt: string;
};

// --- Portal-based Action Menu ---
function ActionMenu({ 
  onEdit, 
  onDelete 
}: { 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    document.addEventListener('click', close);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, { passive: true });
    return () => {
      document.removeEventListener('click', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close);
    };
  }, [isOpen]);

  return (
    <>
      <button 
        ref={buttonRef}
        onClick={toggleMenu}
        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <MoreVertical size={18} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="absolute z-[9999] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 w-36 overflow-hidden py-1 animate-in fade-in zoom-in duration-100"
          style={{ 
            top: coords.top + 4, 
            left: coords.left - 136 + coords.width // Align right
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => { setIsOpen(false); onEdit(); }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
          >
            <Edit2 size={14} /> Edit
          </button>
          <button 
            onClick={() => { setIsOpen(false); onDelete(); }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

// --- Page Component ---
export default function ClientsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('All Plans');
  const [statusFilter, setStatusFilter] = useState('All Status');

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({ name: '', subdomain: '', adminEmail: '', plan: 'Starter', status: 'Active' });

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      } else {
        throw new Error('Failed to fetch');
      }
    } catch (error) {
      console.error(error);
      showToast('Error loading clients', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.subdomain.trim()) return;

    setIsSaving(true);
    try {
      const isEdit = !!editingClient;
      const url = isEdit ? `/api/admin/clients/${editingClient.id}` : '/api/admin/clients';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save');
      }

      showToast(`Client ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
      setShowAddModal(false);
      setEditingClient(null);
      setFormData({ name: '', subdomain: '', adminEmail: '', plan: 'Starter', status: 'Active' });
      fetchClients();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${deletingClient.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      
      showToast('Client deleted.', 'success');
      setDeletingClient(null);
      fetchClients();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModal = () => {
    setFormData({ name: '', subdomain: '', adminEmail: '', plan: 'Starter', status: 'Active' });
    setShowAddModal(true);
  };

  const openEditModal = (client: ClientData) => {
    setFormData({ 
      name: client.name, 
      subdomain: client.subdomain,
      adminEmail: client.adminEmail || '',
      plan: client.plan, 
      status: client.status 
    });
    setEditingClient(client);
  };

  const filteredClients = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.subdomain.toLowerCase().includes(q);
    const matchPlan = planFilter === 'All Plans' || c.plan === planFilter;
    const matchStatus = statusFilter === 'All Status' || c.status === statusFilter;
    return matchSearch && matchPlan && matchStatus;
  });

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
            <Building2 className="text-indigo-600 dark:text-indigo-400" size={28} />
            Tenant Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage all organizations using the SaaS platform.
          </p>
        </div>
        {isAdmin && (
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2 shadow-md">
            <Plus size={18} /> Add New Client
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search clients by name or subdomain..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all"
          />
        </div>
        <select 
          value={planFilter} onChange={e => setPlanFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
        >
          <option>All Plans</option>
          <option>Enterprise</option>
          <option>Pro</option>
          <option>Starter</option>
        </select>
        <select 
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
        >
          <option>All Status</option>
          <option>Active</option>
          <option>Suspended</option>
        </select>
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col w-full overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20 text-indigo-600">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p className="text-slate-500 font-medium text-sm">Loading clients...</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Subdomain</th>
                  <th>Current Plan</th>
                  <th>Total Users</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  {isAdmin && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="text-center py-16 text-slate-500">
                      No clients found.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr key={client.id} className="table-row border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 shadow-inner">
                            {client.name.substring(0, 2)}
                          </div>
                          <div className="flex flex-col">
                            <span className="truncate max-w-[150px] md:max-w-[250px]">{client.name}</span>
                            {client.adminEmail && (
                              <span className="text-[10px] text-slate-400 font-normal">{client.adminEmail}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-500 dark:text-slate-400 font-mono text-xs">
                        {client.subdomain}.codernest.cloud
                      </td>
                      <td>
                        <span className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          {client.plan}
                        </span>
                      </td>
                      <td className="font-medium tabular-nums text-slate-700 dark:text-slate-300">
                        {client.users.toLocaleString()}
                      </td>
                      <td>
                        {client.status === 'Active' ? (
                          <span className="badge badge-green flex w-fit items-center gap-1 shadow-sm">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="badge badge-red flex w-fit items-center gap-1 shadow-sm">
                            <XCircle size={12} /> Suspended
                          </span>
                        )}
                      </td>
                      <td className="text-slate-500 dark:text-slate-400 text-sm">
                        {new Date(client.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      {isAdmin && (
                        <td className="text-right relative">
                          <ActionMenu 
                            onEdit={() => openEditModal(client)}
                            onDelete={() => setDeletingClient(client)}
                          />
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      
      {/* Add / Edit Modal */}
      {(showAddModal || editingClient) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); setEditingClient(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveClient} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Company Name *</label>
                <input 
                  type="text" required
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white text-sm transition-shadow"
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Admin Email</label>
                <input 
                  type="email"
                  value={formData.adminEmail} onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white text-sm transition-shadow"
                  placeholder="admin@acmecorp.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Subdomain *</label>
                <div className="flex">
                  <input 
                    type="text" required
                    value={formData.subdomain} onChange={e => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full px-4 py-2.5 rounded-l-xl border border-slate-200 dark:border-slate-700 border-r-0 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white text-sm transition-shadow"
                    placeholder="acme"
                  />
                  <span className="inline-flex items-center px-4 rounded-r-xl border border-slate-200 dark:border-slate-700 border-l-0 bg-slate-100 dark:bg-slate-800/50 text-slate-500 text-sm">
                    .codernest.cloud
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Plan</label>
                  <select 
                    value={formData.plan} onChange={e => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white text-sm cursor-pointer"
                  >
                    <option>Starter</option>
                    <option>Pro</option>
                    <option>Enterprise</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white text-sm cursor-pointer"
                  >
                    <option>Active</option>
                    <option>Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => { setShowAddModal(false); setEditingClient(null); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving || !formData.name || !formData.subdomain}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSaving && <Loader2 size={16} className="animate-spin" />}
                  {editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingClient && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <Trash2 size={28} className="text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Client</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Are you sure you want to delete <strong>{deletingClient.name}</strong>? This action cannot be undone and will remove all associated data.
            </p>
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setDeletingClient(null)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteClient}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-70"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
