"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

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
    <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Column — Login Form */}
      <div className="flex flex-col items-center justify-center p-8 bg-white w-full h-full">
        <div className="w-full max-w-md">
          <div style={{ marginBottom: '32px' }}>
            <div className="brand-icon" style={{ marginBottom: '24px', width: '48px', height: '48px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2-9 5 18 3-11h6"/></svg>
            </div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your SecureVision enterprise account.</p>
          </div>

          <button className="btn-social">
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div className="auth-divider">
            <span className="auth-divider-text">OR CONTINUE WITH EMAIL</span>
          </div>

          <form className="upload-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="password">Password</label>
                <a href="#" style={{ color: 'var(--accent-indigo)', fontSize: '13px', textDecoration: 'none' }}>Forgot Password?</a>
              </div>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary btn-block"
              style={{ marginTop: '8px', minHeight: '40px' }}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: 'var(--accent-indigo)', fontWeight: 600, textDecoration: 'none' }}>
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
          className="auth-banner-img"
          style={{ objectFit: 'cover' }}
        />
        <div className="auth-banner-overlay"></div>
        <div className="auth-banner-content">
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>
            &quot;SecureVision reduced our unauthorized access incidents by 94% in the first quarter.&quot;
          </h2>
          <p style={{ opacity: 0.8, fontSize: '15px' }}>
            — Alex Mercer, Head of Physical Security at TechCorp
          </p>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
