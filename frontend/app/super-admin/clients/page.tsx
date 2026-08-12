"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Users as UsersIcon, CheckCircle2, XCircle, MoreVertical, Edit2, Trash2, Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthContext';
import { createPortal } from 'react-dom';

type UserData = {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
};

// --- Portal-based Action Menu ---
function ActionMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void; }) {
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
      <button ref={buttonRef} onClick={toggleMenu} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors">
        <MoreVertical size={18} />
      </button>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="absolute z-[9999] bg-white rounded-lg shadow-xl border border-slate-100 w-36 overflow-hidden py-1"
          style={{ top: coords.top + 4, left: coords.left - 136 + coords.width }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => { setIsOpen(false); onEdit(); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2">
            <Edit2 size={14} /> Assign Plan
          </button>
          <button onClick={() => { setIsOpen(false); onDelete(); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
            <Trash2 size={14} /> Delete
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

export default function UsersManagementPage() {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        // Filter only USER roles
        setUsers(data.filter((u: UserData) => u.role === 'USER'));
      } else {
        throw new Error('Failed to fetch');
      }
    } catch (error) {
      console.error(error);
      showToast('Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('User deleted successfully', 'success');
        fetchUsers();
      } else {
        throw new Error('Deletion failed');
      }
    } catch (err) {
      showToast('Failed to delete user', 'error');
    }
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  if (!role || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
    return null;
  }

  return (
    <div className="p-8 pb-20 max-w-7xl mx-auto fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <UsersIcon className="text-indigo-600" size={32} />
            User / Client Management
          </h1>
          <p className="text-slate-500 mt-2">Manage standard users, assign plans, and monitor activity.</p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-8 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search users by email..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-sm text-slate-500 font-medium">
          Total Users: <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{filteredUsers.length}</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative min-h-[400px]">
        {loading ? (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-600 font-medium animate-pulse">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-slate-500">
            <UsersIcon size={48} className="text-slate-300 mb-4" />
            <p className="text-lg font-medium">No records found. Click here to add one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                  <th className="p-5 pl-6 rounded-tl-2xl">User Email</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Joined Date</th>
                  <th className="p-5 text-right pr-6 rounded-tr-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="p-5 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{user.email}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {user.id.slice(0,8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        {user.isVerified ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/50">
                            <CheckCircle2 size={14} /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
                            <XCircle size={14} /> Unverified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-5 text-sm text-slate-600 font-medium">
                      {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="p-5 text-right pr-6">
                      <ActionMenu 
                        onEdit={() => showToast('Plan assignment UI placeholder', 'success')} 
                        onDelete={() => handleDelete(user.id)} 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-white animate-in slide-in-from-bottom-5 z-[9999] ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <span className="font-semibold">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
