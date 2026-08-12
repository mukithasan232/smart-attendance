'use client';

import { useState, useEffect } from 'react';
import { Receipt, CheckCircle2, AlertCircle, CreditCard, ChevronRight } from 'lucide-react';

type Transaction = {
  id: string;
  status: string;
  amount: number;
  gatewayUsed: string;
  createdAt: string;
};

type Bill = {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  dueDate: string | null;
  description: string | null;
  createdAt: string;
  transactions: Transaction[];
};

type Gateway = {
  id: string;
  providerName: string;
};

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Payment Modal State
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const res = await fetch('/api/billing');
      if (!res.ok) throw new Error('Failed to fetch billing data');
      const data = await res.json();
      setBills(data.bills);
      setGateways(data.availableGateways);
      if (data.availableGateways.length > 0) {
        setSelectedGateway(data.availableGateways[0].providerName);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayInitiate = (bill: Bill) => {
    setSelectedBill(bill);
    setStatus(null);
  };

  const handleCheckout = async () => {
    if (!selectedBill || !selectedGateway) return;
    setProcessing(true);
    setStatus(null);

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId: selectedBill.id, providerName: selectedGateway }),
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to initiate checkout');

      // Mock redirecting to a payment gateway checkout URL
      if (data.checkoutUrl) {
        setStatus({ type: 'success', message: 'Redirecting to payment gateway...' });
        // Normally we would do: window.location.href = data.checkoutUrl;
        // For now, we simulate a successful payment by hitting our webhook mock in a few seconds
        setTimeout(() => {
          simulateWebhook(selectedBill.id, data.transactionId, selectedGateway);
        }, 2000);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
      setProcessing(false);
    }
  };

  // MOCK WEBHOOK FIRING FOR DEMO PURPOSES
  const simulateWebhook = async (billId: string, transactionId: string, providerName: string) => {
    try {
      await fetch('/api/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, transactionId, providerName, status: 'SUCCESS' }),
      });
      setStatus({ type: 'success', message: 'Payment successful!' });
      setTimeout(() => {
        setSelectedBill(null);
        fetchBillingData();
      }, 2000);
    } catch(e) {
       console.error("Webhook sim failed", e);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          Billing & Invoices
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your subscriptions and pay pending invoices.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading bills...</div>
        ) : bills.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">You have no bills.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {bills.map(bill => (
                <tr key={bill.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                    {bill.description || 'Subscription Renewal'}
                  </td>
                  <td className="px-6 py-4">
                    {bill.amount.toFixed(2)} {bill.currency}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      bill.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      bill.status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-500">
                    {new Date(bill.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {bill.status === 'PENDING' ? (
                      <button 
                        onClick={() => handlePayInitiate(bill)}
                        className="inline-flex items-center gap-1 bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 rounded-md font-medium text-xs hover:bg-zinc-800 dark:hover:bg-zinc-200"
                      >
                        Pay Now <ChevronRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-zinc-400 text-xs font-medium">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-bold mb-1">Complete Payment</h3>
            <p className="text-zinc-500 text-sm mb-6">You are paying for {selectedBill.description || 'Invoice'}</p>
            
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 mb-6 flex justify-between items-center">
              <span className="text-zinc-600 dark:text-zinc-300 font-medium">Total Amount</span>
              <span className="text-2xl font-bold">{selectedBill.amount.toFixed(2)} {selectedBill.currency}</span>
            </div>

            {status && (
              <div className={`p-3 rounded-md text-sm mb-4 flex gap-2 items-start ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30' : 'bg-red-50 text-red-700 dark:bg-red-950/30'}`}>
                {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <span>{status.message}</span>
              </div>
            )}

            <div className="space-y-4 mb-8">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Select Payment Method</label>
              
              {gateways.length === 0 ? (
                <div className="text-red-500 text-sm">No payment gateways are currently active. Please contact support.</div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {gateways.map(g => (
                    <label key={g.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedGateway === g.providerName ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-800/50' : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}>
                      <input 
                        type="radio" 
                        name="gateway" 
                        value={g.providerName} 
                        checked={selectedGateway === g.providerName}
                        onChange={() => setSelectedGateway(g.providerName)}
                        className="text-black focus:ring-black"
                      />
                      <CreditCard className="w-5 h-5 text-zinc-500" />
                      <span className="font-medium">{g.providerName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => { setSelectedBill(null); setStatus(null); }}
                disabled={processing}
                className="flex-1 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleCheckout}
                disabled={processing || gateways.length === 0}
                className="flex-1 py-2.5 rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {processing ? 'Processing...' : `Pay ${selectedBill.amount.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
