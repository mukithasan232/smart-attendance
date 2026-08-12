"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useBranding } from '@/components/providers/BrandingContext';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { branding } = useBranding();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verified = searchParams.get('verified');
    const error = searchParams.get('error');
    if (verified === 'true') {
      setToast({ message: 'Email verified successfully! You can now log in.', type: 'success' });
    } else if (error) {
      let msg = 'Failed to verify email.';
      if (error === 'MissingToken') msg = 'Verification token is missing.';
      if (error === 'InvalidToken') msg = 'Verification token is invalid or expired.';
      setToast({ message: msg, type: 'error' });
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setToast({ message: 'Please fill in all fields.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      if (res.ok) {
        setToast({ message: 'Login successful! Redirecting...', type: 'success' });
        const role = data.user?.app_metadata?.role || 'USER';
        
        if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
          window.location.href = '/super-admin/dashboard';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setToast({ message: data.error || 'Invalid credentials. Please try again.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Error logging in.', type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950">
      {/* Left Column: Form */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-24 relative z-10 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="w-full max-w-[420px]">
          
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Welcome back</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Please enter your details to sign in.</p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">Password</label>
                <a href="#" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors">Forgot Password?</a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-indigo)' }}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-8">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline transition-all">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Branding & Image */}
      <div className="hidden md:flex md:w-1/2 relative bg-[url('/auth-bg-new.png')] bg-cover bg-center items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-indigo-900/40 mix-blend-multiply z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent z-0"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="h-20 mb-6 object-contain" />
          ) : (
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl mb-6 shadow-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-indigo)' }}>
              <span className="text-white text-3xl font-black">{branding.appName.charAt(0)}</span>
            </div>
          )}
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">{branding.appName}</h2>
          <p className="text-lg lg:text-xl text-white/90 font-medium max-w-md">
            {branding.tagline}
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-bold text-white animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>}>
      <LoginContent />
    </Suspense>
  );
}
