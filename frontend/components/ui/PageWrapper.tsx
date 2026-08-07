import React from "react";

export interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageWrapper({ children, className = "", title, subtitle, actions }: PageWrapperProps) {
  return (
    <div className={`min-h-screen bg-slate-50 p-6 lg:p-8 flex flex-col gap-6 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 lg:gap-6 w-full">
          <div>
            {title && <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>}
            {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
