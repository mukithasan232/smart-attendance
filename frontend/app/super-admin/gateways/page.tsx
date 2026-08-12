'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

type Gateway = {
  id: string;
  providerName: string;
  apiKey: string;
  secretKey: string;
  webhookSecret: string | null;
  isActive: boolean;
};

export default function GatewaysAdminPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [providerName, setProviderName] = useState('Stripe');
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      const res = await fetch('/api/admin/gateways');
      if (!res.ok) throw new Error('Failed to fetch gateways');
      const data = await res.json();
      setGateways(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (g: Gateway) => {
    setProviderName(g.providerName);
    setApiKey(g.apiKey);
    setSecretKey(g.providerName === 'Manual' ? 'manual-secret' : ''); // Force them to re-enter if they want to update, except manual
    setWebhookSecret('');
    setIsActive(g.isActive);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const payload = {
        providerName,
        apiKey,
        secretKey: providerName === 'Manual' ? 'manual-secret' : secretKey,
        webhookSecret,
        isActive
      };

      const res = await fetch('/api/admin/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save gateway');

      setStatus({ type: 'success', message: data.message });
      fetchGateways(); // Refresh list
      
      // Clear sensitive fields
      setSecretKey('');
      setWebhookSecret('');
      
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Payment Gateways
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Configure and manage your payment integrations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="md:col-span-1 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Add / Edit Gateway</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {status && (
              <div className={`p-3 rounded-md text-sm flex gap-2 items-start ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30' : 'bg-red-50 text-red-700 dark:bg-red-950/30'}`}>
                {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <span>{status.message}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Provider Name</label>
              <select 
                value={providerName} 
                onChange={e => setProviderName(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-none"
              >
                <option value="Stripe">Stripe</option>
                <option value="Razorpay">Razorpay</option>
                <option value="PayPal">PayPal</option>
                <option value="SSLCommerz">SSLCommerz</option>
                <option value="Manual">Manual (Bank/bKash/Nagad)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {providerName === 'Manual' ? 'Payment Instructions' : 'Public API Key'}
              </label>
              {providerName === 'Manual' ? (
                <textarea 
                  required
                  value={apiKey} onChange={e => setApiKey(e.target.value)}
                  placeholder="e.g. Send money to bKash 017XXXXXX and provide Transaction ID below."
                  className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-black dark:focus:border-white focus:ring-1 outline-none h-24 resize-none"
                />
              ) : (
                <input 
                  type="text" required
                  value={apiKey} onChange={e => setApiKey(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-black dark:focus:border-white focus:ring-1 outline-none"
                />
              )}
            </div>

            {providerName !== 'Manual' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Secret Key</label>
                  <input 
                    type="password" required
                    value={secretKey} onChange={e => setSecretKey(e.target.value)}
                    placeholder="Required for saving"
                    className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-black dark:focus:border-white focus:ring-1 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Webhook Secret (Optional)</label>
                  <input 
                    type="password" 
                    value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)}
                    placeholder="For verifying webhooks"
                    className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:border-black dark:focus:border-white focus:ring-1 outline-none"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" id="isActive"
                checked={isActive} onChange={e => setIsActive(e.target.checked)}
                className="rounded border-zinc-300 text-black focus:ring-black"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Enable this gateway</label>
            </div>

            <button 
              type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2 rounded-md font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Configuration
            </button>
          </form>
        </div>

        {/* List Section */}
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold">Configured Gateways</h3>
            </div>
            
            <div className="p-0">
              {loading ? (
                <div className="p-8 text-center text-zinc-500">Loading...</div>
              ) : gateways.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">No gateways configured yet.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">Provider</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Public Key</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {gateways.map(g => (
                      <tr key={g.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                        <td className="px-4 py-3 font-medium">{g.providerName}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${g.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                            {g.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-500 truncate max-w-[150px]">
                          {g.apiKey}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEdit(g)} className="text-blue-600 hover:underline dark:text-blue-400 font-medium">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
