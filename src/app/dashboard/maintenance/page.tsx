"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Wrench, Search, Clock, Calendar, CheckCircle2, MoreHorizontal, Eye, Edit, UserPlus, XCircle, LayoutList, LayoutGrid, Check, CheckCircle, HelpCircle, Send, MessageSquare, Activity, Plus, ShieldCheck, AlertTriangle, Building2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";
import { PaginationBar } from "@/components/ui/PaginationBar";

export default function MaintenancePage() {
  const { data: session } = useSession();
  const ownerId = (session?.user as any)?.id;
  const isOwner = (session?.user as any)?.role === "OWNER";
  const { allowed: moduleAllowed, loading: moduleLoading } = useModuleAccess("maintenance");
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
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, priorityFilter, categoryFilter, dateFilter, viewMode]);

  // Modals state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedReqForAssign, setSelectedReqForAssign] = useState<any>(null);
  const [selectedInspectorId, setSelectedInspectorId] = useState("");
  const [assignModalMode, setAssignModalMode] = useState<"select" | "create">("select");
  const [newInspector, setNewInspector] = useState({ name: "", email: "", phone: "", password: "TempPassword@123" });
  const [inspectorSubmitting, setInspectorSubmitting] = useState(false);

  const [vendors, setVendors] = useState<any[]>([]);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedReqForDispatch, setSelectedReqForDispatch] = useState<any>(null);
  const [selectedVendorId, setSelectedVendorId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, usersRes, vendorsRes] = await Promise.all([
        fetch("/api/maintenance"),
        fetch("/api/users?role=INSPECTOR"),
        fetch("/api/external-vendors")
      ]);
      const reqData = await reqRes.json();
      const usersData = await usersRes.json();
      const vendorsData = await vendorsRes.json();

      if (Array.isArray(reqData)) setRequests(reqData);
      if (Array.isArray(usersData)) setInspectors(usersData);
      if (Array.isArray(vendorsData)) setVendors(vendorsData);
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
    if (!selectedReqForAssign) return;
    try {
      const res = await fetch("/api/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedReqForAssign.id,
          inspectorId: selectedInspectorId === "none" ? null : selectedInspectorId,
          status: selectedInspectorId === "none" ? "SUBMITTED" : "ASSIGNED",
        }),
      });

      if (res.ok) {
        toast.success("Inspector assignment updated");
        setAssignModalOpen(false);
        fetchData();
      } else {
        toast.error("Failed to update assignment");
      }
    } catch (err) {
      toast.error("Error updating assignment");
    }
  };

  const handleCreateInspector = async () => {
    if (!newInspector.name || !newInspector.email) {
      toast.error("Name and Email are required");
      return;
    }
    setInspectorSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newInspector,
          role: "INSPECTOR",
        }),
      });

      if (res.ok) {
        const createdUser = await res.json();
        toast.success("Inspector created successfully!");
        setInspectors(prev => [...prev, createdUser]);
        setSelectedInspectorId(createdUser.id);
        setAssignModalMode("select");
        setNewInspector({ name: "", email: "", phone: "", password: "TempPassword@123" });
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create inspector");
      }
    } catch (err) {
      toast.error("Error creating inspector");
    } finally {
      setInspectorSubmitting(false);
    }
  };

  const handleDispatchSubmit = async () => {
    if (!selectedReqForDispatch || !selectedVendorId) {
      toast.error("Please select a vendor");
      return;
    }
    try {
      const res = await fetch("/api/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedReqForDispatch.id,
          externalVendorId: selectedVendorId,
          status: "ASSIGNED",
        }),
      });

      if (res.ok) {
        toast.success("Vendor dispatched successfully!");
        setDispatchModalOpen(false);
        fetchData();
      } else {
        toast.error("Failed to dispatch vendor");
      }
    } catch (err) {
      toast.error("Error dispatching vendor");
    }
  };

  const handleQuickStatusChange = async (reqId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reqId,
          status: newStatus,
        }),
      });

      if (res.ok) {
        toast.success(`Status updated to ${newStatus.toLowerCase().replace(/_/g, ' ')}`);
        fetchData();
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      toast.error("Error updating status");
    }
  };

  const openAssignModal = (req: any) => {
    setSelectedReqForAssign(req);
    setSelectedInspectorId(req.inspectorId || "none");
    setAssignModalMode("select");
    setAssignModalOpen(true);
  };

  const openDispatchModal = (req: any) => {
    setSelectedReqForDispatch(req);
    setSelectedVendorId(req.externalVendorId || "");
    setDispatchModalOpen(true);
  };

  // Filter logic
  const filteredRequests = requests.filter(req => {
    const q = search.toLowerCase();
    const matchesSearch = !q || 
      req.title?.toLowerCase().includes(q) ||
      req.description?.toLowerCase().includes(q) ||
      req.category?.toLowerCase().includes(q) ||
      req.unit?.property?.name?.toLowerCase().includes(q) ||
      req.unit?.name?.toLowerCase().includes(q) ||
      req.tenant?.name?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "ALL" || 
      (statusFilter === "UNASSIGNED" ? (!req.inspector && !req.externalVendor) : req.status === statusFilter);
    const matchesPriority = priorityFilter === "ALL" || req.priority === priorityFilter;
    const matchesCategory = categoryFilter === "ALL" || req.category === categoryFilter;

    let matchesDate = true;
    if (dateFilter !== "ALL" && req.createdAt) {
      const reqDate = new Date(req.createdAt);
      const now = new Date();
      if (dateFilter === "TODAY") {
        matchesDate = reqDate.toDateString() === now.toDateString();
      } else if (dateFilter === "WEEK") {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = reqDate >= oneWeekAgo;
      } else if (dateFilter === "MONTH") {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = reqDate >= oneMonthAgo;
      }
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesDate;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "EMERGENCY": return "bg-rose-50 text-rose-700 border-rose-200 font-extrabold";
      case "HIGH": return "bg-amber-50 text-amber-700 border-amber-200 font-bold";
      case "MEDIUM": return "bg-blue-50 text-blue-700 border-blue-200 font-bold";
      case "LOW": return "bg-slate-100 text-slate-700 border-slate-200 font-bold";
      default: return "bg-slate-100 text-slate-700 border-slate-200 font-bold";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            Submitted
          </span>
        );
      case "ASSIGNED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
            <UserPlus className="h-3.5 w-3.5 text-purple-600" />
            Assigned
          </span>
        );
      case "DIAGNOSIS_SCHEDULED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 whitespace-nowrap">
            <Calendar className="h-3.5 w-3.5 text-sky-600" />
            Diagnosis Scheduled
          </span>
        );
      case "DIAGNOSIS_COMPLETE": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 whitespace-nowrap">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
            Diagnosis Complete
          </span>
        );
      case "APPROVED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Approved
          </span>
        );
      case "REPAIR_SCHEDULED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
            <Calendar className="h-3.5 w-3.5 text-purple-600" />
            Repair Scheduled
          </span>
        );
      case "AWAITING_APPROVAL": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            Awaiting Approval
          </span>
        );
      case "PENDING_TENANT_CONFIRMATION": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
            Pending Confirmation
          </span>
        );
      case "RESOLVED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Resolved
          </span>
        );
      case "CLOSED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
            <CheckCircle className="h-3.5 w-3.5 text-slate-500" />
            Closed
          </span>
        );
      default: 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap capitalize">
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

  if (!moduleAllowed && !moduleLoading) {
    return <ModuleLockedBanner module="maintenance" />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6">
      
      {/* Page Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span className="text-slate-900 font-bold">Maintenance &amp; Work Orders</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Maintenance Command Center
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
            Track emergency repairs, dispatch certified inspectors, and manage vendor estimates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/maintenance/new">
            <Button className="h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 rounded-xl shadow-xs text-xs gap-2">
              <Plus className="h-4 w-4" /> Log Maintenance Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* Sleek KPI Summary Strip (Platform Design System) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card 
          onClick={() => setStatusFilter("ALL")}
          className={`rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-blue-500 bg-white cursor-pointer transition-all ${statusFilter === "ALL" ? "ring-2 ring-blue-400" : "hover:border-slate-300"}`}
        >
          <CardContent className="p-4">
            <p className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">Total Tickets</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalCount}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">All Maintenance Requests</p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter("UNASSIGNED")}
          className={`rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-amber-500 bg-white cursor-pointer transition-all ${statusFilter === "UNASSIGNED" ? "ring-2 ring-amber-400" : "hover:border-slate-300"}`}
        >
          <CardContent className="p-4">
            <p className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">Needs Assignment</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{unassignedCount}</p>
            <p className="text-[11px] text-amber-600 font-bold mt-0.5">{unassignedCount > 0 ? "Requires Dispatch Action" : "All Tickets Assigned"}</p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter("AWAITING_APPROVAL")}
          className={`rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-purple-500 bg-white cursor-pointer transition-all ${statusFilter === "AWAITING_APPROVAL" ? "ring-2 ring-purple-400" : "hover:border-slate-300"}`}
        >
          <CardContent className="p-4">
            <p className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider">Awaiting Approval</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{awaitingCount}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Vendor Estimates Pending</p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setStatusFilter("ASSIGNED")}
          className={`rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-emerald-500 bg-white cursor-pointer transition-all ${statusFilter === "ASSIGNED" ? "ring-2 ring-emerald-400" : "hover:border-slate-300"}`}
        >
          <CardContent className="p-4">
            <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">Active Repairs</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{activeCount}</p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Work In Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar & Filter Container */}
      <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/40 space-y-3">
          
          <div className="flex flex-col lg:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input 
                placeholder="Search issue title, property, unit, or tenant..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-xl focus:bg-white font-medium"
              />
            </div>

            {/* Filter Select Controls with Explicit Placeholders */}
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full lg:w-auto">
              {/* Status Select */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold px-3 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="UNASSIGNED">⚠️ Needs Assignment</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="AWAITING_APPROVAL">Awaiting Approval</option>
                <option value="PENDING_TENANT_CONFIRMATION">Pending Confirmation</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>

              {/* Priority Select */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold px-3 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
              >
                <option value="ALL">All Priorities</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Category Select */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold px-3 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="PLUMBING">Plumbing</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="HVAC">HVAC</option>
                <option value="APPLIANCES">Appliances</option>
                <option value="FLOORING">Flooring</option>
                <option value="PAINTING">Painting</option>
                <option value="ROOFING">Roofing</option>
                <option value="GENERAL_REPAIR">General Repair</option>
                <option value="OTHER">Other</option>
              </select>

              {/* Date Select */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold px-3 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">This Week</option>
                <option value="MONTH">This Month</option>
              </select>

              {/* View Switcher Toggle */}
              <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1 shrink-0 ml-auto lg:ml-0">
                <button 
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "list" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
                  title="Table View"
                >
                  <LayoutList className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* LIST TABLE VIEW */}
        {viewMode === "list" ? (
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200">
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Issue &amp; Category</th>
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Property &amp; Unit</th>
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Priority &amp; Status</th>
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Assigned Dispatch</th>
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Requested Date</th>
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs font-bold text-slate-400">
                      Loading maintenance tickets...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Wrench className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-bold text-slate-700">No requests found</p>
                        <p className="text-xs text-slate-400">Try adjusting your filters or log a new ticket.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const start = (currentPage - 1) * itemsPerPage;
                    const paginated = filteredRequests.slice(start, start + itemsPerPage);
                    return paginated.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors group">
                        
                        {/* 1. Issue & Category */}
                        <td className="py-3.5 px-6">
                          <div className="space-y-1">
                            <Link 
                              href={`/dashboard/maintenance/${req.id}`}
                              className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors block line-clamp-1"
                            >
                              {req.title}
                            </Link>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-extrabold uppercase tracking-wider">
                              {req.category?.replace(/_/g, ' ') || "General"}
                            </span>
                          </div>
                        </td>

                        {/* 2. Property & Unit */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            {req.unit?.property?.images?.[0] ? (
                              <img
                                src={req.unit.property.images[0]}
                                alt={req.unit.property.name}
                                className="h-9 w-9 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 font-bold">
                                <Building2 className="h-4 w-4 text-blue-500" />
                              </div>
                            )}
                            <div className="space-y-0.5">
                              <span className="font-bold text-xs text-slate-900 block">
                                {req.unit?.property?.name || "Property"}
                              </span>
                              <span className="text-[11px] font-bold text-blue-600 block">
                                {req.unit?.name?.includes("Unit") ? req.unit.name : `Unit ${req.unit?.name || 'A'}`}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Priority & Status */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getPriorityColor(req.priority)} capitalize`}>
                              {req.priority.toLowerCase()}
                            </span>
                            {getStatusBadge(req.status)}
                          </div>
                        </td>

                        {/* 4. Assigned Dispatch */}
                        <td className="py-3.5 px-6">
                          {req.inspector ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                              <UserPlus className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              <span>{req.inspector.name}</span>
                              <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded font-bold">Inspector</span>
                            </div>
                          ) : req.externalVendor ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                              <Wrench className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span>{req.externalVendor.name}</span>
                              <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-bold">Vendor</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Unassigned
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); openAssignModal(req); }}
                                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                              >
                                + Assign
                              </button>
                            </div>
                          )}
                        </td>

                        {/* 5. Requested Date */}
                        <td className="py-3.5 px-6">
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {req.createdAt ? format(new Date(req.createdAt), "MMM d, yyyy") : "N/A"}
                          </span>
                        </td>

                        {/* 6. Action Column */}
                        <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 inline-flex items-center justify-center transition-colors border border-slate-200">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 bg-white rounded-xl shadow-lg border-slate-200 p-1">
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/maintenance/${req.id}`)}
                                className="text-xs font-bold text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                View Ticket
                              </DropdownMenuItem>

                              {req.status === "AWAITING_APPROVAL" && (
                                <DropdownMenuItem 
                                  onClick={() => router.push(`/dashboard/maintenance/${req.id}`)} 
                                  className="text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                                >
                                  ⚡ Review Estimate
                                </DropdownMenuItem>
                              )}

                              {!req.externalVendorId && (
                                <DropdownMenuItem 
                                  onClick={() => openAssignModal(req)} 
                                  className="text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                                >
                                  <UserPlus className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                  {req.inspector ? "Reassign Inspector" : "Assign Inspector"}
                                </DropdownMenuItem>
                              )}

                              {req.status === "SUBMITTED" && (
                                <DropdownMenuItem 
                                  onClick={() => openDispatchModal(req)} 
                                  className="text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                >
                                  <Send className="h-3.5 w-3.5 mr-2" />
                                  Dispatch Vendor
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/maintenance/${req.id}/edit`)}
                                className="text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                Edit Ticket
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleCancelRequest(req.id)}
                                className="text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-2" />
                                Cancel Ticket
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>

                      </tr>
                    ));
                  })()
                )}
              </tbody>
            </table>

            <PaginationBar
              currentPage={currentPage}
              totalPages={Math.ceil(filteredRequests.length / itemsPerPage) || 1}
              totalItems={filteredRequests.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              itemLabel="requests"
            />
          </CardContent>
        ) : (
          /* CARD GRID VIEW */
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full py-12 text-center text-xs font-bold text-slate-400">Loading requests...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400">
                  <Wrench className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No requests found</p>
                </div>
              ) : (
                (() => {
                  const start = (currentPage - 1) * itemsPerPage;
                  const paginated = filteredRequests.slice(start, start + itemsPerPage);
                  return paginated.map((req) => (
                    <Card key={req.id} className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden hover:shadow-md transition-all">
                      
                      {/* Card Header */}
                      <div className="p-4 border-b border-slate-100 space-y-2">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {req.unit?.property?.images?.[0] ? (
                              <img
                                src={req.unit.property.images[0]}
                                alt={req.unit.property.name}
                                className="h-10 w-10 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 font-bold">
                                <Building2 className="h-5 w-5 text-blue-500" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-extrabold uppercase tracking-wider mb-0.5">
                                {req.category?.replace(/_/g, ' ') || "General"}
                              </span>
                              <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">{req.title}</h3>
                              <p className="text-[11px] font-semibold text-slate-500 truncate">
                                {req.unit?.property?.name} &bull; <span className="text-blue-600 font-bold">{req.unit?.name}</span>
                              </p>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 inline-flex items-center justify-center transition-colors border border-slate-200 shrink-0">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 bg-white rounded-xl shadow-lg border-slate-200 p-1">
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/maintenance/${req.id}`)}
                                className="text-xs font-bold text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openAssignModal(req)}
                                className="text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                              >
                                <UserPlus className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                Assign Inspector
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDispatchModal(req)}
                                className="text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                              >
                                <Send className="h-3.5 w-3.5 mr-2" />
                                Dispatch Vendor
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleCancelRequest(req.id)}
                                className="text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-2" />
                                Cancel Ticket
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <p className="text-xs font-semibold text-slate-500">
                          {req.unit?.property?.name} &bull; <span className="text-blue-600 font-bold">{req.unit?.name}</span>
                        </p>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getPriorityColor(req.priority)} capitalize`}>
                            {req.priority.toLowerCase()}
                          </span>
                          {getStatusBadge(req.status)}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>Assignee:</span>
                          <span className="font-bold text-slate-800">
                            {req.inspector?.name || req.externalVendor?.name || "Unassigned"}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {req.createdAt ? format(new Date(req.createdAt), "MMM d, yyyy") : ""}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/maintenance/${req.id}`)}
                          className="h-7 px-3 text-xs font-bold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs gap-1"
                        >
                          <Eye className="h-3 w-3" /> View Ticket
                        </Button>
                      </div>

                    </Card>
                  ));
                })()
              )}
            </div>

            <div className="mt-4">
              <PaginationBar
                currentPage={currentPage}
                totalPages={Math.ceil(filteredRequests.length / itemsPerPage) || 1}
                totalItems={filteredRequests.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                itemLabel="requests"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {assignModalMode === "select" ? (
              <>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-1">
                    <h2 className="text-xl font-bold text-slate-900">Assign Inspector</h2>
                    <button 
                      onClick={() => setAssignModalMode("create")} 
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      + New Inspector
                    </button>
                  </div>
                  <p className="text-xs font-medium text-slate-500 mb-6">Select an inspector to handle this maintenance request.</p>
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inspector</label>
                    <select
                      value={selectedInspectorId}
                      onChange={(e) => setSelectedInspectorId(e.target.value)}
                      className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                    >
                      <option value="none">Leave unassigned</option>
                      {ownerId && (
                        <option value={ownerId}>Assign to Me (Self)</option>
                      )}
                      {inspectors.map((ins) => (
                        <option key={ins.id} value={ins.id}>{ins.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setAssignModalOpen(false)} className="rounded-xl font-semibold text-xs text-slate-600">Cancel</Button>
                  <Button onClick={handleAssignSubmit} className="rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800">Confirm Assignment</Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-1">
                    <h2 className="text-xl font-bold text-slate-900">Add New Inspector</h2>
                    <button 
                      onClick={() => setAssignModalMode("select")} 
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Back to Select
                    </button>
                  </div>
                  <p className="text-xs font-medium text-slate-500 mb-6">Add a new inspector to your team directory.</p>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Full Name *</label>
                      <Input 
                        value={newInspector.name} 
                        onChange={e => setNewInspector({...newInspector, name: e.target.value})} 
                        placeholder="e.g. Jake Inspector" 
                        className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Email Address *</label>
                      <Input 
                        type="email" 
                        value={newInspector.email} 
                        onChange={e => setNewInspector({...newInspector, email: e.target.value})} 
                        placeholder="jake@example.com" 
                        className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</label>
                      <Input 
                        value={newInspector.phone} 
                        onChange={e => setNewInspector({...newInspector, phone: e.target.value})} 
                        placeholder="+1 (555) 123-4567" 
                        className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs" 
                      />
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setAssignModalMode("select")} className="rounded-xl font-semibold text-xs text-slate-600">Cancel</Button>
                  <Button onClick={handleCreateInspector} disabled={inspectorSubmitting} className="rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800">Save Inspector</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Dispatch Vendor Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Dispatch External Vendor</h2>
              <p className="text-xs font-medium text-slate-500 mb-6">Select an external vendor to assign to this maintenance request.</p>
              
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vendor</label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                >
                  <option value="">Select a vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name} ({vendor.specialty})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 font-medium mt-2">
                  This vendor will automatically receive an email with a secure Magic Link to manage this job.
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDispatchModalOpen(false)} className="rounded-xl font-semibold text-xs text-slate-600">Cancel</Button>
              <Button onClick={handleDispatchSubmit} className="rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800">Confirm Dispatch</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
