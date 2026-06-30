"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Plus, Loader2, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";

export default function MyRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [maintFilterPriority, setMaintFilterPriority] = useState("ALL");
  const [maintFilterStatus, setMaintFilterStatus] = useState("ALL");

  const fetchMaintenance = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/maintenance");
      if (res.ok) {
        setMaintenance(await res.json());
      }
    } catch (err) {
      toast.error("Failed to load maintenance requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    fetchMaintenance();
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#3B82F6]" />
        <p className="text-slate-400 font-extrabold text-sm uppercase tracking-wider">Syncing maintenance log...</p>
      </div>
    );
  }

  const filteredMaint = maintenance
    .filter(m => maintFilterPriority === "ALL" || m.priority === maintFilterPriority)
    .filter(m => maintFilterStatus === "ALL" || m.status === maintFilterStatus);

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">My Requests</h1>
          <p className="text-[#64748B] text-sm mt-1">Track pending tickets, schedule inspection dates, and view histories.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchMaintenance}
            variant="outline"
            className="bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl font-bold flex items-center gap-2 h-11 px-5 shadow-sm"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button 
            onClick={() => router.push("/dashboard/maintenance/new")} 
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold h-11 px-5 rounded-xl shadow-sm flex items-center gap-2"
          >
            <Plus className="h-5 w-5" /> Submit Request
          </Button>
        </div>
      </div>

      <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-[#F1F5F9] mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-[#0F172A]">Maintenance Log</h2>
            <span className="text-xs text-[#64748B]">All logged repairs and their current statuses</span>
          </div>

          <div className="flex gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
            <Select value={maintFilterPriority} onValueChange={(val) => setMaintFilterPriority(val || "ALL")}>
              <SelectTrigger className="h-9 text-xs w-32 bg-slate-50 border-[#E2E8F0] rounded-xl">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
              </SelectContent>
            </Select>

            <Select value={maintFilterStatus} onValueChange={(val) => setMaintFilterStatus(val || "ALL")}>
              <SelectTrigger className="h-9 text-xs w-32 bg-slate-50 border-[#E2E8F0] rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-xs uppercase text-[#64748B]">Ticket Title</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#64748B]">Category</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#64748B]">Priority</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#64748B]">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#64748B]">Assigned Inspector</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#64748B]">Date Filed</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#64748B] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaint.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-[#64748B] italic font-semibold">
                    No maintenance tickets found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaint.map((m) => (
                  <TableRow
                    key={m.id}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/maintenance/${m.id}`)}
                  >
                    <TableCell className="font-bold text-slate-800 py-4">
                      {m.title}
                      <p className="text-[10px] text-[#64748B] font-normal mt-0.5 line-clamp-1">{m.description}</p>
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs font-semibold">{m.category}</TableCell>
                    <TableCell>
                      <Badge className={
                        m.priority === "EMERGENCY" ? "bg-red-50 text-red-700 border border-red-200" :
                        m.priority === "HIGH" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                        m.priority === "MEDIUM" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        "bg-slate-100 text-slate-700 border border-slate-200"
                      }>
                        {m.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full font-bold px-2.5 py-0.5 capitalize text-[10px]">
                        {m.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-700">
                      {m.inspector ? m.inspector.name : <span className="text-[#64748B] italic">Awaiting assignment</span>}
                    </TableCell>
                    <TableCell className="text-[#64748B] text-xs">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 rounded-lg border-[#E2E8F0] text-[#3B82F6] hover:bg-blue-50 hover:border-blue-200 font-semibold text-xs flex items-center gap-1.5"
                        onClick={() => router.push(`/dashboard/maintenance/${m.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
