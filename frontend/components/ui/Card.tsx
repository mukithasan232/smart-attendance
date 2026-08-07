import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div 
      className={`bg-white rounded-[20px] p-6 lg:p-8 shadow-sm border border-slate-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
