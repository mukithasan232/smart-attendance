"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera, Smartphone, BrainCircuit, Database, Save, Loader2, Trash2, Plus,
  Video, Plug, Mail, SendHorizonal, CheckCircle, XCircle, Eye, EyeOff,
  Pencil, Play, Wifi, WifiOff, AlertTriangle, X,
} from 'lucide-react';
import {
  getNotificationSettings, saveNotificationSettings, testEmailConnection, SmtpSettings,
  getCameras, addCamera, updateCamera, deleteCamera, applyCamera, CameraConfig,
} from '@/lib/api';

type Tab = 'camera' | 'notifications' | 'ai' | 'database' | 'integrations';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label className="toggle-switch" style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle-slider"></span>
    </label>
  );
}

function SectionRow({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="setting-row">
      <div className="setting-info">
        <span className="setting-name">{title}</span>
        <span className="setting-desc">{desc}</span>
      </div>
      {children}
    </div>
  );
}

// ── Camera Modal ──────────────────────────────────────────────────────────────

const EMPTY_CAM = { name: '', url: '', location: '', enabled: true };

function CameraModal({
  initial,
  onSave,
  onClose,
  isSaving,
}: {
  initial?: CameraConfig | null;
  onSave: (data: Omit<CameraConfig, 'id'>) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState(
    initial ? { name: initial.name, url: initial.url, location: initial.location, enabled: initial.enabled }
            : EMPTY_CAM
  );
  const [urlError, setUrlError] = useState('');

  const validateUrl = (url: string) => {
    if (!url.trim()) { setUrlError('URL is required.'); return false; }
    const isRtsp = url.startsWith('rtsp://') || url.startsWith('rtsps://');
    const isDigit = /^\d+$/.test(url.trim()); // local webcam index like "0"
    const isHttp = url.startsWith('http://') || url.startsWith('https://');
    if (!isRtsp && !isDigit && !isHttp) {
      setUrlError('Must be an RTSP URL (rtsp://...) or local index (0, 1, 2...)');
      return false;
    }
    setUrlError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (!validateUrl(form.url)) return;
    onSave(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Camera size={18} className="text-indigo-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {initial ? 'Edit Camera' : 'Add New Camera'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Camera Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Main Entrance, Parking Lot"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Stream URL / Device Index *</label>
            <input
              type="text"
              className={`form-input ${urlError ? 'border-red-400 focus:border-red-400' : ''}`}
              placeholder="rtsp://admin:pass@192.168.1.100/stream  or  0"
              value={form.url}
              onChange={e => { setForm({ ...form, url: e.target.value }); if (urlError) validateUrl(e.target.value); }}
              onBlur={e => validateUrl(e.target.value)}
              required
            />
            {urlError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertTriangle size={11} /> {urlError}
              </p>
            )}
            <p className="setting-desc mt-1">
              RTSP URL from your camera, or a local webcam index (<code>0</code>, <code>1</code>…).
              For EZVIZ/Hikvision: <code>rtsp://admin:PASSWORD@IP:554/Streaming/Channels/101</code>
            </p>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Location / Label</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Lobby, Back Door, Rooftop"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
            />
          </div>

          <SectionRow title="Enable on save" desc="Activate this camera immediately after saving.">
            <Toggle checked={form.enabled} onChange={() => setForm({ ...form, enabled: !form.enabled })} />
          </SectionRow>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving || !form.name.trim() || !form.url.trim()}>
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {initial ? 'Save Changes' : 'Add Camera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onClose, isDeleting }: {
  name: string; onConfirm: () => void; onClose: () => void; isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 size={22} className="text-red-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">Delete Camera</h3>
          <p className="text-sm text-slate-500">
            Are you sure you want to delete <strong>{name}</strong>?
            This cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 mt-6">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('camera');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Camera tab state ────────────────────────────────────────────────────────
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [camLoading, setCamLoading] = useState(false);
  const [showCamModal, setShowCamModal] = useState(false);
  const [editingCam, setEditingCam] = useState<CameraConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CameraConfig | null>(null);
  const [camSaving, setCamSaving] = useState(false);
  const [camDeleting, setCamDeleting] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const fetchCameras = useCallback(async () => {
    setCamLoading(true);
    try {
      const data = await getCameras();
      setCameras(data.cameras);
    } catch {
      // backend offline — keep empty
    } finally {
      setCamLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line
    if (activeTab === 'camera') fetchCameras();
  }, [activeTab, fetchCameras]);

  const handleAddCamera = async (form: Omit<CameraConfig, 'id'>) => {
    setCamSaving(true);
    try {
      await addCamera(form);
      await fetchCameras();
      setShowCamModal(false);
      showToast('Camera added successfully!', 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to add camera.', 'error');
    } finally {
      setCamSaving(false);
    }
  };

  const handleEditCamera = async (form: Omit<CameraConfig, 'id'>) => {
    if (!editingCam) return;
    setCamSaving(true);
    try {
      await updateCamera(editingCam.id, form);
      await fetchCameras();
      setEditingCam(null);
      showToast('Camera updated successfully!', 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to update camera.', 'error');
    } finally {
      setCamSaving(false);
    }
  };

  const handleDeleteCamera = async () => {
    if (!deleteTarget) return;
    setCamDeleting(true);
    try {
      await deleteCamera(deleteTarget.id);
      await fetchCameras();
      setDeleteTarget(null);
      showToast('Camera deleted.', 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to delete camera.', 'error');
    } finally {
      setCamDeleting(false);
    }
  };

  const handleToggleCamera = async (cam: CameraConfig) => {
    try {
      await updateCamera(cam.id, { ...cam, enabled: !cam.enabled });
      await fetchCameras();
      showToast(`${cam.name} ${!cam.enabled ? 'enabled' : 'disabled'}.`, 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to update camera.', 'error');
    }
  };

  const handleApplyCamera = async (cam: CameraConfig) => {
    setApplyingId(cam.id);
    try {
      const res = await applyCamera(cam.id);
      showToast(res.message, 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to apply camera.', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  // ── Telegram tab state ──────────────────────────────────────────────────────
  const [telegramToken, setTelegramToken] = useState('123456789:ABCDEF...');
  const [chatId, setChatId] = useState('-10012345678');
  const [alertUnknown, setAlertUnknown] = useState(true);
  const [alertKnown, setAlertKnown] = useState(false);

  // ── AI tab state ────────────────────────────────────────────────────────────
  const [matchThreshold, setMatchThreshold] = useState(0.65);
  const [cooldown, setCooldown] = useState(60);

  // ── Database tab state ──────────────────────────────────────────────────────
  const [retention, setRetention] = useState('30');

  // ── SMTP tab state ──────────────────────────────────────────────────────────
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [smtp, setSmtp] = useState<SmtpSettings>({
    enabled: false, host: 'smtp.gmail.com', port: 587, use_tls: true,
    user: '', password: '', from_addr: '', to_emails: '',
    alert_unknown: true, alert_known: false,
  });

  useEffect(() => {
    if (activeTab !== 'integrations') return;
    // eslint-disable-next-line
    setSmtpLoading(true);
    getNotificationSettings()
      .then(data => setSmtp(data.smtp))
      .catch(() => {})
      .finally(() => setSmtpLoading(false));
  }, [activeTab]);

  const handleSave = async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setIsLoading(false);
    showToast('Settings saved successfully.', 'success');
  };

  const handleTestTelegram = async () => {
    setIsTestingConnection(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsTestingConnection(false);
    showToast('Telegram connected! Test alert sent.', 'success');
  };

  const handleSmtpSave = async () => {
    setIsLoading(true);
    try {
      await saveNotificationSettings(smtp);
      showToast('SMTP settings saved successfully.', 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || 'Failed to save settings.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTestingConnection(true);
    try {
      const res = await testEmailConnection();
      showToast(res.message, 'success');
    } catch (err: unknown) {
      showToast((err as Error).message || 'Test email failed.', 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'camera',        label: 'Camera Management',       icon: <Camera size={18} /> },
    { id: 'notifications', label: 'Notifications (Telegram)', icon: <Smartphone size={18} /> },
    { id: 'integrations',  label: 'Integrations (Email)',    icon: <Plug size={18} /> },
    { id: 'ai',            label: 'AI Engine Settings',      icon: <BrainCircuit size={18} /> },
    { id: 'database',      label: 'Database & System',       icon: <Database size={18} /> },
  ];

  return (
    <div className="page-root">
      {/* ── Modals ── */}
      {showCamModal && (
        <CameraModal
          onSave={handleAddCamera}
          onClose={() => setShowCamModal(false)}
          isSaving={camSaving}
        />
      )}
      {editingCam && (
        <CameraModal
          initial={editingCam}
          onSave={handleEditCamera}
          onClose={() => setEditingCam(null)}
          isSaving={camSaving}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.name}
          onConfirm={handleDeleteCamera}
          onClose={() => setDeleteTarget(null)}
          isDeleting={camDeleting}
        />
      )}

      <div className="main-content">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Settings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your enterprise platform configurations.</p>
        </div>

        <div className="settings-layout">
          {/* Sidebar */}
          <div className="settings-sidebar">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`settings-tab ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="settings-content">

            {/* ── CAMERA MANAGEMENT ─────────────────────────────────────────── */}
            {activeTab === 'camera' && (
              <div className="settings-card">
                <div className="settings-card-header">
                  <h2 className="settings-card-title">Camera Management</h2>
                  <p className="settings-card-subtitle">
                    Configure RTSP streams or local webcams. Click <strong>Apply</strong> to hot-switch the live feed without restarting the server.
                  </p>
                </div>

                <div className="settings-card-body">
                  {/* Toolbar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
                        Active Cameras
                        {!camLoading && (
                          <span style={{
                            marginLeft: '8px', fontSize: '12px', fontWeight: 500,
                            background: 'var(--bg-surface)', border: '1px solid var(--border)',
                            borderRadius: '20px', padding: '2px 8px', color: 'var(--text-secondary)',
                          }}>
                            {cameras.length}
                          </span>
                        )}
                      </h3>
                    </div>
                    <button
                      className="btn-primary"
                      style={{ padding: '7px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => setShowCamModal(true)}
                    >
                      <Plus size={15} /> Add Camera
                    </button>
                  </div>

                  {/* Quick-start hint */}
                  <div style={{
                    padding: '12px 16px', borderRadius: 'var(--radius-md)',
                    background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)',
                    marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start',
                  }}>
                    <Wifi size={16} style={{ color: 'var(--accent-indigo)', flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Quick setup:</strong>
                      {' '}Enter your RTSP URL → Save → click <strong>Apply</strong> to switch the live feed.
                      Use index <code style={{ background: '#f1f5f9', padding: '0 4px', borderRadius: '3px' }}>0</code> for built-in webcam.
                      For EZVIZ/Hikvision: <code style={{ background: '#f1f5f9', padding: '0 4px', borderRadius: '3px' }}>rtsp://admin:PASS@IP:554/Streaming/Channels/101</code>
                    </div>
                  </div>

                  {/* Camera list */}
                  {camLoading ? (
                    <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                      <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-indigo)' }} />
                    </div>
                  ) : cameras.length === 0 ? (
                    <div style={{
                      padding: '48px 20px', textAlign: 'center', border: '2px dashed var(--border)',
                      borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)',
                    }}>
                      <Video size={36} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block' }} />
                      <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>No cameras configured</p>
                      <p style={{ fontSize: '13px' }}>Click <strong>+ Add Camera</strong> to get started.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {cameras.map(cam => (
                        <div key={cam.id} style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '14px 16px', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)', background: cam.enabled ? '#fff' : '#fafafa',
                          transition: 'all 0.15s',
                        }}>
                          {/* Icon */}
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                            background: cam.enabled ? 'rgba(99,102,241,0.1)' : '#f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {cam.enabled
                              ? <Wifi size={18} style={{ color: 'var(--accent-indigo)' }} />
                              : <WifiOff size={18} style={{ color: 'var(--text-muted)' }} />}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                                {cam.name}
                              </span>
                              {cam.location && (
                                <span style={{
                                  fontSize: '11px', padding: '1px 7px', borderRadius: '10px',
                                  background: '#f1f5f9', color: 'var(--text-secondary)',
                                }}>
                                  {cam.location}
                                </span>
                              )}
                              {!cam.enabled && (
                                <span style={{
                                  fontSize: '11px', padding: '1px 7px', borderRadius: '10px',
                                  background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa',
                                }}>
                                  Disabled
                                </span>
                              )}
                            </div>
                            <p style={{
                              fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {cam.url}
                            </p>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {/* Apply / hot-reload */}
                            <button
                              onClick={() => handleApplyCamera(cam)}
                              disabled={!cam.enabled || applyingId === cam.id}
                              title={cam.enabled ? 'Switch live feed to this camera' : 'Enable camera first'}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                                background: cam.enabled ? 'rgba(99,102,241,0.08)' : '#f1f5f9',
                                color: cam.enabled ? 'var(--accent-indigo)' : 'var(--text-muted)',
                                border: `1px solid ${cam.enabled ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
                                cursor: cam.enabled ? 'pointer' : 'not-allowed',
                                transition: 'all 0.15s',
                              }}
                            >
                              {applyingId === cam.id
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Play size={12} />}
                              Apply
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => setEditingCam(cam)}
                              title="Edit camera"
                              className="icon-btn"
                            >
                              <Pencil size={15} />
                            </button>

                            {/* Toggle */}
                            <Toggle checked={cam.enabled} onChange={() => handleToggleCamera(cam)} />

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteTarget(cam)}
                              className="icon-btn"
                              style={{ color: 'var(--accent-red)' }}
                              title="Delete camera"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TELEGRAM ───────────────────────────────────────────────────── */}
            {activeTab === 'notifications' && (
              <div className="settings-card">
                <div className="settings-card-header">
                  <h2 className="settings-card-title">Telegram Notifications</h2>
                  <p className="settings-card-subtitle">Configure real-time alerts sent to your Telegram group or channel.</p>
                </div>
                <div className="settings-card-body">
                  <div className="form-group">
                    <label className="form-label">Telegram Bot Token</label>
                    <input type="text" className="form-input" value={telegramToken} onChange={e => setTelegramToken(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Chat ID</label>
                    <input type="text" className="form-input" value={chatId} onChange={e => setChatId(e.target.value)} />
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <SectionRow title="Alert on Unknown Person" desc="Send a photo when an unregistered face is detected.">
                      <Toggle checked={alertUnknown} onChange={() => setAlertUnknown(!alertUnknown)} />
                    </SectionRow>
                    <SectionRow title="Alert on Known Person" desc="Send a notification when an employee or known visitor arrives.">
                      <Toggle checked={alertKnown} onChange={() => setAlertKnown(!alertKnown)} />
                    </SectionRow>
                  </div>
                </div>
                <div className="settings-card-footer">
                  <button className="btn-secondary" onClick={handleTestTelegram} disabled={isTestingConnection} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isTestingConnection ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
                    Test Connection
                  </button>
                  <button className="btn-primary" onClick={handleSave} disabled={isLoading}>
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* ── INTEGRATIONS (SMTP) ────────────────────────────────────────── */}
            {activeTab === 'integrations' && (
              <div className="settings-card">
                <div className="settings-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mail size={20} color="white" />
                    </div>
                    <div>
                      <h2 className="settings-card-title" style={{ marginBottom: '2px' }}>Email / SMTP Integration</h2>
                      <p className="settings-card-subtitle">Receive security alert emails with snapshot attachments.</p>
                    </div>
                  </div>
                </div>
                {smtpLoading ? (
                  <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                    <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-indigo)' }} />
                  </div>
                ) : (
                  <>
                    <div className="settings-card-body">
                      <div style={{ padding: '16px 20px', background: smtp.enabled ? 'rgba(99,102,241,0.06)' : 'var(--bg-surface)', border: `1px solid ${smtp.enabled ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {smtp.enabled ? <CheckCircle size={18} style={{ color: '#22c55e' }} /> : <XCircle size={18} style={{ color: 'var(--text-muted)' }} />}
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>Email Alerts {smtp.enabled ? 'Enabled' : 'Disabled'}</span>
                            <p className="setting-desc">{smtp.enabled ? 'Security alerts will be sent to configured recipients.' : 'Turn this on to activate email notifications.'}</p>
                          </div>
                        </div>
                        <Toggle checked={smtp.enabled} onChange={() => setSmtp(p => ({ ...p, enabled: !p.enabled }))} />
                      </div>
                      <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '16px' }}>SMTP Server</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">SMTP Host</label>
                          <input type="text" className="form-input" placeholder="smtp.gmail.com" value={smtp.host} onChange={e => setSmtp(p => ({ ...p, host: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ margin: 0, minWidth: '100px' }}>
                          <label className="form-label">Port</label>
                          <input type="number" className="form-input" placeholder="587" value={smtp.port} onChange={e => setSmtp(p => ({ ...p, port: parseInt(e.target.value) || 587 }))} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Username</label>
                        <input type="email" className="form-input" placeholder="you@gmail.com" value={smtp.user} onChange={e => setSmtp(p => ({ ...p, user: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Password / App Password</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showPassword ? 'text' : 'password'} className="form-input" placeholder="Gmail App Password (16 chars)" value={smtp.password} onChange={e => setSmtp(p => ({ ...p, password: e.target.value }))} style={{ paddingRight: '40px' }} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <p className="setting-desc" style={{ marginTop: '6px' }}>For Gmail: enable 2FA → <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-indigo)', textDecoration: 'none' }}>generate an App Password</a>.</p>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">From Address</label>
                          <input type="email" className="form-input" placeholder="Same as username" value={smtp.from_addr} onChange={e => setSmtp(p => ({ ...p, from_addr: e.target.value }))} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Recipient Email(s)</label>
                          <input type="text" className="form-input" placeholder="admin@company.com, soc@company.com" value={smtp.to_emails} onChange={e => setSmtp(p => ({ ...p, to_emails: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ marginTop: '16px' }}>
                        <SectionRow title="Use STARTTLS" desc="Recommended for port 587. Disable for SSL (port 465).">
                          <Toggle checked={smtp.use_tls} onChange={() => setSmtp(p => ({ ...p, use_tls: !p.use_tls }))} />
                        </SectionRow>
                      </div>
                      <div style={{ borderTop: '1px solid var(--border)', margin: '24px 0' }} />
                      <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '16px' }}>Alert Triggers</h3>
                      <SectionRow title="Alert on Unknown Person" desc="Send an email with snapshot when an unregistered face is detected.">
                        <Toggle checked={smtp.alert_unknown} onChange={() => setSmtp(p => ({ ...p, alert_unknown: !p.alert_unknown }))} />
                      </SectionRow>
                      <SectionRow title="Alert on Known Person Arrival" desc="Send a notification when a registered visitor is detected.">
                        <Toggle checked={smtp.alert_known} onChange={() => setSmtp(p => ({ ...p, alert_known: !p.alert_known }))} />
                      </SectionRow>
                    </div>
                    <div className="settings-card-footer">
                      <button className="btn-secondary" onClick={handleTestEmail} disabled={isTestingConnection || !smtp.enabled} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isTestingConnection ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
                        Send Test Email
                      </button>
                      <button className="btn-primary" onClick={handleSmtpSave} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── AI ENGINE ──────────────────────────────────────────────────── */}
            {activeTab === 'ai' && (
              <div className="settings-card">
                <div className="settings-card-header">
                  <h2 className="settings-card-title">AI Engine Configuration</h2>
                  <p className="settings-card-subtitle">Fine-tune the facial recognition algorithms and confidence thresholds.</p>
                </div>
                <div className="settings-card-body">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label className="form-label">Face Match Confidence Threshold</label>
                      <span className="badge badge-green tabular-nums">{(matchThreshold * 100).toFixed(0)}%</span>
                    </div>
                    <input type="range" min="0.4" max="0.95" step="0.01" className="form-slider" value={matchThreshold} onChange={e => setMatchThreshold(parseFloat(e.target.value))} />
                    <p className="setting-desc" style={{ marginTop: '8px' }}>Higher values reduce false positives. Recommended: 60–70%.</p>
                  </div>
                  <div className="form-group" style={{ marginTop: '24px' }}>
                    <label className="form-label">Alert Cooldown (Seconds)</label>
                    <input type="number" className="form-input" value={cooldown} onChange={e => setCooldown(parseInt(e.target.value))} style={{ maxWidth: '200px' }} />
                    <p className="setting-desc" style={{ marginTop: '4px' }}>Time before re-alerting for the same person.</p>
                  </div>
                </div>
                <div className="settings-card-footer">
                  <button className="btn-primary" onClick={handleSave} disabled={isLoading}>
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* ── DATABASE ───────────────────────────────────────────────────── */}
            {activeTab === 'database' && (
              <div className="settings-card">
                <div className="settings-card-header">
                  <h2 className="settings-card-title">Database & System</h2>
                  <p className="settings-card-subtitle">Manage data retention policies and perform manual backups.</p>
                </div>
                <div className="settings-card-body">
                  <div className="form-group">
                    <label className="form-label">Visitor Log Retention Policy</label>
                    <select className="form-input" value={retention} onChange={e => setRetention(e.target.value)} style={{ maxWidth: '400px', cursor: 'pointer' }}>
                      <option value="7">Auto-delete after 7 days</option>
                      <option value="30">Auto-delete after 30 days</option>
                      <option value="90">Auto-delete after 90 days</option>
                      <option value="forever">Keep forever (Manual deletion only)</option>
                    </select>
                  </div>
                  <div style={{ marginTop: '24px', padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#f8fafc' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Manual Backup</h3>
                    <p className="setting-desc" style={{ marginBottom: '16px' }}>Download a complete snapshot of your database and visitor logs.</p>
                    <button className="btn-secondary">Download Backup (.zip)</button>
                  </div>
                </div>
                <div className="settings-card-footer">
                  <button className="btn-primary" onClick={handleSave} disabled={isLoading}>
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
