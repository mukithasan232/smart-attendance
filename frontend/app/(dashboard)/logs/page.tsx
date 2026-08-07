"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getEvents,
  snapshotUrl,
  registerPersonFromEvent,
  DetectionEvent,
} from "@/lib/api";
import {
  Search, Download, RefreshCw, ShieldCheck, ShieldAlert,
  Eye, UserPlus, CheckCircle, AlertCircle, ClipboardList,
  CalendarDays, X,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — used when the backend is offline.
// TODO: Remove mock data once the FastAPI backend is reachable in production.
//       The real fetch happens in fetchEvents() below via GET /api/events.
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_EVENTS: DetectionEvent[] = [
  {
    id: 1,
    person_id: 12,
    person_name: "Alex Mercer",
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    snapshot_path: "",
    status: "Known",
    buffer_status: "added",
    camera_id: "cam-01 · Main Entrance",
  },
  {
    id: 2,
    person_id: null,
    person_name: "Unknown",
    timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    snapshot_path: "",
    status: "Unknown",
    buffer_status: "pending",
    camera_id: "cam-02 · Back Door",
  },
  {
    id: 3,
    person_id: 7,
    person_name: "Sarah Connor",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    snapshot_path: "",
    status: "Known",
    buffer_status: "added",
    camera_id: "cam-01 · Main Entrance",
  },
  {
    id: 4,
    person_id: null,
    person_name: "Unknown",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    snapshot_path: "",
    status: "Unknown",
    buffer_status: "ignored",
    camera_id: "cam-03 · Lobby",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts: string) {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function isWithinRange(ts: string, range: string): boolean {
  const date = new Date(ts).getTime();
  const now = Date.now();
  if (range === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return date >= start.getTime();
  }
  if (range === "7d") return date >= now - 7 * 86400_000;
  if (range === "30d") return date >= now - 30 * 86400_000;
  return true; // "all"
}

// ── Avatar initials ───────────────────────────────────────────────────────────

function AvatarInitial({ name, isKnown }: { name: string; isKnown: boolean }) {
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        isKnown ? "bg-indigo-100 text-indigo-700" : "bg-red-100 text-red-700"
      }`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      {[56, 160, 90, 130, 120].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 rounded-md bg-slate-200 animate-pulse" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const [events, setEvents]       = useState<DetectionEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [search, setSearch]       = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"All" | "Known" | "Unknown">("All");
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Data fetching ─────────────────────────────────────────────────────────
  // TODO: Replace MOCK_EVENTS fallback with a proper error boundary / empty state
  //       once the FastAPI backend at /api/events is always reachable.
  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents(200); // GET /api/events?limit=200
      setEvents(data);
      setUsingMock(false);
    } catch {
      // Backend offline — fall back to mock data so the UI is still useful
      setEvents(MOCK_EVENTS);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Register unknown person ───────────────────────────────────────────────
  const handleMakeKnown = async (eventId: number) => {
    const name = window.prompt("Enter name for this person:");
    if (!name?.trim()) return;
    try {
      await registerPersonFromEvent(eventId, name.trim());
      showToast(`Registered "${name.trim()}" successfully!`, "success");
      fetchEvents();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to register person.", "error");
    }
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const header = ["ID", "Name / Visitor ID", "Classification", "Camera Source", "Timestamp"];
    const rows = filtered.map(e =>
      [e.id, e.person_name, e.status, e.camera_id, e.timestamp].join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // eslint-disable-next-line
    a.download = `visitor-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = events.filter(ev => {
    const matchStatus = statusFilter === "All" || ev.status === statusFilter;
    const matchDate   = isWithinRange(ev.timestamp, dateRange);
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      ev.person_name.toLowerCase().includes(q) ||
      ev.camera_id.toLowerCase().includes(q) ||
      String(ev.id).includes(q);
    return matchStatus && matchDate && matchSearch;
  });

  const knownCount   = events.filter(e => e.status === "Known").length;
  const unknownCount = events.filter(e => e.status === "Unknown").length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Snapshot Preview Modal ── */}
      {selectedSnapshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedSnapshot(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selectedSnapshot}
              alt="Detection snapshot"
              className="w-full object-cover max-h-[70vh]"
              onError={e => { e.currentTarget.src = "https://placehold.co/600x400?text=Image+Not+Found"; }}
            />
            <div className="p-4 flex justify-end border-t border-slate-100">
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
              >
                <X size={14} /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Page Content ── */}
      <div className="p-6 lg:p-8 flex flex-col gap-6 bg-slate-50 min-h-screen">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 lg:gap-6 mb-6 md:mb-8 w-full">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Visitor Logs</h1>
            <p className="text-slate-500 text-sm mt-1">
              Historical record of all recognized and unknown faces.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {usingMock && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                <AlertCircle size={12} /> Demo data — backend offline
              </span>
            )}
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 border border-indigo-600"
            >
              <Download size={15} /> Export CSV
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: "Total Events",    value: events.length, color: "text-indigo-600",  bg: "bg-indigo-50",  icon: <ClipboardList size={20} className="text-indigo-500" /> },
            { label: "Known Visitors",  value: knownCount,    color: "text-emerald-600", bg: "bg-emerald-50", icon: <ShieldCheck   size={20} className="text-emerald-500" /> },
            { label: "Unknown / Alerts",value: unknownCount,  color: "text-red-600",     bg: "bg-red-50",     icon: <ShieldAlert   size={20} className="text-red-500" /> },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-[20px] shadow-sm border border-slate-100 p-6 lg:p-8 flex items-center gap-4">
              <div className={`${s.bg} w-12 h-12 rounded-full flex items-center justify-center`}>{s.icon}</div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                <p className={`text-3xl font-extrabold mt-1 ${s.color}`}>
                  {loading
                    ? <span className="inline-block w-12 h-6 bg-slate-200 rounded animate-pulse" />
                    : s.value
                  }
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-[20px] p-6 lg:p-8 shadow-sm border border-slate-100">

          {/* ── Action Bar ── */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 lg:gap-6 mb-6 md:mb-8 w-full border-b border-slate-200 pb-4">

            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or ID…"
                className="w-full md:w-auto md:min-w-[300px] px-4 py-2.5 rounded-xl border border-slate-200 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-shadow"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Date range dropdown */}
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 appearance-none cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {(["All", "Known", "Unknown"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === f
                      ? "bg-white shadow-sm text-slate-800"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* ── Table ── */}
          <div className="w-full overflow-x-auto bg-white rounded-[20px] border border-slate-100">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr>
                  {/* Columns per spec: Profile · Name/Visitor ID · Classification · Camera Source · Timestamp */}
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">Profile</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">Name / Visitor ID</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">Classification</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">Camera Source</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">Timestamp</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {/* Skeleton loader */}
                {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

                {/* Empty state */}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <ShieldCheck size={40} strokeWidth={1.5} />
                        <p className="font-medium text-slate-500">No records found</p>
                        <p className="text-xs">
                          {search || statusFilter !== "All" || dateRange !== "all"
                            ? "Try adjusting your filters."
                            : "The system is monitoring — events will appear here."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Data rows */}
                {!loading && filtered.map(ev => {
                  const imgUrl  = snapshotUrl(ev.snapshot_path);
                  const isKnown = ev.status === "Known";
                  return (
                    <tr
                      key={ev.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >

                      {/* ── Profile (snapshot thumbnail) ── */}
                      <td className="px-6 py-4.5 border-b border-slate-50">
                        {imgUrl ? (
                          <button
                            onClick={() => setSelectedSnapshot(imgUrl)}
                            className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 hover:ring-2 hover:ring-indigo-400 transition-all flex-shrink-0 block"
                            title="View full snapshot"
                          >
                            <img
                              src={imgUrl}
                              alt="snapshot"
                              className="w-full h-full object-cover"
                              onError={e => { e.currentTarget.src = "https://placehold.co/100x100?text=?"; }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                              <Eye size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ) : (
                          /* No snapshot — show avatar initials as fallback */
                          <AvatarInitial name={ev.person_name} isKnown={isKnown} />
                        )}
                      </td>

                      {/* ── Name / Visitor ID ── */}
                      <td className="px-6 py-4.5 border-b border-slate-50">
                        <div className="flex items-center gap-2.5">
                          {imgUrl && <AvatarInitial name={ev.person_name} isKnown={isKnown} />}
                          <div>
                            <p className="font-semibold text-slate-800 text-sm leading-tight">
                              {ev.person_name}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              {isKnown ? `PID-${ev.person_id}` : `EVT-${ev.id}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* ── Classification badge ── */}
                      <td className="px-6 py-4.5 border-b border-slate-50">
                        <span className={`px-2.5 py-1 inline-flex items-center gap-1.5 rounded-md font-bold text-xs ${
                          isKnown
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {isKnown
                            ? <ShieldCheck size={11} />
                            : <ShieldAlert size={11} />}
                          {ev.status}
                        </span>
                        {ev.buffer_status === "ignored" && (
                          <span className="ml-2 text-xs text-slate-400">(ignored)</span>
                        )}
                      </td>

                      {/* ── Camera Source ── */}
                      <td className="px-6 py-4.5 border-b border-slate-50">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-mono bg-slate-100 px-2 py-1 rounded-md">
                          {ev.camera_id}
                        </span>
                      </td>

                      {/* ── Timestamp ── */}
                      <td className="px-6 py-4.5 border-b border-slate-50 text-slate-500 text-xs tabular-nums">
                        {formatTime(ev.timestamp)}
                      </td>

                      {/* ── Action ── */}
                      <td className="px-6 py-4.5 border-b border-slate-50">
                        {!isKnown && ev.buffer_status !== "added" && (
                          <button
                            onClick={() => handleMakeKnown(ev.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-colors"
                          >
                            <UserPlus size={12} /> Register
                          </button>
                        )}
                        {ev.buffer_status === "added" && (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle size={12} /> Registered
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Table Footer ── */}
          {!loading && (
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
              <span>
                Showing{" "}
                <span className="font-semibold text-slate-700">{filtered.length}</span>
                {" "}of{" "}
                <span className="font-semibold text-slate-700">{events.length}</span>
                {" "}events
                {usingMock && <span className="ml-2 text-amber-600">(demo data)</span>}
              </span>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
