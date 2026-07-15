"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Wrench, ArrowRight, Calendar, AlertCircle, ClipboardCheck, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InspectorOverviewPage() {
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id;
  const [requests, setRequests] = useState<any[]>([]);
  const [walkthroughs, setWalkthroughs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [maintRes, leaseRes] = await Promise.all([
        fetch("/api/maintenance"),
        fetch("/api/leases")
      ]);
      if (!maintRes.ok) throw new Error("Failed to load work orders");
      if (!leaseRes.ok) throw new Error("Failed to load walkthroughs");
      
      const maintData = await maintRes.json();
      const leaseData = await leaseRes.json();
      
      setRequests(maintData);
      setWalkthroughs(leaseData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
        <p className="text-slate-400 font-extrabold text-sm tracking-wider uppercase">Loading overview...</p>
      </div>
    );
  }

  // Active / Closed maintenance tasks counts
  const activeTasks = requests.filter((r) => !["RESOLVED", "CLOSED"].includes(r.status));
  const resolvedTasks = requests.filter((r) => r.status === "RESOLVED");
  const closedTasks = requests.filter((r) => r.status === "CLOSED");

  // Build active walkthroughs list
  const activeWalkthroughs = walkthroughs.flatMap((lease) => {
    const list = [];
    if (
      lease.preliminaryInspectorId === userId &&
      lease.preliminaryInspectionStatus === "SCHEDULED"
    ) {
      list.push({
        id: `${lease.id}-prelim`,
        type: "WALKTHROUGH",
        walkthroughType: "PRELIMINARY",
        title: `Preliminary Walkthrough: ${lease.unit?.property?.name}`,
        subtitle: `Unit ${lease.unit?.name} · Tenant: ${lease.tenant?.name || "N/A"}`,
        date: lease.preliminaryInspectionDate ? new Date(lease.preliminaryInspectionDate) : null,
        status: "Scheduled",
        link: `/dashboard/inspector/inspections/${lease.id}?type=PRELIMINARY`,
        actionLabel: "Conduct Inspection",
      });
    }
    if (
      lease.moveOutInspectorId === userId &&
      lease.moveOutStatus === "INSPECTION_SCHEDULED"
    ) {
      list.push({
        id: `${lease.id}-final`,
        type: "WALKTHROUGH",
        walkthroughType: "FINAL",
        title: `Final Walkthrough: ${lease.unit?.property?.name}`,
        subtitle: `Unit ${lease.unit?.name} · Tenant: ${lease.tenant?.name || "N/A"}`,
        date: lease.inspectionDate ? new Date(lease.inspectionDate) : null,
        status: "Scheduled",
        link: `/dashboard/inspector/inspections/${lease.id}?type=FINAL`,
        actionLabel: "Conduct Inspection",
      });
    }
    return list;
  });

  // Map active maintenance tasks to agenda items
  const maintenanceAgenda = activeTasks.map((t) => {
    let date = null;
    let actionLabel = "View Ticket";
    let statusLabel = t.status.replace(/_/g, " ");

    if (t.status === "ASSIGNED") {
      actionLabel = "Schedule Diagnosis";
    } else if (t.status === "DIAGNOSIS_SCHEDULED") {
      date = t.diagnosisDate ? new Date(t.diagnosisDate) : null;
      actionLabel = "Submit Estimate";
    } else if (t.status === "PENDING_APPROVAL") {
      statusLabel = "Pending Approval";
    } else if (t.status === "APPROVED") {
      actionLabel = "Schedule Repair";
    } else if (t.status === "REPAIR_SCHEDULED") {
      date = t.repairDate ? new Date(t.repairDate) : null;
      actionLabel = "Complete Work";
    }

    return {
      id: t.id,
      type: "MAINTENANCE",
      title: t.title,
      subtitle: `${t.unit?.property?.name} · Unit ${t.unit?.name}`,
      date,
      status: statusLabel,
      priority: t.priority,
      link: `/dashboard/inspector/active`,
      actionLabel,
    };
  });

  // Combine agenda items
  const allAgendaItems = [...activeWalkthroughs, ...maintenanceAgenda];

  // Group agenda items:
  // 1. Action Needed (assigned but not scheduled yet)
  const needsScheduling = allAgendaItems.filter(item => !item.date);

  // 2. Scheduled items
  const scheduledItems = allAgendaItems
    .filter(item => !!item.date)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime());

  // Split scheduled into Today and Upcoming
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const todayAgenda = scheduledItems.filter(item => item.date! >= startOfToday && item.date! <= endOfToday);
  const upcomingAgenda = scheduledItems.filter(item => item.date! > endOfToday);

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] w-full pb-10 pt-4">
      {/* Dashboard Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">Inspector Dashboard</h1>
          <p className="text-slate-500 font-semibold mt-1">Unified agenda of your assigned jobs and properties.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <CardHeader className="p-0">
            <CardDescription className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Work Orders</CardDescription>
            <CardTitle className="text-3xl font-black mt-2 text-[#0F172A] flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                <Wrench className="h-6 w-6 text-blue-500" />
              </div>
              {activeTasks.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <CardHeader className="p-0">
            <CardDescription className="text-slate-500 text-xs font-bold uppercase tracking-wider">Walkthroughs Scheduled</CardDescription>
            <CardTitle className="text-3xl font-black mt-2 text-[#0F172A] flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-505 rounded-xl">
                <ClipboardCheck className="h-6 w-6 text-indigo-500" />
              </div>
              {activeWalkthroughs.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-[#3B82F6] text-white border-0 shadow-md rounded-2xl p-6 flex flex-col justify-between">
          <CardHeader className="p-0">
            <CardDescription className="text-blue-100 text-xs font-bold uppercase tracking-wider">Completed Work</CardDescription>
            <CardTitle className="text-3xl font-black mt-2 flex items-center gap-3">
              <div className="p-2 bg-white/20 text-white rounded-xl">
                <Check className="h-6 w-6" />
              </div>
              {resolvedTasks.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <CardHeader className="p-0">
            <CardDescription className="text-slate-500 text-xs font-bold uppercase tracking-wider">Archived / Closed</CardDescription>
            <CardTitle className="text-3xl font-black mt-2 text-[#0F172A] flex items-center gap-3">
              <div className="p-2 bg-slate-100 text-slate-505 rounded-xl">
                <Clock className="h-6 w-6 text-slate-500" />
              </div>
              {closedTasks.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Agenda Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Agenda Section: Today & Upcoming */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-[#0F172A] flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Your Scheduled Agenda
          </h2>

          {/* Today's Schedule */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="px-6 py-4 bg-slate-50 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">Scheduled Today</CardTitle>
              </div>
              <Badge variant="outline" className="font-bold text-[10px] uppercase bg-indigo-50 border-indigo-200 text-indigo-700">
                {todayAgenda.length} Jobs
              </Badge>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {todayAgenda.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-semibold text-xs italic">
                  No appointments scheduled for today.
                </div>
              ) : (
                todayAgenda.map((item) => (
                  <div key={item.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-indigo-600">
                          {item.date?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Badge className={`text-[9px] font-black uppercase ${
                          item.type === "WALKTHROUGH" 
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200" 
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {item.type}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                      <p className="text-xs text-slate-500 font-semibold">{item.subtitle}</p>
                    </div>
                    <Link href={item.link}>
                      <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-9">
                        {item.actionLabel}
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming Schedule */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="px-6 py-4 bg-slate-50 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">Upcoming Agenda</CardTitle>
              </div>
              <Badge variant="outline" className="font-bold text-[10px] uppercase bg-slate-200 text-slate-600 border-slate-350">
                {upcomingAgenda.length} Upcoming
              </Badge>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {upcomingAgenda.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-semibold text-xs italic">
                  No upcoming scheduled tasks.
                </div>
              ) : (
                upcomingAgenda.map((item) => (
                  <div key={item.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-600">
                          {item.date?.toLocaleDateString()} · {item.date?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Badge className={`text-[9px] font-black uppercase ${
                          item.type === "WALKTHROUGH" 
                            ? "bg-indigo-50 text-indigo-750 border border-indigo-200" 
                            : "bg-blue-50 text-blue-750 border border-blue-200"
                        }`}>
                          {item.type}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                      <p className="text-xs text-slate-500 font-semibold">{item.subtitle}</p>
                    </div>
                    <Link href={item.link}>
                      <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl h-9">
                        {item.actionLabel}
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Action Needed / Needs Scheduling */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-[#0F172A] flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Unscheduled Tasks
          </h2>

          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="px-5 py-4 bg-slate-50 border-b border-[#E2E8F0]">
              <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider">Requires Booking / Setup</CardTitle>
              <CardDescription className="text-[11px] font-semibold text-slate-400 mt-0.5">Assigned to you but no schedule set yet.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {needsScheduling.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-semibold text-xs italic">
                  All assigned tasks are scheduled.
                </div>
              ) : (
                needsScheduling.map((item) => (
                  <div key={item.id} className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl space-y-2 flex flex-col">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-250 uppercase tracking-wider">
                        {item.status}
                      </span>
                      {(item as any).priority && (
                        <Badge variant="destructive" className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded">
                          {(item as any).priority}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs">{item.title}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{item.subtitle}</p>
                    </div>
                    <Link href={item.link} className="w-full mt-1">
                      <Button size="sm" className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black rounded-lg h-8 flex items-center justify-center gap-1">
                        {item.actionLabel}
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
