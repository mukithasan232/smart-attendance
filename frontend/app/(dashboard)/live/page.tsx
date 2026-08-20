"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from 'react';
import { Maximize2, RefreshCw, Activity, ShieldCheck, Video, ServerCrash, Loader2 } from 'lucide-react';
import { STREAM_URL } from '@/lib/api';
import { getCameraSource, getProxiedStreamUrl } from '@/lib/camera';

export default function LiveMonitorPage() {
  const [streamFailed, setStreamFailed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [streamUrl, setStreamUrl] = useState(STREAM_URL);
  const [cameraActive, setCameraActive] = useState(false);
  const [camIndex, setCamIndex] = useState('0'); // 0 for Phone/Default, 1 for Macbook

  useEffect(() => {
    const customSource = getCameraSource();
    if (customSource && customSource !== '0') {
      setStreamUrl(getProxiedStreamUrl(customSource));
    } else {
      setStreamUrl(STREAM_URL);
    }
  }, []);

  const handleStartCamera = async () => {
    try {
      await fetch(`http://localhost:8000/api/camera/start?cam_idx=${encodeURIComponent(camIndex)}`, { method: 'POST' });
      setCameraActive(true);
      setStreamFailed(false);
      // Force refresh of the image tag
      setStreamUrl(`${STREAM_URL}?t=${Date.now()}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopCamera = async () => {
    try {
      await fetch('http://localhost:8000/api/camera/stop', { method: 'POST' });
      setCameraActive(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setStreamFailed(false);
    
    const customSource = getCameraSource();
    const base = (customSource && customSource !== '0') ? getProxiedStreamUrl(customSource) : STREAM_URL;
    const sep = base.includes('?') ? '&' : '?';
    setStreamUrl(`${base}${sep}t=${Date.now()}`);
    
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
              {!cameraActive ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-900 z-10">
                  <Video size={48} className="mb-4 opacity-50 text-indigo-400" />
                  <p className="font-medium text-lg text-slate-300">Camera is Offline</p>
                  <p className="text-sm opacity-75 mt-1 mb-6 text-center max-w-xs">
                    The camera feed is currently stopped to save resources. Start it from the panel.
                  </p>
                  <button onClick={handleStartCamera} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-semibold text-white transition-colors shadow-lg shadow-indigo-500/20">
                    Start Test Camera
                  </button>
                </div>
              ) : streamFailed ? (
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

            <div className="flex flex-col gap-4">
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Camera Source</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setCamIndex('0'); if(cameraActive) setTimeout(handleStartCamera, 100); }}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${camIndex === '0' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`}
                  >
                    Camera (0)
                  </button>
                  <button
                    onClick={() => { setCamIndex('1'); if(cameraActive) setTimeout(handleStartCamera, 100); }}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${camIndex === '1' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'}`}
                  >
                    Camera (1)
                  </button>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Or enter Phone IP Camera URL:</label>
                  <input
                    type="text"
                    placeholder="http://192.168.1.5:8080/video"
                    value={camIndex !== '0' && camIndex !== '1' ? camIndex : ''}
                    onChange={(e) => setCamIndex(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                  To use your phone's camera, install <strong>IP Webcam</strong> (Android) or <strong>EpocCam</strong> (iOS). Open the app, find the URL it gives you (like <code>http://192.168.x.x:8080/video</code>), paste it in the box above, and click Start Camera!
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                {cameraActive ? (
                  <button
                    onClick={handleStopCamera}
                    className="w-full py-3 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <ServerCrash size={18} />
                    Stop Camera
                  </button>
                ) : (
                  <button
                    onClick={handleStartCamera}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20"
                  >
                    <Video size={18} />
                    Start Camera
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
