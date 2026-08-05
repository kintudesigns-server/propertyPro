"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Wrench, Search, Clock, Calendar, CheckCircle2, MoreHorizontal, Eye, Edit, UserPlus, XCircle, LayoutList, LayoutGrid, CheckCircle, HelpCircle, Send, Plus, ShieldCheck, AlertTriangle, Building2, User } from "lucide-react";
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
      case "HIGH": return "bg-amber-50 text-amber-800 border-amber-200 font-bold";
      case "MEDIUM": return "bg-slate-100 text-slate-800 border-slate-200 font-bold";
      case "LOW": return "bg-slate-100 text-slate-600 border-slate-200 font-bold";
      default: return "bg-slate-100 text-slate-700 border-slate-200 font-bold";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs whitespace-nowrap">
            <Clock className="h-3 w-3 text-slate-600" />
            Submitted
          </span>
        );
      case "ASSIGNED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs whitespace-nowrap">
            <UserPlus className="h-3 w-3 text-purple-600" />
            Assigned
          </span>
        );
      case "DIAGNOSIS_SCHEDULED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs whitespace-nowrap">
            <Calendar className="h-3 w-3 text-slate-600" />
            Diagnosis Scheduled
          </span>
        );
      case "DIAGNOSIS_COMPLETE": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Diagnosis Complete
          </span>
        );
      case "APPROVED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Approved
          </span>
        );
      case "REPAIR_SCHEDULED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs whitespace-nowrap">
            <Calendar className="h-3 w-3 text-purple-600" />
            Repair Scheduled
          </span>
        );
      case "AWAITING_APPROVAL": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap">
            <Clock className="h-3 w-3 text-amber-600" />
            Awaiting Approval
          </span>
        );
      case "PENDING_TENANT_CONFIRMATION": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap">
            <HelpCircle className="h-3 w-3 text-amber-600" />
            Pending Confirmation
          </span>
        );
      case "RESOLVED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Resolved
          </span>
        );
      case "CLOSED": 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-slate-100 text-slate-500 border border-slate-200 shadow-2xs whitespace-nowrap">
            <CheckCircle className="h-3 w-3 text-slate-500" />
            Closed
          </span>
        );
      default: 
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs whitespace-nowrap">
            <HelpCircle className="h-3 w-3" />
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
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      
      {/* Page Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Maintenance Command Center
          </h1>
          <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
            Track emergency repairs, dispatch certified inspectors, and manage vendor estimates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/maintenance/new">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-xs rounded-xl h-9 px-4 text-xs font-medium flex items-center gap-2 cursor-pointer border-none">
              <Plus className="h-4 w-4" /> Log Maintenance Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Tickets"
          value={totalCount}
          subtext="All maintenance requests"
          icon={Wrench}
          variant="blue"
          active={statusFilter === "ALL"}
          onClick={() => setStatusFilter("ALL")}
        />
        <KpiCard
          title="Needs Assignment"
          value={unassignedCount}
          subtext={unassignedCount > 0 ? "Requires dispatch action" : "All tickets assigned"}
          icon={AlertTriangle}
          variant="amber"
          active={statusFilter === "UNASSIGNED"}
          onClick={() => setStatusFilter("UNASSIGNED")}
        />
        <KpiCard
          title="Awaiting Approval"
          value={awaitingCount}
          subtext="Vendor estimates pending"
          icon={Clock}
          variant="purple"
          active={statusFilter === "AWAITING_APPROVAL"}
          onClick={() => setStatusFilter("AWAITING_APPROVAL")}
        />
        <KpiCard
          title="Active Repairs"
          value={activeCount}
          subtext="Work in progress"
          icon={CheckCircle2}
          variant="emerald"
          active={statusFilter === "ASSIGNED"}
          onClick={() => setStatusFilter("ASSIGNED")}
        />
      </div>

      {/* Control Bar & Filter Container */}
      <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden font-sans">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search issue title, property, unit, or tenant..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9 bg-white border-slate-200 rounded-xl font-normal text-xs text-[#1D1D1F] focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 shadow-2xs"
            />
          </div>

          {/* Filter Select Controls */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full lg:w-auto">
            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white text-[#1D1D1F] text-xs font-medium px-3 shadow-2xs outline-none cursor-pointer"
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
              className="h-9 rounded-xl border border-slate-200 bg-white text-[#1D1D1F] text-xs font-medium px-3 shadow-2xs outline-none cursor-pointer"
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
              className="h-9 rounded-xl border border-slate-200 bg-white text-[#1D1D1F] text-xs font-medium px-3 shadow-2xs outline-none cursor-pointer"
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
              className="h-9 rounded-xl border border-slate-200 bg-white text-[#1D1D1F] text-xs font-medium px-3 shadow-2xs outline-none cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">This Week</option>
              <option value="MONTH">This Month</option>
            </select>

            {/* View Switcher Toggle */}
            <div className="flex bg-slate-100 border border-slate-200/50 p-1 rounded-xl shadow-2xs gap-1 shrink-0 ml-auto lg:ml-0">
              <button 
                onClick={() => setViewMode("list")}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${viewMode === "list" ? "bg-white text-[#1D1D1F] shadow-2xs" : "text-[#6E6E73] hover:text-[#1D1D1F]"}`}
                title="Table View"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setViewMode("grid")}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${viewMode === "grid" ? "bg-white text-[#1D1D1F] shadow-2xs" : "text-[#6E6E73] hover:text-[#1D1D1F]"}`}
                title="Card Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

          </div>
        </div>

        {/* LIST TABLE VIEW */}
        {viewMode === "list" ? (
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  <th className="py-3.5 px-6 font-normal text-xs text-[#6E6E73]">Issue &amp; Category</th>
                  <th className="py-3.5 px-6 font-normal text-xs text-[#6E6E73]">Property &amp; Unit</th>
                  <th className="py-3.5 px-6 font-normal text-xs text-[#6E6E73]">Priority &amp; Status</th>
                  <th className="py-3.5 px-6 font-normal text-xs text-[#6E6E73]">Assigned Dispatch</th>
                  <th className="py-3.5 px-6 font-normal text-xs text-[#6E6E73]">Requested Date</th>
                  <th className="py-3.5 px-6 font-normal text-xs text-[#6E6E73] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-xs font-bold text-slate-400">
                      Loading maintenance tickets...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-500">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Wrench className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-semibold text-slate-900">No requests found</p>
                        <p className="text-xs text-slate-500 font-medium">Try adjusting your filters or log a new ticket.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const start = (currentPage - 1) * itemsPerPage;
                    const paginated = filteredRequests.slice(start, start + itemsPerPage);
                    return paginated.map((req) => (
                      <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                        
                        {/* 1. Issue & Category */}
                        <td className="py-3.5 px-6">
                          <div className="space-y-1">
                            <Link 
                              href={`/dashboard/maintenance/${req.id}`}
                              className="font-semibold text-xs text-[#1D1D1F] hover:text-slate-700 transition-colors block line-clamp-1"
                            >
                              {req.title}
                            </Link>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-[#6E6E73] border border-slate-200/60 rounded-md text-[10px] font-medium uppercase tracking-wider">
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
                              <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 font-medium">
                                <Building2 className="h-4 w-4" />
                              </div>
                            )}
                            <div className="space-y-0.5">
                              <span className="font-semibold text-xs text-[#1D1D1F] block">
                                {req.unit?.property?.name || "Property"}
                              </span>
                              <span className="text-xs font-normal text-[#6E6E73] block">
                                {req.unit?.name?.includes("Unit") ? req.unit.name : `Unit ${req.unit?.name || 'A'}`}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Priority & Status */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase border tracking-wider ${getPriorityColor(req.priority)} capitalize`}>
                              {req.priority.toLowerCase()}
                            </span>
                            {getStatusBadge(req.status)}
                          </div>
                        </td>

                        {/* 4. Assigned Dispatch */}
                        <td className="py-3.5 px-6">
                          {req.inspector ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-[#1D1D1F]">
                              <UserPlus className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              <span className="font-semibold">{req.inspector.name}</span>
                              <span className="text-[10px] text-[#6E6E73] bg-slate-100 border border-slate-200/60 px-1.5 py-0.2 rounded font-medium uppercase tracking-wider">Inspector</span>
                            </div>
                          ) : req.externalVendor ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-[#1D1D1F]">
                              <Wrench className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              <span className="font-semibold">{req.externalVendor.name}</span>
                              <span className="text-[10px] text-[#6E6E73] bg-slate-100 border border-slate-200/60 px-1.5 py-0.2 rounded font-medium uppercase tracking-wider">Vendor</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase bg-amber-50 text-amber-800 border border-amber-200 tracking-wider">
                                Unassigned
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); openAssignModal(req); }}
                                className="text-xs font-medium text-slate-900 hover:underline cursor-pointer"
                              >
                                + Assign
                              </button>
                            </div>
                          )}
                        </td>

                        {/* 5. Requested Date */}
                        <td className="py-3.5 px-6">
                          <span className="text-xs font-normal text-[#6E6E73] flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {req.createdAt ? format(new Date(req.createdAt), "MMM d, yyyy") : "N/A"}
                          </span>
                        </td>

                        {/* 6. Action Column */}
                        <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center transition-colors border border-slate-200/80 cursor-pointer">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 bg-white rounded-2xl shadow-xl border-slate-200 p-1.5">
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/maintenance/${req.id}`)}
                                className="font-bold text-xs text-slate-800 py-2 rounded-xl cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                View Ticket
                              </DropdownMenuItem>

                              {req.status === "AWAITING_APPROVAL" && (
                                <DropdownMenuItem 
                                  onClick={() => router.push(`/dashboard/maintenance/${req.id}`)} 
                                  className="font-bold text-xs text-amber-800 py-2 rounded-xl cursor-pointer"
                                >
                                  ⚡ Review Estimate
                                </DropdownMenuItem>
                              )}

                              {!req.externalVendorId && (
                                <DropdownMenuItem 
                                  onClick={() => openAssignModal(req)} 
                                  className="font-bold text-xs text-slate-800 py-2 rounded-xl cursor-pointer"
                                >
                                  <UserPlus className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                  {req.inspector ? "Reassign Inspector" : "Assign Inspector"}
                                </DropdownMenuItem>
                              )}

                              {req.status === "SUBMITTED" && (
                                <DropdownMenuItem 
                                  onClick={() => openDispatchModal(req)} 
                                  className="font-bold text-xs text-slate-900 py-2 rounded-xl cursor-pointer"
                                >
                                  <Send className="h-3.5 w-3.5 mr-2 text-slate-700" />
                                  Dispatch Vendor
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/maintenance/${req.id}/edit`)}
                                className="font-bold text-xs text-slate-800 py-2 rounded-xl cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                Edit Ticket
                              </DropdownMenuItem>

                              <DropdownMenuSeparator className="bg-slate-100 my-1" />
                              <DropdownMenuItem
                                onClick={() => handleCancelRequest(req.id)}
                                className="font-bold text-xs text-rose-600 py-2 rounded-xl cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-2 text-rose-600" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {loading ? (
                <div className="col-span-full py-16 text-center text-xs font-bold text-slate-400">Loading requests...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500">
                  <Wrench className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-900">No requests found</p>
                </div>
              ) : (
                (() => {
                  const start = (currentPage - 1) * itemsPerPage;
                  const paginated = filteredRequests.slice(start, start + itemsPerPage);
                  return paginated.map((req) => (
                    <Card key={req.id} className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden hover:shadow-md transition-all">
                      
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
                              <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 font-bold">
                                <Building2 className="h-5 w-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-extrabold uppercase tracking-wider mb-0.5">
                                {req.category?.replace(/_/g, ' ') || "General"}
                              </span>
                              <h3 className="font-semibold text-slate-900 text-sm leading-snug truncate">{req.title}</h3>
                              <p className="text-[11px] font-semibold text-slate-500 truncate">
                                {req.unit?.property?.name} &bull; <span className="text-slate-900 font-bold">{req.unit?.name}</span>
                              </p>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center transition-colors border border-slate-200 shrink-0 cursor-pointer">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 bg-white rounded-2xl shadow-xl border-slate-200 p-1.5">
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/maintenance/${req.id}`)}
                                className="font-bold text-xs text-slate-800 py-2 rounded-xl cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openAssignModal(req)}
                                className="font-bold text-xs text-slate-800 py-2 rounded-xl cursor-pointer"
                              >
                                <UserPlus className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                Assign Inspector
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDispatchModal(req)}
                                className="font-bold text-xs text-slate-900 py-2 rounded-xl cursor-pointer"
                              >
                                <Send className="h-3.5 w-3.5 mr-2 text-slate-700" />
                                Dispatch Vendor
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <p className="text-xs font-semibold text-slate-500">
                          {req.unit?.property?.name} &bull; <span className="text-slate-900 font-bold">{req.unit?.name}</span>
                        </p>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border shadow-2xs ${getPriorityColor(req.priority)} capitalize`}>
                            {req.priority.toLowerCase()}
                          </span>
                          {getStatusBadge(req.status)}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>Assignee:</span>
                          <span className="font-semibold text-slate-900">
                            {req.inspector?.name || req.externalVendor?.name || "Unassigned"}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="p-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500">
                          {req.createdAt ? format(new Date(req.createdAt), "MMM d, yyyy") : ""}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/maintenance/${req.id}`)}
                          className="h-8 px-3 text-xs font-bold border-slate-200 bg-white text-slate-800 hover:bg-slate-50 rounded-xl shadow-xs gap-1 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Ticket
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {assignModalMode === "select" ? (
              <>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-1">
                    <h2 className="text-base font-semibold text-slate-900">Assign Inspector</h2>
                    <button 
                      onClick={() => setAssignModalMode("create")} 
                      className="text-xs font-bold text-slate-900 hover:underline cursor-pointer"
                    >
                      + New Inspector
                    </button>
                  </div>
                  <p className="text-xs font-medium text-slate-500 mb-6">Select an inspector to handle this maintenance request.</p>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inspector</label>
                    <select
                      value={selectedInspectorId}
                      onChange={(e) => setSelectedInspectorId(e.target.value)}
                      className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none shadow-xs cursor-pointer"
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
                <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAssignModalOpen(false)} className="rounded-xl font-bold text-xs text-slate-700 bg-white border-slate-200 h-9 px-4">Cancel</Button>
                  <Button onClick={handleAssignSubmit} className="rounded-xl text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 h-9 px-5 shadow-xs">Confirm Assignment</Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-1">
                    <h2 className="text-base font-semibold text-slate-900">Add New Inspector</h2>
                    <button 
                      onClick={() => setAssignModalMode("select")} 
                      className="text-xs font-bold text-slate-900 hover:underline cursor-pointer"
                    >
                      Back to Select
                    </button>
                  </div>
                  <p className="text-xs font-medium text-slate-500 mb-6">Add a new inspector to your team directory.</p>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name *</label>
                      <Input 
                        value={newInspector.name} 
                        onChange={e => setNewInspector({...newInspector, name: e.target.value})} 
                        placeholder="e.g. Jake Inspector" 
                        className="h-10 rounded-xl bg-white border-slate-200 text-xs font-semibold" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address *</label>
                      <Input 
                        type="email" 
                        value={newInspector.email} 
                        onChange={e => setNewInspector({...newInspector, email: e.target.value})} 
                        placeholder="jake@example.com" 
                        className="h-10 rounded-xl bg-white border-slate-200 text-xs font-semibold" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                      <Input 
                        value={newInspector.phone} 
                        onChange={e => setNewInspector({...newInspector, phone: e.target.value})} 
                        placeholder="+1 (555) 123-4567" 
                        className="h-10 rounded-xl bg-white border-slate-200 text-xs font-semibold" 
                      />
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAssignModalMode("select")} className="rounded-xl font-bold text-xs text-slate-700 bg-white border-slate-200 h-9 px-4">Cancel</Button>
                  <Button onClick={handleCreateInspector} disabled={inspectorSubmitting} className="rounded-xl text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 h-9 px-5 shadow-xs">Save Inspector</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Dispatch Vendor Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-1">Dispatch External Vendor</h2>
              <p className="text-xs font-medium text-slate-500 mb-6">Select an external vendor to assign to this maintenance request.</p>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor</label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none shadow-xs cursor-pointer"
                >
                  <option value="">Select a vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name} ({vendor.specialty})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 font-medium mt-2 leading-relaxed">
                  This vendor will automatically receive an email with a secure Magic Link to manage this job.
                </p>
              </div>
            </div>
            <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDispatchModalOpen(false)} className="rounded-xl font-bold text-xs text-slate-700 bg-white border-slate-200 h-9 px-4">Cancel</Button>
              <Button onClick={handleDispatchSubmit} className="rounded-xl text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 h-9 px-5 shadow-xs">Confirm Dispatch</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

