"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { Wrench, Search, Clock, Calendar, CheckCircle2, MoreHorizontal, Eye, Edit, UserPlus, XCircle, LayoutList, LayoutGrid, Check, CheckCircle, HelpCircle, Send, MessageSquare, Activity } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function MaintenancePage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  
  // View Toggle
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  // Modals state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedReqForAssign, setSelectedReqForAssign] = useState<any>(null);
  const [selectedInspectorId, setSelectedInspectorId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, usersRes] = await Promise.all([
        fetch("/api/maintenance"),
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

  const handleQuickStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Status updated successfully`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.title.toLowerCase().includes(search.toLowerCase()) || 
                          req.unit.name.toLowerCase().includes(search.toLowerCase()) ||
                          req.tenant?.name?.toLowerCase().includes(search.toLowerCase()) ||
                          req.unit.property.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || 
                          (statusFilter === "UNASSIGNED" ? (!req.inspector && !req.externalVendor) : req.status === statusFilter);
    const matchesPriority = priorityFilter === "ALL" || req.priority === priorityFilter;
    const matchesCategory = categoryFilter === "ALL" || req.category === categoryFilter;
    
    // Simple date filtering placeholder
    let matchesDate = true;
    if (dateFilter === "TODAY") {
      matchesDate = new Date(req.createdAt).toDateString() === new Date().toDateString();
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesDate;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "EMERGENCY": return "bg-red-50 text-red-600 border-red-200";
      case "HIGH": return "bg-orange-50 text-orange-600 border-orange-200";
      case "MEDIUM": return "bg-blue-50 text-blue-600 border-blue-200";
      case "LOW": return "bg-green-50 text-green-600 border-green-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 whitespace-nowrap">
            <Clock className="h-3.5 w-3.5" />
            Submitted
          </span>
        );
      case "ASSIGNED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-600 border border-purple-200 whitespace-nowrap">
            <UserPlus className="h-3.5 w-3.5" />
            Assigned
          </span>
        );
      case "AWAITING_APPROVAL": 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            <Clock className="h-3.5 w-3.5" />
            Awaiting Approval
          </span>
        );
      case "PENDING_TENANT_CONFIRMATION": 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            <HelpCircle className="h-3.5 w-3.5" />
            Pending Confirmation
          </span>
        );
      case "RESOLVED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-200 whitespace-nowrap">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Resolved
          </span>
        );
      case "CLOSED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200 whitespace-nowrap">
            <CheckCircle className="h-3.5 w-3.5" />
            Closed
          </span>
        );
      default: 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200 whitespace-nowrap capitalize">
            <HelpCircle className="h-3.5 w-3.5" />
            {status.toLowerCase().replace(/_/g, ' ')}
          </span>
        );
    }
  };

  const totalCount = requests.length;
  const unassignedCount = requests.filter(r => !r.inspector && !r.externalVendor).length;
  const awaitingCount = requests.filter(r => r.status === "AWAITING_APPROVAL").length;
  const activeCount = requests.filter(r => r.status === "ASSIGNED" || r.status === "PENDING_TENANT_CONFIRMATION").length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 relative">
      
      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`p-5 bg-white border rounded-2xl shadow-sm hover:shadow transition-all text-left flex items-center justify-between group cursor-pointer outline-none focus:ring-2 focus:ring-blue-100 ${
            statusFilter === "ALL" ? "border-blue-500 ring-2 ring-blue-50" : "border-[#E2E8F0]"
          }`}
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Tickets</p>
            <p className="text-3xl font-extrabold text-[#0F172A]">{totalCount}</p>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${statusFilter === "ALL" ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-500"}`}>
            <Wrench className="h-6 w-6" />
          </div>
        </button>

        {/* Card 2: Needs Assignment */}
        <button
          onClick={() => setStatusFilter("UNASSIGNED")}
          className={`p-5 bg-white border rounded-2xl shadow-sm hover:shadow transition-all text-left flex items-center justify-between group cursor-pointer outline-none focus:ring-2 focus:ring-orange-100 ${
            statusFilter === "UNASSIGNED" ? "border-orange-500 ring-2 ring-orange-50" : "border-[#E2E8F0]"
          }`}
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Needs Assignment</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-extrabold text-[#0F172A]">{unassignedCount}</p>
              {unassignedCount > 0 && (
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse" />
              )}
            </div>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
            statusFilter === "UNASSIGNED" ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-500"
          }`}>
            <UserPlus className="h-6 w-6" />
          </div>
        </button>

        {/* Card 3: Awaiting Approval */}
        <button
          onClick={() => setStatusFilter("AWAITING_APPROVAL")}
          className={`p-5 bg-white border rounded-2xl shadow-sm hover:shadow transition-all text-left flex items-center justify-between group cursor-pointer outline-none focus:ring-2 focus:ring-amber-100 ${
            statusFilter === "AWAITING_APPROVAL" ? "border-amber-500 ring-2 ring-amber-50" : "border-[#E2E8F0]"
          }`}
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Awaiting Approval</p>
            <p className="text-3xl font-extrabold text-[#0F172A]">{awaitingCount}</p>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
            statusFilter === "AWAITING_APPROVAL" ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-600"
          }`}>
            <Clock className="h-6 w-6" />
          </div>
        </button>

        {/* Card 4: Active Repairs */}
        <button
          onClick={() => setStatusFilter("ASSIGNED")}
          className={`p-5 bg-white border rounded-2xl shadow-sm hover:shadow transition-all text-left flex items-center justify-between group cursor-pointer outline-none focus:ring-2 focus:ring-green-100 ${
            statusFilter === "ASSIGNED" ? "border-green-500 ring-2 ring-green-50" : "border-[#E2E8F0]"
          }`}
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Active Repairs</p>
            <p className="text-3xl font-extrabold text-[#0F172A]">{activeCount}</p>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
            statusFilter === "ASSIGNED" ? "bg-green-500 text-white" : "bg-green-50 text-green-600"
          }`}>
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </button>
      </div>
      
      {/* Exact Header matching screenshot */}
      <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Wrench className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Maintenance Requests ({requests.length})</h1>
              <p className="text-[#64748B] text-sm font-medium mt-0.5">A list of all maintenance requests and their current status</p>
            </div>
          </div>

          <div className="flex items-center bg-[#F1F5F9] rounded-lg p-1">
            <button 
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md flex items-center justify-center transition-all ${viewMode === "list" ? "bg-blue-600 text-white shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"}`}
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md flex items-center justify-center transition-all ${viewMode === "grid" ? "bg-blue-600 text-white shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          
        </div>

        {/* Filter Bar exactly like screenshot */}
        <div className="mt-6 flex flex-col lg:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input 
              placeholder="Search by title, description, category..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-lg bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-medium text-sm shadow-sm w-full"
            />
          </div>
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "ALL")}>
              <SelectTrigger className="h-10 rounded-lg bg-white border-[#E2E8F0] font-medium text-[#0F172A] w-full lg:w-[140px] shadow-sm focus:ring-[#3B82F6]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="UNASSIGNED">⚠️ Needs Assignment</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                <SelectItem value="AWAITING_APPROVAL">Awaiting Approval</SelectItem>
                <SelectItem value="PENDING_TENANT_CONFIRMATION">Pending Confirmation</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v || "ALL")}>
              <SelectTrigger className="h-10 rounded-lg bg-white border-[#E2E8F0] font-medium text-[#0F172A] w-full lg:w-[140px] shadow-sm focus:ring-[#3B82F6]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v || "ALL")}>
              <SelectTrigger className="h-10 rounded-lg bg-white border-[#E2E8F0] font-medium text-[#0F172A] w-full lg:w-[150px] shadow-sm focus:ring-[#3B82F6]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="PLUMBING">Plumbing</SelectItem>
                <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                <SelectItem value="HVAC">HVAC</SelectItem>
                <SelectItem value="APPLIANCES">Appliances</SelectItem>
                <SelectItem value="FLOORING">Flooring</SelectItem>
                <SelectItem value="PAINTING">Painting</SelectItem>
                <SelectItem value="ROOFING">Roofing</SelectItem>
                <SelectItem value="LANDSCAPING">Landscaping</SelectItem>
                <SelectItem value="CLEANING">Cleaning</SelectItem>
                <SelectItem value="PEST_CONTROL">Pest Control</SelectItem>
                <SelectItem value="SECURITY">Security</SelectItem>
                <SelectItem value="GENERAL_REPAIR">General Repair</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v || "ALL")}>
              <SelectTrigger className="h-10 rounded-lg bg-white border-[#E2E8F0] font-medium text-[#0F172A] w-full lg:w-[130px] shadow-sm focus:ring-[#3B82F6]">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="ALL">All Dates</SelectItem>
                <SelectItem value="TODAY">Today</SelectItem>
                <SelectItem value="WEEK">This Week</SelectItem>
                <SelectItem value="MONTH">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {viewMode === "list" ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-[#64748B] text-[13px] font-semibold border-y border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-4 font-semibold">Property</th>
                  <th className="px-4 py-4 font-semibold">Priority</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Assigned To</th>
                  <th className="px-4 py-4 font-semibold">Created</th>
                  <th className="px-4 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-[#64748B] font-medium">Loading requests...</td></tr>
                ) : filteredRequests.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-[#64748B] font-medium">No maintenance requests found.</td></tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#F8FAFC] transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex flex-col space-y-1">
                          <span className="font-semibold text-[#0F172A] text-[15px]">{req.unit.property.name || req.tenant?.name || "Property Name"}</span>
                          <Link href={`/dashboard/properties/${req.unit.property.id}/units/${req.unit.id}`} className="text-blue-500 hover:underline font-medium text-[13px]">
                            {req.unit.name.includes("Unit") ? req.unit.name : `Unit ${req.unit.name}`} (apartment)
                          </Link>
                          <span className="text-[#64748B] text-xs">
                            {req.unit.property.city || "City"}, {req.unit.property.state || "State"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(req.priority)} capitalize`}>
                          {req.priority.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-4 py-4">
                        {req.inspector ? (
                          <span className="font-medium text-[#0F172A]">{req.inspector.name}</span>
                        ) : req.externalVendor ? (
                          <span className="font-medium text-blue-600 flex items-center gap-1"><Wrench className="h-3 w-3" /> {req.externalVendor.name}</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Unassigned
                            </span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={(e) => { e.stopPropagation(); openAssignModal(req); }} 
                              className="h-7 px-2 text-xs font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg"
                            >
                              Assign
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-[#64748B] font-medium text-[13px]">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(req.createdAt), "MMM d, yyyy, hh:mm a")}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded-lg outline-none focus:ring-2 focus:ring-[#3B82F6]">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white rounded-xl shadow-lg border-[#E2E8F0] p-1">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/maintenance/${req.id}`)} className="cursor-pointer flex items-center gap-2 text-sm font-medium text-[#0F172A] p-2 rounded-lg hover:bg-[#F1F5F9]">
                              <Eye className="h-4 w-4 text-[#64748B]" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/maintenance/${req.id}/edit`)} className="cursor-pointer flex items-center gap-2 text-sm font-medium text-[#0F172A] p-2 rounded-lg hover:bg-[#F1F5F9]">
                              <Edit className="h-4 w-4 text-[#64748B]" />
                              Edit Request
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAssignModal(req)} className="cursor-pointer flex items-center gap-2 text-sm font-medium text-blue-600 p-2 rounded-lg hover:bg-blue-50">
                              <UserPlus className="h-4 w-4" />
                              {req.inspector ? "Reassign Inspector" : "Assign Inspector"}
                            </DropdownMenuItem>
                            <div className="h-px bg-[#E2E8F0] my-1" />
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
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-12 text-center text-[#64748B] font-medium">Loading requests...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="col-span-full py-12 text-center text-[#64748B] font-medium">No maintenance requests found.</div>
            ) : (
              filteredRequests.map((req) => (
                <Card key={req.id} className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all group">
                  <div className="p-5 border-b border-[#F1F5F9] flex justify-between items-start gap-4">
                    <div className="flex flex-col space-y-1 w-full overflow-hidden">
                      <h3 className="font-bold text-[#0F172A] text-lg leading-tight truncate">{req.title}</h3>
                      <Link href={`/dashboard/properties/${req.unit.property.id}/units/${req.unit.id}`} className="text-blue-500 hover:underline font-medium text-[13px] truncate block w-full">
                        {req.unit.property.name} - {req.unit.name.includes("Unit") ? req.unit.name : `Unit ${req.unit.name}`}
                      </Link>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 shrink-0 inline-flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg outline-none focus:ring-2 focus:ring-[#3B82F6]">
                        <MoreHorizontal className="h-5 w-5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-white rounded-xl shadow-lg border-[#E2E8F0] p-1.5 z-50 relative">
                        {/* 1. Dispatch Vendor & Assignments (Only if not closed) */}
                        {req.status !== "CLOSED" && req.status !== "RESOLVED" && (
                          <>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/maintenance/${req.id}`)} className="cursor-pointer flex items-center gap-2 text-sm font-medium text-blue-600 p-2 rounded-lg hover:bg-blue-50 focus:bg-blue-50 focus:text-blue-700">
                              <Send className="h-4 w-4" /> Dispatch Vendor
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAssignModal(req)} className="cursor-pointer flex items-center gap-2 text-sm font-medium text-[#0F172A] p-2 rounded-lg hover:bg-[#F1F5F9] focus:bg-[#F1F5F9]">
                              <UserPlus className="h-4 w-4 text-[#64748B]" /> {req.inspector ? "Reassign Inspector" : "Assign Inspector"}
                            </DropdownMenuItem>
                            <div className="h-px bg-[#E2E8F0] my-1" />
                          </>
                        )}

                        {/* 2. Quick Status Updates */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer flex items-center gap-2 text-sm font-medium text-[#0F172A] p-2 rounded-lg hover:bg-[#F1F5F9] focus:bg-[#F1F5F9]">
                            <Activity className="h-4 w-4 text-[#64748B]" /> Change Status
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="w-40 bg-white rounded-xl shadow-lg border-[#E2E8F0] p-1.5 z-50">
                              <DropdownMenuItem onClick={() => handleQuickStatusChange(req.id, "ASSIGNED")} className="cursor-pointer text-sm font-medium text-[#0F172A] p-2 rounded-lg hover:bg-[#F1F5F9] focus:bg-[#F1F5F9]">Mark Assigned</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQuickStatusChange(req.id, "AWAITING_APPROVAL")} className="cursor-pointer text-sm font-medium text-[#0F172A] p-2 rounded-lg hover:bg-[#F1F5F9] focus:bg-[#F1F5F9]">Mark Awaiting</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleQuickStatusChange(req.id, "RESOLVED")} className="cursor-pointer text-sm font-medium text-green-700 p-2 rounded-lg hover:bg-green-50 focus:bg-green-50 focus:text-green-800">Mark Resolved</DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>

                        <DropdownMenuItem onClick={() => router.push(`/dashboard/maintenance/${req.id}/edit`)} className="cursor-pointer flex items-center gap-2 text-sm font-medium text-[#0F172A] p-2 rounded-lg hover:bg-[#F1F5F9] focus:bg-[#F1F5F9]">
                          <Edit className="h-4 w-4 text-[#64748B]" /> Edit Request
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => { window.location.href = `mailto:${req.tenant?.email || ''}?subject=Regarding Maintenance Ticket: ${req.title}`; }} className="cursor-pointer flex items-center gap-2 text-sm font-medium text-[#0F172A] p-2 rounded-lg hover:bg-[#F1F5F9] focus:bg-[#F1F5F9]">
                          <MessageSquare className="h-4 w-4 text-[#64748B]" /> Contact Tenant
                        </DropdownMenuItem>

                        {/* 3. Destructive Action */}
                        {req.status !== "CLOSED" && req.status !== "RESOLVED" && (
                          <>
                            <div className="h-px bg-[#E2E8F0] my-1" />
                            <DropdownMenuItem onClick={() => handleCancelRequest(req.id)} className="cursor-pointer flex items-center gap-2 text-sm font-medium text-red-600 p-2 rounded-lg hover:bg-red-50 focus:bg-red-50 focus:text-red-700">
                              <XCircle className="h-4 w-4" /> Cancel Request
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(req.priority)} capitalize`}>
                        {req.priority.toLowerCase()}
                      </span>
                      {getStatusBadge(req.status)}
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <UserPlus className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">{req.externalVendor ? "Vendor" : "Inspector"}</p>
                          {req.inspector ? (
                            <p className="font-semibold text-[#0F172A] text-sm">{req.inspector.name}</p>
                          ) : req.externalVendor ? (
                            <p className="font-semibold text-blue-600 text-sm flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" /> {req.externalVendor.name}</p>
                          ) : (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Needs Assignment
                              </span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={(e) => { e.stopPropagation(); openAssignModal(req); }} 
                                className="h-6 px-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg"
                              >
                                Assign
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <Calendar className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Created</p>
                          <p className="font-semibold text-[#0F172A] text-sm">{format(new Date(req.createdAt), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 mt-2 border-t border-[#F1F5F9]">
                      <Button onClick={() => router.push(`/dashboard/maintenance/${req.id}`)} variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 font-semibold rounded-xl">
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E2E8F0] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-[#0F172A] mb-1">Assign Inspector</h2>
              <p className="text-sm font-medium text-[#64748B] mb-6">Select an inspector to handle this maintenance request.</p>
              
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#0F172A] uppercase tracking-wide">Inspector</label>
                <Select value={selectedInspectorId} onValueChange={(v) => setSelectedInspectorId(v || "")}>
                  <SelectTrigger className="w-full h-12 bg-white border-[#E2E8F0] rounded-xl focus:ring-[#3B82F6] font-medium text-[#0F172A] shadow-sm">
                    <SelectValue placeholder="Select an inspector">
                      {selectedInspectorId === "none" || !selectedInspectorId
                        ? ""
                        : inspectors.find((i) => i.id === selectedInspectorId)?.name || selectedInspectorId}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E2E8F0]">
                    <SelectItem value="none">Leave unassigned</SelectItem>
                    {inspectors.map((ins) => (
                      <SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setAssignModalOpen(false)} className="rounded-xl font-semibold text-[#64748B] hover:text-[#0F172A]">Cancel</Button>
              <Button onClick={handleAssignSubmit} className="rounded-xl font-semibold bg-[#3B82F6] hover:bg-[#2563EB] text-white">Confirm Assignment</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
