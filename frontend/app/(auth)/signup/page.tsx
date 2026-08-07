"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !orgName) {
      setToast({ message: 'Please fill in all fields.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setIsLoading(true);
    // Placeholder API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setToast({ message: 'Account created successfully! Redirecting...', type: 'success' });
      // Here we would handle actual redirection: router.push('/pricing') or router.push('/dashboard')
    } catch (err) {
      setToast({ message: 'An error occurred. Please try again.', type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="auth-layout">
      {/* Left Form Section */}
      <div className="auth-form-section">
        <div style={{ marginBottom: '32px' }}>
          <div className="brand-icon" style={{ marginBottom: '24px', width: '48px', height: '48px' }}>
            {/* SVG Logo Placeholder */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2-9 5 18 3-11h6"/></svg>
          </div>
          <h1 className="auth-title">Create an account</h1>
          <p className="auth-subtitle">Start your 3-month free trial today. No credit card required.</p>
        </div>

        <button className="btn-social">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign up with Google
        </button>

        <div className="auth-divider">
          <span className="auth-divider-text">OR CONTINUE WITH EMAIL</span>
        </div>

        <form className="upload-form" onSubmit={handleSignup}>
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">Full Name</label>
            <input 
              id="fullName"
              type="text" 
              className="form-input" 
              placeholder="John Doe" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Work Email</label>
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
            <label className="form-label" htmlFor="orgName">Organization / Home Name</label>
            <input 
              id="orgName"
              type="text" 
              className="form-input" 
              placeholder="Acme Corp" 
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              className="form-input" 
              placeholder="Create a strong password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary btn-block" 
            style={{ marginTop: '16px', minHeight: '40px' }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-secondary" style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent-indigo)', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
          </Link>
        </p>
        
        <p className="text-center text-xs mt-4" style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
          By clicking &quot;Create Account&quot;, you agree to our <a href="#" style={{ color: 'inherit', textDecoration: 'underline' }}>Terms of Service</a> and <a href="#" style={{ color: 'inherit', textDecoration: 'underline' }}>Privacy Policy</a>.
        </p>
      </div>

      {/* Right Banner Section */}
      <div className="auth-banner-section">
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
            Join 500+ enterprises securing their premises with SecureVision.
          </h2>
          <p style={{ opacity: 0.8, fontSize: '15px' }}>
            Advanced RTSP monitoring, instant telegram alerts, and unlimited known persons recognition.
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
