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
    bg: "bg-blue-50 text-blue-700 border-blue-200/60",
    text: "text-blue-600",
    iconBg: "bg-blue-50 text-blue-600 border border-blue-100/80",
    activeBg: "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30 shadow-xs",
    dot: "bg-blue-500",
  },
  green: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    text: "text-emerald-600",
    iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100/80",
    activeBg: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30 shadow-xs",
    dot: "bg-emerald-500",
  },
  emerald: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    text: "text-emerald-600",
    iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100/80",
    activeBg: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30 shadow-xs",
    dot: "bg-emerald-500",
  },
  orange: {
    bg: "bg-amber-50 text-amber-700 border-amber-200/60",
    text: "text-amber-600",
    iconBg: "bg-amber-50 text-amber-600 border border-amber-100/80",
    activeBg: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30 shadow-xs",
    dot: "bg-amber-500",
  },
  amber: {
    bg: "bg-amber-50 text-amber-700 border-amber-200/60",
    text: "text-amber-600",
    iconBg: "bg-amber-50 text-amber-600 border border-amber-100/80",
    activeBg: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30 shadow-xs",
    dot: "bg-amber-500",
  },
  purple: {
    bg: "bg-purple-50 text-purple-700 border-purple-200/60",
    text: "text-purple-600",
    iconBg: "bg-purple-50 text-purple-600 border border-purple-100/80",
    activeBg: "border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/30 shadow-xs",
    dot: "bg-purple-500",
  },
  indigo: {
    bg: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
    text: "text-indigo-600",
    iconBg: "bg-indigo-50 text-indigo-600 border border-indigo-100/80",
    activeBg: "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 shadow-xs",
    dot: "bg-indigo-500",
  },
  red: {
    bg: "bg-rose-50 text-rose-700 border-rose-200/60",
    text: "text-rose-600",
    iconBg: "bg-rose-50 text-rose-600 border border-rose-100/80",
    activeBg: "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30 shadow-xs",
    dot: "bg-rose-500",
  },
  slate: {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    text: "text-slate-700",
    iconBg: "bg-slate-100 text-slate-600 border border-slate-200/80",
    activeBg: "border-slate-500 ring-2 ring-slate-500/20 bg-slate-50 shadow-xs",
    dot: "bg-slate-500",
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
  const valueFontSize = isLongValue ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl";

  const content = (
    <div
      onClick={onClick}
      className={`
        bg-white border rounded-[20px] p-4.5 shadow-xs transition-all duration-200 relative overflow-hidden group flex flex-col justify-between
        ${onClick || href ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""}
        ${
          active
            ? styles.activeBg
            : "border-slate-200/80 hover:border-slate-300"
        }
        ${className}
      `}
    >
      <div className="flex justify-between items-start mb-3 gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 truncate flex-1">
          {title}
        </span>
        {Icon && (
          <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-2xs ${styles.iconBg}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <p className={`${valueFontSize} font-black tracking-tight text-slate-900 leading-none truncate`} title={valueStr}>
            {value}
          </p>
          {badgeText && (
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${styles.bg}`}>
              {badgeText}
            </span>
          )}
        </div>

        {subtext && (
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 truncate pt-0.5">
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
