"use client";

import React, { useState } from 'react';
import { Maximize2, RefreshCw, Activity, ShieldCheck, Video, ServerCrash, Loader2 } from 'lucide-react';
import { STREAM_URL } from '@/lib/api';

export default function LiveMonitorPage() {
  const [streamFailed, setStreamFailed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [streamUrl, setStreamUrl] = useState(STREAM_URL);

  const cameras = [
    { id: 'cam-01', name: 'Main Entrance', active: true },
    { id: 'cam-02', name: 'Back Door', active: false },
    { id: 'cam-03', name: 'Lobby', active: false },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setStreamFailed(false);
    // Force a re-render of the image by changing the URL slightly
    setStreamUrl(`${STREAM_URL}?t=${Date.now()}`);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleFullscreen = () => {
    const player = document.getElementById('video-player-container');
    if (player) {
      if (player.requestFullscreen) {
        player.requestFullscreen();
      }
    }
  };

  return (
    <div className="p-6 h-full flex flex-col min-h-screen">
      {/* Page Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">Live Monitor</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-700 tracking-wide uppercase">Live</span>
            </div>
          </div>
          <p className="text-sm text-slate-500">Real-time AI surveillance feed</p>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1">

        {/* Main Viewing Area */}
        <div className="lg:w-3/4 flex flex-col">
          <div
            id="video-player-container"
            className="relative flex-1 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col min-h-[400px] lg:min-h-[600px]"
          >
            {/* Video Stream */}
            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden group">
              {streamFailed ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-900 z-10">
                  <ServerCrash size={48} className="mb-4 opacity-50" />
                  <p className="font-medium text-lg text-slate-300">Stream disconnected</p>
                  <p className="text-sm opacity-75 mt-1 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Attempting to reconnect...
                  </p>
                  <button onClick={handleRefresh} className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white transition-colors border border-slate-700">
                    Retry Now
                  </button>
                </div>
              ) : (
                <img
                  src={streamUrl}
                  alt="Live Camera Feed"
                  className={`w-full h-full object-contain ${isRefreshing ? 'opacity-50' : 'opacity-100'} transition-opacity`}
                  onError={() => setStreamFailed(true)}
                  onLoad={() => setStreamFailed(false)}
                />
              )}
            </div>

            {/* Overlay Controls */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 pt-16 flex justify-between items-end opacity-100 transition-opacity z-20">

              {/* Left side stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 text-white/90 text-sm font-medium shadow-sm">
                  <Activity size={16} className="text-emerald-400" />
                  FPS: 20
                </div>
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 text-white/90 text-sm font-medium shadow-sm hidden sm:flex">
                  <ShieldCheck size={16} className="text-indigo-400" />
                  AI: InsightFace Active
                </div>
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  className="p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg text-white/90 hover:bg-white/20 hover:text-white transition-colors"
                  title="Refresh Stream"
                >
                  <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={handleFullscreen}
                  className="p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg text-white/90 hover:bg-white/20 hover:text-white transition-colors"
                  title="Fullscreen"
                >
                  <Maximize2 size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Camera Selection Panel */}
        <div className="lg:w-1/4 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex-1">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Video size={18} className="text-slate-400" />
              Available Cameras
            </h3>

            <div className="flex flex-col gap-3">
              {cameras.map((cam) => (
                <div
                  key={cam.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer group ${cam.active
                      ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:border-indigo-300 hover:bg-white'
                    }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-sm text-slate-900 group-hover:text-indigo-700 transition-colors">
                      {cam.name}
                    </div>
                    {cam.active && (
                      <span className="flex h-2 w-2 mt-1.5">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mb-2 font-mono">{cam.id}</div>

                  {/* Mock Thumbnail */}
                  <div className={`h-24 rounded border border-slate-200 bg-slate-100 w-full overflow-hidden relative ${!cam.active && 'opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all'}`}>
                    {cam.active ? (
                      <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                        <span className="text-xs font-medium text-white/70">Live View</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
                        <Video size={24} className="text-slate-400" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
