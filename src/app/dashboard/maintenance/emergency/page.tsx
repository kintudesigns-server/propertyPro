"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertTriangle, Search, Filter, Clock, Flame, UserX, ArrowLeft, MoreHorizontal, Eye, Edit, UserPlus, XCircle } from "lucide-react";
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED": return "bg-red-100 text-red-700";
      case "ASSIGNED": return "bg-orange-100 text-orange-700";
      case "RESOLVED": return "bg-green-100 text-green-700";
      case "CLOSED": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
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
    if (status === "RESOLVED" || status === "CLOSED") return "text-[#6E6E73]";
    const hrs = differenceInHours(new Date(), new Date(dateString));
    if (hrs > 24) return "text-red-600 font-black";
    if (hrs > 4) return "text-orange-600 font-bold";
    return "text-yellow-600 font-bold";
  };

  const totalEmergencies = requests.length;
  const critical = requests.filter(r => r.priority === "EMERGENCY" && r.status !== "RESOLVED" && r.status !== "CLOSED").length;
  const active = requests.filter(r => r.status === "ASSIGNED").length;
  const unassigned = requests.filter(r => r.status === "SUBMITTED").length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/maintenance">
          <Button variant="outline" className="h-10 w-10 p-0 rounded-xl border-red-200 text-red-600 hover:text-red-800 hover:bg-red-50">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-[28px] font-black text-red-600 tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-7 w-7" /> Emergency Response
          </h1>
          <p className="text-[#6E6E73] text-sm font-medium mt-0.5">High priority and emergency maintenance tickets requiring immediate action.</p>
        </div>
      </div>

      {/* Metric Cards - Red Themed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-500 to-red-600 border-none shadow-md rounded-2xl overflow-hidden text-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-red-100 uppercase tracking-wide">Total Emergencies</p>
              <h3 className="text-2xl font-black">{totalEmergencies}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-red-200 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <Flame className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#6E6E73] uppercase tracking-wide">Critical (Active)</p>
              <h3 className="text-2xl font-black text-red-600">{critical}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-orange-200 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#6E6E73] uppercase tracking-wide">In Progress</p>
              <h3 className="text-2xl font-black text-[#1D1D1F]">{active}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-red-200 shadow-sm rounded-2xl overflow-hidden relative overflow-visible">
          {unassigned > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-[10px] font-bold text-white items-center justify-center">{unassigned}</span>
            </span>
          )}
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <UserX className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#6E6E73] uppercase tracking-wide">Unassigned</p>
              <h3 className="text-2xl font-black text-[#1D1D1F]">{unassigned}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="bg-white border-red-200 shadow-sm rounded-[24px] overflow-hidden ring-1 ring-red-100">
        <div className="p-4 border-b border-red-100 bg-red-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-400" />
            <Input 
              placeholder="Search emergency tickets..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-white border-red-200 focus-visible:ring-red-400 font-medium text-sm shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
              <SelectTrigger className="h-11 rounded-xl bg-white border-red-200 font-semibold text-[#1D1D1F] min-w-[140px] shadow-sm focus:ring-red-400 w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-red-200">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-11 rounded-xl border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold px-4 shadow-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              More Filters
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-red-50 text-red-800 text-[12px] font-bold uppercase tracking-wider border-b border-red-100">
              <tr>
                <th className="px-6 py-4">Emergency Request</th>
                <th className="px-6 py-4">Property / Unit</th>
                <th className="px-6 py-4">Tenant</th>
                <th className="px-6 py-4">Elapsed Time</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Assigned To</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-50">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-[#6E6E73] font-medium">Loading emergency requests...</td></tr>
              ) : filteredRequests.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-green-600 font-bold">🎉 No emergency maintenance requests found!</td></tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-red-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-bold text-[#1D1D1F]">{req.title}</p>
                          <p className="text-xs text-[#6E6E73] font-medium">{format(new Date(req.createdAt), "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#1D1D1F]">{req.unit.property.name}</p>
                      <p className="text-xs text-[#6E6E73] font-medium">Unit: {req.unit.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[#1D1D1F]">{req.tenant.name}</p>
                      <p className="text-xs text-red-600 font-bold">{req.tenant.phone || req.tenant.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`h-4 w-4 ${getElapsedColor(req.createdAt, req.status)}`} />
                        <span className={`text-sm ${getElapsedColor(req.createdAt, req.status)}`}>
                          {req.status === "RESOLVED" || req.status === "CLOSED" ? "Resolved" : calculateElapsed(req.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {req.inspector ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold text-red-700">
                            {req.inspector.name?.charAt(0)}
                          </div>
                          <span className="font-semibold text-[#1D1D1F]">{req.inspector.name}</span>
                        </div>
                      ) : (
                        <span className="text-red-500 font-bold text-xs">Action Required</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center text-[#6E6E73] hover:text-red-600 hover:bg-red-100 rounded-lg outline-none focus:ring-2 focus:ring-red-400">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-red-200 p-1">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/maintenance/${req.id}`)} className="cursor-pointer flex items-center gap-2 text-sm font-medium text-[#1D1D1F] p-2 rounded-lg hover:bg-red-50">
                            <Eye className="h-4 w-4 text-[#6E6E73]" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/maintenance/${req.id}/edit`)} className="cursor-pointer flex items-center gap-2 text-sm font-medium text-[#1D1D1F] p-2 rounded-lg hover:bg-red-50">
                            <Edit className="h-4 w-4 text-[#6E6E73]" />
                            Edit Request
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openAssignModal(req)} className="cursor-pointer flex items-center gap-2 text-sm font-medium text-red-600 p-2 rounded-lg hover:bg-red-50">
                            <UserPlus className="h-4 w-4" />
                            Assign Inspector
                          </DropdownMenuItem>
                          <div className="h-px bg-red-100 my-1" />
                          <DropdownMenuItem onClick={() => handleCancelRequest(req.id)} className="cursor-pointer flex items-center gap-2 text-sm font-medium text-red-600 p-2 rounded-lg hover:bg-red-50 focus:bg-red-50 focus:text-red-700">
                            <XCircle className="h-4 w-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-red-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[#1D1D1F] mb-1">Assign Inspector</h2>
              <p className="text-sm font-medium text-[#6E6E73] mb-6">Select a team member to handle this emergency.</p>
              
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#1D1D1F] uppercase tracking-wide">Inspector</label>
                <Select value={selectedInspectorId} onValueChange={(v) => setSelectedInspectorId(v || "")}>
                  <SelectTrigger className="w-full h-12 bg-white border-red-200 rounded-xl focus:ring-red-500 font-medium text-[#1D1D1F] shadow-sm">
                    <SelectValue placeholder="Select an inspector" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-red-200">
                    <SelectItem value="none">Leave unassigned</SelectItem>
                    {inspectors.map((ins) => (
                      <SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-4 bg-red-50/50 border-t border-red-100 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setAssignModalOpen(false)} className="rounded-xl font-semibold text-[#6E6E73] hover:text-[#1D1D1F]">Cancel</Button>
              <Button onClick={handleAssignSubmit} className="rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm">Confirm Assignment</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
