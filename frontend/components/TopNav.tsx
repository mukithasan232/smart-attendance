"use client";

import { Bell, Search } from "lucide-react";
import { usePathname } from "next/navigation";

export default function TopNav() {
  const pathname = usePathname();
  
  const getPageTitle = () => {
    if (pathname === "/") return "System Dashboard";
    if (pathname === "/persons") return "Persons Directory";
    return "SecureVision";
  };

  return (
    <header className="top-nav">
      <div className="top-nav-title">{getPageTitle()}</div>
      
      <div className="top-nav-actions">
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search events or persons..." 
            className="pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors w-64 text-slate-900 placeholder:text-slate-500"
          />
        </div>
        
        <button className="icon-btn relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        
        <div className="user-profile ml-2">
          <div className="avatar">A</div>
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-semibold text-slate-900 leading-tight">Admin User</span>
            <span className="text-xs text-slate-500">Security Dept</span>
          </div>
        </div>
      </div>
    </header>
  );
}
