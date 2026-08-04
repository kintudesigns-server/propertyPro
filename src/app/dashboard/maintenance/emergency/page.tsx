"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertTriangle, Search, Filter, Clock, Flame, UserX, ArrowLeft, MoreHorizontal, Eye, Edit, UserPlus, XCircle, Building2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, differenceInHours, differenceInMinutes } from "date-fns";

export default function EmergencyMaintenancePage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedReqForAssign, setSelectedReqForAssign] = useState<any>(null);
  const [selectedInspectorId, setSelectedInspectorId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, usersRes] = await Promise.all([
        fetch("/api/maintenance?emergency=true"),
        fetch("/api/users?role=INSPECTOR")
      ]);
      const reqData = await reqRes.json();
      const usersData = await usersRes.json();

      if (Array.isArray(reqData)) setRequests(reqData);
      if (Array.isArray(usersData)) setInspectors(usersData);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancelRequest = async (id: string) => {
    if (!confirm("Are you sure you want to cancel and delete this request?")) return;
    try {
      const res = await fetch(`/api/maintenance?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Request cancelled successfully");
        fetchData();
      } else {
        toast.error("Failed to cancel request");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleAssignSubmit = async () => {
    if (!selectedInspectorId || !selectedReqForAssign) return;
    try {
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedReqForAssign.id, inspectorId: selectedInspectorId })
      });
      if (res.ok) {
        toast.success("Inspector assigned successfully");
        setAssignModalOpen(false);
        fetchData();
      } else {
        toast.error("Failed to assign inspector");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const openAssignModal = (req: any) => {
    setSelectedReqForAssign(req);
    setSelectedInspectorId(req.inspectorId || "");
    setAssignModalOpen(true);
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.title.toLowerCase().includes(search.toLowerCase()) || 
                          req.unit.name.toLowerCase().includes(search.toLowerCase()) ||
                          req.tenant.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED": 
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            Submitted
          </span>
        );
      case "ASSIGNED": 
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
            Assigned
          </span>
        );
      case "RESOLVED": 
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            Resolved
          </span>
        );
      case "CLOSED": 
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-slate-100 text-slate-500 border border-slate-200 shadow-2xs">
            Closed
          </span>
        );
      default: 
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
            {status}
          </span>
        );
    }
  };

  const calculateElapsed = (dateString: string) => {
    const created = new Date(dateString);
    const now = new Date();
    const hrs = differenceInHours(now, created);
    const mins = differenceInMinutes(now, created) % 60;
    
    if (hrs > 24) {
      const days = Math.floor(hrs / 24);
      return `${days}d ${hrs % 24}h`;
    }
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const getElapsedColor = (dateString: string, status: string) => {
    if (status === "RESOLVED" || status === "CLOSED") return "text-slate-400";
    const hrs = differenceInHours(new Date(), new Date(dateString));
    if (hrs > 24) return "text-rose-600 font-extrabold";
    if (hrs > 4) return "text-amber-600 font-bold";
    return "text-slate-700 font-bold";
  };

  const totalEmergencies = requests.length;
  const critical = requests.filter(r => r.priority === "EMERGENCY" && r.status !== "RESOLVED" && r.status !== "CLOSED").length;
  const active = requests.filter(r => r.status === "ASSIGNED").length;
  const unassigned = requests.filter(r => r.status === "SUBMITTED").length;

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/maintenance">
            <Button variant="outline" className="h-9 w-9 p-0 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-rose-700 tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-rose-600" /> Emergency Response
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">High priority and emergency maintenance tickets requiring immediate action.</p>
          </div>
        </div>
      </div>

      {/* Metric Cards - Emergency Themed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-rose-600 text-white shadow-xs rounded-3xl border-none overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-xs">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-100">Total Emergencies</p>
              <h3 className="text-2xl font-black text-white mt-0.5">{totalEmergencies}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-rose-200/80 shadow-xs rounded-3xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
              <Flame className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800">Critical (Active)</p>
              <h3 className="text-2xl font-black text-rose-600 mt-0.5">{critical}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-amber-200/80 shadow-xs rounded-3xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">In Progress</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{active}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-rose-200/80 shadow-xs rounded-3xl overflow-hidden relative">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
              <UserX className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800">Unassigned</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{unassigned}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search emergency tickets..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-white border-slate-200 text-xs font-semibold shadow-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold px-3.5 shadow-xs outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-rose-100 bg-rose-50/50 text-rose-800 text-[10px] font-extrabold uppercase tracking-wider">
                <th className="px-6 py-3.5">Emergency Request</th>
                <th className="px-6 py-3.5">Property / Unit</th>
                <th className="px-6 py-3.5">Tenant</th>
                <th className="px-6 py-3.5">Elapsed Time</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Assigned To</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-extrabold text-xs">Loading emergency requests...</td></tr>
              ) : filteredRequests.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-emerald-600 font-extrabold text-sm">🎉 No emergency maintenance requests found!</td></tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-rose-50/30 transition-colors group border-b border-slate-100">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-4 w-4 text-rose-600" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs">{req.title}</p>
                          <p className="text-[11px] text-slate-500 font-semibold">{format(new Date(req.createdAt), "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="font-extrabold text-slate-900 text-xs">{req.unit.property.name}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">Unit: {req.unit.name}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="font-extrabold text-slate-900 text-xs">{req.tenant.name}</p>
                      <p className="text-[11px] text-rose-600 font-bold">{req.tenant.phone || req.tenant.email}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`h-3.5 w-3.5 ${getElapsedColor(req.createdAt, req.status)}`} />
                        <span className={`text-xs ${getElapsedColor(req.createdAt, req.status)}`}>
                          {req.status === "RESOLVED" || req.status === "CLOSED" ? "Resolved" : calculateElapsed(req.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-3.5">
                      {req.inspector ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-800">
                            {req.inspector.name?.charAt(0)}
                          </div>
                          <span className="font-extrabold text-slate-900 text-xs">{req.inspector.name}</span>
                        </div>
                      ) : (
                        <span className="text-rose-600 font-black text-xs uppercase tracking-wider">Action Required</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200/80 outline-none cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white rounded-2xl shadow-xl border-slate-200 p-1.5">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/maintenance/${req.id}`)} className="cursor-pointer font-bold text-xs text-slate-900 py-2 rounded-xl">
                            <Eye className="h-3.5 w-3.5 mr-2 text-slate-500" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/maintenance/${req.id}/edit`)} className="cursor-pointer font-bold text-xs text-slate-900 py-2 rounded-xl">
                            <Edit className="h-3.5 w-3.5 mr-2 text-slate-500" />
                            Edit Request
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openAssignModal(req)} className="cursor-pointer font-bold text-xs text-rose-600 py-2 rounded-xl">
                            <UserPlus className="h-3.5 w-3.5 mr-2" />
                            Assign Inspector
                          </DropdownMenuItem>
                          <div className="h-px bg-slate-100 my-1" />
                          <DropdownMenuItem onClick={() => handleCancelRequest(req.id)} className="cursor-pointer font-bold text-xs text-rose-600 py-2 rounded-xl">
                            <XCircle className="h-3.5 w-3.5 mr-2" />
                            Cancel Request
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-base font-extrabold text-slate-900 mb-1">Assign Inspector</h2>
              <p className="text-xs font-medium text-slate-500 mb-6">Select a team member to handle this emergency.</p>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inspector</label>
                <select
                  value={selectedInspectorId}
                  onChange={(e) => setSelectedInspectorId(e.target.value)}
                  className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none shadow-xs cursor-pointer"
                >
                  <option value="">Select an inspector</option>
                  <option value="none">Leave unassigned</option>
                  {inspectors.map((ins) => (
                    <option key={ins.id} value={ins.id}>{ins.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignModalOpen(false)} className="rounded-xl font-bold text-xs text-slate-700 bg-white border-slate-200 h-9 px-4">Cancel</Button>
              <Button onClick={handleAssignSubmit} className="rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white h-9 px-5 shadow-xs">Confirm Assignment</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
