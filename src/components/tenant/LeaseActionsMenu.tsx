"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Eye, Download, FileText, MessageSquare, MoreHorizontal, LogOut } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  lease: any;
  onSignLease?: (id: string) => void;
  onRequestMoveOut?: (id: string) => void;
  variant?: "table" | "card";
}

export function LeaseActionsMenu({ lease, onSignLease, onRequestMoveOut, variant = "table" }: Props) {
  const router = useRouter();

  const handleDownload = async () => {
    toast.info("Preparing lease agreement for download…");
    try {
      const res = await fetch(`/api/leases/${lease.id}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lease-${lease.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Lease agreement downloaded.");
      } else {
        router.push(`/dashboard/leases/${lease.id}`);
        toast.info("Redirecting to lease details.");
      }
    } catch {
      router.push(`/dashboard/leases/${lease.id}`);
    }
  };

  const actions = [
    {
      label: "View Details",
      icon: Eye,
      color: "text-[#007AFF]",
      onClick: () => router.push(`/dashboard/leases/${lease.id}`),
    },
    {
      label: "Download Agreement",
      icon: Download,
      color: "text-emerald-600",
      onClick: handleDownload,
    },
    {
      label: "View Invoices",
      icon: FileText,
      color: "text-amber-600",
      onClick: () => router.push(`/dashboard/accounting/invoices`),
    },
    {
      label: "Contact Landlord",
      icon: MessageSquare,
      color: "text-violet-600",
      onClick: () => {
        toast.info("Opening contact form…");
        router.push(`/dashboard/leases/${lease.id}?contact=1`);
      },
    },
  ];

  if (lease.status === "ACTIVE" && lease.moveOutStatus === "NONE" && onRequestMoveOut) {
    actions.push({
      label: "Request Move-Out",
      icon: LogOut,
      color: "text-[#6E6E73]",
      onClick: () => onRequestMoveOut(lease.id),
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex items-center justify-center rounded-full transition-all focus:outline-none ${
          variant === "card"
            ? "h-8 w-8 bg-transparent text-white hover:bg-white/20 border-0 shadow-none"
            : "h-8 w-8 border border-[#E5E5EA] bg-white text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] shadow-sm"
        }`}
        title="More actions"
      >
        <MoreHorizontal className={`h-4 w-4 ${variant === "card" ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" : ""}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl border-[#E5E5EA] shadow-xl p-1.5 bg-white z-[100]">
        {actions.map((a) => (
          <DropdownMenuItem
            key={a.label}
            onClick={a.onClick}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#1D1D1F] font-semibold rounded-lg cursor-pointer hover:bg-[#F5F5F7] focus:bg-slate-50 transition-colors border-0 outline-none"
          >
            <a.icon className={`h-4 w-4 shrink-0 ${a.color}`} />
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
