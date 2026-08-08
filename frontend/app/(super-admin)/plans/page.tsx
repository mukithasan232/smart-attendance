"use client";

import React from 'react';
import { CreditCard, Edit2, Plus, Check } from 'lucide-react';

export default function PlansPage() {
  return (
    <div className="w-full flex flex-col gap-6 lg:gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <CreditCard className="text-indigo-600 dark:text-indigo-400" size={28} />
            Subscription Packages
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Configure pricing tiers and limits for your tenants.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Create New Plan
        </button>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Starter Plan */}
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-6 relative group">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Starter</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">For small teams getting started.</p>
            </div>
            <button className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <Edit2 size={18} />
            </button>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">৳0</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium mb-1">/ month</span>
          </div>
          <div className="flex flex-col gap-3 flex-1 mt-2">
            <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Up to 50 Known Persons</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Basic Analytics</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>1 Camera Support</span>
            </div>
          </div>
          <button className="w-full py-2.5 mt-4 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Edit Details
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border-2 border-indigo-500 dark:border-indigo-500 flex flex-col gap-6 relative group">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-500 text-white text-[10px] uppercase font-bold tracking-wider rounded-full">
            Most Popular
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pro</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">The core plan for growing businesses.</p>
            </div>
            <button className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <Edit2 size={18} />
            </button>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">৳1,000</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium mb-1">/ month</span>
          </div>
          <div className="flex flex-col gap-3 flex-1 mt-2">
            <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Unlimited Known Persons</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>24/7 RTSP Monitoring</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Telegram Alerts integration</span>
            </div>
          </div>
          <button className="w-full py-2.5 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors">
            Edit Details
          </button>
        </div>

        {/* Enterprise Plan */}
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-6 relative group">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Enterprise</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Full hardware & multi-camera setup.</p>
            </div>
            <button className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              <Edit2 size={18} />
            </button>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">৳5,000</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium mb-1">setup fee</span>
          </div>
          <div className="flex flex-col gap-3 flex-1 mt-2">
            <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Everything in Pro</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Custom Hardware Setup</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Unlimited Camera Support</span>
            </div>
          </div>
          <button className="w-full py-2.5 mt-4 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Edit Details
          </button>
        </div>

      </div>

      {/* Global Billing Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col gap-6 mt-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Global Billing Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Free Trial Duration (Days)</label>
            <input type="number" defaultValue={90} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white" />
            <p className="text-xs text-slate-500">How long new tenants can use the Starter plan for free.</p>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Grace Period (Days)</label>
            <input type="number" defaultValue={7} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white" />
            <p className="text-xs text-slate-500">Days to keep account active after failed payment.</p>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 dark:border-slate-700 pt-6">
          <button className="btn-primary">Save Settings</button>
        </div>
      </div>
    </div>
  );
}
