"use client";
import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, Download, FileText, MessageSquare, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

interface Props {
  lease: any;
  onSignLease?: (id: string) => void;
  variant?: "table" | "card";
}

export function LeaseActionsMenu({ lease, onSignLease, variant = "table" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDownload = async () => {
    setOpen(false);
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
        // Fallback: open lease detail page
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
      color: "text-[#3B82F6]",
      bg: "hover:bg-blue-50",
      onClick: () => { setOpen(false); router.push(`/dashboard/leases/${lease.id}`); },
    },
    {
      label: "Download Agreement",
      icon: Download,
      color: "text-emerald-600",
      bg: "hover:bg-emerald-50",
      onClick: handleDownload,
    },
    {
      label: "View Invoices",
      icon: FileText,
      color: "text-amber-600",
      bg: "hover:bg-amber-50",
      onClick: () => { setOpen(false); router.push(`/dashboard/accounting/invoices`); },
    },
    {
      label: "Contact Landlord",
      icon: MessageSquare,
      color: "text-violet-600",
      bg: "hover:bg-violet-50",
      onClick: () => {
        setOpen(false);
        toast.info("Opening contact form…");
        router.push(`/dashboard/leases/${lease.id}?contact=1`);
      },
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center justify-center rounded-full transition-all ${
          variant === "card"
            ? "h-8 w-8 bg-transparent text-white hover:bg-white/20 border-0 shadow-none"
            : "h-8 w-8 border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 shadow-sm"
        }`}
        title="More actions"
      >
        <MoreHorizontal className={`h-4 w-4 ${variant === "card" ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-56 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl py-1.5 overflow-hidden">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#0F172A] font-semibold text-left whitespace-nowrap transition-colors ${a.bg}`}
            >
              <a.icon className={`h-4 w-4 shrink-0 ${a.color}`} />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
