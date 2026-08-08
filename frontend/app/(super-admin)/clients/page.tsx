"use client";

import React from 'react';
import { Plus, Search, Building2, CheckCircle2, XCircle, MoreVertical } from 'lucide-react';

const DUMMY_CLIENTS = [
  { id: 1, name: 'Acme Corp', subdomain: 'acme', plan: 'Enterprise', status: 'Active', joined: 'Oct 12, 2026', users: 1250 },
  { id: 2, name: 'Globex Inc', subdomain: 'globex', plan: 'Pro', status: 'Active', joined: 'Oct 11, 2026', users: 450 },
  { id: 3, name: 'Initech', subdomain: 'initech', plan: 'Starter', status: 'Suspended', joined: 'Oct 10, 2026', users: 15 },
  { id: 4, name: 'Soylent Corp', subdomain: 'soylent', plan: 'Pro', status: 'Active', joined: 'Oct 09, 2026', users: 890 },
  { id: 5, name: 'Stark Industries', subdomain: 'stark', plan: 'Enterprise', status: 'Active', joined: 'Oct 08, 2026', users: 5400 },
];

export default function ClientsPage() {
  return (
    <div className="w-full flex flex-col gap-6 lg:gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Building2 className="text-indigo-600 dark:text-indigo-400" size={28} />
            Tenant Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage all organizations using the SaaS platform.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add New Client
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search clients by name or subdomain..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
          />
        </div>
        <select className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
          <option>All Plans</option>
          <option>Enterprise</option>
          <option>Pro</option>
          <option>Starter</option>
        </select>
        <select className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
          <option>All Status</option>
          <option>Active</option>
          <option>Suspended</option>
        </select>
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col w-full overflow-hidden">
        <div className="table-wrap">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Subdomain</th>
                <th>Current Plan</th>
                <th>Total Users</th>
                <th>Status</th>
                <th>Joined Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {DUMMY_CLIENTS.map((client) => (
                <tr key={client.id} className="table-row border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                        {client.name.substring(0, 2)}
                      </div>
                      {client.name}
                    </div>
                  </td>
                  <td className="text-slate-500 dark:text-slate-400 font-mono text-xs">
                    {client.subdomain}.codernest.cloud
                  </td>
                  <td>
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {client.plan}
                    </span>
                  </td>
                  <td className="font-medium tabular-nums text-slate-700 dark:text-slate-300">
                    {client.users.toLocaleString()}
                  </td>
                  <td>
                    {client.status === 'Active' ? (
                      <span className="badge badge-green flex w-fit items-center gap-1">
                        <CheckCircle2 size={12} /> Active
                      </span>
                    ) : (
                      <span className="badge badge-red flex w-fit items-center gap-1">
                        <XCircle size={12} /> Suspended
                      </span>
                    )}
                  </td>
                  <td className="text-slate-500 dark:text-slate-400 text-sm">{client.joined}</td>
                  <td className="text-right">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <MoreVertical size={18} />
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
