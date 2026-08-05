"use client";

// components/StatusBar.tsx — Top status bar showing system health at a glance.

import { useEffect, useState } from "react";
import { getStatus, SystemStatus } from "@/lib/api";
import { Wifi, WifiOff, Users, Camera, Clock } from "lucide-react";

export default function StatusBar() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const s = await getStatus();
        setStatus(s);
        setError(false);
      } catch {
        setError(true);
      }
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, []);

  const cameraOk = status?.camera_running ?? false;

  return (
    <div className="status-bar">
      {/* Brand */}
      <div className="status-brand">
        <div className="brand-icon">
          <Camera size={18} />
        </div>
        <span className="brand-name">SecureVision AI</span>
        <span className="brand-version">v{status?.version ?? "2.0.0"}</span>
      </div>

      {/* Stats */}
      <div className="status-stats">
        {/* Camera Status */}
        <div className={`stat-pill ${cameraOk ? "stat-green" : "stat-red"}`}>
          {cameraOk ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{cameraOk ? "Camera Live" : "Camera Offline"}</span>
          <span className="stat-dot" />
        </div>

        {/* Known Persons Count */}
        <div className="stat-pill stat-blue">
          <Users size={14} />
          <span>{status?.known_persons_count ?? "—"} Known</span>
        </div>

        {/* Camera ID */}
        {status?.camera_id && (
          <div className="stat-pill stat-purple">
            <Camera size={14} />
            <span>{status.camera_id}</span>
          </div>
        )}

        {/* Last Updated */}
        {status?.timestamp && (
          <div className="stat-pill stat-gray">
            <Clock size={14} />
            <span>
              {new Date(status.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        )}

        {/* Backend connection error */}
        {error && (
          <div className="stat-pill stat-red">
            <WifiOff size={14} />
            <span>Backend Offline</span>
          </div>
        )}
      </div>
    </div>
  );
}
