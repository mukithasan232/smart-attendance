"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";
import { X } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 w-full">
      {/* Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Responsive Sidebar Wrapper */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out md:relative md:flex md:flex-col md:translate-x-0 border-r border-slate-100 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Mobile Close Button */}
        <button 
          className="md:hidden absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-800 focus:outline-none z-50"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <X size={20} />
        </button>

        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 min-h-screen overflow-y-auto">
        <TopNav onOpenMenu={() => setIsMobileMenuOpen(true)} />
        <main className="main-content bg-slate-50 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
