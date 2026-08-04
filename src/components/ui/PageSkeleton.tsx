"use client";

import React from "react";

interface PageSkeletonProps {
  variant?: "kpi" | "table" | "list";
}

export function PageSkeleton({ variant = "table" }: PageSkeletonProps) {
  if (variant === "kpi") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-xs">
            <div className="h-4 bg-slate-100 rounded-md w-1/2" />
            <div className="h-7 bg-slate-200 rounded-md w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-white border border-slate-200 p-4 space-y-4 shadow-xs">
            <div className="h-32 bg-slate-100 rounded-xl w-full" />
            <div className="h-5 bg-slate-200 rounded-md w-2/3" />
            <div className="h-4 bg-slate-100 rounded-md w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-12 bg-white rounded-xl border border-slate-200 w-full shadow-xs" />
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 border-b border-slate-100 p-4 flex items-center justify-between">
            <div className="h-4 bg-slate-100 rounded-md w-1/4" />
            <div className="h-4 bg-slate-100 rounded-md w-1/6" />
            <div className="h-4 bg-slate-100 rounded-md w-1/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
