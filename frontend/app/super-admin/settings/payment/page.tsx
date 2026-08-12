"use client";

import React, { useState } from 'react';
import { CreditCard, Wallet, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function PaymentSettingsPage() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Stripe State
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showStripeWebhook, setShowStripeWebhook] = useState(false);
  
  // SSLCommerz State
  const [sslEnabled, setSslEnabled] = useState(false);
  const [showSslSecret, setShowSslSecret] = useState(false);

  const handleSaveSettings = (gateway: string) => (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Implement API call to save credentials
    // Example: await api.post('/api/super-admin/settings/payment', { gateway, credentials });
    // This will securely store the keys in the Super Admin database or secure vault.
    
    setToast({ message: `${gateway} settings saved securely.`, type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="w-full flex flex-col gap-6 lg:gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <CreditCard className="text-indigo-600 dark:text-indigo-400" size={28} />
          Payment Gateways
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Configure and manage active payment methods for tenant subscriptions.
        </p>
      </div>

      {/* Gateway Configuration Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Stripe Configuration Card */}
        <form 
          onSubmit={handleSaveSettings('Stripe')}
          className="bg-white dark:bg-slate-800 rounded-[20px] p-6 lg:p-8 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full"
        >
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CreditCard size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Stripe</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Global credit card processing</p>
              </div>
            </div>
            
            {/* Toggle Switch */}
            <label className="toggle-switch cursor-pointer flex items-center">
              <input 
                type="checkbox" 
                className="hidden"
                checked={stripeEnabled} 
                onChange={() => setStripeEnabled(!stripeEnabled)} 
              />
              <div className={`w-12 h-6 rounded-full transition-colors relative ${stripeEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${stripeEnabled ? 'left-7' : 'left-1'}`} />
              </div>
            </label>
          </div>

          <div className="flex flex-col gap-5 flex-1 opacity-100 transition-opacity" style={{ opacity: stripeEnabled ? 1 : 0.5, pointerEvents: stripeEnabled ? 'auto' : 'none' }}>
            
            {/* Publishable Key */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Publishable Key</label>
              <input 
                type="text" 
                placeholder="pk_test_..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white transition-shadow"
              />
            </div>

            {/* Secret Key */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Secret Key</label>
              <div className="relative">
                <input 
                  type={showStripeSecret ? "text" : "password"} 
                  placeholder="sk_test_..."
                  className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white transition-shadow"
                />
                <button 
                  type="button"
                  onClick={() => setShowStripeSecret(!showStripeSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showStripeSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Webhook Secret */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Webhook Secret</label>
              <div className="relative">
                <input 
                  type={showStripeWebhook ? "text" : "password"} 
                  placeholder="whsec_..."
                  className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white transition-shadow"
                />
                <button 
                  type="button"
                  onClick={() => setShowStripeWebhook(!showStripeWebhook)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showStripeWebhook ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={!stripeEnabled}
            className="w-full mt-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Stripe Settings
          </button>
        </form>


        {/* SSLCommerz Card */}
        <form 
          onSubmit={handleSaveSettings('SSLCommerz')}
          className="bg-white dark:bg-slate-800 rounded-[20px] p-6 lg:p-8 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full"
        >
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Wallet size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">SSLCommerz</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Local gateway for Bangladesh</p>
              </div>
            </div>
            
            {/* Toggle Switch */}
            <label className="toggle-switch cursor-pointer flex items-center">
              <input 
                type="checkbox" 
                className="hidden"
                checked={sslEnabled} 
                onChange={() => setSslEnabled(!sslEnabled)} 
              />
              <div className={`w-12 h-6 rounded-full transition-colors relative ${sslEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${sslEnabled ? 'left-7' : 'left-1'}`} />
              </div>
            </label>
          </div>

          <div className="flex flex-col gap-5 flex-1 transition-opacity" style={{ opacity: sslEnabled ? 1 : 0.5, pointerEvents: sslEnabled ? 'auto' : 'none' }}>
            
            {/* Store ID */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Store ID</label>
              <input 
                type="text" 
                placeholder="Enter store ID"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white transition-shadow"
              />
            </div>

            {/* Store Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Store Password</label>
              <div className="relative">
                <input 
                  type={showSslSecret ? "text" : "password"} 
                  placeholder="Enter store password"
                  className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white transition-shadow"
                />
                <button 
                  type="button"
                  onClick={() => setShowSslSecret(!showSslSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showSslSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Environment */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Environment</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white transition-shadow appearance-none">
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="live">Live (Production)</option>
              </select>
            </div>
          </div>

          <button 
            type="submit"
            disabled={!sslEnabled}
            className="w-full mt-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save SSLCommerz Settings
          </button>
        </form>

      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-bold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
