// lib/api.ts — Typed API client for the Security System FastAPI backend.
// All functions return typed results and throw on non-OK responses.

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const STREAM_URL = `${API_BASE}/api/stream`;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SystemStatus {
  status: string;
  camera_id: string;
  camera_running: boolean;
  known_persons_count: number;
  timestamp: string;
  version: string;
}

export interface Person {
  id: number;
  name: string;
  snapshot_path: string | null;
  created_at: string;
}

export interface DetectionEvent {
  id: number;
  person_id: number | null;
  person_name: string;       // "Unknown" for unidentified faces
  timestamp: string;
  snapshot_path: string;
  status: "Known" | "Unknown";
  buffer_status: "pending" | "added" | "ignored";
  camera_id: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── API Functions ──────────────────────────────────────────────────────────────

export const getStatus = (): Promise<SystemStatus> =>
  apiFetch<SystemStatus>("/api/status");

export const getPersons = (): Promise<Person[]> =>
  apiFetch<Person[]>("/api/persons");

export const deletePerson = (id: number): Promise<{ message: string }> =>
  apiFetch(`/api/persons/${id}`, { method: "DELETE" });

export const getEvents = (limit = 50): Promise<DetectionEvent[]> =>
  apiFetch<DetectionEvent[]>(`/api/events?limit=${limit}`);

export async function uploadPerson(
  name: string,
  imageFile: File
): Promise<{ message: string; person_id: number }> {
  const form = new FormData();
  form.append("name", name);
  form.append("image", imageFile);

  const res = await fetch(`${API_BASE}/api/persons/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Upload failed: ${res.status}`);
  }
  return res.json();
}

export const registerPersonFromEvent = (
  eventId: number,
  name: string
): Promise<{ message: string; person_id: number; event_id: number }> =>
  apiFetch(`/api/events/${eventId}/register_person`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });

/** Build the URL for a snapshot served by the backend static files mount. */
export function snapshotUrl(snapshotPath: string | null): string | null {
  if (!snapshotPath) return null;
  // The backend mounts /snapshots → ./snapshots directory
  // snapshot_path from DB is an absolute local path like ./snapshots/unknown_20260802_...jpg
  // Extract filename and serve via the static endpoint
  const filename = snapshotPath.split("/").pop();
  return filename ? `${API_BASE}/snapshots/${filename}` : null;
}

// ── Notification / SMTP Settings ──────────────────────────────────────────────

export interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  use_tls: boolean;
  user: string;
  password: string;
  from_addr: string;
  to_emails: string;
  alert_unknown: boolean;
  alert_known: boolean;
}

export const getNotificationSettings = (): Promise<{ smtp: SmtpSettings }> =>
  apiFetch<{ smtp: SmtpSettings }>("/api/settings/notifications");

export const saveNotificationSettings = (settings: SmtpSettings): Promise<{ message: string }> =>
  apiFetch("/api/settings/notifications", {
    method: "POST",
    body: JSON.stringify(settings),
  });

export const testEmailConnection = (): Promise<{ success: boolean; message: string }> =>
  apiFetch("/api/settings/notifications/test", { method: "POST" });

// ── Camera Settings ────────────────────────────────────────────────────────────

export interface CameraConfig {
  id: string;
  name: string;
  url: string;
  location: string;
  enabled: boolean;
}

export const getCameras = (): Promise<{ cameras: CameraConfig[] }> =>
  apiFetch<{ cameras: CameraConfig[] }>("/api/settings/cameras");

export const addCamera = (cam: Omit<CameraConfig, "id">): Promise<{ message: string; camera: CameraConfig }> =>
  apiFetch("/api/settings/cameras", {
    method: "POST",
    body: JSON.stringify(cam),
  });

export const updateCamera = (id: string, cam: Omit<CameraConfig, "id">): Promise<{ message: string; camera: CameraConfig }> =>
  apiFetch(`/api/settings/cameras/${id}`, {
    method: "PUT",
    body: JSON.stringify(cam),
  });

export const deleteCamera = (id: string): Promise<{ message: string }> =>
  apiFetch(`/api/settings/cameras/${id}`, { method: "DELETE" });

export const applyCamera = (id: string): Promise<{ message: string; url: string }> =>
  apiFetch(`/api/settings/cameras/${id}/apply`, { method: "POST" });

