import React from "react";

export interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className = "" }: PageWrapperProps) {
  return (
    <div className={`min-h-screen bg-slate-50 p-6 lg:p-8 ${className}`}>
      {children}
    </div>
  );
}
