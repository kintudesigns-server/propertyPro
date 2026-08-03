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
  Check,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<"inspectors" | "vendors">("inspectors");
  const [loading, setLoading] = useState(true);

  // Data states
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Search & Filter
  const [inspectorSearch, setInspectorSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: "inspector" | "vendor" } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, inspectorSearch, vendorSearch, filterSpecialty]);

  async function loadData() {
    setLoading(true);
    try {
      const [resInsp, resVend] = await Promise.all([
        fetch("/api/users?role=INSPECTOR"),
        hasVendorAccess ? fetch("/api/external-vendors") : Promise.resolve(null),
      ]);

      if (resInsp.ok) setInspectors(await resInsp.json());
      if (resVend && resVend.ok) setVendors(await resVend.json());
    } catch (err) {
      toast.error("Failed to load directory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [hasVendorAccess]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const endpoint = deleteTarget.type === "inspector"
        ? `/api/admin/users/${deleteTarget.id}`
        : `/api/external-vendors/${deleteTarget.id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        toast.success(`${deleteTarget.type === "inspector" ? "Staff inspector" : "External vendor"} removed.`);
        setDeleteTarget(null);
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to remove entry");
      }
    } catch (err) {
      toast.error("Error deleting record");
    } finally {
      setDeleting(false);
    }
  }

  // Filtered lists
  const filteredInspectors = inspectors.filter((member) => {
    const q = inspectorSearch.toLowerCase();
    return (
      !q ||
      member.name.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      (member.phone && member.phone.toLowerCase().includes(q))
    );
  });

  const filteredVendors = vendors.filter((vendor) => {
    const q = vendorSearch.toLowerCase();
    const matchesSearch =
      !q ||
      vendor.name.toLowerCase().includes(q) ||
      vendor.specialty.toLowerCase().includes(q) ||
      vendor.email.toLowerCase().includes(q);
    const matchesSpecialty = filterSpecialty === "All" || vendor.specialty === filterSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  // Calculate Metrics
  const totalStaffCount = inspectors.length;
  const activeWorkloadCount = inspectors.reduce(
    (acc, m) => acc + (m._count?.inspectorMaintenanceRequests || 0) + (m._count?.moveOutInspectorLeases || 0),
    0
  );

  const verifiedVendors = vendors.filter((v) => v.w9OnFile && v.insuranceOnFile).length;
  const complianceRate = vendors.length > 0 ? Math.round((verifiedVendors / vendors.length) * 100) : 100;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6">

      {/* Page Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span className="text-slate-900 font-bold">Inspectors &amp; Contractors</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Workforce Directory
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
            Centralized directory for field inspectors, repair dispatchers, and trade contractors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "inspectors" ? (
            <Link href="/dashboard/team/new">
              <Button className="h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 rounded-xl shadow-xs text-xs gap-2">
                <Plus className="h-4 w-4" /> Add Field Inspector
              </Button>
            </Link>
          ) : hasVendorAccess ? (
            <Link href="/dashboard/vendors/new">
              <Button className="h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 rounded-xl shadow-xs text-xs gap-2">
                <Plus className="h-4 w-4" /> Add Trade Contractor
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {/* Sleek KPI Summary Strip (Platform Design System) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-blue-500 bg-white">
          <CardContent className="p-4">
            <p className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">Total Workforce</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalStaffCount}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Staff Field Inspectors</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-indigo-500 bg-white">
          <CardContent className="p-4">
            <p className="text-[10px] font-extrabold text-indigo-800 uppercase tracking-wider">Active Workloads</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{activeWorkloadCount}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Assigned Inspections &amp; Jobs</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-amber-500 bg-white">
          <CardContent className="p-4">
            <p className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">Contractor Network</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{vendors.length}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Trade Specialists</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-emerald-500 bg-white">
          <CardContent className="p-4">
            <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">Compliance Status</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{complianceRate}%</p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Verified W-9 &amp; Insurance</p>
          </CardContent>
        </Card>
      </div>

      {/* Segmented Tabs & Control Bar */}
      <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

            {/* Segmented Tab Buttons */}
            <div className="flex bg-slate-200/70 p-1 rounded-xl gap-1">
              <button
                onClick={() => setActiveTab("inspectors")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "inspectors"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserCheck className="h-4 w-4 text-blue-600" />
                Internal Inspectors
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700">
                  {inspectors.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("vendors")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "vendors"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Wrench className="h-4 w-4 text-amber-600" />
                External Contractors
                {!hasVendorAccess ? (
                  <Lock className="h-3 w-3 text-slate-400" />
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700">
                    {vendors.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Specific Search & Specialty Filters */}
            {activeTab === "inspectors" ? (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search staff name or email..."
                  value={inspectorSearch}
                  onChange={(e) => setInspectorSearch(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-xl focus:bg-white font-medium"
                />
              </div>
            ) : hasVendorAccess ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={filterSpecialty}
                  onChange={(e) => setFilterSpecialty(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-bold px-3 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
                >
                  <option value="All">All Specialties</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Appliance Repair">Appliance Repair</option>
                  <option value="Handyman">Handyman</option>
                  <option value="Pest Control">Pest Control</option>
                  <option value="Landscaping">Landscaping</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="General">General</option>
                </select>

                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search contractor..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-xl focus:bg-white font-medium"
                  />
                </div>
              </div>
            ) : null}

          </div>
        </div>

        {/* TAB 1: INTERNAL FIELD INSPECTORS */}
        {activeTab === "inspectors" ? (
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200">
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Inspector Name</th>
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Contact Channels</th>
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Designation</th>
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Active Workload</th>
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs font-bold text-slate-400">
                      Loading staff inspectors...
                    </td>
                  </tr>
                ) : filteredInspectors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <UserCheck className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-bold text-slate-700">No inspectors found</p>
                        <p className="text-xs text-slate-400">Try adjusting search query or add a new inspector.</p>
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
                        <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Inspector Name & Role */}
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <div
                                className="relative cursor-pointer shrink-0"
                                onClick={() => router.push(`/dashboard/team/${member.id}`)}
                              >
                                {member.avatar ? (
                                  <img
                                    src={member.avatar}
                                    alt={member.name}
                                    className="h-9 w-9 rounded-xl object-cover border border-slate-200 shadow-xs"
                                  />
                                ) : (
                                  <div className={`h-9 w-9 rounded-xl ${colorClass} font-black text-sm flex items-center justify-center shadow-xs`}>
                                    {member.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" title="Available for Dispatch" />
                              </div>
                              <div>
                                <Link
                                  href={`/dashboard/team/${member.id}`}
                                  className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors block"
                                >
                                  {member.name}
                                </Link>
                                <span className="text-[11px] font-semibold text-slate-500">
                                  Staff Field Inspector
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Contact Channels */}
                          <td className="py-3.5 px-6">
                            <div className="space-y-0.5">
                              <a
                                href={`mailto:${member.email}`}
                                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                              >
                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                {member.email}
                              </a>
                              {member.phone && (
                                <a
                                  href={`tel:${member.phone}`}
                                  className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
                                >
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  {member.phone}
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Designation Badge */}
                          <td className="py-3.5 px-6">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold">
                              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                              Certified Inspector
                            </span>
                          </td>

                          {/* Workload Indicator */}
                          <td className="py-3.5 px-6">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold">
                              <Activity className="h-3.5 w-3.5 text-slate-400" />
                              {totalJobs} Active Jobs
                            </span>
                          </td>

                          {/* Actions Column */}
                          <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 inline-flex items-center justify-center transition-colors border border-slate-200">
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 bg-white rounded-xl shadow-lg border-slate-200 p-1">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/team/${member.id}`)}
                                  className="text-xs font-bold text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/team/${member.id}/edit`)}
                                  className="text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => window.open(`mailto:${member.email}`)}
                                  className="text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                                >
                                  <Mail className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                  Send Email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget({ id: member.id, name: member.name, type: "inspector" })}
                                  className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Remove Inspector
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

            <PaginationBar
              currentPage={currentPage}
              totalPages={Math.ceil(filteredInspectors.length / itemsPerPage) || 1}
              totalItems={filteredInspectors.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              itemLabel="inspectors"
            />
          </CardContent>
        ) : !hasVendorAccess ? (
          /* Locked Vendor Access Banner */
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center max-w-xl mx-auto my-8 space-y-4 shadow-xs">
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
          /* TAB 2: EXTERNAL CONTRACTORS */
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200">
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Company / Specialist</th>
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Trade Specialty</th>
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Call-Out Fee</th>
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Compliance Verification</th>
                  <th className="py-3.5 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs font-bold text-slate-400">
                      Loading vendor network...
                    </td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Wrench className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-bold text-slate-700">No contractors found</p>
                        <p className="text-xs text-slate-400">Try adjusting search query or add a new trade contractor.</p>
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
                        <tr key={vendor.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Company / Specialist */}
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-9 w-9 rounded-xl ${avatarBg} font-black text-sm flex items-center justify-center border border-white shadow-xs shrink-0 cursor-pointer`}
                                onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)}
                              >
                                {vendor.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <Link
                                  href={`/dashboard/vendors/${vendor.id}`}
                                  className="font-bold text-sm text-slate-900 hover:text-amber-600 transition-colors block"
                                >
                                  {vendor.name}
                                </Link>
                                <a href={`mailto:${vendor.email}`} className="text-xs font-semibold text-slate-500 hover:underline">
                                  {vendor.email}
                                </a>
                              </div>
                            </div>
                          </td>

                          {/* Trade Specialty */}
                          <td className="py-3.5 px-6">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${specStyle.bg} ${specStyle.text} ${specStyle.border}`}>
                              <Wrench className="h-3 w-3" />
                              {vendor.specialty}
                            </span>
                          </td>

                          {/* Call Out Fee */}
                          <td className="py-3.5 px-6">
                            <span className="font-extrabold text-slate-900 text-xs">
                              {callOutFee > 0 ? `$${callOutFee.toFixed(2)} / call-out` : "Standard Rate"}
                            </span>
                          </td>

                          {/* Compliance Verification */}
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-2 flex-wrap">
                              {vendor.w9OnFile ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-[11px] font-bold">
                                  <Check className="h-3 w-3 text-emerald-600" /> W-9
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-[11px] font-bold">
                                  <XCircle className="h-3 w-3 text-rose-500" /> W-9 Missing
                                </span>
                              )}

                              {vendor.insuranceOnFile ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-[11px] font-bold">
                                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> Insured
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-[11px] font-bold">
                                  <AlertTriangle className="h-3 w-3 text-amber-600" /> No Insurance
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions Column */}
                          <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 inline-flex items-center justify-center transition-colors border border-slate-200">
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 bg-white rounded-xl shadow-lg border-slate-200 p-1">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)}
                                  className="text-xs font-bold text-slate-900 hover:bg-slate-50 rounded-lg cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                  Manage Vendor
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/vendors/${vendor.id}/edit`)}
                                  className="text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                  Edit Vendor Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => window.open(`mailto:${vendor.email}`)}
                                  className="text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                                >
                                  <Mail className="h-3.5 w-3.5 mr-2 text-slate-400" />
                                  Send Email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget({ id: vendor.id, name: vendor.name, type: "vendor" })}
                                  className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Remove Contractor
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

            <PaginationBar
              currentPage={currentPage}
              totalPages={Math.ceil(filteredVendors.length / itemsPerPage) || 1}
              totalItems={filteredVendors.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              itemLabel="contractors"
            />
          </CardContent>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={`Remove ${deleteTarget?.type === "inspector" ? "Staff Inspector" : "External Contractor"}?`}
        description={`Are you sure you want to remove ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel="Remove Record"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />

    </div>
  );
}
