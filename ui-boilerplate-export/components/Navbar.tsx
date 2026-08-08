'use client';
import { useState, useEffect, useRef } from 'react';
import { Menu, User, Settings, LogOut, Bell } from 'lucide-react';
import ThemeToggle from './ThemeToggle'; // Force TS refresh

export default function Navbar({ onMobileMenuToggleAction }: { onMobileMenuToggleAction?: () => void }) {
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/30 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-50 sticky top-0 transition-colors duration-300">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuToggleAction}
          className="md:hidden p-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-gray-400 text-sm font-medium">
              Welcome, User
            </span>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Notification Bell */}
        <button className="relative p-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">
          <Bell className="w-5 h-5" />
        </button>

        {/* Avatar / Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className={`flex items-center gap-2 p-1 rounded-full transition-all ${showProfile ? 'ring-2 ring-indigo-500/60' : ''}`}
          >
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/20 bg-gradient-to-tr from-indigo-500 to-purple-600">
              U
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-gray-700/50 rounded-2xl shadow-xl dark:shadow-lg dark:shadow-black/20 overflow-hidden z-50">
              {/* User info header */}
              <div className="p-4 border-b border-slate-100 dark:border-white/10">
                <p className="text-slate-800 dark:text-white font-medium text-sm flex items-center gap-2">
                  John Doe
                </p>
                <p className="text-slate-500 dark:text-gray-500 text-xs mt-0.5">user@example.com</p>
              </div>

              <div className="p-2">
                <button
                  onClick={() => setShowProfile(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 dark:hover:text-white text-sm transition-colors duration-150"
                >
                  <Settings className="w-4 h-4" /> Settings
                </button>

                <button
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-500/5 dark:hover:bg-gray-700 text-sm transition-colors duration-150"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
