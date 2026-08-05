"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Wrench, ClipboardCheck, CheckCircle2, Archive, Calendar,
  AlertTriangle, Clock, ArrowRight, MapPin, User, ChevronRight,
  Loader2, Zap, ListChecks, LayoutDashboard, ShieldCheck,
  MessageSquare, Sparkles, Navigation, Phone, Mail, CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// ─── Priority Color & Status Configurations ─────────────────────────────────
const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  EMERGENCY: { label: "Emergency", bg: "bg-red-50/90",    text: "text-red-700",   border: "border-red-200"   },
  HIGH:      { label: "High",      bg: "bg-orange-50/90", text: "text-orange-700",border: "border-orange-200" },
  MEDIUM:    { label: "Medium",    bg: "bg-amber-50/90",  text: "text-amber-800", border: "border-amber-200"  },
  LOW:       { label: "Low",       bg: "bg-slate-100",    text: "text-slate-600", border: "border-slate-200"  },
};

const STATUS_STEP: Record<string, { label: string; next: string; color: string }> = {
  ASSIGNED:            { label: "Assigned — Needs Scheduling", next: "Schedule Diagnosis",    color: "text-amber-700"  },
  DIAGNOSIS_SCHEDULED: { label: "Diagnosis Scheduled",         next: "Submit Diagnosis",      color: "text-blue-700"   },
  AWAITING_APPROVAL:    { label: "Waiting for Approval",        next: "Pending Approval",      color: "text-purple-700" },
  APPROVED:            { label: "Approved — Schedule Repair",  next: "Schedule Repair",       color: "text-emerald-700"},
  REPAIR_SCHEDULED:    { label: "Repair Scheduled",            next: "Complete Work",         color: "text-indigo-700" },
};

function formatDate(d: Date | null) {
  if (!d) return null;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(d: Date | null) {
  if (!d) return null;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";

export default function InspectorOverviewPage() {
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id;
  const userName = (session?.user as any)?.name?.split(" ")[0] || "Inspector";

  const featureAccess = useFeatureAccess("view_inspector_dashboard");
  const isBlocked = !featureAccess.loading && !featureAccess.allowed;

  const [requests, setRequests] = useState<any[]>([]);
  const [walkthroughs, setWalkthroughs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      try {
        const [mRes, lRes] = await Promise.all([fetch("/api/maintenance"), fetch("/api/leases")]);
        if (mRes.ok) setRequests(await mRes.json());
        if (lRes.ok) setWalkthroughs(await lRes.json());
      } catch {
        toast.error("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[65vh] gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-slate-900" />
        <p className="text-slate-500 font-extrabold text-xs tracking-wider uppercase">Loading Field Dashboard...</p>
      </div>
    );
  }

  // ── Compute Data ─────────────────────────────────────────────────────────
  const activeTasks   = requests.filter(r => !["RESOLVED", "CLOSED"].includes(r.status));
  const resolvedTasks = requests.filter(r => r.status === "RESOLVED");
  const closedTasks   = requests.filter(r => r.status === "CLOSED");

  const walkthroughItems: any[] = walkthroughs.flatMap(lease => {
    const out = [];
    if (lease.preliminaryInspectorId === userId && lease.preliminaryInspectionStatus === "SCHEDULED") {
      out.push({
        id: `${lease.id}-prelim`,
        type: "WALKTHROUGH",
        walkthroughType: "Move-In",
        title: `Move-In Inspection`,
        property: lease.unit?.property?.name || "Property",
        unit: lease.unit?.name || "—",
        tenant: lease.tenant?.name || "N/A",
        date: lease.preliminaryInspectionDate ? new Date(lease.preliminaryInspectionDate) : null,
        link: `/dashboard/inspector/inspections/${lease.id}?type=PRELIMINARY`,
      });
    }
    if (lease.moveOutInspectorId === userId && lease.moveOutStatus === "INSPECTION_SCHEDULED") {
      out.push({
        id: `${lease.id}-final`,
        type: "WALKTHROUGH",
        walkthroughType: "Move-Out",
        title: `Move-Out Inspection`,
        property: lease.unit?.property?.name || "Property",
        unit: lease.unit?.name || "—",
        tenant: lease.tenant?.name || "N/A",
        date: lease.inspectionDate ? new Date(lease.inspectionDate) : null,
        link: `/dashboard/inspector/inspections/${lease.id}?type=FINAL`,
      });
    }
    return out;
  });

  const maintenanceItems: any[] = activeTasks.map(t => ({
    id: t.id,
    type: "REPAIR",
    title: t.title,
    property: t.unit?.property?.name || "Property",
    unit: t.unit?.name || "—",
    priority: t.priority || "MEDIUM",
    status: t.status,
    date: t.status === "DIAGNOSIS_SCHEDULED" && t.diagnosisDate
      ? new Date(t.diagnosisDate)
      : t.status === "REPAIR_SCHEDULED" && t.repairDate
      ? new Date(t.repairDate)
      : null,
    link: `/dashboard/inspector/active`,
  }));

  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const allItems = [...walkthroughItems, ...maintenanceItems];

  const todayItems    = allItems.filter(i => i.date && i.date <= endOfToday && i.date >= new Date(now.getFullYear(), now.getMonth(), now.getDate())).sort((a,b) => a.date - b.date);
  const unscheduled   = allItems.filter(i => !i.date);
  const EMERGENCY_count = maintenanceItems.filter(t => t.priority === "EMERGENCY").length;

  return (
    <div className="relative">
      {isBlocked && (
        <FeatureBlockedOverlay
          featureLabel={featureAccess.featureLabel || "Inspector Dashboard Overview"}
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}
      <div className={`max-w-7xl mx-auto pt-6 pb-24 space-y-6 font-sans px-4 sm:px-0 ${isBlocked ? "pointer-events-none select-none blur-[2.5px] opacity-70" : ""}`}>

      {/* ── HERO HEADER BANNER ── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6 font-sans">
        <div className="space-y-1 font-sans">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-700" />
              Field Inspector Hub
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Available for Dispatch
            </span>
          </div>

          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight pt-1">
            Good {now.getHours() < 12 ? "morning" : now.getHours() < 18 ? "afternoon" : "evening"}, {userName} 👋
          </h1>
          <p className="text-[#6E6E73] text-xs font-normal">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            <span className="mx-2">&bull;</span>
            <span className="text-[#1D1D1F] font-semibold">{activeTasks.length} Active Work Orders</span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 font-sans">
          <Link href="/dashboard/messages">
            <Button variant="outline" className="h-9 border border-slate-200 bg-white text-[#1D1D1F] hover:bg-slate-50 font-medium text-xs rounded-xl shadow-2xs cursor-pointer flex items-center justify-center gap-2 px-4">
              <MessageSquare className="h-4 w-4 text-slate-700" /> Messages
            </Button>
          </Link>
          <Link href="/dashboard/inspector/active">
            <Button className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-2">
              <Wrench className="h-4 w-4 text-white" /> View All Work Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* ── EMERGENCY ALERT BANNER ── */}
      {EMERGENCY_count > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-2xs flex items-center justify-between gap-4 font-sans">
          <div className="flex items-center gap-3.5">
            <div className="h-9 w-9 bg-rose-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-950">
                {EMERGENCY_count} High-Priority Emergency Repair{EMERGENCY_count > 1 ? "s" : ""} Assigned
              </p>
              <p className="text-xs font-normal text-rose-700 mt-0.5">Immediate field response required. Contact tenant and dispatch diagnosis.</p>
            </div>
          </div>
          <Link href="/dashboard/inspector/active">
            <Button className="h-9 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-xl px-4 flex items-center justify-center gap-1.5 border-none shadow-xs">
              Respond Now <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* ── KPI STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
        <Link href="/dashboard/inspector/active">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex justify-between items-start hover:border-slate-300 transition-all group">
            <div className="space-y-1">
              <p className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider">Active Repairs</p>
              <h3 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">{activeTasks.length}</h3>
              <p className="text-xs font-normal text-[#6E6E73]">In-progress &amp; assigned</p>
            </div>
            <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/inspector/inspections">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex justify-between items-start hover:border-slate-300 transition-all group">
            <div className="space-y-1">
              <p className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider">Walkthroughs</p>
              <h3 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">{walkthroughItems.length}</h3>
              <p className="text-xs font-normal text-[#6E6E73]">Move-in / Move-out</p>
            </div>
            <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/inspector/active">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex justify-between items-start hover:border-slate-300 transition-all group">
            <div className="space-y-1">
              <p className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider">Completed</p>
              <h3 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">{resolvedTasks.length}</h3>
              <p className="text-xs font-normal text-[#6E6E73]">Resolved repairs</p>
            </div>
            <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/inspector/history">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex justify-between items-start hover:border-slate-300 transition-all group">
            <div className="space-y-1">
              <p className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider">Archived</p>
              <h3 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">{closedTasks.length}</h3>
              <p className="text-xs font-normal text-[#6E6E73]">Closed history</p>
            </div>
            <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
              <Archive className="h-4 w-4" />
            </div>
          </div>
        </Link>
      </div>

      {/* ── MAIN DISPATCH WORKLOAD & ACTIONS GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">

        {/* LEFT 2 COLUMNS: Workload Dispatch */}
        <div className="lg:col-span-2 space-y-6">

          {/* ACTIVE DISPATCH QUEUE */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                  <Navigation className="h-4 w-4 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Active Workload &amp; Field Dispatch</h2>
                  <p className="text-xs font-normal text-[#6E6E73] mt-0.5">Assigned repair tasks and scheduled walkthrough inspections</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                {allItems.length} Total Jobs
              </span>
            </div>

            {allItems.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center mx-auto text-slate-700 shadow-2xs mb-1">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="text-xs font-semibold text-[#1D1D1F]">All Field Tasks Clear</h3>
                <p className="text-xs font-normal text-[#6E6E73] max-w-sm mx-auto">You currently have no active work orders or scheduled inspections assigned.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {allItems.map((item) => {
                  const pCfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG["MEDIUM"];
                  const sCfg = STATUS_STEP[item.status];
                  return (
                    <div key={item.id} className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0 mt-0.5">
                          {item.type === "WALKTHROUGH" ? <ClipboardCheck className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                              {item.type === "WALKTHROUGH" ? `${item.walkthroughType} Inspection` : "Repair Request"}
                            </span>
                            {item.priority && (
                              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border shadow-2xs ${pCfg.bg} ${pCfg.text} ${pCfg.border}`}>
                                {pCfg.label}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-semibold text-[#1D1D1F]">{item.title}</h4>

                          <div className="flex items-center gap-3 text-xs font-normal text-[#6E6E73] flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" /> {item.property} &bull; Unit {item.unit}
                            </span>
                            {item.tenant && (
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5 text-slate-400" /> {item.tenant}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <Link href={item.link}>
                          <Button className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl px-4 flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-xs">
                            {sCfg?.next || (item.type === "WALKTHROUGH" ? "Conduct" : "View")}
                            <ArrowRight className="h-3.5 w-3.5 text-white" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 1 COLUMN: Action Needed & Quick Links */}
        <div className="space-y-6">

          {/* ACTION REQUIRED WIDGET */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <div className="h-9 w-9 bg-amber-50 border border-amber-200/80 text-amber-700 rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Action Required</h3>
                <p className="text-xs font-normal text-[#6E6E73] mt-0.5">
                  {unscheduled.length === 0 ? "All tasks scheduled" : `${unscheduled.length} task${unscheduled.length > 1 ? "s" : ""} pending action`}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {unscheduled.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center mx-auto text-slate-700 shadow-2xs mb-1">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-xs font-semibold text-[#1D1D1F]">Everything On Schedule!</p>
                  <p className="text-xs font-normal text-[#6E6E73]">No pending unscheduled tasks.</p>
                </div>
              ) : (
                unscheduled.map((item) => {
                  const sCfg = STATUS_STEP[item.status];
                  return (
                    <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-3">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                          {item.type}
                        </span>
                        <h4 className="text-xs font-semibold text-[#1D1D1F] mt-1.5">{item.title}</h4>
                        <p className="text-xs font-normal text-[#6E6E73] mt-0.5">{item.property} &bull; Unit {item.unit}</p>
                      </div>

                      <Link href={item.link} className="block">
                        <Button className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1 border-none cursor-pointer shadow-xs">
                          {sCfg?.next || "View Task"} <ArrowRight className="h-3 w-3 text-white" />
                        </Button>
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* QUICK LINKS PANEL */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-3">
            <h3 className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider">Field Staff Shortcuts</h3>

            {[
              { label: "Assigned Work Orders", href: "/dashboard/inspector/active", Icon: Wrench },
              { label: "Move-Out Walkthroughs", href: "/dashboard/inspector/inspections", Icon: ClipboardCheck },
              { label: "Inbox Messages", href: "/dashboard/messages", Icon: MessageSquare },
              { label: "Closed Diagnostics History", href: "/dashboard/inspector/history", Icon: ListChecks },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer group shadow-2xs">
                <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                  <link.Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-[#1D1D1F] flex-1">{link.label}</span>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
}

