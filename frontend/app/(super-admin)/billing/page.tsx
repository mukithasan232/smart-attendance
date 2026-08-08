"use client";

import React from 'react';
import { Receipt, CheckCircle2, XCircle, Download, Clock } from 'lucide-react';

const DUMMY_TRANSACTIONS = [
  { id: 'INV-2026-001', client: 'Acme Corp', amount: '$5,000', status: 'Paid', date: 'Oct 12, 2026' },
  { id: 'INV-2026-002', client: 'Globex Inc', amount: '$1,000', status: 'Paid', date: 'Oct 11, 2026' },
  { id: 'INV-2026-003', client: 'Wayne Ent', amount: '$1,000', status: 'Pending', date: 'Oct 10, 2026' },
  { id: 'INV-2026-004', client: 'Soylent Corp', amount: '$1,000', status: 'Failed', date: 'Oct 09, 2026' },
  { id: 'INV-2026-005', client: 'Stark Industries', amount: '$5,000', status: 'Paid', date: 'Oct 08, 2026' },
  { id: 'INV-2026-006', client: 'Oscorp', amount: '$5,000', status: 'Pending', date: 'Oct 07, 2026' },
];

export default function BillingPage() {
  return (
    <div className="w-full flex flex-col gap-6 lg:gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Receipt className="text-indigo-600 dark:text-indigo-400" size={28} />
            Revenue & Billing
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Master transaction log across all tenants and subscriptions.
          </p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Download size={18} /> Export CSV
        </button>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Processed (YTD)</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white">$142,500</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pending Invoices</p>
          <p className="text-3xl font-extrabold text-amber-500">$6,000</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Failed (Last 30 days)</p>
          <p className="text-3xl font-extrabold text-red-500">$1,000</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col w-full overflow-hidden">
        <div className="table-wrap">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Client Name</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-right">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {DUMMY_TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="table-row border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{tx.id}</td>
                  <td className="font-bold text-slate-800 dark:text-slate-200">{tx.client}</td>
                  <td className="font-medium tabular-nums text-slate-700 dark:text-slate-300">{tx.amount}</td>
                  <td>
                    {tx.status === 'Paid' ? (
                      <span className="badge badge-green flex w-fit items-center gap-1">
                        <CheckCircle2 size={12} /> Paid
                      </span>
                    ) : tx.status === 'Pending' ? (
                      <span className="badge flex w-fit items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                        <Clock size={12} /> Pending
                      </span>
                    ) : (
                      <span className="badge badge-red flex w-fit items-center gap-1">
                        <XCircle size={12} /> Failed
                      </span>
                    )}
                  </td>
                  <td className="text-slate-500 dark:text-slate-400 text-sm">{tx.date}</td>
                  <td className="text-right">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <Download size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
