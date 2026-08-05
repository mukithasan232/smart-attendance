"use client";

// components/LiveFeed.tsx — MJPEG stream viewer with connection state handling.
// Browsers natively decode multipart/x-mixed-replace streams via <img> tags.

import { useState } from "react";
import { STREAM_URL } from "@/lib/api";
import { AlertCircle, RefreshCw, Maximize2 } from "lucide-react";

export default function LiveFeed() {
  const [hasError, setHasError] = useState(false);
  const [key, setKey] = useState(0); // increment to force <img> reload

  const handleError = () => setHasError(true);
  const handleLoad = () => setHasError(false);
  const reload = () => {
    setHasError(false);
    setKey((k) => k + 1);
  };

  return (
    <div className="live-feed-card">
      {/* Header */}
      <div className="feed-header">
        <div className="feed-title">
          <span className="live-dot" />
          <span>Live Camera Feed</span>
        </div>
        <div className="feed-actions">
          <button
            onClick={reload}
            className="icon-btn"
            title="Reload stream"
          >
            <RefreshCw size={16} />
          </button>
          <a
            href={STREAM_URL}
            target="_blank"
            rel="noreferrer"
            className="icon-btn"
            title="Open full stream"
          >
            <Maximize2 size={16} />
          </a>
        </div>
      </div>

      {/* Stream */}
      <div className="feed-viewport">
        {hasError ? (
          <div className="feed-error">
            <AlertCircle size={40} className="text-red-500 mb-3" />
            <p className="font-semibold text-slate-100">Stream Unavailable</p>
            <p className="text-sm text-slate-300 mt-1">
              Make sure the backend is running on{" "}
              <code className="text-indigo-300">:8000</code>
            </p>
            <button onClick={reload} className="btn-primary mt-4">
              <RefreshCw size={14} />
              Reconnect
            </button>
          </div>
        ) : (
          <img
            key={key}
            src={STREAM_URL}
            alt="Live security camera feed"
            className="feed-img"
            onError={handleError}
            onLoad={handleLoad}
          />
        )}
      </div>

      {/* Footer info bar */}
      <div className="feed-footer">
        <span className="text-xs text-slate-500">
          MJPEG · 20 FPS · InsightFace Annotated
        </span>
        {!hasError && (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Streaming
          </span>
        )}
      </div>
    </div>
  );
}
