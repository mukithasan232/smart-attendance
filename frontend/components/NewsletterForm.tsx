'use client';

import { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setStatus({ type: 'success', message: data.message });
      setEmail('');
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setStatus(null);
      }, 5000);
      
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">Subscribe to Newsletter</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Get the latest updates right to your inbox.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white disabled:opacity-50"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </div>

        {status && (
          <div
            className={`flex items-start gap-2 p-3 text-sm rounded-md ${
              status.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <p className="mt-0.5">{status.message}</p>
          </div>
        )}
      </form>
    </div>
  );
}
