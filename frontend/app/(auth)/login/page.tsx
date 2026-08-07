"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setToast({ message: 'Please fill in all fields.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      if (email === 'admin@codernest.cloud') {
        document.cookie = "auth-token=secure-token-123; path=/; max-age=86400";
        setToast({ message: 'Login successful! Redirecting...', type: 'success' });
        window.location.href = '/';
      } else {
        setToast({ message: 'Invalid credentials. Please try again.', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Error logging in.', type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-end justify-center pb-20 relative bg-[url('/auth-banner.png')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-slate-950/40 z-0"></div>

      <div className="relative z-10 w-full max-w-[400px] p-8 rounded-2xl bg-slate-900/40 backdrop-blur-lg border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
        
        <h1 className="text-2xl font-semibold text-white text-center mb-1">Welcome back.</h1>
        <p className="text-xs text-slate-300 text-center mb-8">Securing Your Digital Enterprise.</p>

        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
          
          <input
            id="email"
            type="email"
            className="w-full px-4 py-3 bg-slate-950/50 border border-emerald-500/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 transition-all text-sm"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-3 bg-slate-950/50 border border-emerald-500/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 transition-all text-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="text-right mt-1">
              <a href="#" className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors">Forgot Password?</a>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 mt-4 bg-indigo-900/60 border border-indigo-500/50 hover:bg-indigo-800/80 hover:border-indigo-400 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Log In'}
          </button>
        </form>

        <div className="text-right mt-4">
          <p className="text-[11px] text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-bold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
