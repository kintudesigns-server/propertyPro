"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

export type KpiCardVariant = 
  | "blue" 
  | "green" 
  | "orange" 
  | "purple" 
  | "red" 
  | "slate"
  | "emerald"
  | "amber"
  | "indigo";

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: React.ReactNode;
  icon?: LucideIcon;
  variant?: KpiCardVariant;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  className?: string;
  badgeText?: string;
}

const variantStyles: Record<KpiCardVariant, { bg: string; text: string; iconBg: string; activeBg: string; dot: string }> = {
  blue: {
    bg: "bg-slate-100 text-slate-800 border-slate-200",
    text: "text-slate-900",
    iconBg: "bg-slate-100 text-slate-800 border border-slate-200/80",
    activeBg: "border-slate-900 ring-2 ring-slate-900/10 bg-slate-50/60 shadow-xs",
    dot: "bg-slate-800",
  },
  green: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    text: "text-emerald-700",
    iconBg: "bg-emerald-50 text-emerald-700 border border-emerald-100/80",
    activeBg: "border-emerald-600 ring-2 ring-emerald-600/10 bg-emerald-50/40 shadow-xs",
    dot: "bg-emerald-600",
  },
  emerald: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    text: "text-emerald-700",
    iconBg: "bg-emerald-50 text-emerald-700 border border-emerald-100/80",
    activeBg: "border-emerald-600 ring-2 ring-emerald-600/10 bg-emerald-50/40 shadow-xs",
    dot: "bg-emerald-600",
  },
  orange: {
    bg: "bg-amber-50 text-amber-800 border-amber-200/60",
    text: "text-amber-800",
    iconBg: "bg-amber-50 text-amber-800 border border-amber-100/80",
    activeBg: "border-amber-600 ring-2 ring-amber-600/10 bg-amber-50/40 shadow-xs",
    dot: "bg-amber-600",
  },
  amber: {
    bg: "bg-amber-50 text-amber-800 border-amber-200/60",
    text: "text-amber-800",
    iconBg: "bg-amber-50 text-amber-800 border border-amber-100/80",
    activeBg: "border-amber-600 ring-2 ring-amber-600/10 bg-amber-50/40 shadow-xs",
    dot: "bg-amber-600",
  },
  purple: {
    bg: "bg-purple-50 text-purple-800 border-purple-200/60",
    text: "text-purple-800",
    iconBg: "bg-purple-50 text-purple-800 border border-purple-100/80",
    activeBg: "border-purple-600 ring-2 ring-purple-600/10 bg-purple-50/40 shadow-xs",
    dot: "bg-purple-600",
  },
  indigo: {
    bg: "bg-indigo-50 text-indigo-800 border-indigo-200/60",
    text: "text-indigo-800",
    iconBg: "bg-indigo-50 text-indigo-800 border border-indigo-100/80",
    activeBg: "border-indigo-600 ring-2 ring-indigo-600/10 bg-indigo-50/40 shadow-xs",
    dot: "bg-indigo-600",
  },
  red: {
    bg: "bg-rose-50 text-rose-800 border-rose-200/60",
    text: "text-rose-800",
    iconBg: "bg-rose-50 text-rose-800 border border-rose-100/80",
    activeBg: "border-rose-600 ring-2 ring-rose-600/10 bg-rose-50/40 shadow-xs",
    dot: "bg-rose-600",
  },
  slate: {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    text: "text-slate-800",
    iconBg: "bg-slate-100 text-slate-700 border border-slate-200/80",
    activeBg: "border-slate-800 ring-2 ring-slate-800/10 bg-slate-50 shadow-xs",
    dot: "bg-slate-600",
  },
};

export function KpiCard({
  title,
  value,
  subtext,
  icon: Icon,
  variant = "blue",
  active = false,
  onClick,
  href,
  className = "",
  badgeText,
}: KpiCardProps) {
  const styles = variantStyles[variant] || variantStyles.blue;

  const valueStr = String(value);
  const isLongValue = valueStr.length > 8;
  const valueFontSize = isLongValue ? "text-xl" : "text-2xl";

  const content = (
    <div
      onClick={onClick}
      className={`
        bg-white border rounded-3xl p-5 shadow-xs transition-all duration-200 relative overflow-hidden group flex flex-col justify-between
        ${onClick || href ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""}
        ${
          active
            ? styles.activeBg
            : "border-slate-200/80 hover:border-slate-300"
        }
        ${className}
      `}
    >
      <div className="flex justify-between items-start mb-2 gap-1.5">
        <span className="text-xs font-normal text-[#6E6E73] leading-tight block min-w-0" title={title}>
          {title}
        </span>
        {Icon && (
          <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-2xs ${styles.iconBg}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <p className={`${valueFontSize} font-semibold tracking-tight text-[#1D1D1F] leading-none truncate`} title={valueStr}>
            {value}
          </p>
          {badgeText && (
            <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${styles.bg}`}>
              {badgeText}
            </span>
          )}
        </div>

        {subtext && (
          <div className="text-xs font-normal text-[#6E6E73] flex items-center gap-1.5 truncate pt-0.5">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${styles.dot}`} />
            <span className="truncate">{subtext}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block group focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
