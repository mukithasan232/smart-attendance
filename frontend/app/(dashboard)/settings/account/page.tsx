"use client";

import { useState } from 'react';
import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card } from "@/components/ui/Card";
import { ShieldAlert, User as UserIcon, Lock, Save, Loader2 } from "lucide-react";
import { useAuth } from '@/components/providers/AuthContext';
import { createClient } from '@/utils/supabase/client';

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setToast({ message: "Passwords do not match", type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (password.length < 6) {
      setToast({ message: "Password must be at least 6 characters", type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setToast({ message: 'Password updated successfully!', type: 'success' });
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to update password', type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <PageWrapper title="Account & Security" subtitle="Manage personal profile details, change password, and view assigned subscription plan tier.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        {/* Profile Information */}
        <Card>
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 mb-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-xl flex items-center justify-center">
                <UserIcon size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Profile Information</h3>
                <p className="text-slate-500 text-sm">Your primary account details.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Your email cannot be changed.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                <input
                  type="text"
                  value={user?.app_metadata?.role || 'User'}
                  disabled
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed capitalize"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Security & Password */}
        <Card>
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 mb-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-xl flex items-center justify-center">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Security</h3>
                <p className="text-slate-500 text-sm">Update your password to keep your account secure.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </Card>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-bold text-white animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}
    </PageWrapper>
  );
}
