"use client";

import React, { useState } from 'react';
import { 
  Camera, 
  Smartphone, 
  BrainCircuit, 
  Database, 
  Save, 
  Loader2, 
  Trash2, 
  Plus, 
  Video 
} from 'lucide-react';

type Tab = 'camera' | 'notifications' | 'ai' | 'database';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('camera');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Mock State for Settings
  const [cameras, setCameras] = useState([
    { id: '1', name: 'Main Entrance', url: 'rtsp://192.168.1.100/stream', location: 'Lobby', enabled: true },
    { id: '2', name: 'Back Door', url: 'rtsp://192.168.1.101/stream', location: 'Alley', enabled: false },
  ]);
  const [telegramToken, setTelegramToken] = useState('123456789:ABCDEF...');
  const [chatId, setChatId] = useState('-10012345678');
  const [alertUnknown, setAlertUnknown] = useState(true);
  const [alertKnown, setAlertKnown] = useState(false);
  
  const [matchThreshold, setMatchThreshold] = useState(0.65);
  const [cooldown, setCooldown] = useState(60);
  
  const [retention, setRetention] = useState('30');

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API Call
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsLoading(false);
    setToast({ message: 'Settings saved successfully.', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsTestingConnection(false);
    setToast({ message: 'Telegram connected successfully! Test alert sent.', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="page-root">
      <div className="main-content">
        <div style={{ marginBottom: '32px' }}>
          <h1 className="text-2xl font-bold" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Settings</h1>
          <p className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Manage your enterprise platform configurations.</p>
        </div>

        <div className="settings-layout">
          {/* Vertical Sidebar Tabs */}
          <div className="settings-sidebar">
            <button 
              className={`settings-tab ${activeTab === 'camera' ? 'active' : ''}`}
              onClick={() => setActiveTab('camera')}
            >
              <Camera size={18} /> Camera Management
            </button>
            <button 
              className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <Smartphone size={18} /> Notifications (Telegram)
            </button>
            <button 
              className={`settings-tab ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <BrainCircuit size={18} /> AI Engine Settings
            </button>
            <button 
              className={`settings-tab ${activeTab === 'database' ? 'active' : ''}`}
              onClick={() => setActiveTab('database')}
            >
              <Database size={18} /> Database & System
            </button>
          </div>

          {/* Settings Content Area */}
          <div className="settings-content">
            
            {/* 🎥 CAMERA MANAGEMENT */}
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
                          <div className="camera-icon-wrap">
                            <Video size={20} />
                          </div>
                          <div className="camera-meta">
                            <h4>{cam.name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({cam.location})</span></h4>
                            <p style={{ fontFamily: 'monospace', marginTop: '2px' }}>{cam.url}</p>
                          </div>
                        </div>
                        <div className="camera-actions">
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={cam.enabled} 
                              onChange={() => {
                                const newStatus = !cam.enabled;
                                setCameras(cameras.map(c => c.id === cam.id ? { ...c, enabled: newStatus } : c));
                                setToast({ message: `Camera ${cam.name} ${newStatus ? 'enabled' : 'disabled'}.`, type: 'success' });
                                setTimeout(() => setToast(null), 3000);
                              }} 
                            />
                            <span className="toggle-slider"></span>
                          </label>
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

            {/* 📱 NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="settings-card">
                <div className="settings-card-header">
                  <h2 className="settings-card-title">Telegram Notifications</h2>
                  <p className="settings-card-subtitle">Configure real-time alerts sent to your Telegram group or channel.</p>
                </div>
                <div className="settings-card-body">
                  <div className="form-group">
                    <label className="form-label">Telegram Bot Token</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Chat ID</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={chatId}
                      onChange={(e) => setChatId(e.target.value)}
                    />
                  </div>
                  
                  <div style={{ marginTop: '16px' }}>
                    <div className="setting-row">
                      <div className="setting-info">
                        <span className="setting-name">Alert on Unknown Person</span>
                        <span className="setting-desc">Send a photo when an unregistered face is detected.</span>
                      </div>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={alertUnknown} onChange={() => setAlertUnknown(!alertUnknown)} />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    <div className="setting-row">
                      <div className="setting-info">
                        <span className="setting-name">Alert on Known Person</span>
                        <span className="setting-desc">Send a notification when an employee or known visitor arrives.</span>
                      </div>
                      <label className="toggle-switch">
                        <input type="checkbox" checked={alertKnown} onChange={() => setAlertKnown(!alertKnown)} />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="settings-card-footer">
                  <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleTestConnection} disabled={isTestingConnection}>
                    {isTestingConnection ? <Loader2 size={16} className="animate-spin" /> : null}
                    Test Connection
                  </button>
                  <button className="btn-primary" onClick={handleSave} disabled={isLoading}>
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* 🧠 AI ENGINE SETTINGS */}
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
                      type="range" 
                      min="0.4" 
                      max="0.95" 
                      step="0.01" 
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
                      type="number" 
                      className="form-input" 
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

            {/* 💾 DATABASE & SYSTEM */}
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

      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
