// lib/api.ts — Typed API client for the Security System FastAPI backend.
// All functions return typed results and throw on non-OK responses.

export let API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export let STREAM_URL = `${API_BASE}/api/stream`;

let isConfigLoaded = false;
let configPromise: Promise<void> | null = null;

export async function loadConfig() {
  if (isConfigLoaded) return;
  if (!configPromise) {
    configPromise = (async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.backendUrl) {
            API_BASE = data.backendUrl.replace(/\/$/, '');
            STREAM_URL = `${API_BASE}/api/stream`;
          }
        }
      } catch (err) {
        console.error("Failed to load config:", err);
      } finally {
        isConfigLoaded = true;
      }
    })();
  }
  return configPromise;
}

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
  designation?: string;
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
  await loadConfig();
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

export const clearAllEvents = (): Promise<{ success: boolean; message: string; error?: string }> =>
  apiFetch(`/api/events`, { method: "DELETE" });

export async function uploadPerson(
  name: string,
  designation: string,
  imageFile: File
): Promise<{ message: string; person_id: number }> {
  await loadConfig();
  const form = new FormData();
  form.append("name", name);
  form.append("designation", designation);
  form.append("image", imageFile);

  const res = await fetch(`${API_BASE}/api/persons`, {
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
  name: string,
  imagePath: string
): Promise<{ message: string; person_id: number }> =>
  apiFetch(`/api/register-from-log`, {
    method: "POST",
    body: JSON.stringify({ log_id: eventId, name, image_path: imagePath }),
  });

/** Build the URL for a snapshot served by the backend static files mount. */
export function snapshotUrl(snapshotPath: string | null): string | null {
  if (!snapshotPath) return null;
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
