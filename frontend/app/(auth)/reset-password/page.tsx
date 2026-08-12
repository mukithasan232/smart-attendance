'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setMessage({ type: 'success', text: 'Password has been successfully reset. Redirecting...' });
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="text-center p-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/50">
        <h3 className="font-semibold text-lg">Invalid Reset Link</h3>
        <p className="mt-2 text-sm">This password reset link is invalid or missing required parameters.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Set New Password
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter your new password below.
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        {message && (
          <div className={`p-4 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'}`}>
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full justify-center rounded-md bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Suspense fallback={<div className="animate-pulse w-full max-w-md h-96 bg-zinc-100 dark:bg-zinc-900 rounded-2xl"></div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
