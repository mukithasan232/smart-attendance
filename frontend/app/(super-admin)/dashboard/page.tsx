"use client";

import React from 'react';
import { DollarSign, Building, UserPlus, Activity, CheckCircle2, XCircle } from 'lucide-react';

const DUMMY_PAYMENTS = [
  { id: 1, client: 'Acme Corp', plan: 'Enterprise', amount: '$5,000', status: 'Paid', date: 'Oct 12, 2026' },
  { id: 2, client: 'Globex Inc', plan: 'Pro', amount: '$1,000', status: 'Paid', date: 'Oct 11, 2026' },
  { id: 3, client: 'Initech', plan: 'Starter', amount: '$0', status: 'Paid', date: 'Oct 10, 2026' },
  { id: 4, client: 'Soylent Corp', plan: 'Pro', amount: '$1,000', status: 'Failed', date: 'Oct 09, 2026' },
  { id: 5, client: 'Stark Industries', plan: 'Enterprise', amount: '$5,000', status: 'Paid', date: 'Oct 08, 2026' },
];

export default function SuperAdminDashboard() {
  return (
    <div className="w-full flex flex-col gap-6 lg:gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              SaaS Control Center
            </h1>
            <span className="badge bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50 uppercase tracking-widest text-[10px]">
              Super Admin
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Overview of revenue, tenants, and system metrics.
          </p>
        </div>
      </div>

      {/* Stats Cards (4 Column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1 */}
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total MRR</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">$4,250</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              +15% from last month
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Clients</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
              <Building size={20} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">124</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-1">
              Across 3 regions
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Signups (This Week)</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center">
              <UserPlus size={20} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">+12</span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1 flex items-center gap-1">
              Trial conversions
            </span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Churn Rate</span>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 flex items-center justify-center">
              <Activity size={20} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">1.2%</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              Very healthy
            </span>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col w-full overflow-hidden mt-2">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Recent Payments</h2>
        </div>

        <div className="table-wrap">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {DUMMY_PAYMENTS.map((payment) => (
                <tr key={payment.id} className="table-row border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="font-semibold text-slate-800 dark:text-slate-200">{payment.client}</td>
                  <td>
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {payment.plan}
                    </span>
                  </td>
                  <td className="font-medium tabular-nums">{payment.amount}</td>
                  <td>
                    {payment.status === 'Paid' ? (
                      <span className="badge badge-green flex w-fit items-center gap-1">
                        <CheckCircle2 size={12} /> Paid
                      </span>
                    ) : (
                      <span className="badge badge-red flex w-fit items-center gap-1">
                        <XCircle size={12} /> Failed
                      </span>
                    )}
                  </td>
                  <td className="text-slate-500 dark:text-slate-400 text-sm">{payment.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
