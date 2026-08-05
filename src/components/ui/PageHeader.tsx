"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: LucideIcon;
    disabled?: boolean;
  };
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action, children }: PageHeaderProps) {
  const ActionIcon = action?.icon || Plus;

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">{title}</h1>
        {subtitle && <p className="text-[#6E6E73] text-sm mt-1 font-normal">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {children}
        {action && (
          action.disabled ? (
            <Button disabled className="bg-slate-100 text-slate-400 border border-slate-200 rounded-xl h-11 font-medium px-5 flex items-center gap-2 text-sm cursor-not-allowed">
              <ActionIcon className="h-4 w-4" /> {action.label}
            </Button>
          ) : action.href ? (
            <Link href={action.href}>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl h-11 px-5 flex items-center gap-2 text-sm shadow-xs transition-all active:scale-98">
                <ActionIcon className="h-4 w-4" /> {action.label}
              </Button>
            </Link>
          ) : (
            <Button onClick={action.onClick} className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl h-11 px-5 flex items-center gap-2 text-sm shadow-xs transition-all active:scale-98">
              <ActionIcon className="h-4 w-4" /> {action.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
