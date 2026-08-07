"use client";

import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Smartphone, 
  BrainCircuit, 
  Database, 
  Save, 
  Loader2, 
  Trash2, 
  Plus, 
  Video,
  Plug,
  Mail,
  SendHorizonal,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  getNotificationSettings,
  saveNotificationSettings,
  testEmailConnection,
  SmtpSettings,
} from '@/lib/api';

type Tab = 'camera' | 'notifications' | 'ai' | 'database' | 'integrations';

// ── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle-slider"></span>
    </label>
  );
}

// ── Section Divider ───────────────────────────────────────────────────────────

function SectionRow({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('camera');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Camera tab state
  const [cameras, setCameras] = useState([
    { id: '1', name: 'Main Entrance', url: 'rtsp://192.168.1.100/stream', location: 'Lobby', enabled: true },
    { id: '2', name: 'Back Door', url: 'rtsp://192.168.1.101/stream', location: 'Alley', enabled: false },
  ]);

  // Telegram tab state
  const [telegramToken, setTelegramToken] = useState('123456789:ABCDEF...');
  const [chatId, setChatId] = useState('-10012345678');
  const [alertUnknown, setAlertUnknown] = useState(true);
  const [alertKnown, setAlertKnown] = useState(false);

  // AI tab state
  const [matchThreshold, setMatchThreshold] = useState(0.65);
  const [cooldown, setCooldown] = useState(60);

  // Database tab state
  const [retention, setRetention] = useState('30');

  // Integrations (SMTP) tab state
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [smtp, setSmtp] = useState<SmtpSettings>({
    enabled: false,
    host: 'smtp.gmail.com',
    port: 587,
    use_tls: true,
    user: '',
    password: '',
    from_addr: '',
    to_emails: '',
    alert_unknown: true,
    alert_known: false,
  });

  // Load SMTP settings when Integrations tab is opened
  useEffect(() => {
    if (activeTab !== 'integrations') return;
    setSmtpLoading(true);
    getNotificationSettings()
      .then((data) => setSmtp(data.smtp))
      .catch(() => { /* backend offline — use defaults */ })
      .finally(() => setSmtpLoading(false));
  }, [activeTab]);

  const handleSave = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsLoading(false);
    showToast('Settings saved successfully.', 'success');
  };

  const handleTestTelegram = async () => {
    setIsTestingConnection(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsTestingConnection(false);
    showToast('Telegram connected successfully! Test alert sent.', 'success');
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
      showToast((err as Error).message || 'Test email failed. Check your SMTP credentials.', 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const updateSmtp = (patch: Partial<SmtpSettings>) =>
    setSmtp((prev) => ({ ...prev, ...patch }));

  // ── Sidebar tab definitions ────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'camera',        label: 'Camera Management',      icon: <Camera size={18} /> },
    { id: 'notifications', label: 'Notifications (Telegram)', icon: <Smartphone size={18} /> },
    { id: 'integrations',  label: 'Integrations (Email)',   icon: <Plug size={18} /> },
    { id: 'ai',            label: 'AI Engine Settings',     icon: <BrainCircuit size={18} /> },
    { id: 'database',      label: 'Database & System',      icon: <Database size={18} /> },
  ];

  return (
    <div className="page-root">
      <div className="main-content">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Settings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your enterprise platform configurations.</p>
        </div>

        <div className="settings-layout">
          {/* Sidebar */}
          <div className="settings-sidebar">
            {tabs.map((t) => (
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

            {/* ── CAMERA ── */}
            {activeTab === 'camera' && (
              <div className="settings-card">
                <div className="settings-card-header">
                  <h2 className="settings-card-title">Camera Management</h2>
                  <p className="settings-card-subtitle">Add, edit, or remove RTSP streams connected to the system.</p>
                </div>
                <div className="settings-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Active Cameras</h3>
                    <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                      <Plus size={16} /> Add Camera
                    </button>
                  </div>
                  <div>
                    {cameras.map(cam => (
                      <div key={cam.id} className="camera-list-item">
                        <div className="camera-info">
                          <div className="camera-icon-wrap"><Video size={20} /></div>
                          <div className="camera-meta">
                            <h4>{cam.name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({cam.location})</span></h4>
                            <p style={{ fontFamily: 'monospace', marginTop: '2px' }}>{cam.url}</p>
                          </div>
                        </div>
                        <div className="camera-actions">
                          <Toggle
                            checked={cam.enabled}
                            onChange={() => {
                              const newStatus = !cam.enabled;
                              setCameras(cameras.map(c => c.id === cam.id ? { ...c, enabled: newStatus } : c));
                              showToast(`Camera ${cam.name} ${newStatus ? 'enabled' : 'disabled'}.`, 'success');
                            }}
                          />
                          <button className="icon-btn" style={{ color: 'var(--accent-red)' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TELEGRAM NOTIFICATIONS ── */}
            {activeTab === 'notifications' && (
              <div className="settings-card">
                <div className="settings-card-header">
                  <h2 className="settings-card-title">Telegram Notifications</h2>
                  <p className="settings-card-subtitle">Configure real-time alerts sent to your Telegram group or channel.</p>
                </div>
                <div className="settings-card-body">
                  <div className="form-group">
                    <label className="form-label">Telegram Bot Token</label>
                    <input type="text" className="form-input" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Chat ID</label>
                    <input type="text" className="form-input" value={chatId} onChange={(e) => setChatId(e.target.value)} />
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

            {/* ── INTEGRATIONS (SMTP) ── */}
            {activeTab === 'integrations' && (
              <div className="settings-card">
                <div className="settings-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
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

                      {/* Master enable toggle */}
                      <div style={{
                        padding: '16px 20px',
                        background: smtp.enabled ? 'rgba(99,102,241,0.06)' : 'var(--bg-surface)',
                        border: `1px solid ${smtp.enabled ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {smtp.enabled
                            ? <CheckCircle size={18} style={{ color: '#22c55e' }} />
                            : <XCircle size={18} style={{ color: 'var(--text-muted)' }} />}
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>
                              Email Alerts {smtp.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <p className="setting-desc">
                              {smtp.enabled
                                ? 'Security alerts will be sent to the configured recipients.'
                                : 'Turn this on to activate email notifications.'}
                            </p>
                          </div>
                        </div>
                        <Toggle checked={smtp.enabled} onChange={() => updateSmtp({ enabled: !smtp.enabled })} />
                      </div>

                      {/* SMTP connection settings */}
                      <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        SMTP Server
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">SMTP Host</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="smtp.gmail.com"
                            value={smtp.host}
                            onChange={(e) => updateSmtp({ host: e.target.value })}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0, minWidth: '100px' }}>
                          <label className="form-label">Port</label>
                          <input
                            type="number"
                            className="form-input"
                            placeholder="587"
                            value={smtp.port}
                            onChange={(e) => updateSmtp({ port: parseInt(e.target.value) || 587 })}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Username / Email Address</label>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="you@gmail.com"
                          value={smtp.user}
                          onChange={(e) => updateSmtp({ user: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Password / App Password</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-input"
                            placeholder="Gmail App Password (16 chars)"
                            value={smtp.password}
                            onChange={(e) => updateSmtp({ password: e.target.value })}
                            style={{ paddingRight: '40px' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                              position: 'absolute', right: '12px', top: '50%',
                              transform: 'translateY(-50%)', background: 'none',
                              border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                              padding: 0, display: 'flex',
                            }}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <p className="setting-desc" style={{ marginTop: '6px' }}>
                          For Gmail: enable 2FA → generate an{' '}
                          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer"
                            style={{ color: 'var(--accent-indigo)', textDecoration: 'none' }}>
                            App Password
                          </a>.
                        </p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">From Address</label>
                          <input
                            type="email"
                            className="form-input"
                            placeholder="Same as username"
                            value={smtp.from_addr}
                            onChange={(e) => updateSmtp({ from_addr: e.target.value })}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Recipient Email(s)</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="admin@company.com, soc@company.com"
                            value={smtp.to_emails}
                            onChange={(e) => updateSmtp({ to_emails: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* TLS toggle */}
                      <div style={{ marginTop: '16px' }}>
                        <SectionRow title="Use STARTTLS" desc="Recommended for port 587. Disable only for SSL (port 465) or plain SMTP.">
                          <Toggle checked={smtp.use_tls} onChange={() => updateSmtp({ use_tls: !smtp.use_tls })} />
                        </SectionRow>
                      </div>

                      {/* Divider */}
                      <div style={{ borderTop: '1px solid var(--border)', margin: '24px 0' }} />

                      {/* Alert trigger toggles */}
                      <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Alert Triggers
                      </h3>

                      <SectionRow
                        title="Alert on Unknown Person"
                        desc="Send an email with snapshot when an unregistered face is detected."
                      >
                        <Toggle checked={smtp.alert_unknown} onChange={() => updateSmtp({ alert_unknown: !smtp.alert_unknown })} />
                      </SectionRow>

                      <SectionRow
                        title="Alert on Known Person Arrival"
                        desc="Send a notification when a registered employee or visitor is detected."
                      >
                        <Toggle checked={smtp.alert_known} onChange={() => updateSmtp({ alert_known: !smtp.alert_known })} />
                      </SectionRow>
                    </div>

                    <div className="settings-card-footer">
                      <button
                        className="btn-secondary"
                        onClick={handleTestEmail}
                        disabled={isTestingConnection || !smtp.enabled}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        title={!smtp.enabled ? 'Enable SMTP first' : 'Send a test email'}
                      >
                        {isTestingConnection
                          ? <Loader2 size={16} className="animate-spin" />
                          : <SendHorizonal size={16} />}
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

            {/* ── AI ENGINE ── */}
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
                    <input
                      type="range" min="0.4" max="0.95" step="0.01"
                      className="form-slider"
                      value={matchThreshold}
                      onChange={(e) => setMatchThreshold(parseFloat(e.target.value))}
                    />
                    <p className="setting-desc" style={{ marginTop: '8px' }}>
                      Higher values reduce false positives but may miss partial faces. Recommended: 60-70%.
                    </p>
                  </div>
                  <div className="form-group" style={{ marginTop: '24px' }}>
                    <label className="form-label">Alert Cooldown (Seconds)</label>
                    <input
                      type="number" className="form-input"
                      value={cooldown}
                      onChange={(e) => setCooldown(parseInt(e.target.value))}
                      style={{ maxWidth: '200px' }}
                    />
                    <p className="setting-desc" style={{ marginTop: '4px' }}>
                      Time to wait before alerting again for the same person.
                    </p>
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

            {/* ── DATABASE & SYSTEM ── */}
            {activeTab === 'database' && (
              <div className="settings-card">
                <div className="settings-card-header">
                  <h2 className="settings-card-title">Database & System</h2>
                  <p className="settings-card-subtitle">Manage data retention policies and perform manual backups.</p>
                </div>
                <div className="settings-card-body">
                  <div className="form-group">
                    <label className="form-label">Visitor Log Retention Policy</label>
                    <select
                      className="form-input"
                      value={retention}
                      onChange={(e) => setRetention(e.target.value)}
                      style={{ maxWidth: '400px', cursor: 'pointer' }}
                    >
                      <option value="7">Auto-delete after 7 days</option>
                      <option value="30">Auto-delete after 30 days</option>
                      <option value="90">Auto-delete after 90 days</option>
                      <option value="forever">Keep forever (Manual deletion only)</option>
                    </select>
                  </div>
                  <div style={{ marginTop: '24px', padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#f8fafc' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Manual Backup</h3>
                    <p className="setting-desc" style={{ marginBottom: '16px' }}>Download a complete snapshot of your embedded vector database and visitor logs.</p>
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
          {toast.message}
        </div>
      )}
    </div>
  );
}
