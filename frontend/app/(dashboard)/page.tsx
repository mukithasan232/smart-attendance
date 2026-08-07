"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Users, AlertTriangle, Video, Activity, TrendingUp, TrendingDown,
  ShieldCheck, ShieldAlert, RefreshCw, Clock, Wifi,
} from "lucide-react";
import { getEvents, getStatus, DetectionEvent, SystemStatus } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — used when the backend is offline.
// TODO: Replace with real API calls once FastAPI backend is reachable.
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_TRAFFIC: { day: string; known: number; unknown: number; total: number }[] = [
  { day: "Mon", known: 38, unknown: 4,  total: 42 },
  { day: "Tue", known: 52, unknown: 7,  total: 59 },
  { day: "Wed", known: 61, unknown: 5,  total: 66 },
  { day: "Thu", known: 45, unknown: 9,  total: 54 },
  { day: "Fri", known: 78, unknown: 12, total: 90 },
  { day: "Sat", known: 33, unknown: 3,  total: 36 },
  { day: "Sun", known: 29, unknown: 2,  total: 31 },
];

const MOCK_RECENT: DetectionEvent[] = [
  { id: 101, person_id: 5,    person_name: "Alex Mercer",   timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),  snapshot_path: "", status: "Known",   buffer_status: "added",   camera_id: "cam-01" },
  { id: 102, person_id: null, person_name: "Unknown",        timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),  snapshot_path: "", status: "Unknown", buffer_status: "pending", camera_id: "cam-02" },
  { id: 103, person_id: 12,   person_name: "Sarah Connor",  timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), snapshot_path: "", status: "Known",   buffer_status: "added",   camera_id: "cam-01" },
  { id: 104, person_id: null, person_name: "Unknown",        timestamp: new Date(Date.now() - 1000 * 60 * 28).toISOString(), snapshot_path: "", status: "Unknown", buffer_status: "ignored", camera_id: "cam-03" },
  { id: 105, person_id: 3,    person_name: "James Walker",  timestamp: new Date(Date.now() - 1000 * 60 * 41).toISOString(), snapshot_path: "", status: "Known",   buffer_status: "added",   camera_id: "cam-01" },
];

const MOCK_STATUS: SystemStatus = {
  status: "running",
  camera_id: "cam-01",
  camera_running: true,
  known_persons_count: 24,
  timestamp: new Date().toISOString(),
  version: "2.0.0",
};

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

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  title, value, icon, trend, trendLabel, accent, loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent: "indigo" | "red" | "emerald" | "violet";
  loading?: boolean;
}) {
  const accents = {
    indigo:  { iconBg: "bg-indigo-50 text-indigo-600" },
    red:     { iconBg: "bg-red-50 text-red-600" },
    emerald: { iconBg: "bg-emerald-50 text-emerald-600" },
    violet:  { iconBg: "bg-violet-50 text-violet-600" },
  };
  const a = accents[accent];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow h-full">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">{title}</p>
        <div className={`p-2 rounded-lg ${a.iconBg}`}>
          {icon}
        </div>
      </div>
      
      {/* Middle Row */}
      <div>
        {loading ? (
          <div className="mt-1 h-8 w-24 bg-slate-200 rounded animate-pulse" />
        ) : (
          <p className="text-3xl font-bold text-slate-800 tabular-nums">{value}</p>
        )}
      </div>

      {/* Bottom Row */}
      <div className="mt-4">
        {trendLabel && !loading && (
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
            trend === "up"   ? "bg-emerald-50 text-emerald-600" :
            trend === "down" ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"
          }`}>
            {trend === "up"   && <TrendingUp  size={14} />}
            {trend === "down" && <TrendingDown size={14} />}
            {trendLabel}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Live Activity Feed Item ───────────────────────────────────────────────────

function FeedItem({ ev, animate }: { ev: DetectionEvent; animate: boolean }) {
  const isKnown = ev.status === "Known";
  return (
    <div className={`flex items-center justify-between py-4 border-b border-slate-100 last:border-0 transition-all duration-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}>
      <div className="flex items-center gap-4 min-w-0">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          isKnown ? "bg-indigo-100 text-indigo-700" : "bg-red-100 text-red-700"
        }`}>
          {ev.person_name.charAt(0).toUpperCase()}
        </div>
        {/* Info */}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{ev.person_name}</p>
          <p className="text-xs text-slate-400 truncate mt-0.5">{ev.camera_id}</p>
        </div>
      </div>
      {/* Badge + time */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isKnown ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        }`}>
          {isKnown ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
          {ev.status}
        </span>
        <span className="text-xs text-slate-400 tabular-nums font-medium">{timeAgo(ev.timestamp)}</span>
      </div>
    </div>
  );
}

// ── Donut Chart (Known vs Unknown) ────────────────────────────────────────────

const DONUT_COLORS = ["#6366f1", "#f87171"];

function KnownUnknownDonut({ known, unknown }: { known: number; unknown: number }) {
  const data = [
    { name: "Known",   value: known   || 0 },
    { name: "Unknown", value: unknown || 0 },
  ];
  const total = known + unknown || 1;
  const pct   = Math.round((known / total) * 100);

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: "100%", height: 200, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 12, color: "#fff" }}
              formatter={(v: unknown, n: unknown) => [`${v} events`, String(n)]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-slate-800">{pct}%</span>
          <span className="text-sm font-medium text-slate-500">Known</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex gap-5 mt-4">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-sm text-slate-700">
            <span className="w-3 h-3 rounded-full shadow-sm" style={{ background: DONUT_COLORS[i] }} />
            <span className="font-semibold">{d.name}</span>
            <span className="text-slate-500 font-medium">({d.value})</span>
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
  const [traffic]   = useState(MOCK_TRAFFIC);
  const [loading,   setLoading]   = useState(true);
  const [usingMock, setUsingMock] = useState(false);
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
      setEvents(evData);
      setStatus(sysStatus);
      setUsingMock(false);
    } catch {
      // Backend offline — use mock data
      setEvents(MOCK_RECENT);
      setStatus(MOCK_STATUS);
      setUsingMock(true);
      // TODO: Remove mock fallback once backend is always reachable
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
  const totalToday   = todayEvents.length   || (usingMock ? 142 : 0);
  const unknownToday = todayEvents.filter(e => e.status === "Unknown").length || (usingMock ? 8 : 0);
  const knownToday   = totalToday - unknownToday;
  const recentFive   = events.slice(0, 5);

  return (
    <div className="p-6 space-y-6">

      {/* ── Page Header (Clean header row, no double title) ── */}
      <div className="flex items-center justify-between mb-2">
        <div /> {/* Placeholder to push actions to the right if title is handled by layout */}
        <div className="flex items-center gap-3">
          {usingMock && (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium shadow-sm">
              <AlertTriangle size={14} /> Demo mode
            </span>
          )}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white border border-slate-200 shadow-sm rounded-lg px-4 py-2">
            <Clock size={14} className="text-slate-400" />
            {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat Cards (4-column grid) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* TODO: Replace static values with data from GET /api/status + /api/events */}
        <StatCard
          title="Total Visitors Today"
          value={totalToday}
          icon={<Users size={20} />}
          accent="indigo"
          trend="up"
          trendLabel="+12% from yesterday"
          loading={loading}
        />
        <StatCard
          title="Unknown Alerts"
          value={unknownToday}
          icon={<AlertTriangle size={20} />}
          accent="red"
          trend={unknownToday > 5 ? "down" : "up"}
          trendLabel={unknownToday > 5 ? "High — review logs" : "Low — all clear"}
          loading={loading}
        />
        <StatCard
          title="Active Cameras"
          value={status?.camera_running ? "1 / 1" : "0 / 1"}
          icon={
            <div className="relative">
              <Video size={20} />
              {status?.camera_running && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                </span>
              )}
            </div>
          }
          accent="emerald"
          trend="neutral"
          trendLabel={status?.camera_running ? "Live feed active" : "Camera offline"}
          loading={loading}
        />
        <StatCard
          title="System Uptime"
          value={uptimeStr(uptimeStart)}
          icon={<Activity size={20} />}
          accent="violet"
          trend="up"
          trendLabel={`v${status?.version || "2.0.0"} · All systems OK`}
          loading={loading}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Area Chart — Visitor Traffic (2/3 width) */}
        {/* TODO: Replace MOCK_TRAFFIC with GET /api/events/daily-summary once implemented */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Visitor Traffic</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Last 7 days — Known vs Unknown</p>
            </div>
            <div className="flex items-center gap-4 text-sm font-medium">
              <span className="flex items-center gap-2 text-slate-700">
                <span className="w-3.5 h-2 rounded-sm bg-indigo-500 inline-block shadow-sm" /> Known
              </span>
              <span className="flex items-center gap-2 text-slate-700">
                <span className="w-3.5 h-2 rounded-sm bg-red-400 inline-block shadow-sm" /> Unknown
              </span>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={traffic} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradKnown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gradUnknown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f87171" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="known"
                  name="Known"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="url(#gradKnown)"
                  dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#6366f1", strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="unknown"
                  name="Unknown"
                  stroke="#f87171"
                  strokeWidth={3}
                  fill="url(#gradUnknown)"
                  dot={{ r: 4, fill: "#f87171", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#f87171", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut + quick stats (1/3 width) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800">Face Classification</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Today&apos;s known vs unknown ratio</p>
          </div>
          {/* TODO: Replace knownToday/unknownToday with live data from /api/events */}
          <KnownUnknownDonut known={knownToday} unknown={unknownToday} />

          {/* Quick stats with grid background wrappers */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
            {[
              { label: "Registered People", value: status?.known_persons_count ?? 24 },
              { label: "Avg Daily Visitors", value: Math.round(traffic.reduce((s, d) => s + d.total, 0) / traffic.length) },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm border border-slate-100">
                <p className="text-xs text-slate-500 font-medium mb-1.5">{s.label}</p>
                <p className="text-2xl font-bold text-slate-800 tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Live Feed + Camera Status ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent Live Activity Feed (2/3) */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Recent Activity</h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Last 5 detection events — live</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full shadow-sm">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              LIVE
            </div>
          </div>

          {/* TODO: Replace MOCK_RECENT with real events from GET /api/events?limit=5 */}
          <div className="flex flex-col gap-2">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
                    <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2.5">
                      <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse flex-shrink-0" />
                  </div>
                ))
              : recentFive.map((ev) => (
                  <FeedItem key={ev.id} ev={ev} animate={feedVisible} />
                ))
            }
          </div>

          {!loading && (
            <a
              href="/logs"
              className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 py-3 rounded-xl transition-colors"
            >
              View All Logs →
            </a>
          )}
        </div>

        {/* Camera & System Health status (1/3) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-full">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800">System Health</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Live camera & service status</p>
          </div>

          <div className="flex-1 space-y-6">
            {/* Camera status list */}
            {/* TODO: Replace with real camera list from GET /api/settings/cameras */}
            <div className="space-y-4">
              {[
                { name: "Main Entrance", id: "cam-01", active: status?.camera_running ?? true },
                { name: "Back Door",     id: "cam-02", active: false },
                { name: "Lobby",         id: "cam-03", active: false },
              ].map(cam => (
                <div key={cam.id} className="flex items-center justify-between pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cam.active ? "bg-emerald-50" : "bg-slate-50 border border-slate-100"}`}>
                      {cam.active ? <Wifi size={18} className="text-emerald-600" /> : <Video size={18} className="text-slate-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{cam.name}</p>
                      <p className="text-xs font-medium text-slate-400 font-mono mt-0.5 truncate">{cam.id}</p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-md border ${
                    cam.active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-200"
                  }`}>
                    {cam.active ? "Live" : "Offline"}
                  </span>
                </div>
              ))}
            </div>

            {/* System info grid */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-3">
              {[
                { label: "Backend Version", value: status?.version ?? "2.0.0" },
                { label: "Uptime",          value: uptimeStr(uptimeStart) },
                { label: "Known Persons",   value: status?.known_persons_count ?? 24 },
                { label: "Primary Camera",  value: status?.camera_id ?? "cam-01" },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">{row.label}</span>
                  <span className="font-bold text-slate-800">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
