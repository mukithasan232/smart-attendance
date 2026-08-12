'use client';

import { useState, useEffect } from 'react';
import { Camera, Wifi, WifiOff } from 'lucide-react';

interface LiveCameraFeedProps {
  className?: string;
  baseUrl?: string;
}

export default function LiveCameraFeed({ className = '', baseUrl = 'http://localhost:8000' }: LiveCameraFeedProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [statusText, setStatusText] = useState('Connecting...');

  useEffect(() => {
    // Poll the backend /api/status to see if the camera loop is actively running
    const checkStatus = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/status`);
        if (!res.ok) throw new Error('Status fetch failed');
        const data = await res.json();
        
        if (data.camera_running) {
          setIsOnline(true);
          setStatusText('Live');
        } else {
          setIsOnline(false);
          setStatusText('Offline / Reconnecting');
        }
      } catch (error) {
        setIsOnline(false);
        setStatusText('Backend Unreachable');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [baseUrl]);

  return (
    <div className={`relative flex flex-col bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 shadow-xl ${className}`}>
      {/* Header/Overlay Toolbar */}
      <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent z-10 flex justify-between items-center">
        <div className="flex items-center gap-2 text-white font-medium">
          <Camera className="w-4 h-4 text-zinc-300" />
          <span className="text-sm tracking-wide">YOLOv8 Security Feed</span>
        </div>
        
        {/* Status Indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${
          isOnline 
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
            : 'bg-red-500/20 text-red-300 border-red-500/50'
        }`}>
          {isOnline ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          {statusText}
        </div>
      </div>

      {/* Video Feed (MJPEG Stream) */}
      <div className="flex-1 w-full h-full bg-black flex items-center justify-center min-h-[300px]">
        {/* We use a standard img tag because MJPEG is natively supported by browsers */}
        <img 
          src={`${baseUrl}/api/stream`} 
          alt="Live Camera Feed" 
          className="w-full h-full object-cover"
          onError={(e) => {
            // If the stream fails to load, we can hide the broken image icon
            (e.target as HTMLImageElement).style.display = 'none';
          }}
          onLoad={(e) => {
            (e.target as HTMLImageElement).style.display = 'block';
          }}
        />
        
        {/* Fallback when offline */}
        {!isOnline && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950/80 backdrop-blur-sm z-0">
            <Wifi className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Stream Disconnected</p>
            <p className="text-xs mt-1 text-zinc-600">Waiting for camera feed...</p>
          </div>
        )}
      </div>
    </div>
  );
}
