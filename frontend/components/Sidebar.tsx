"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Video, List, Users, Settings, ShieldAlert, LogOut } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Live Monitor", href: "/live", icon: Video },
    { name: "Visitor Logs", href: "/logs", icon: List },
    { name: "Persons Directory", href: "/persons", icon: Users },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const handleLogout = () => {
    document.cookie = "auth-token=; path=/; max-age=0";
    window.location.href = '/login';
  };

  return (
    <aside className="sidebar flex flex-col h-full">
      <div className="sidebar-header">
        <div className="brand-icon">
          <ShieldAlert size={18} />
        </div>
        <div className="brand-name">SecureVision ERP</div>
      </div>
      <nav className="sidebar-nav flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={isActive ? "nav-active" : "nav-link"}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 mt-auto border-t border-slate-200/20">
        <button 
          onClick={handleLogout}
          className="nav-link w-full text-left flex items-center gap-3 text-slate-500 hover:text-red-500 transition-colors"
        >
          <LogOut size={18} />
          Log Out
        </button>
      </div>
    </aside>
  );
}
