import React from "react";

export type BadgeVariant = "success" | "danger" | "warning" | "info" | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = "neutral", className = "", children, ...props }: BadgeProps) {
  const baseClasses = "px-2.5 py-1 rounded-full text-xs font-semibold border";
  
  const variantClasses: Record<BadgeVariant, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    danger: "bg-rose-50 text-rose-700 border-rose-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    info: "bg-blue-50 text-blue-700 border-blue-100",
    neutral: "bg-slate-100 text-slate-700 border-slate-200"
  };

  return (
    <span 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
