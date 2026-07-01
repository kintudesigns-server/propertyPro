"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Wrench, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InspectorOverviewPage() {
  const { status } = useSession();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInspectorRequests = async () => {
    try {
      const res = await fetch("/api/maintenance");
      if (!res.ok) throw new Error("Failed to load requests");
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assigned inspections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchInspectorRequests();
    }
  }, [status]);

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3B82F6]"></div>
        <p className="text-slate-400 font-extrabold text-sm tracking-wider uppercase">Loading overview...</p>
      </div>
    );
  }

  const activeTasks = requests.filter((r) => r.status === "ASSIGNED" || r.status === "SUBMITTED");
  const urgentTasks = activeTasks.filter(t => t.priority === "HIGH" || t.priority === "EMERGENCY").slice(0, 5);

  return (
    <div className="flex flex-col gap-8 max-w-[1200px] w-full pb-10 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">Inspector Dashboard</h1>
          <p className="text-slate-500 font-semibold mt-1">Overview of your assigned properties and tasks.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <CardHeader className="p-0">
            <CardDescription className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Jobs</CardDescription>
            <CardTitle className="text-3xl font-black mt-2 text-[#0F172A] flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                <Wrench className="h-6 w-6" />
              </div>
              {activeTasks.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-[#3B82F6] text-white border-0 shadow-md rounded-2xl p-6 flex flex-col justify-between">
          <CardHeader className="p-0">
            <CardDescription className="text-blue-100 text-xs font-bold uppercase tracking-wider">Resolved Inspections</CardDescription>
            <CardTitle className="text-3xl font-black mt-2 flex items-center gap-3">
              <div className="p-2 bg-white/20 text-white rounded-xl">
                <Check className="h-6 w-6" />
              </div>
              {requests.filter((r) => r.status === "RESOLVED").length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <CardHeader className="p-0">
            <CardDescription className="text-slate-500 text-xs font-bold uppercase tracking-wider">Closed Jobs History</CardDescription>
            <CardTitle className="text-3xl font-black mt-2 text-[#0F172A] flex items-center gap-3">
              <div className="p-2 bg-slate-100 text-slate-500 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
              {requests.filter((r) => r.status === "CLOSED").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Urgent Tasks Preview */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="px-6 py-5 border-b border-[#E2E8F0] flex flex-row items-center justify-between bg-slate-50/50">
          <div>
            <CardTitle className="text-lg font-extrabold text-[#0F172A]">Urgent Active Tasks</CardTitle>
            <CardDescription className="text-slate-500 text-xs font-semibold mt-0.5">High priority tasks requiring immediate attention.</CardDescription>
          </div>
          <Link href="/dashboard/inspector/active">
            <Button variant="outline" size="sm" className="font-bold text-xs">
              View All Tasks <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {urgentTasks.length === 0 ? (
            <div className="text-center py-10 text-slate-500 font-semibold text-sm">
              No urgent tasks currently assigned. You're all caught up!
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-[#E2E8F0]">
                  <TableHead className="text-slate-500 font-bold text-[11px] uppercase tracking-wider h-10 px-6">Ticket Info</TableHead>
                  <TableHead className="text-slate-500 font-bold text-[11px] uppercase tracking-wider h-10">Property</TableHead>
                  <TableHead className="text-slate-500 font-bold text-[11px] uppercase tracking-wider h-10">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urgentTasks.map((t) => (
                  <TableRow key={t.id} className="border-[#E2E8F0] hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-6 py-4">
                      <strong className="block font-bold text-[#0F172A]">{t.title}</strong>
                      <span className="text-xs text-slate-500 block max-w-xs truncate mt-0.5">{t.description}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <strong className="block font-bold text-[#0F172A]">{t.unit.property.name}</strong>
                      <span className="text-xs text-slate-500 mt-0.5 block">{t.unit.name}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge className={`rounded-full font-bold px-3 py-0.5 text-[10px] uppercase tracking-wider ${
                        t.priority === "HIGH" || t.priority === "EMERGENCY"
                          ? "bg-red-50 text-red-600 hover:bg-red-50 border-red-200"
                          : "bg-orange-50 text-orange-600 hover:bg-orange-50 border-orange-200"
                      }`}>
                        {t.priority}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
