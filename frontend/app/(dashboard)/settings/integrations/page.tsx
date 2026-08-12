"use client";

import { useState, useEffect } from 'react';
import { PageWrapper } from "@/components/ui/PageWrapper";
import { Card } from "@/components/ui/Card";
import { Plug, Save, Loader2, Send, MessageCircle } from "lucide-react";

export default function IntegrationsSettingsPage() {
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/user/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setTelegramBotToken(data.settings.telegramBotToken || '');
          setTelegramChatId(data.settings.telegramChatId || '');
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramBotToken,
          telegramChatId,
        })
      });

      if (!res.ok) throw new Error('Failed to save settings');
      
      setToast({ message: 'Settings saved successfully!', type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || 'An error occurred', type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const testTelegram = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/user/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramBotToken,
          chatId: telegramChatId,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send test message');
      
      setToast({ message: 'Test message sent to your Telegram!', type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || 'An error occurred', type: 'error' });
    } finally {
      setIsTesting(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <PageWrapper title="Telegram & Alert Integrations" subtitle="Configure personal Telegram Bot Token and Chat ID for instant face-detection alerts.">
      <Card className="max-w-2xl">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 mb-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-xl flex items-center justify-center">
              <MessageCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Telegram Alerts</h3>
              <p className="text-slate-500 text-sm">Receive instant notifications when persons are recognized.</p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800/50 text-sm">
            Receive instant alerts for camera events directly to your personal Telegram account. Create a bot using @BotFather on Telegram to get your token.
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telegram Bot Token</label>
              <input
                type="password"
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                placeholder="e.g. 123456789:ABCdefGHIjklMNO..."
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telegram Chat ID</label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="e.g. -100123456789"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <button
              onClick={saveSettings}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Settings
            </button>
            <button
              onClick={testTelegram}
              disabled={isTesting || !telegramBotToken || !telegramChatId}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-all disabled:opacity-50"
            >
              {isTesting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              Test Connection
            </button>
          </div>
        </div>
      </Card>
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-bold text-white animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}
    </PageWrapper>
  );
}
