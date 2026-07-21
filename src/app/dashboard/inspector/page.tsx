"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Wrench, ClipboardCheck, CheckCircle2, Archive, Calendar,
  AlertTriangle, Clock, ArrowRight, MapPin, User, ChevronRight,
  Loader2, Zap, ListChecks, LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/KpiCard";

// ─── Priority color helpers ────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  EMERGENCY: { label: "Emergency", bg: "bg-red-50",    text: "text-red-700",   border: "border-red-300"   },
  HIGH:      { label: "High",      bg: "bg-orange-50", text: "text-orange-700",border: "border-orange-300" },
  MEDIUM:    { label: "Medium",    bg: "bg-amber-50",  text: "text-amber-700", border: "border-amber-200"  },
  LOW:       { label: "Low",       bg: "bg-[#F5F5F7]",  text: "text-[#6E6E73]", border: "border-[#E5E5EA]"  },
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
function isToday(d: Date) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function isTomorrow(d: Date) {
  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  return d.getFullYear() === tom.getFullYear() && d.getMonth() === tom.getMonth() && d.getDate() === tom.getDate();
}
function relativeDay(d: Date) {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return formatDate(d);
}

export default function InspectorOverviewPage() {
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id;
  const userName = (session?.user as any)?.name?.split(" ")[0] || "Inspector";

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
      } catch { toast.error("Failed to load dashboard data."); }
      finally { setLoading(false); }
    })();
  }, [status]);

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-[#8E8E93] font-semibold text-sm">Loading your dashboard...</p>
      </div>
    );
  }

  // ── Compute data ─────────────────────────────────────────────────────────
  const activeTasks   = requests.filter(r => !["RESOLVED", "CLOSED"].includes(r.status));
  const resolvedTasks = requests.filter(r => r.status === "RESOLVED");
  const closedTasks   = requests.filter(r => r.status === "CLOSED");

  const walkthroughItems: any[] = walkthroughs.flatMap(lease => {
    const out = [];
    if (lease.preliminaryInspectorId === userId && lease.preliminaryInspectionStatus === "SCHEDULED") {
      out.push({
        id: `${lease.id}-prelim`, type: "WALKTHROUGH", walkthroughType: "Move-In",
        title: `Move-In Inspection`,
        property: lease.unit?.property?.name || "—",
        unit: lease.unit?.name || "—",
        tenant: lease.tenant?.name || "N/A",
        date: lease.preliminaryInspectionDate ? new Date(lease.preliminaryInspectionDate) : null,
        link: `/dashboard/inspector/inspections/${lease.id}?type=PRELIMINARY`,
      });
    }
    if (lease.moveOutInspectorId === userId && lease.moveOutStatus === "INSPECTION_SCHEDULED") {
      out.push({
        id: `${lease.id}-final`, type: "WALKTHROUGH", walkthroughType: "Move-Out",
        title: `Move-Out Inspection`,
        property: lease.unit?.property?.name || "—",
        unit: lease.unit?.name || "—",
        tenant: lease.tenant?.name || "N/A",
        date: lease.inspectionDate ? new Date(lease.inspectionDate) : null,
        link: `/dashboard/inspector/inspections/${lease.id}?type=FINAL`,
      });
    }
    return out;
  });

  const maintenanceItems: any[] = activeTasks.map(t => ({
    id: t.id, type: "REPAIR",
    title: t.title,
    property: t.unit?.property?.name || "—",
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

  // Split into today, upcoming, unscheduled
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const allItems = [...walkthroughItems, ...maintenanceItems];

  const todayItems     = allItems.filter(i => i.date && i.date <= endOfToday && i.date >= new Date(now.getFullYear(), now.getMonth(), now.getDate())).sort((a,b) => a.date - b.date);
  const upcomingItems  = allItems.filter(i => i.date && i.date > endOfToday).sort((a, b) => a.date - b.date);
  const unscheduled    = allItems.filter(i => !i.date);

  const EMERGENCY_count = maintenanceItems.filter(t => t.priority === "EMERGENCY").length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-20 space-y-7">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="h-4 w-4 text-indigo-500" />
            <span className="text-[11px] font-extrabold text-indigo-500 uppercase tracking-widest">Inspector Dashboard</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Good {now.getHours() < 12 ? "morning" : now.getHours() < 18 ? "afternoon" : "evening"}, {userName} 👋
          </h1>
          <p className="text-[#8E8E93] text-sm font-medium mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            {todayItems.length > 0 && <span className="text-indigo-600 font-bold ml-2">· {todayItems.length} job{todayItems.length > 1 ? "s" : ""} today</span>}
          </p>
        </div>
        <Link href="/dashboard/inspector/active">
          <Button className="bg-slate-900 hover:bg-[#007AFF] text-white font-bold text-sm rounded-xl h-10 px-5 flex items-center gap-2">
            <Wrench className="h-4 w-4" /> View All Work Orders
          </Button>
        </Link>
      </div>

      {/* ── EMERGENCY ALERT BANNER ── */}
      {EMERGENCY_count > 0 && (
        <div className="relative flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="absolute left-0 top-0 w-1 h-full bg-red-500 rounded-l-xl" />
          <div className="ml-2 h-9 w-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-red-900">
              {EMERGENCY_count} Emergency Repair{EMERGENCY_count > 1 ? "s" : ""} Require Immediate Attention
            </p>
            <p className="text-xs text-red-600 mt-0.5 font-medium">Respond to emergency tickets as soon as possible.</p>
          </div>
          <Link href="/dashboard/inspector/active">
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shrink-0">
              View Now <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          href="/dashboard/inspector/active"
          title="Active Repairs"
          value={activeTasks.length}
          subtext="Assigned & in-progress"
          icon={Wrench}
          variant="blue"
        />
        <KpiCard
          href="/dashboard/inspector/inspections"
          title="Walkthroughs"
          value={walkthroughItems.length}
          subtext="Inspections scheduled"
          icon={ClipboardCheck}
          variant="indigo"
        />
        <KpiCard
          href="/dashboard/inspector/active"
          title="Completed"
          value={resolvedTasks.length}
          subtext="Resolved this period"
          icon={CheckCircle2}
          variant="green"
        />
        <KpiCard
          href="/dashboard/inspector/history"
          title="Archived"
          value={closedTasks.length}
          subtext="Closed tickets"
          icon={Archive}
          variant="slate"
        />
      </div>

      {/* ── MAIN CONTENT: Today + Upcoming + Unscheduled ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Scheduled Work (2/3 width) */}
        <div className="lg:col-span-2 space-y-5">

          {/* TODAY */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Today's Schedule</h2>
                  <p className="text-[10px] text-[#8E8E93] font-medium">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${todayItems.length > 0 ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-100 text-[#6E6E73] border-slate-200"}`}>
                {todayItems.length === 0 ? "Clear" : `${todayItems.length} Job${todayItems.length > 1 ? "s" : ""}`}
              </span>
            </div>

            {todayItems.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-slate-700">No jobs scheduled for today</p>
                <p className="text-xs text-[#8E8E93] mt-1">Check upcoming tasks below or action unscheduled items.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {todayItems.map((item) => <JobRow key={item.id} item={item} showTime />)}
              </div>
            )}
          </div>

          {/* UPCOMING */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Clock className="h-4 w-4 text-[#6E6E73]" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Upcoming Jobs</h2>
                  <p className="text-[10px] text-[#8E8E93] font-medium">All scheduled work after today</p>
                </div>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full border bg-slate-100 text-[#6E6E73] border-slate-200">
                {upcomingItems.length} scheduled
              </span>
            </div>

            {upcomingItems.length === 0 ? (
              <div className="text-center py-10 text-[#8E8E93] text-xs font-semibold italic">
                No upcoming scheduled jobs.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {upcomingItems.map((item) => <JobRow key={item.id} item={item} showDate />)}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Action Needed (1/3 width) */}
        <div className="space-y-5">
          <div className="bg-white border border-amber-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 bg-amber-50 flex items-center gap-2.5">
              <div className="h-8 w-8 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-black text-amber-900">Action Required</h2>
                <p className="text-[10px] text-amber-700 font-medium">
                  {unscheduled.length === 0 ? "All tasks are scheduled" : `${unscheduled.length} task${unscheduled.length > 1 ? "s" : ""} need your attention`}
                </p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {unscheduled.length === 0 ? (
                <div className="text-center py-8">
                  <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-xs font-bold text-[#6E6E73]">All clear!</p>
                  <p className="text-[11px] text-[#8E8E93] mt-0.5">Every task has a scheduled date.</p>
                </div>
              ) : (
                unscheduled.map((item) => {
                  const pCfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG["MEDIUM"];
                  const sCfg = STATUS_STEP[item.status];
                  return (
                    <div key={item.id} className="border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-300 hover:shadow-xs transition-all bg-white">
                      {/* Type + Priority badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${item.type === "WALKTHROUGH" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                          {item.type === "WALKTHROUGH" ? item.walkthroughType : "Repair"}
                        </span>
                        {item.priority && (
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${pCfg.bg} ${pCfg.text} ${pCfg.border}`}>
                            {pCfg.label}
                          </span>
                        )}
                      </div>

                      {/* Title + location */}
                      <div>
                        <p className="text-sm font-black text-slate-900 leading-snug">{item.title}</p>
                        <p className="text-[11px] text-[#6E6E73] font-medium mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{item.property} · Unit {item.unit}
                        </p>
                        {item.tenant && (
                          <p className="text-[11px] text-[#8E8E93] font-medium flex items-center gap-1 mt-0.5">
                            <User className="h-3 w-3" /> {item.tenant}
                          </p>
                        )}
                      </div>

                      {/* Status step */}
                      {sCfg && (
                        <p className={`text-[10px] font-bold ${sCfg.color}`}>
                          ↳ {sCfg.label}
                        </p>
                      )}

                      <Link href={item.link} className="block">
                        <button className="w-full h-8 bg-slate-900 hover:bg-[#007AFF] text-white text-[11px] font-black rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                          {sCfg?.next || "View Details"} <ArrowRight className="h-3 w-3" />
                        </button>
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-4 space-y-2">
            <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase tracking-widest mb-3">Quick Links</p>
            {[
              { label: "All Repairs & Work Orders", href: "/dashboard/inspector/active", Icon: Wrench, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Move-Out Walkthroughs", href: "/dashboard/inspector/inspections", Icon: ClipboardCheck, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Completed History", href: "/dashboard/inspector/history", Icon: ListChecks, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map(link => (
              <Link key={link.href} href={link.href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F5F7] border border-transparent hover:border-slate-200 transition-all group">
                <div className={`h-8 w-8 ${link.bg} rounded-lg flex items-center justify-center shrink-0`}>
                  <link.Icon className={`h-3.5 w-3.5 ${link.color}`} />
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-[#1D1D1F] flex-1 transition-colors">{link.label}</span>
                <ChevronRight className="h-4 w-4 text-[#8E8E93] group-hover:text-[#6E6E73] transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── JobRow component ─────────────────────────────────────────────────────────
function JobRow({ item, showTime, showDate }: { item: any; showTime?: boolean; showDate?: boolean }) {
  const pCfg = PRIORITY_CONFIG[item.priority] || null;
  const sCfg = STATUS_STEP[item.status] || null;

  return (
    <div className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-[#F5F5F7]/70 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        {/* Type icon */}
        <div className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${item.type === "WALKTHROUGH" ? "bg-indigo-50" : "bg-blue-50"}`}>
          {item.type === "WALKTHROUGH"
            ? <ClipboardCheck className="h-4 w-4 text-indigo-600" />
            : <Wrench className="h-4 w-4 text-blue-600" />}
        </div>

        <div className="min-w-0">
          {/* Date/time line */}
          {item.date && (
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {showTime && (
                <span className="text-xs font-black text-indigo-600">{formatTime(item.date)}</span>
              )}
              {showDate && (
                <span className="text-xs font-black text-slate-700">{relativeDay(item.date)}</span>
              )}
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${item.type === "WALKTHROUGH" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                {item.type === "WALKTHROUGH" ? item.walkthroughType : "Repair"}
              </span>
              {pCfg && item.priority !== "MEDIUM" && item.priority !== "LOW" && (
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${pCfg.bg} ${pCfg.text} ${pCfg.border}`}>
                  {pCfg.label}
                </span>
              )}
            </div>
          )}

          <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
          <p className="text-[11px] text-[#6E6E73] font-medium mt-0.5 flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />{item.property} · Unit {item.unit}
          </p>
          {item.tenant && (
            <p className="text-[11px] text-[#8E8E93] font-medium flex items-center gap-1 mt-0.5">
              <User className="h-3 w-3 shrink-0" />{item.tenant}
            </p>
          )}
          {sCfg && (
            <p className={`text-[10px] font-bold mt-1 ${sCfg.color}`}>↳ {sCfg.label}</p>
          )}
        </div>
      </div>

      <Link href={item.link} className="shrink-0">
        <button className="h-9 bg-slate-900 hover:bg-[#007AFF] text-white text-[11px] font-black rounded-xl px-3.5 flex items-center gap-1.5 transition-colors whitespace-nowrap">
          {sCfg?.next || (item.type === "WALKTHROUGH" ? "Conduct" : "View")}
          <ArrowRight className="h-3 w-3" />
        </button>
      </Link>
    </div>
  );
}
