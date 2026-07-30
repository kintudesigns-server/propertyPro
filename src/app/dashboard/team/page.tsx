"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Briefcase,
  Trash2,
  Mail,
  Phone,
  ShieldCheck,
  Wrench,
  Search,
  MoreHorizontal,
  Edit,
  CheckCircle2,
  DollarSign,
  Lock,
  Users,
  AlertTriangle,
  FileSignature,
  Filter,
  Sparkles,
  UserCheck,
  Activity,
  CalendarCheck,
  X,
  ExternalLink,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PaginationBar } from "@/components/ui/PaginationBar";

// Avatar colors helper
const AVATAR_COLORS = [
  "bg-blue-500 text-white",
  "bg-indigo-500 text-white",
  "bg-purple-500 text-white",
  "bg-emerald-500 text-white",
  "bg-amber-500 text-white",
  "bg-rose-500 text-white",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Specialty badge style map
const SPECIALTY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Plumbing: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Electrical: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  HVAC: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  "Appliance Repair": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Handyman: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Pest Control": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  Landscaping: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  Cleaning: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  General: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
};

export default function InspectorsAndVendorsPage() {
  const router = useRouter();
  const { allowed: hasVendorAccess } = useModuleAccess("vendors");
  const { allowed: hasTeamAccess, loading: teamLoading } = useModuleAccess("team_management");
  const { data: session } = useSession();
  const isOwner = (session?.user as any)?.role === "OWNER";
  const [activeTab, setActiveTab] = useState<"inspectors" | "vendors">("inspectors");
  const [loading, setLoading] = useState(true);

  // Inspectors State
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [inspectorSearch, setInspectorSearch] = useState("");

  // Vendors State
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorSearch, setVendorSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, inspectorSearch, vendorSearch]);
  const [filterSpecialty, setFilterSpecialty] = useState("All");

  // Deletion Confirm Dialog State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: "inspector" | "vendor" } | null>(null);

  // Edit Vendor State
  const [editOpen, setEditOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch functions
  const fetchInspectors = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users?role=INSPECTOR");
      const data = await res.json();
      if (Array.isArray(data)) {
        setInspectors(data);
      }
    } catch (error) {
      console.error("Failed to fetch inspectors:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/external-vendors");
      const data = await res.json();
      if (Array.isArray(data)) {
        setVendors(data);
      }
    } catch (err) {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "inspectors") {
      fetchInspectors();
    } else {
      fetchVendors();
    }
  }, [activeTab]);

  // Inspector Delete Handler
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "inspector") {
        const res = await fetch(`/api/users?id=${deleteTarget.id}`, { method: "DELETE" });
        if (res.ok) {
          toast.success(`Removed ${deleteTarget.name} from staff.`);
          fetchInspectors();
        } else {
          const error = await res.json();
          toast.error(error.error || "Failed to delete staff member.");
        }
      } else {
        const res = await fetch(`/api/external-vendors/${deleteTarget.id}`, { method: "DELETE" });
        if (res.ok) {
          toast.success(`Deleted vendor ${deleteTarget.name}.`);
          fetchVendors();
        } else {
          const error = await res.json();
          toast.error(error.error || "Failed to delete vendor.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setDeleteTarget(null);
    }
  };

  // Vendor Edit Submit
  const handleEditVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVendor?.name || !editVendor?.email) return toast.error("Name and email required");
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/external-vendors/${editVendor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editVendor),
      });
      if (!res.ok) throw new Error("Failed to update vendor");
      toast.success("Vendor details updated");
      setEditOpen(false);
      fetchVendors();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered lists
  const filteredInspectors = inspectors.filter((i) => {
    const q = inspectorSearch.toLowerCase();
    return i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q) || (i.phone && i.phone.includes(q));
  });

  const filteredVendors = vendors.filter((v) => {
    const q = vendorSearch.toLowerCase();
    const matchesSearch = v.name.toLowerCase().includes(q) || v.specialty.toLowerCase().includes(q) || v.email.toLowerCase().includes(q);
    const matchesFilter = filterSpecialty === "All" || v.specialty === filterSpecialty;
    return matchesSearch && matchesFilter;
  });

  // Calculate Metrics
  const totalStaffCount = inspectors.length + (hasVendorAccess ? vendors.length : 0);
  const activeWorkloadCount = inspectors.reduce((sum, i) => sum + (i._count?.inspectorMaintenanceRequests || 0) + (i._count?.moveOutInspectorLeases || 0), 0);
  const compliantVendorsCount = vendors.filter((v) => v.w9OnFile && v.insuranceOnFile).length;
  const complianceRate = vendors.length > 0 ? Math.round((compliantVendorsCount / vendors.length) * 100) : 100;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 pb-28">
      {/* ─── PAGE HEADER & MAIN ACTION ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
              <Sparkles className="h-3 w-3 text-blue-500" />
              Workforce Operations Hub
            </span>
          </div>
          <h1 className="text-3xl font-black text-[#1D1D1F] tracking-tight">Inspectors &amp; Contractors</h1>
          <p className="text-[#6E6E73] mt-1 text-sm font-medium">
            Centralized management for internal field inspectors, repair dispatchers, and external trade contractors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "inspectors" ? (
            <Link href="/dashboard/team/new">
              <Button className="h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-sm gap-2 border-none">
                <Plus className="h-4 w-4" /> Add Staff Inspector
              </Button>
            </Link>
          ) : hasVendorAccess ? (
            <Link href="/dashboard/vendors/new">
              <Button className="h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-sm gap-2 border-none">
                <Plus className="h-4 w-4" /> Add New Vendor
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {/* ─── ENTERPRISE KPI SUMMARY STRIP ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Team */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Workforce</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{totalStaffCount} <span className="text-xs font-semibold text-slate-500">Members</span></h3>
          </div>
        </div>

        {/* Card 2: Active Inspections Workload */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Active Workloads</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{activeWorkloadCount} <span className="text-xs font-semibold text-slate-500">Jobs Assigned</span></h3>
          </div>
        </div>

        {/* Card 3: Contractor Network */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Vendor Network</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{vendors.length} <span className="text-xs font-semibold text-slate-500">Specialists</span></h3>
          </div>
        </div>

        {/* Card 4: Compliance Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Compliance Status</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{complianceRate}% <span className="text-xs font-semibold text-emerald-600 font-bold">Verified</span></h3>
          </div>
        </div>
      </div>

      {/* ─── SEGMENTED TAB SWITCHER & FILTER BAR ─── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
          {/* Tabs */}
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("inspectors")}
              className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === "inspectors"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <UserCheck className="h-4 w-4 text-blue-600" />
              Internal Inspectors
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700">
                {inspectors.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("vendors")}
              className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === "vendors"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Wrench className="h-4 w-4 text-amber-600" />
              External Contractors
              {!hasVendorAccess ? (
                <Lock className="h-3 w-3 text-slate-400" />
              ) : (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700">
                  {vendors.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Specific Search / Filter Input */}
          {activeTab === "inspectors" ? (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search staff name or email..."
                value={inspectorSearch}
                onChange={(e) => setInspectorSearch(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus:bg-white"
              />
              {inspectorSearch && (
                <button onClick={() => setInspectorSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : hasVendorAccess ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search vendor or specialty..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus:bg-white"
                />
                {vendorSearch && (
                  <button onClick={() => setVendorSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Select value={filterSpecialty} onValueChange={(v) => setFilterSpecialty(v || "All")}>
                <SelectTrigger className="w-40 h-9 text-xs rounded-xl border-slate-200 bg-slate-50">
                  <SelectValue placeholder="Specialty" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="All">All Trade Specialties</SelectItem>
                  <SelectItem value="Plumbing">Plumbing</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="HVAC">HVAC</SelectItem>
                  <SelectItem value="Appliance Repair">Appliance Repair</SelectItem>
                  <SelectItem value="Handyman">Handyman</SelectItem>
                  <SelectItem value="Pest Control">Pest Control</SelectItem>
                  <SelectItem value="Landscaping">Landscaping</SelectItem>
                  <SelectItem value="Cleaning">Cleaning</SelectItem>
                  <SelectItem value="General">General Construction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        {/* ─── TAB CONTENT 1: INTERNAL INSPECTORS ─── */}
        {activeTab === "inspectors" ? (
          <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F2F2F7] border-b border-[#E5E5EA]">
                    <th className="py-4 px-6 text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Inspector Name</th>
                    <th className="py-4 px-6 text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Contact Channels</th>
                    <th className="py-4 px-6 text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Role &amp; Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Active Workload</th>
                    <th className="py-4 px-6 text-xs font-bold text-[#6E6E73] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-sm font-semibold text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-800" />
                          <span>Loading inspector directory...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredInspectors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-2">
                          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                            <UserCheck className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-700">No staff members found</p>
                          <p className="text-xs text-slate-400">Try adjusting your search query or add a new field inspector to your team.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const start = (currentPage - 1) * itemsPerPage;
                      const paginated = filteredInspectors.slice(start, start + itemsPerPage);
                      return paginated.map((member) => {
                      const totalJobs = (member._count?.inspectorMaintenanceRequests || 0) + (member._count?.moveOutInspectorLeases || 0);
                      const colorClass = getAvatarColor(member.name);

                      return (
                        <tr key={member.id} className="hover:bg-[#F2F2F7]/50 transition-colors group">
                          {/* Name & Avatar */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="relative cursor-pointer shrink-0" onClick={() => router.push(`/dashboard/team/${member.id}`)}>
                                {member.avatar ? (
                                  <img
                                    src={member.avatar}
                                    alt={member.name}
                                    className="h-10 w-10 rounded-xl object-cover border border-slate-200 shadow-xs"
                                  />
                                ) : (
                                  <div className={`h-10 w-10 rounded-xl ${colorClass} font-black text-sm flex items-center justify-center shadow-xs`}>
                                    {member.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" title="Available for Dispatch" />
                              </div>
                              <div>
                                <Link
                                  href={`/dashboard/team/${member.id}`}
                                  className="font-extrabold text-sm text-[#1D1D1F] hover:text-blue-600 transition-colors block"
                                >
                                  {member.name}
                                </Link>
                                <span className="text-xs font-medium text-[#6E6E73]">
                                  Field Inspector &bull; ID: {member.id.substring(0, 8)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              <a
                                href={`mailto:${member.email}`}
                                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                              >
                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                {member.email}
                              </a>
                              {member.phone ? (
                                <a
                                  href={`tel:${member.phone}`}
                                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                                >
                                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                                  {member.phone}
                                </a>
                              ) : (
                                <span className="text-[11px] text-slate-300 font-medium italic">No phone on file</span>
                              )}
                            </div>
                          </td>

                          {/* Designation Badge */}
                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] rounded-lg text-xs font-bold shadow-2xs">
                                <ShieldCheck className="h-3.5 w-3.5 text-[#D97706]" />
                                Certified Inspector
                              </span>
                            </div>
                          </td>

                          {/* Workload Indicator */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${totalJobs > 0 ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-[#F2F2F7] text-[#6E6E73] border border-[#E5E5EA]"}`}>
                                <Activity className="h-3.5 w-3.5" />
                                {totalJobs} Active Jobs
                              </span>
                            </div>
                          </td>

                          {/* Actions Menu */}
                          <td className="py-4 px-6 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 inline-flex items-center justify-center transition-colors">
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 bg-white rounded-xl shadow-lg border-slate-200 p-1">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/team/${member.id}`)}
                                  className="text-xs font-bold text-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                  View Inspector Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/team/${member.id}/edit`)}
                                  className="text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                  Edit Inspector Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/team/${member.id}`)}
                                  className="text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                                >
                                  <Wrench className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                  Dispatch Work Order
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => window.open(`mailto:${member.email}`)}
                                  className="text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                                >
                                  <Mail className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                  Send Direct Email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget({ id: member.id, name: member.name, type: "inspector" })}
                                  className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Remove Staff Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    });
                  })()
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              currentPage={currentPage}
              totalPages={Math.ceil(filteredInspectors.length / itemsPerPage) || 1}
              totalItems={filteredInspectors.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              itemLabel="inspectors"
            />
          </div>
        ) : !hasVendorAccess ? (
          /* Locked Vendor Access Banner */
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center max-w-xl mx-auto my-8 space-y-4 shadow-sm">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Lock className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">External Contractor Portal Locked</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Managing 3rd-party vendor directories, call-out fee ledgers, and compliance W-9 tracking is exclusive to Professional tier plans.
            </p>
            <Link href="/dashboard/owner/billing">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 px-8 rounded-xl mt-2 border-none">
                Upgrade Subscription Plan
              </Button>
            </Link>
          </div>
        ) : (
          /* ─── TAB CONTENT 2: EXTERNAL CONTRACTORS ─── */
          <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F2F2F7] border-b border-[#E5E5EA]">
                    <th className="py-4 px-6 text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Company / Specialist</th>
                    <th className="py-4 px-6 text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Trade Specialty</th>
                    <th className="py-4 px-6 text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Call-Out Fee</th>
                    <th className="py-4 px-6 text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Compliance Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-[#6E6E73] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-sm font-semibold text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-800" />
                          <span>Loading vendor network...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-2">
                          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                            <Wrench className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-700">No contractors found</p>
                          <p className="text-xs text-slate-400">Try adjusting your search query or add a new external contractor to your portal.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const start = (currentPage - 1) * itemsPerPage;
                      const paginatedVendors = filteredVendors.slice(start, start + itemsPerPage);
                      return paginatedVendors.map((vendor) => {
                        const specStyle = SPECIALTY_STYLES[vendor.specialty] || SPECIALTY_STYLES.General;
                        const callOutFee = Number(vendor.baseCallOutFee || 0);
                        const avatarBg = getAvatarColor(vendor.name);

                        return (
                          <tr key={vendor.id} className="hover:bg-[#F2F2F7]/50 transition-colors group">
                            {/* Company / Specialist */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl ${avatarBg} font-black text-sm flex items-center justify-center border border-white shadow-xs shrink-0 cursor-pointer`} onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)}>
                                  {vendor.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <Link
                                    href={`/dashboard/vendors/${vendor.id}`}
                                    className="font-extrabold text-sm text-[#1D1D1F] hover:text-amber-600 transition-colors block"
                                  >
                                    {vendor.name}
                                  </Link>
                                  <a href={`mailto:${vendor.email}`} className="text-xs font-medium text-[#6E6E73] hover:underline">
                                    {vendor.email}
                                  </a>
                                </div>
                              </div>
                            </td>

                            {/* Trade Specialty */}
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${specStyle.bg} ${specStyle.text} ${specStyle.border}`}>
                                <Wrench className="h-3.5 w-3.5" />
                                {vendor.specialty}
                              </span>
                            </td>

                            {/* Call Out Fee */}
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1D1D1F] bg-[#F2F2F7] border border-[#E5E5EA] px-3 py-1 rounded-lg whitespace-nowrap">
                                <DollarSign className="h-3.5 w-3.5 text-[#16A34A] -mr-1" />
                                {callOutFee > 0 ? `${callOutFee.toFixed(2)} Call-Out` : "Standard Rate"}
                              </span>
                            </td>

                            {/* Compliance Status */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${vendor.w9OnFile ? "bg-[#DCFCE7] text-[#16A34A] border-emerald-200" : "bg-[#FEE2E2] text-[#EF4444] border-red-200"}`}>
                                  <FileSignature className="h-3.5 w-3.5" />
                                  W-9 {vendor.w9OnFile ? "Verified" : "Missing"}
                                </span>

                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${vendor.insuranceOnFile ? "bg-[#DCFCE7] text-[#16A34A] border-emerald-200" : "bg-[#FEE2E2] text-[#EF4444] border-red-200"}`}>
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Insured {vendor.insuranceOnFile ? "Active" : "Missing"}
                                </span>
                              </div>
                            </td>

                            {/* Actions Menu */}
                            <td className="py-4 px-6 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 inline-flex items-center justify-center transition-colors">
                                  <MoreHorizontal className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 bg-white rounded-xl shadow-lg border-slate-200 p-1">
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)}
                                    className="text-xs font-bold text-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer"
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                    View Vendor Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/dashboard/vendors/${vendor.id}/edit`)}
                                    className="text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                                  >
                                    <Edit className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                    Edit Vendor Info
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => window.open(`mailto:${vendor.email}`)}
                                    className="text-xs font-semibold text-slate-700 rounded-lg cursor-pointer"
                                  >
                                    <Mail className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                    Contact Contractor
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteTarget({ id: vendor.id, name: vendor.name, type: "vendor" })}
                                    className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    Delete Vendor
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              currentPage={currentPage}
              totalPages={Math.ceil(filteredVendors.length / itemsPerPage) || 1}
              totalItems={filteredVendors.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              itemLabel="contractors"
            />
          </div>
        )}
      </div>

      {/* ─── CONFIRM DELETE DIALOG ─── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={deleteTarget?.type === "inspector" ? "Remove Staff Inspector" : "Delete External Vendor"}
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Confirm Delete"
        confirmVariant="destructive"
        onConfirm={confirmDelete}
      />

      {/* ─── EDIT VENDOR DIALOG ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white max-w-lg rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Edit Vendor Profile</DialogTitle>
          </DialogHeader>

          {editVendor && (
            <form onSubmit={handleEditVendorSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Company / Vendor Name</Label>
                <Input
                  value={editVendor.name || ""}
                  onChange={(e) => setEditVendor({ ...editVendor, name: e.target.value })}
                  className="rounded-xl h-10 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Email Address</Label>
                  <Input
                    type="email"
                    value={editVendor.email || ""}
                    onChange={(e) => setEditVendor({ ...editVendor, email: e.target.value })}
                    className="rounded-xl h-10 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Phone Number</Label>
                  <Input
                    value={editVendor.phone || ""}
                    onChange={(e) => setEditVendor({ ...editVendor, phone: e.target.value })}
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Specialty</Label>
                  <Select value={editVendor.specialty} onValueChange={(v) => setEditVendor({ ...editVendor, specialty: v })}>
                    <SelectTrigger className="rounded-xl h-10 text-xs">
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Plumbing">Plumbing</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                      <SelectItem value="HVAC">HVAC</SelectItem>
                      <SelectItem value="Appliance Repair">Appliance Repair</SelectItem>
                      <SelectItem value="Handyman">Handyman</SelectItem>
                      <SelectItem value="Pest Control">Pest Control</SelectItem>
                      <SelectItem value="Landscaping">Landscaping</SelectItem>
                      <SelectItem value="Cleaning">Cleaning</SelectItem>
                      <SelectItem value="General">General Construction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Base Call-Out Fee ($)</Label>
                  <Input
                    type="number"
                    value={editVendor.baseCallOutFee || "0"}
                    onChange={(e) => setEditVendor({ ...editVendor, baseCallOutFee: e.target.value })}
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">W-9 Form Verified</Label>
                  <Switch
                    checked={editVendor.w9OnFile || false}
                    onCheckedChange={(checked) => setEditVendor({ ...editVendor, w9OnFile: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">Liability Insurance Active</Label>
                  <Switch
                    checked={editVendor.insuranceOnFile || false}
                    onCheckedChange={(checked) => setEditVendor({ ...editVendor, insuranceOnFile: checked })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl h-10 text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 text-xs font-bold">
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
