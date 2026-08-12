"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Edit2, Plus, Check, Loader2, XCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthContext';

type PlanData = {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  isPopular: boolean;
};

export default function PlansPage() {
  const { role } = useAuth();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    features: [''],
    isPopular: false
  });

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      } else {
        throw new Error('Failed to fetch plans');
      }
    } catch (error) {
      console.error(error);
      showToast('Error loading plans', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openCreateModal = () => {
    setEditingPlanId(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      features: [''],
      isPopular: false
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plan: PlanData) => {
    setEditingPlanId(plan.id);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      features: plan.features.length ? plan.features : [''],
      isPopular: plan.isPopular
    });
    setIsModalOpen(true);
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const removeFeature = (index: number) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures.length ? newFeatures : [''] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up empty features
    const cleanedFeatures = formData.features.filter(f => f.trim() !== '');

    setIsSubmitting(true);
    try {
      const url = editingPlanId ? `/api/admin/plans/${editingPlanId}` : '/api/admin/plans';
      const method = editingPlanId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, features: cleanedFeatures })
      });

      if (res.ok) {
        showToast(`Plan ${editingPlanId ? 'updated' : 'created'} successfully`, 'success');
        setIsModalOpen(false);
        fetchPlans();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save plan');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Plan deleted successfully', 'success');
        fetchPlans();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete plan');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (!role || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-6 lg:gap-8 fade-in relative">
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
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Create New Plan
        </button>
      </div>

      {/* Pricing Grid */}
      <div className="relative min-h-[400px]">
        {loading ? (
          <div className="absolute inset-0 bg-slate-50/50 dark:bg-transparent backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium animate-pulse">Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-96 text-slate-500 bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700">
             <CreditCard size={48} className="text-slate-300 mb-4" />
             <p className="text-lg font-medium">No plans found. Create one to get started!</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.id} className={`bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm flex flex-col gap-6 relative group ${plan.isPopular ? 'border-2 border-indigo-500 dark:border-indigo-500' : 'border border-slate-100 dark:border-slate-700'}`}>
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-500 text-white text-[10px] uppercase font-bold tracking-wider rounded-full">
                    Most Popular
                  </div>
                )}
                
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(plan.id)} className="text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Delete Plan">
                      <Trash2 size={16} />
                    </button>
                    <button onClick={() => openEditModal(plan)} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Edit Plan">
                      <Edit2 size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">৳{plan.price.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium mb-1">/ month</span>
                </div>
                
                <div className="flex flex-col gap-3 flex-1 mt-2">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                <button onClick={() => openEditModal(plan)} className={`w-full py-2.5 mt-4 rounded-xl font-bold transition-colors ${plan.isPopular ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  Edit Details
                </button>
              </div>
            ))}
          </div>
        )}
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

      {/* Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg my-8 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="text-indigo-600 dark:text-indigo-400" size={24} />
                {editingPlanId ? 'Edit Plan' : 'Create New Plan'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full p-1 border border-slate-200 dark:border-slate-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Plan Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Enterprise"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <input 
                  type="text" 
                  placeholder="e.g., For growing businesses"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Monthly Price (BDT)</label>
                <input 
                  type="number" 
                  min="0"
                  step="1"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                    checked={formData.isPopular}
                    onChange={e => setFormData({...formData, isPopular: e.target.checked})}
                  />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">Most Popular Plan</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Highlights this plan with a badge on the pricing grid.</div>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between items-center">
                  <span>Features</span>
                  <button type="button" onClick={addFeature} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1">
                    <Plus size={12} /> Add Feature
                  </button>
                </label>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 pb-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <Check size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                        <input 
                          type="text" 
                          placeholder="e.g., Unlimited Users"
                          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-900 dark:text-white"
                          value={feature}
                          onChange={e => handleFeatureChange(index, e.target.value)}
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeFeature(index)}
                        className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                        title="Remove feature"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 mt-2">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  {isSubmitting ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-white animate-in slide-in-from-bottom-5 z-[99999] ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <span className="font-semibold">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
