"use client";
/* eslint-disable @next/next/no-img-element */
// components/EventsTable.tsx — Auto-refreshing recent detection events log.

import { useEffect, useState, useCallback } from "react";
import { getEvents, snapshotUrl, registerPersonFromEvent, DetectionEvent } from "@/lib/api";
import { RefreshCw, ShieldCheck, ShieldAlert, Eye, UserPlus, CheckCircle, AlertCircle } from "lucide-react";

export default function EventsTable() {
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleMakeKnown = async (eventId: number) => {
    const name = window.prompt("Enter name for this person:");
    if (!name || !name.trim()) return;

    try {
      await registerPersonFromEvent(eventId, name.trim());
      showToast(`Successfully registered ${name}!`, "success");
      fetchEvents();
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to register person", "error");
    }
  };

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents(50);
      setEvents(data);
    } catch {
      // silently fail — status bar shows backend offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000); // refresh every 3s
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === "success" ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.msg}
        </div>
      )}

      {/* Snapshot preview modal */}
      {selectedSnapshot && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedSnapshot(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedSnapshot}
              alt="Detection snapshot"
              className="modal-img"
              onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400?text=Image+Not+Found'; }}
            />
            <button
              className="modal-close"
              onClick={() => setSelectedSnapshot(null)}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      <div className="card">
        {/* Header */}
        <div className="card-header">
          <h2 className="card-title">Recent Visitor Events</h2>
          <button onClick={fetchEvents} className="icon-btn" title="Refresh">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Table */}
        <div className="table-wrap">
          {events.length === 0 && !loading ? (
            <div className="empty-state">
              <ShieldCheck size={36} className="text-slate-400 mb-2" />
              <p>No events yet. The system is monitoring…</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  <th>Person</th>
                  <th>Time</th>
                  <th>Camera</th>
                  <th>Snapshot</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const imgUrl = snapshotUrl(ev.snapshot_path);
                  return (
                    <tr key={ev.id} className="table-row">
                      <td className="text-slate-500 text-xs">{ev.id}</td>

                      {/* Status badge */}
                      <td>
                        <span
                          className={`badge ${
                            ev.status === "Known"
                              ? "badge-green"
                              : "badge-red"
                          }`}
                        >
                          {ev.status === "Known" ? (
                            <ShieldCheck size={11} />
                          ) : (
                            <ShieldAlert size={11} />
                          )}
                          {ev.status}
                        </span>
                      </td>

                      {/* Person name */}
                      <td className="font-medium text-slate-900">
                        {ev.person_name}
                        {ev.buffer_status === "ignored" && (
                          <span className="ml-2 text-xs text-slate-400">
                            (ignored)
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="text-slate-500 text-xs tabular-nums">
                        {formatTime(ev.timestamp)}
                      </td>

                      {/* Camera ID */}
                      <td className="text-slate-500 text-xs">{ev.camera_id}</td>

                      {/* Snapshot thumbnail */}
                      <td>
                        {imgUrl ? (
                          <button
                            onClick={() => setSelectedSnapshot(imgUrl)}
                            className="snapshot-thumb-btn"
                          >
                            <img
                              src={imgUrl}
                              alt="snapshot"
                              className="snapshot-thumb"
                              onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100?text=No+Img'; }}
                            />
                            <Eye
                              size={12}
                              className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100 text-slate-900"
                            />
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td>
                        {ev.status === "Unknown" && ev.buffer_status !== "added" && (
                          <button
                            className="btn-secondary text-xs py-1 px-2"
                            onClick={() => handleMakeKnown(ev.id)}
                            title="Register this person"
                          >
                            <UserPlus size={12} />
                            Add to Known
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
