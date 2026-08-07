"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
    <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50">
      {/* Left Column — Login Form */}
      <div className="flex flex-col items-center justify-center p-6 lg:p-12 bg-white w-full h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
        <div className="w-full max-w-sm flex flex-col gap-8">
          
          <div className="flex flex-col gap-2">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2-9 5 18 3-11h6"/></svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-sm text-slate-500 font-medium">Sign in to your SecureVision enterprise account.</p>
          </div>

          <button className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Or continue with email</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleLogin}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-shadow"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700" htmlFor="password">Password</label>
                <a href="#" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Forgot Password?</a>
              </div>
              <input
                id="password"
                type="password"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-shadow"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-200 border border-indigo-600 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 font-medium">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
              Request Access
            </Link>
          </p>
        </div>
      </div>

      {/* Right Column — Dark Branding / Quote */}
      <div className="hidden lg:flex items-center justify-center relative bg-slate-900 w-full h-full overflow-hidden">
        <Image
          src="/auth-banner.png"
          alt="SecureVision Dashboard"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-indigo-900/30 mix-blend-multiply z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent z-10"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-12 lg:p-16 z-20 text-white">
          <div className="max-w-xl">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-6 leading-snug tracking-tight text-white">
              &quot;SecureVision reduced our unauthorized access incidents by 94% in the first quarter.&quot;
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
                AM
              </div>
              <div>
                <p className="text-white font-bold text-sm">Alex Mercer</p>
                <p className="text-indigo-200 font-medium text-xs mt-0.5">Head of Physical Security at TechCorp</p>
              </div>
            </div>
          </div>
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
