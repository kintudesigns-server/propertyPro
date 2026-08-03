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
        <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
        <p className="text-slate-400 font-extrabold text-xs tracking-wider uppercase">Loading Field Dashboard...</p>
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
      <div className={`max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-24 space-y-8 ${isBlocked ? "pointer-events-none select-none blur-[2.5px] opacity-70" : ""}`}>

      {/* ── iOS 18 HERO HEADER BANNER ── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200/80 text-blue-700 rounded-lg text-xs font-extrabold">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              Field Inspector Hub
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Available for Dispatch
            </span>
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Good {now.getHours() < 12 ? "morning" : now.getHours() < 18 ? "afternoon" : "evening"}, {userName} 👋
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            <span className="text-slate-300 mx-2">&bull;</span>
            <span className="text-slate-700 font-bold">{activeTasks.length} Active Work Orders</span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/dashboard/messages">
            <Button variant="outline" className="h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-5 rounded-2xl text-sm gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" /> Messages
            </Button>
          </Link>
          <Link href="/dashboard/inspector/active">
            <Button className="h-11 bg-slate-900 hover:bg-blue-600 text-white font-bold px-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-sm gap-2 border-none">
              <Wrench className="h-4 w-4" /> View All Work Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* ── EMERGENCY ALERT BANNER ── */}
      {EMERGENCY_count > 0 && (
        <div className="bg-red-50 border border-red-200/90 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-red-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-black text-red-950">
                {EMERGENCY_count} High-Priority Emergency Repair{EMERGENCY_count > 1 ? "s" : ""} Assigned
              </p>
              <p className="text-xs font-semibold text-red-700 mt-0.5">Immediate field response required. Contact tenant and dispatch diagnosis.</p>
            </div>
          </div>
          <Link href="/dashboard/inspector/active">
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-5 rounded-xl text-xs gap-1.5 border-none shadow-sm">
              Respond Now <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* ── APPLE-STYLE KPI STRIP ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/inspector/active">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-blue-200 transition-all flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Active Repairs</p>
              <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{activeTasks.length}</h3>
              <p className="text-xs font-semibold text-slate-500">In-progress &amp; assigned</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Wrench className="h-6 w-6" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/inspector/inspections">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-indigo-200 transition-all flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Walkthroughs</p>
              <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{walkthroughItems.length}</h3>
              <p className="text-xs font-semibold text-slate-500">Move-in / Move-out</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <ClipboardCheck className="h-6 w-6" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/inspector/active">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-emerald-200 transition-all flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Completed</p>
              <h3 className="text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{resolvedTasks.length}</h3>
              <p className="text-xs font-semibold text-slate-500">Resolved repairs</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/inspector/history">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Archived</p>
              <h3 className="text-2xl font-black text-slate-900 group-hover:text-slate-700 transition-colors">{closedTasks.length}</h3>
              <p className="text-xs font-semibold text-slate-500">Closed history</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-all">
              <Archive className="h-6 w-6" />
            </div>
          </div>
        </Link>
      </div>

      {/* ── MAIN DISPATCH WORKLOAD & ACTIONS GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT 2 COLUMNS: Workload Dispatch & Schedule */}
        <div className="lg:col-span-2 space-y-6">

          {/* ACTIVE DISPATCH QUEUE */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 pb-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
                  <Navigation className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Active Workload &amp; Field Dispatch</h2>
                  <p className="text-xs font-semibold text-slate-400">Assigned repair tasks and scheduled walkthrough inspections</p>
                </div>
              </div>
              <span className="text-xs font-extrabold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl">
                {allItems.length} Total Jobs
              </span>
            </div>

            {allItems.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800">All Field Tasks Clear</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">You currently have no active work orders or scheduled inspections assigned.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {allItems.map((item) => {
                  const pCfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG["MEDIUM"];
                  const sCfg = STATUS_STEP[item.status];
                  return (
                    <div key={item.id} className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${item.type === "WALKTHROUGH" ? "bg-indigo-50 text-indigo-600" : "bg-blue-50 text-blue-600"}`}>
                          {item.type === "WALKTHROUGH" ? <ClipboardCheck className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border ${item.type === "WALKTHROUGH" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                              {item.type === "WALKTHROUGH" ? `${item.walkthroughType} Inspection` : "Repair Request"}
                            </span>
                            {item.priority && (
                              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border ${pCfg.bg} ${pCfg.text} ${pCfg.border}`}>
                                {pCfg.label}
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>

                          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 flex-wrap">
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
                          <Button className="h-9 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-xl px-4 flex items-center gap-1.5 transition-all">
                            {sCfg?.next || (item.type === "WALKTHROUGH" ? "Conduct" : "View")}
                            <ArrowRight className="h-3.5 w-3.5" />
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
          <div className="bg-white rounded-3xl border border-amber-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-amber-100 bg-amber-50/60 flex items-center gap-3">
              <div className="h-9 w-9 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-amber-950">Action Required</h3>
                <p className="text-xs font-medium text-amber-700">
                  {unscheduled.length === 0 ? "All tasks scheduled" : `${unscheduled.length} task${unscheduled.length > 1 ? "s" : ""} pending action`}
                </p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {unscheduled.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Everything On Schedule!</p>
                  <p className="text-[11px] text-slate-400">No pending unscheduled tasks.</p>
                </div>
              ) : (
                unscheduled.map((item) => {
                  const sCfg = STATUS_STEP[item.status];
                  return (
                    <div key={item.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {item.type}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{item.title}</h4>
                        <p className="text-xs text-slate-500 font-medium">{item.property} &bull; Unit {item.unit}</p>
                      </div>

                      <Link href={item.link} className="block">
                        <Button className="w-full h-8 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-xl gap-1">
                          {sCfg?.next || "View Task"} <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* QUICK LINKS PANEL */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Field Staff Shortcuts</h3>

            {[
              { label: "Assigned Work Orders", href: "/dashboard/inspector/active", Icon: Wrench, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Move-Out Walkthroughs", href: "/dashboard/inspector/inspections", Icon: ClipboardCheck, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Inbox Messages", href: "/dashboard/messages", Icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Closed Diagnostics History", href: "/dashboard/inspector/history", Icon: ListChecks, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group">
                <div className={`h-9 w-9 ${link.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <link.Icon className={`h-4 w-4 ${link.color}`} />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex-1">{link.label}</span>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
