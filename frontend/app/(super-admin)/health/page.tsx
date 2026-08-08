"use client";

import React from 'react';
import { Activity, Server, Database, Globe, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function HealthPage() {
  return (
    <div className="w-full flex flex-col gap-6 lg:gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Activity className="text-indigo-600 dark:text-indigo-400" size={28} />
            System Infrastructure
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time monitoring of server health and active services.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-400 text-sm font-bold shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          All Systems Operational
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <Server className="text-blue-500" size={24} />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CPU Load</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">42%</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">Normal</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-4 overflow-hidden">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '42%' }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <Database className="text-purple-500" size={24} />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Memory</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">68%</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">21.4 GB</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-4 overflow-hidden">
            <div className="bg-purple-500 h-2 rounded-full" style={{ width: '68%' }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <Globe className="text-emerald-500" size={24} />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">API Uptime</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">99.9%</span>
            <span className="text-sm text-emerald-500 font-medium">Last 30 days</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-4 overflow-hidden">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <Activity className="text-orange-500" size={24} />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Connections</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">1,245</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">WebSockets</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-4 overflow-hidden">
            <div className="bg-orange-500 h-2 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col gap-6 mt-2">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Service Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-white">Core API</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">us-east-1</span>
            </div>
            <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} /> Operational
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-white">Face Recognition Engine</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">gpu-cluster-a</span>
            </div>
            <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} /> Operational
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-white">WebSocket Gateway</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">RTSP Stream Forwarding</span>
            </div>
            <span className="flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle size={16} /> Degraded Performance
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-white">PostgreSQL Database</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Primary Instance</span>
            </div>
            <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} /> Operational
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
