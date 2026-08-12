"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Plug, Video, CreditCard, Plus, Save, Trash2, CheckCircle, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { getCameras, addCamera, updateCamera, deleteCamera, applyCamera, CameraConfig } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthContext';
import { useRouter } from 'next/navigation';

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label className="toggle-switch" style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <span className="slider round"></span>
    </label>
  );
}

export default function IntegrationsPage() {
  const { role } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'gateways' | 'cameras'>('gateways');
  const [loading, setLoading] = useState(true);

  // Cameras State
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [camSaving, setCamSaving] = useState(false);
  const [showCamModal, setShowCamModal] = useState(false);
  const [newCamForm, setNewCamForm] = useState<Omit<CameraConfig, 'id'>>({ name: '', url: '', location: '', enabled: true });

  // Gateways State
  const [gateways, setGateways] = useState<any[]>([]);
  const [gateSaving, setGateSaving] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const [newGateForm, setNewGateForm] = useState({ providerName: '', apiKey: '', secretKey: '', webhookSecret: '', isActive: true });
  const [showSecret, setShowSecret] = useState(false);
  
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (role && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      router.push('/');
    }
  }, [role, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'cameras') {
        const data = await getCameras();
        setCameras(data.cameras || []);
      } else if (activeTab === 'gateways') {
        const res = await fetch('/api/admin/gateways');
        if (res.ok) {
          const data = await res.json();
          setGateways(data || []);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Camera Actions ---
  const handleAddCamera = async () => {
    setCamSaving(true);
    try {
      await addCamera(newCamForm);
      await fetchData();
      setShowCamModal(false);
      setNewCamForm({ name: '', url: '', location: '', enabled: true });
      showToast('Camera added successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add camera', 'error');
    } finally {
      setCamSaving(false);
    }
  };

  const handleToggleCamera = async (cam: CameraConfig) => {
    try {
      await updateCamera(cam.id, { ...cam, enabled: !cam.enabled });
      await fetchData();
      showToast(`${cam.name} ${!cam.enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update camera', 'error');
    }
  };

  const handleDeleteCamera = async (id: string) => {
    if (!confirm('Are you sure you want to delete this camera?')) return;
    try {
      await deleteCamera(id);
      await fetchData();
      showToast('Camera deleted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete camera', 'error');
    }
  };

  const handleApplyCamera = async (cam: CameraConfig) => {
    try {
      await applyCamera(cam.id);
      showToast(`${cam.name} applied as active stream`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to apply camera', 'error');
    }
  };

  // --- Gateway Actions ---
  const handleAddGateway = async () => {
    setGateSaving(true);
    try {
      const res = await fetch('/api/admin/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGateForm)
      });
      if (!res.ok) throw new Error('Failed to add gateway');
      await fetchData();
      setShowGateModal(false);
      setNewGateForm({ providerName: '', apiKey: '', secretKey: '', webhookSecret: '', isActive: true });
      showToast('Gateway added successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add gateway', 'error');
    } finally {
      setGateSaving(false);
    }
  };

  const handleToggleGateway = async (gate: any) => {
    try {
      const res = await fetch(`/api/admin/gateways/${gate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !gate.isActive })
      });
      if (!res.ok) throw new Error('Failed to update gateway');
      await fetchData();
      showToast(`${gate.providerName} ${!gate.isActive ? 'enabled' : 'disabled'}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update gateway', 'error');
    }
  };

  const handleDeleteGateway = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment gateway?')) return;
    try {
      const res = await fetch(`/api/admin/gateways/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete gateway');
      await fetchData();
      showToast('Gateway deleted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete gateway', 'error');
    }
  };

  if (!role || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
    return null;
  }

  return (
    <div className="p-8 pb-20 fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Plug className="text-blue-600 dark:text-blue-400" size={32} />
            Integrations & Config
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Manage third-party integrations, payment gateways, and live camera feeds securely.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-800 mb-8 overflow-x-auto hide-scrollbar">
        {[
          { id: 'gateways', label: 'Payment Gateways', icon: <CreditCard size={18} /> },
          { id: 'cameras', label: 'Camera Feeds', icon: <Video size={18} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'gateways' | 'cameras')}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors relative whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.icon} {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-[#1a1b23] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
            <p className="text-gray-500">Loading configurations...</p>
          </div>
        ) : (
          <>
            {/* GATEWAYS TAB */}
            {activeTab === 'gateways' && (
              <div className="space-y-6 fade-in">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Providers</h3>
                    <p className="text-sm text-gray-500 mt-1">Configure Stripe, SSLCommerz, or custom webhooks.</p>
                  </div>
                  <button onClick={() => setShowGateModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Add Gateway
                  </button>
                </div>

                {gateways.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                    <CreditCard className="mx-auto text-gray-400 mb-3" size={32} />
                    <p className="text-gray-500">No payment gateways configured.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gateways.map(gate => (
                      <div key={gate.id} className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#20212b] transition-colors">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            {gate.providerName}
                            {gate.isActive && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">Active</span>}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">Key: {gate.apiKey}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Toggle checked={gate.isActive} onChange={() => handleToggleGateway(gate)} />
                          <button onClick={() => handleDeleteGateway(gate.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CAMERAS TAB */}
            {activeTab === 'cameras' && (
              <div className="space-y-6 fade-in">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Camera Feeds</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage IP cameras, RTSP URLs, or WebSockets.</p>
                  </div>
                  <button onClick={() => setShowCamModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Add Camera
                  </button>
                </div>

                {cameras.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                    <Video className="mx-auto text-gray-400 mb-3" size={32} />
                    <p className="text-gray-500">No cameras configured.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cameras.map(cam => (
                      <div key={cam.id} className="p-5 border border-gray-200 dark:border-gray-800 rounded-xl hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{cam.name}</h4>
                            {cam.location && <p className="text-xs text-gray-500">{cam.location}</p>}
                          </div>
                          <Toggle checked={cam.enabled} onChange={() => handleToggleCamera(cam)} />
                        </div>
                        <p className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded text-gray-600 dark:text-gray-300 font-mono overflow-hidden text-ellipsis mb-4">
                          {cam.url}
                        </p>
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleApplyCamera(cam)} className="flex-1 btn-secondary text-xs flex justify-center items-center gap-2 py-2">
                            <CheckCircle size={14} /> Set Active
                          </button>
                          <button onClick={() => handleDeleteCamera(cam.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Gateway Modal */}
      {showGateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
          <div className="bg-white dark:bg-[#1a1b23] rounded-2xl max-w-md w-full shadow-2xl p-6 border border-gray-200 dark:border-gray-800 slide-up">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add Payment Gateway</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Provider Name *</label>
                <input type="text" className="input-field" placeholder="e.g. Stripe, SSLCommerz" value={newGateForm.providerName} onChange={e => setNewGateForm({...newGateForm, providerName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">API Key / Client ID *</label>
                <input type="text" className="input-field" value={newGateForm.apiKey} onChange={e => setNewGateForm({...newGateForm, apiKey: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Secret Key *</label>
                <div className="relative">
                  <input type={showSecret ? 'text' : 'password'} className="input-field pr-10" value={newGateForm.secretKey} onChange={e => setNewGateForm({...newGateForm, secretKey: e.target.value})} />
                  <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700">
                    {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Webhook Secret (Optional)</label>
                <input type="password" className="input-field" value={newGateForm.webhookSecret} onChange={e => setNewGateForm({...newGateForm, webhookSecret: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowGateModal(false)} className="flex-1 btn-secondary" disabled={gateSaving}>Cancel</button>
                <button onClick={handleAddGateway} className="flex-1 btn-primary flex justify-center items-center gap-2" disabled={gateSaving || !newGateForm.providerName || !newGateForm.apiKey || !newGateForm.secretKey}>
                  {gateSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
          <div className="bg-white dark:bg-[#1a1b23] rounded-2xl max-w-md w-full shadow-2xl p-6 border border-gray-200 dark:border-gray-800 slide-up">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add Camera Stream</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Camera Name *</label>
                <input type="text" className="input-field" placeholder="e.g. Front Door" value={newCamForm.name} onChange={e => setNewCamForm({...newCamForm, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stream URL (RTSP, HTTP) *</label>
                <input type="text" className="input-field" placeholder="rtsp://..." value={newCamForm.url} onChange={e => setNewCamForm({...newCamForm, url: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location (Optional)</label>
                <input type="text" className="input-field" placeholder="Lobby" value={newCamForm.location} onChange={e => setNewCamForm({...newCamForm, location: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCamModal(false)} className="flex-1 btn-secondary" disabled={camSaving}>Cancel</button>
                <button onClick={handleAddCamera} className="flex-1 btn-primary flex justify-center items-center gap-2" disabled={camSaving || !newCamForm.name || !newCamForm.url}>
                  {camSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 text-white slide-up z-50 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span className="font-medium">{toast.msg}</span>
        </div>
      )}
      
      <style jsx>{`
        .toggle-switch {
          position: relative; display: inline-block; width: 44px; height: 24px;
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
          background-color: #cbd5e1; transition: .3s;
        }
        .slider:before {
          position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
          background-color: white; transition: .3s;
        }
        input:checked + .slider { background-color: #2563eb; }
        input:checked + .slider:before { transform: translateX(20px); }
        .slider.round { border-radius: 24px; }
        .slider.round:before { border-radius: 50%; }
        
        .fade-in { animation: fadeIn 0.4s ease-out; }
        .slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
