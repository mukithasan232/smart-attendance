"use client";

import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Globe, CheckCircle2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface HealthData {
  metrics: {
    cpuLoad: number;
    memoryUsage: number;
    memoryTotalGB: string;
    uptimePercent: number;
    connections: number;
  };
  services: {
    id: string;
    name: string;
    region: string;
    status: string;
    latency: number;
    uptime: string;
  }[];
  timestamp: string;
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedMetric, setSelectedMetric] = useState<{title: string, desc: string, value: string, sub: string, icon: any} | null>(null);
  const [selectedService, setSelectedService] = useState<any | null>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/admin/system/health');
      if (!res.ok) throw new Error('Failed to fetch health data');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const allOperational = data?.services.every(s => s.status === 'Operational') ?? false;

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
        {isLoading && !data ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 text-sm">
            <Loader2 size={16} className="animate-spin" /> Fetching...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm font-bold shadow-sm">
            <AlertTriangle size={16} /> Error fetching health
          </div>
        ) : (
          <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-bold shadow-sm ${allOperational ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${allOperational ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
            {allOperational ? 'All Systems Operational' : 'Degraded Performance'}
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            title: 'CPU Load',
            value: data ? `${data.metrics.cpuLoad}%` : '--%',
            sub: 'Normal',
            percent: data?.metrics.cpuLoad || 0,
            icon: <Server className="text-blue-500" size={24} />,
            color: 'bg-blue-500',
            desc: 'Real-time CPU load average across all cores.',
          },
          {
            title: 'Memory',
            value: data ? `${data.metrics.memoryUsage}%` : '--%',
            sub: data ? `${data.metrics.memoryTotalGB} GB Total` : '-- GB',
            percent: data?.metrics.memoryUsage || 0,
            icon: <Database className="text-purple-500" size={24} />,
            color: 'bg-purple-500',
            desc: 'System RAM utilization currently active.',
          },
          {
            title: 'API Uptime',
            value: data ? `${data.metrics.uptimePercent}%` : '--%',
            sub: 'Last 30 days',
            percent: data?.metrics.uptimePercent || 0,
            icon: <Globe className="text-emerald-500" size={24} />,
            color: 'bg-emerald-500',
            desc: 'Percentage of time the core API has been available.',
          },
          {
            title: 'Connections',
            value: data ? data.metrics.connections.toLocaleString() : '--',
            sub: 'WebSockets',
            percent: data ? Math.min((data.metrics.connections / 2000) * 100, 100) : 0,
            icon: <Activity className="text-orange-500" size={24} />,
            color: 'bg-orange-500',
            desc: 'Number of active WebSocket connections to the streaming gateway.',
          }
        ].map((metric, idx) => (
          <div key={idx} 
               onClick={() => setSelectedMetric(metric)}
               className="bg-white dark:bg-slate-800 rounded-[20px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              {metric.icon}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{metric.title}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{metric.value}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{metric.sub}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-4 overflow-hidden">
              <div className={`${metric.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${metric.percent}%` }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Services List */}
      <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col gap-6 mt-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Service Status</h3>
          <span className="text-xs text-slate-500">Auto-refreshes every 10s</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.services || []).map(service => {
            const isOk = service.status === 'Operational';
            return (
              <div key={service.id} 
                   onClick={() => setSelectedService(service)}
                   className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:border-slate-300 dark:hover:border-slate-500 transition-colors">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 dark:text-white">{service.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{service.region}</span>
                </div>
                <span className={`flex items-center gap-1.5 text-sm font-bold ${isOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {isOk ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} 
                  {service.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metric Modal */}
      {selectedMetric && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {selectedMetric.icon}
                <h3 className="text-xl font-bold">{selectedMetric.title} Diagnostics</h3>
              </div>
              <button onClick={() => setSelectedMetric(null)} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedMetric.desc}</p>
                  <div className="mt-4 flex items-end gap-3">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{selectedMetric.value}</span>
                    <span className="text-sm font-medium text-slate-500 mb-1">{selectedMetric.sub}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Historical Trend (Last 24h)</h4>
                  <div className="h-32 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                    <span className="text-xs font-mono text-slate-400">Chart rendering...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Activity className="text-indigo-500" size={24} />
                <h3 className="text-xl font-bold">{selectedService.name} Status</h3>
              </div>
              <button onClick={() => setSelectedService(null)} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Latency</span>
                    <span className="text-xl font-black">{selectedService.latency} ms</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Uptime</span>
                    <span className="text-xl font-black">{selectedService.uptime}</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Region</span>
                    <span className="text-sm font-semibold">{selectedService.region}</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Status</span>
                    <span className={`text-sm font-bold ${selectedService.status === 'Operational' ? 'text-emerald-500' : 'text-amber-500'}`}>{selectedService.status}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Recent Logs</h4>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-[10px] text-emerald-400 h-32 overflow-y-auto">
                    <div>[03:12:45] Health check ping successful...</div>
                    <div>[03:12:55] Health check ping successful...</div>
                    <div>[03:13:05] Health check ping successful...</div>
                    <div>[03:13:15] Replicating data to secondary...</div>
                    <div>[03:13:25] Health check ping successful...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
