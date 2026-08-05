"use client";

import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="page-root">
      <div className="main-content">
        <div className="pricing-header">
          <h1 className="pricing-title">Simple, transparent pricing</h1>
          <p className="pricing-subtitle">
            Enterprise-grade face recognition tailored for your business needs.
          </p>
        </div>

        <div className="pricing-toggle-wrap">
          <span className={`text-sm font-semibold ${!isYearly ? 'text-primary' : 'text-muted'}`}>Monthly</span>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={isYearly} 
              onChange={() => setIsYearly(!isYearly)} 
            />
            <span className="toggle-slider"></span>
          </label>
          <span className={`text-sm font-semibold flex items-center gap-2 ${isYearly ? 'text-primary' : 'text-muted'}`}>
            Yearly <span className="badge badge-green">Save 20%</span>
          </span>
        </div>

        <div className="pricing-grid">
          {/* Starter Plan */}
          <div className="pricing-card">
            <h3 className="pricing-tier">Starter</h3>
            <div className="pricing-price">
              <span className="pricing-currency">৳</span>0
              <span className="pricing-period">/mo</span>
            </div>
            <p className="pricing-desc">For early birds. 3 months free to get started with basic features.</p>
            
            <ul className="pricing-features">
              <li><CheckCircle2 size={20} className="lucide" /> Up to 50 Known Persons</li>
              <li><CheckCircle2 size={20} className="lucide" /> Basic Analytics</li>
              <li><CheckCircle2 size={20} className="lucide" /> 1 Camera Support</li>
              <li><CheckCircle2 size={20} className="lucide" /> Community Support</li>
              <li className="opacity-50"><X size={20} className="text-red-500 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-red)' }} /> 24/7 RTSP Monitoring</li>
            </ul>
            
            <Link href="/signup" className="btn-secondary btn-block mt-auto" style={{ textDecoration: 'none' }}>
              Start Free Trial
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="pricing-card popular">
            <div className="popular-badge">Most Popular</div>
            <h3 className="pricing-tier">Pro</h3>
            <div className="pricing-price">
              <span className="pricing-currency">৳</span>{isYearly ? '800' : '1,000'}
              <span className="pricing-period">/mo</span>
            </div>
            <p className="pricing-desc">The core plan for growing businesses requiring continuous monitoring.</p>
            
            <ul className="pricing-features">
              <li><CheckCircle2 size={20} className="lucide" /> Unlimited Known Persons</li>
              <li><CheckCircle2 size={20} className="lucide" /> 24/7 RTSP Monitoring</li>
              <li><CheckCircle2 size={20} className="lucide" /> Telegram Alerts integration</li>
              <li><CheckCircle2 size={20} className="lucide" /> Advanced Cloud Dashboard</li>
              <li><CheckCircle2 size={20} className="lucide" /> Priority Email Support</li>
            </ul>
            
            <Link href="/signup" className="btn-primary btn-block mt-auto" style={{ textDecoration: 'none' }}>
              Get Started
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="pricing-card">
            <h3 className="pricing-tier">Enterprise</h3>
            <div className="pricing-price">
              <span className="pricing-currency">৳</span>5,000
              <span className="pricing-period">setup</span>
            </div>
            <p className="pricing-desc">Full on-premise hardware setup and custom multi-camera integration.</p>
            
            <ul className="pricing-features">
              <li><CheckCircle2 size={20} className="lucide" /> Everything in Pro</li>
              <li><CheckCircle2 size={20} className="lucide" /> Custom Hardware Setup</li>
              <li><CheckCircle2 size={20} className="lucide" /> Unlimited Camera Support</li>
              <li><CheckCircle2 size={20} className="lucide" /> Dedicated Account Manager</li>
              <li><CheckCircle2 size={20} className="lucide" /> 24/7 Phone Support</li>
            </ul>
            
            <button className="btn-secondary btn-block mt-auto">
              Contact Sales
            </button>
          </div>
        </div>

        <div className="pricing-faq">
          <h3 className="card-title text-center" style={{ fontSize: '24px' }}>Frequently Asked Questions</h3>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>What happens after my 3-month free trial?</h4>
              <p>Your account will be paused until you upgrade to the Pro plan. We will notify you 7 days before your trial expires so you can make a decision without any sudden interruptions.</p>
            </div>
            <div className="faq-item">
              <h4>Can I change my plan later?</h4>
              <p>Yes, you can upgrade, downgrade, or cancel your subscription at any time directly from your billing dashboard. Changes take effect on the next billing cycle.</p>
            </div>
            <div className="faq-item">
              <h4>Do you support custom RTSP streams?</h4>
              <p>Absolutely. Our Pro and Enterprise plans allow you to connect any standard RTSP camera stream directly into our monitoring platform for real-time analysis.</p>
            </div>
            <div className="faq-item">
              <h4>What kind of hardware do I need for Enterprise?</h4>
              <p>We provide the necessary edge-computing devices for the Enterprise setup, ensuring low-latency processing on-site. Contact our sales team for detailed specifications.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
