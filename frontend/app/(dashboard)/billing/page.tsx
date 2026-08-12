"use client";

import React, { useState, useEffect } from 'react';
import { PageWrapper } from "@/components/ui/PageWrapper";
import { CreditCard, CheckCircle2, Building, Zap, Shield, Loader2, Landmark } from 'lucide-react';
import { Button } from "@/components/ui/Button";

type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  isPopular: boolean;
};

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutTab, setCheckoutTab] = useState<'card' | 'manual'>('card');
  
  // Manual Payment State
  const [manualInstructions, setManualInstructions] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchManualInstructions();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans');
      if (res.ok) {
        setPlans(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchManualInstructions = async () => {
    try {
      const res = await fetch('/api/gateways/manual');
      if (res.ok) {
        const data = await res.json();
        setManualInstructions(data.instructions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubscribe = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowCheckout(true);
    setCheckoutTab('card');
    setTransactionId('');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !transactionId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/billing/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          transactionId
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Payment submitted for review!', 'success');
        setShowCheckout(false);
      } else {
        throw new Error(data.error || 'Failed to submit payment');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlanIcon = (name: string) => {
    if (name.toLowerCase().includes('enterprise')) return <Building size={24} className="text-indigo-600" />;
    if (name.toLowerCase().includes('pro')) return <Zap size={24} className="text-amber-500" />;
    return <Shield size={24} className="text-emerald-500" />;
  };

  return (
    <PageWrapper 
      title="Billing & Subscription" 
      subtitle="Manage your subscription plan, view invoices, and upgrade your account."
    >
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 size={32} className="animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`relative bg-white dark:bg-slate-900 rounded-[24px] border ${plan.isPopular ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.02]' : 'border-slate-200 dark:border-slate-800 shadow-sm'} p-6 sm:p-8 flex flex-col transition-all duration-300 hover:shadow-xl`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-md">
                  Most Popular
                </div>
              )}
              
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-sm">
                  {getPlanIcon(plan.name)}
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 min-h-[40px]">{plan.description}</p>
              
              <div className="mt-6 mb-8">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">${plan.price}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium mb-1">/mo</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600 dark:text-slate-300 text-sm">{feat}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                onClick={() => handleSubscribe(plan)}
                className={`w-full py-6 text-base font-bold rounded-xl ${plan.isPopular ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white'}`}
              >
                {plan.price === 0 ? 'Current Plan' : 'Subscribe Now'}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Hybrid Checkout Modal */}
      {showCheckout && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Checkout</h3>
                <p className="text-sm text-slate-500">You are subscribing to the <strong className="text-indigo-600 dark:text-indigo-400">{selectedPlan.name} Plan</strong></p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">${selectedPlan.price}</div>
                <div className="text-xs text-slate-500">per month</div>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 w-full shrink-0">
              <button 
                className={`flex-1 py-4 flex items-center justify-center gap-2 font-semibold text-sm transition-colors relative ${checkoutTab === 'card' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                onClick={() => setCheckoutTab('card')}
              >
                <CreditCard size={18} />
                Credit Card
                {checkoutTab === 'card' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
              </button>
              
              {manualInstructions && (
                <button 
                  className={`flex-1 py-4 flex items-center justify-center gap-2 font-semibold text-sm transition-colors relative ${checkoutTab === 'manual' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  onClick={() => setCheckoutTab('manual')}
                >
                  <Landmark size={18} />
                  Manual Transfer
                  {checkoutTab === 'manual' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
              {checkoutTab === 'card' ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                  <CreditCard size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Card Payments coming soon</p>
                  <p className="text-sm text-center max-w-xs">Stripe integration is currently in development. Please use Manual Transfer for now.</p>
                </div>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-6">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                    <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
                      <Landmark size={16} /> Payment Instructions
                    </h4>
                    <p className="text-sm text-indigo-700 dark:text-indigo-200 whitespace-pre-wrap">{manualInstructions}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Transaction ID / Reference</label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. 8A7B6C5D4E"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono"
                    />
                    <p className="text-xs text-slate-500 mt-2">Enter the Transaction ID provided by your bank or mobile banking app after completing the transfer.</p>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <Button type="button" variant="outline" className="flex-1 py-6" onClick={() => setShowCheckout(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1 py-6" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 size={18} className="animate-spin mr-2" /> : <CheckCircle2 size={18} className="mr-2" />}
                      Submit Payment
                    </Button>
                  </div>
                </form>
              )}
            </div>
            
            {checkoutTab === 'card' && (
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCheckout(false)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-bold text-white animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </PageWrapper>
  );
}
