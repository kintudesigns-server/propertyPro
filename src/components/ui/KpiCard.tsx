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

const variantStyles: Record<KpiCardVariant, { bg: string; text: string; iconBg: string }> = {
  blue: {
    bg: "bg-[#007AFF]/10",
    text: "text-[#007AFF]",
    iconBg: "bg-[#007AFF]/15 text-[#007AFF]",
  },
  green: {
    bg: "bg-[#34C759]/10",
    text: "text-[#34C759]",
    iconBg: "bg-[#34C759]/15 text-[#34C759]",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    iconBg: "bg-emerald-500/15 text-emerald-600",
  },
  orange: {
    bg: "bg-[#FF9500]/10",
    text: "text-[#FF9500]",
    iconBg: "bg-[#FF9500]/15 text-[#FF9500]",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
    iconBg: "bg-amber-500/15 text-amber-600",
  },
  purple: {
    bg: "bg-[#AF52DE]/10",
    text: "text-[#AF52DE]",
    iconBg: "bg-[#AF52DE]/15 text-[#AF52DE]",
  },
  indigo: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-600",
    iconBg: "bg-indigo-500/15 text-indigo-600",
  },
  red: {
    bg: "bg-[#FF3B30]/10",
    text: "text-[#FF3B30]",
    iconBg: "bg-[#FF3B30]/15 text-[#FF3B30]",
  },
  slate: {
    bg: "bg-slate-500/10",
    text: "text-slate-700",
    iconBg: "bg-slate-500/15 text-slate-700",
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
        bg-white border rounded-2xl p-4 shadow-xs transition-all duration-200 relative overflow-hidden group
        ${onClick || href ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""}
        ${
          active
            ? "border-[#007AFF] ring-2 ring-[#007AFF]/20 bg-[#F5F5F7]"
            : "border-[#E5E5EA] hover:border-[#D1D1D6]"
        }
        ${className}
      `}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] truncate">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${styles.iconBg}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 min-w-0">
        <p className={`${valueFontSize} font-bold tracking-tight text-[#1D1D1F] truncate`} title={valueStr}>
          {value}
        </p>
        {badgeText && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${styles.bg} ${styles.text}`}>
            {badgeText}
          </span>
        )}
      </div>

      {subtext && (
        <div className="mt-2 text-xs font-medium text-[#8E8E93] flex items-center gap-1 truncate">
          {subtext}
        </div>
      )}
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
