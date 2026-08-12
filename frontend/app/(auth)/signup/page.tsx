"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useBranding } from '@/components/providers/BrandingContext';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { branding } = useBranding();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !orgName) {
      setToast({ message: 'Please fill in all fields.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Call our API to create user in Supabase (Admin) and Prisma
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, orgName })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      setToast({ message: 'Account created! Logging you in...', type: 'success' });
      
      // 2. Auto-login using Supabase client to set session dynamically
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error('Account created, but auto-login failed. Please sign in manually.');
      }

      // 3. Redirect to dashboard dynamically
      window.location.href = window.location.origin + '/dashboard';
      
    } catch (err: any) {
      setToast({ message: err.message || 'An error occurred. Please try again.', type: 'error' });
      setIsLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950">
      
      {/* Left Column: Form Section */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-24 relative z-10 bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto">
        <div className="w-full max-w-sm flex flex-col gap-6 py-6 lg:py-0">
          
          <div className="flex flex-col gap-2 text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Create an account</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Start your 3-month free trial today. No credit card required.</p>
          </div>

          <button className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </button>

          <div className="relative flex items-center my-2">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Or continue with email</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSignup}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300" htmlFor="fullName">Full Name</label>
              <input 
                id="fullName"
                type="text" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-shadow" 
                placeholder="John Doe" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300" htmlFor="email">Work Email</label>
              <input 
                id="email"
                type="email" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-shadow" 
                placeholder="you@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300" htmlFor="orgName">Organization / Home Name</label>
              <input 
                id="orgName"
                type="text" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-shadow" 
                placeholder="Acme Corp" 
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300" htmlFor="password">Password</label>
              <div className="relative">
                <input 
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-2.5 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-shadow" 
                  placeholder="Create a strong password" 
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
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-indigo)' }}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline transition-colors">
                Sign In
              </Link>
            </p>
            <p className="text-xs text-slate-400 mt-3">
              By clicking &quot;Create Account&quot;, you agree to our <a href="#" className="underline hover:text-slate-600 dark:hover:text-slate-300">Terms of Service</a> and <a href="#" className="underline hover:text-slate-600 dark:hover:text-slate-300">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Branding & Image */}
      <div className="hidden md:flex md:w-1/2 relative bg-[url('/auth-bg-new.png')] bg-cover bg-center items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-indigo-900/40 mix-blend-multiply z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent z-10"></div>
        
        <div className="relative z-20 flex flex-col items-center justify-center text-center">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="h-20 mb-6 object-contain" />
          ) : (
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl mb-6 shadow-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-indigo)' }}>
              <span className="text-white text-3xl font-black">{branding.appName.charAt(0)}</span>
            </div>
          )}
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">{branding.appName}</h2>
          <p className="text-lg lg:text-xl text-white/90 font-medium max-w-md">
            Join 500+ enterprises securing their premises with {branding.appName}.
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
