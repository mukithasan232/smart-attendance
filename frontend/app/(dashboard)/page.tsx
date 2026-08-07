"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Users, AlertTriangle, Video,
  ShieldCheck, ShieldAlert, RefreshCw, Clock, Wifi,
} from "lucide-react";
import { getEvents, getStatus, DetectionEvent, SystemStatus } from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function uptimeStr(startMs: number): string {
  const diff = Math.floor((Date.now() - startMs) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return `${h}h ${m}m`;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl border border-slate-700">
      <p className="font-semibold mb-1.5 text-slate-300">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── HRM Card Component ────────────────────────────────────────────────────────

function HRMCard({
  title, value, icon, iconColor,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor: "blue" | "red" | "amber";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-500",
    red: "bg-red-50 text-red-500",
    amber: "bg-amber-50 text-amber-500",
  };

  return (
    <div className="bg-white rounded-[20px] px-6 py-5 shadow-sm border border-slate-100 flex flex-row items-center justify-between h-full">
      <div className="flex flex-col justify-center m-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          {title}
        </p>
        <p className="text-4xl font-extrabold text-slate-900 leading-none">
          {value}
        </p>
      </div>
      
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${colors[iconColor]}`}>
        {icon}
      </div>
    </div>
  );
}

// ── Live Activity Feed Item ───────────────────────────────────────────────────

function FeedItem({ ev, animate }: { ev: DetectionEvent; animate: boolean }) {
  const isKnown = ev.status === "Known";
  return (
    <div className={`flex items-center justify-between py-4 border-b border-slate-50 last:border-0 transition-all duration-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}>
      <div className="flex items-center gap-4 min-w-0">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 shadow-inner ${
          isKnown ? "bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-700 border border-indigo-200" 
                  : "bg-gradient-to-br from-rose-100 to-rose-50 text-rose-700 border border-rose-200"
        }`}>
          {ev.person_name.charAt(0).toUpperCase()}
        </div>
        {/* Info */}
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{ev.person_name}</p>
          <p className="text-xs text-slate-500 font-medium truncate mt-0.5 flex items-center gap-1">
            <Video size={10} /> {ev.camera_id}
          </p>
        </div>
      </div>
      {/* Badge + time */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={`px-2.5 py-1 inline-flex items-center gap-1.5 rounded-md font-bold text-xs ${
          isKnown ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                  : "bg-rose-50 text-rose-700 border border-rose-100"
        }`}>
          {isKnown ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
          {ev.status}
        </span>
        <span className="text-xs text-slate-400 tabular-nums font-semibold">{timeAgo(ev.timestamp)}</span>
      </div>
    </div>
  );
}

// ── Donut Chart (Known vs Unknown) ────────────────────────────────────────────

const DONUT_COLORS = ["#4f46e5", "#f43f5e"];

function KnownUnknownDonut({ known, unknown }: { known: number; unknown: number }) {
  const data = [
    { name: "Known",   value: known   || 0 },
    { name: "Unknown", value: unknown || 0 },
  ];
  const total = known + unknown || 1;
  const pct   = Math.round((known / total) * 100);

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: "100%", height: 180, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={5}
              dataKey="value"
              strokeWidth={0}
              cornerRadius={4}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 12, color: "#fff", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
              formatter={(v: unknown, n: unknown) => [`${v} events`, String(n)]}
              itemStyle={{ fontWeight: 600 }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{pct}%</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Known</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-6 mt-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-sm shadow-sm" style={{ background: DONUT_COLORS[i] }} />
            <span className="font-bold text-slate-700">{d.name}</span>
            <span className="text-slate-400 font-semibold tabular-nums">({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard Page ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const [events,    setEvents]    = useState<DetectionEvent[]>([]);
  const [status,    setStatus]    = useState<SystemStatus | null>(null);
  const [traffic]   = useState<{ day: string; known: number; unknown: number; total: number }[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [feedVisible, setFeedVisible] = useState(false);
  // eslint-disable-next-line
  const [uptimeStart] = useState(Date.now() - 1000 * 60 * 60 * 3.5); // mock 3.5h uptime
  // eslint-disable-next-line
  const [now, setNow] = useState(Date.now());

  // Tick uptime every minute
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Fetch live data ─────────────────────────────────────────────────────────
  // TODO: Also fetch traffic data from GET /api/events/daily-summary when that
  //       endpoint is implemented. Currently uses hardcoded MOCK_TRAFFIC for the chart.
  const fetchData = useCallback(async () => {
    try {
      const [evData, sysStatus] = await Promise.all([
        getEvents(50),   // GET /api/events?limit=50
        getStatus(),     // GET /api/status
      ]);
      setEvents(evData || []);
      setStatus(sysStatus);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setEvents([]);
    } finally {
      setLoading(false);
      setTimeout(() => setFeedVisible(true), 100);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line
    fetchData();
    const interval = setInterval(fetchData, 10_000); // auto-refresh every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Derived metrics ─────────────────────────────────────────────────────────

  const todayEvents  = events.filter(e => {
    const d = new Date(e.timestamp); const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  });
  const totalToday   = todayEvents.length;
  const unknownToday = todayEvents.filter(e => e.status === "Unknown").length;
  const knownToday   = totalToday - unknownToday;
  const recentFive   = events.slice(0, 5);

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 bg-slate-50 min-h-screen">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 lg:gap-6 mb-6 md:mb-8 w-full">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {new Date(now).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors bg-white">
            Customize Dashboard
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} strokeWidth={2.5} />
            Sync Data
          </button>
        </div>
      </div>

      {/* ── Summary Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <HRMCard 
          title="ACTIVE CAMERAS" 
          value={loading ? "..." : (status?.camera_running ? 1 : 0)} 
          icon={<Video size={20} />} 
          iconColor="blue" 
        />
        <HRMCard 
          title="UNKNOWN ALERTS" 
          value={loading ? "..." : unknownToday} 
          icon={<AlertTriangle size={20} />} 
          iconColor="red" 
        />
        <HRMCard 
          title="TOTAL VISITORS" 
          value={loading ? "..." : totalToday} 
          icon={<Users size={20} />} 
          iconColor="amber" 
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Area Chart — Visitor Traffic (2/3 width) */}
        <div className="xl:col-span-2 bg-white rounded-[20px] p-6 lg:p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Visitor Traffic</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Last 7 days — Known vs Unknown</p>
            </div>
            <div className="flex items-center gap-5 text-sm font-bold">
              <span className="flex items-center gap-2 text-slate-700">
                <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block shadow-sm" /> Known
              </span>
              <span className="flex items-center gap-2 text-slate-700">
                <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block shadow-sm" /> Unknown
              </span>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={traffic} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradKnown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gradUnknown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b", fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="known"
                  name="Known"
                  stroke="#4f46e5"
                  strokeWidth={3.5}
                  fill="url(#gradKnown)"
                  dot={{ r: 4, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#4f46e5", strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="unknown"
                  name="Unknown"
                  stroke="#f43f5e"
                  strokeWidth={3.5}
                  fill="url(#gradUnknown)"
                  dot={{ r: 4, fill: "#f43f5e", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#f43f5e", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut + quick stats (1/3 width) */}
        <div className="bg-white rounded-[20px] p-6 lg:p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">Classification</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Today&apos;s distribution</p>
          </div>
          <KnownUnknownDonut known={knownToday} unknown={unknownToday} />

          {/* Quick stats with grid background wrappers */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
            {[
              { label: "Registered", value: status?.known_persons_count ?? 0 },
              { label: "Avg Visitors", value: traffic.length ? Math.round(traffic.reduce((s, d) => s + d.total, 0) / traffic.length) : 0 },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">{s.label}</p>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Live Feed + Camera Status ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent Live Activity Feed (2/3) */}
        <div className="xl:col-span-2 bg-white rounded-[20px] p-6 lg:p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Recent Activity</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Last 5 detection events</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg shadow-sm">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              Live
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-4 border-b border-slate-50 last:border-0">
                    <div className="w-11 h-11 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2.5">
                      <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-slate-50 rounded animate-pulse" />
                    </div>
                    <div className="h-7 w-20 bg-slate-50 rounded-md animate-pulse flex-shrink-0" />
                  </div>
                ))
              : recentFive.map((ev) => (
                  <FeedItem key={ev.id} ev={ev} animate={feedVisible} />
                ))
            }
          </div>

          {!loading && (
            <Link
              href="/logs"
              className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 py-3.5 rounded-xl transition-colors border border-indigo-100/50"
            >
              View All Logs →
            </Link>
          )}
        </div>

        {/* Camera & System Health status (1/3) */}
        <div className="bg-white rounded-[20px] p-6 lg:p-8 shadow-sm border border-slate-100 flex flex-col h-full">
          <div className="mb-8">
            <h2 className="text-lg font-extrabold text-slate-900">System Health</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Device & service status</p>
          </div>

          <div className="flex-1 space-y-8 flex flex-col">
            {/* Camera status list */}
            <div className="space-y-4 flex-1">
              {[
                { name: "Main Entrance", id: "cam-01", active: status?.camera_running ?? true },
                { name: "Back Door",     id: "cam-02", active: false },
                { name: "Lobby",         id: "cam-03", active: false },
              ].map(cam => (
                <div key={cam.id} className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cam.active ? "bg-emerald-50 border border-emerald-100" : "bg-slate-50 border border-slate-100"}`}>
                      {cam.active ? <Video size={18} className="text-emerald-600" /> : <Video size={18} className="text-slate-300" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{cam.name}</p>
                      <p className="text-[11px] font-semibold tracking-wider text-slate-400 font-mono mt-0.5 truncate uppercase">{cam.id}</p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 px-2.5 py-1 inline-flex items-center gap-1.5 rounded-md font-bold text-xs ${
                    cam.active ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-200"
                  }`}>
                    {cam.active ? "Live" : "Offline"}
                  </span>
                </div>
              ))}
            </div>

            {/* System info grid */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-3 mt-auto">
              {[
                { label: "Core Version",   value: status?.version ?? "2.0.0" },
                { label: "System Uptime",  value: uptimeStr(uptimeStart) },
                { label: "Total Profiles", value: status?.known_persons_count ?? 0 },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-semibold">{row.label}</span>
                  <span className="font-bold text-slate-900">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
