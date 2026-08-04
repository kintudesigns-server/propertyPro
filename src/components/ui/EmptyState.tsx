"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: LucideIcon;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const ActionIcon = action?.icon || Plus;

  return (
    <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs max-w-md mx-auto w-full my-6 flex flex-col items-center">
      <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-500 shadow-2xs">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 font-medium mb-6 max-w-xs">{description}</p>
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl h-10 px-5 flex items-center gap-2 text-xs shadow-xs">
              <ActionIcon className="h-4 w-4" /> {action.label}
            </Button>
          </Link>
        ) : (
          <Button onClick={action.onClick} className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl h-10 px-5 flex items-center gap-2 text-xs shadow-xs">
            <ActionIcon className="h-4 w-4" /> {action.label}
          </Button>
        )
      )}
    </div>
  );
}
