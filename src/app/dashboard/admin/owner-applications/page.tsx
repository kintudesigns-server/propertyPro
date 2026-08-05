"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Loader2, Search, RefreshCw, CheckCircle2, XCircle, Clock, Eye, FileText,
  Building2, Globe, Phone, Mail, Users, ChevronRight, Filter, ExternalLink, Shield
} from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/ui/KpiCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PaginationBar } from "@/components/ui/PaginationBar";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:      { label: "Pending",      color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  UNDER_REVIEW: { label: "Under Review", color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  APPROVED:     { label: "Approved",     color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200" },
  REJECTED:     { label: "Rejected",     color: "text-red-700",    bg: "bg-red-50 border-red-200" },
};

export default function AdminOwnerApplicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);
  const [showConfirmReject, setShowConfirmReject] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if ((session?.user as any)?.role !== "SUPERADMIN") router.push("/dashboard");
  }, [status, session]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/owner-applications");
      if (res.ok) setApplications(await res.json());
    } catch { toast.error("Failed to load applications"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (status === "authenticated") fetchApplications(); }, [status]);

  const handleAction = async (appId: string, action: "APPROVE" | "REJECT" | "UNDER_REVIEW") => {
    if (action === "REJECT" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/owner-applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason, adminNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === "APPROVE" ? "Application approved! Owner account created." : action === "REJECT" ? "Application rejected." : "Status updated to Under Review.");
      setSelectedApp(null);
      setRejectionReason("");
      setAdminNotes("");
      fetchApplications();
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = applications.filter(a => {
    const matchStatus = statusFilter === "ALL" || a.status === statusFilter;
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === "PENDING").length,
    underReview: applications.filter(a => a.status === "UNDER_REVIEW").length,
    approved: applications.filter(a => a.status === "APPROVED").length,
    rejected: applications.filter(a => a.status === "REJECTED").length,
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
        <p className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Loading owner applications...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-red-500 rounded-xl">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Owner Applications</h1>
            <p className="text-[#6E6E73] text-sm font-normal mt-0.5">Review and manage owner account requests</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={fetchApplications} className="text-[#6E6E73] hover:bg-[#F2F2F7]">
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stats Grid — Standardized KpiCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard title="Pending Review" value={stats.pending} subtext="Requires administrative action" icon={Clock} variant="amber" />
        <KpiCard title="Under Review" value={stats.underReview} subtext="Currently being verified" icon={Search} variant="blue" />
        <KpiCard title="Approved" value={stats.approved} subtext="Access granted to platform" icon={CheckCircle2} variant="emerald" />
        <KpiCard title="Rejected" value={stats.rejected} subtext="Denied application requests" icon={XCircle} variant="red" />
      </div>

      {/* Filter and Register Ledger */}
      <Card className="bg-white border border-[#E5E5EA] shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden">
        <CardHeader className="border-b border-[#E5E5EA] pb-5 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 sm:p-8">
          <div>
            <CardTitle className="text-lg font-semibold text-[#1D1D1F]">Applications Register</CardTitle>
            <CardDescription className="text-[#6E6E73] font-normal text-xs mt-0.5">Verify landlord credentials and set approval status.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
            {/* Status Segment Filter */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto border border-slate-200/30">
              {["ALL", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((statusOption) => (
                <button
                  key={statusOption}
                  onClick={() => setStatusFilter(statusOption)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === statusOption
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-[#6E6E73] hover:text-slate-800"
                  }`}
                >
                  {statusOption === "ALL"
                    ? "All"
                    : statusOption === "PENDING"
                    ? "Pending"
                    : statusOption === "UNDER_REVIEW"
                    ? "Under Review"
                    : statusOption === "APPROVED"
                    ? "Approved"
                    : "Rejected"}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
              <Input
                placeholder="Search applications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-white border-[#E5E5EA] focus:ring-[#EF4444] text-[#1D1D1F] font-normal text-sm shadow-sm placeholder:text-[#8E8E93]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-[#6E6E73]">
              <FileText className="h-14 w-14 mx-auto text-slate-200 mb-3" />
              <p className="font-semibold text-base">No applications matching filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#E5E5EA] hover:bg-transparent bg-slate-50/20">
                  <TableHead className="text-[#6E6E73] font-medium text-[11px] uppercase tracking-wider pl-6 sm:pl-8 py-4">Landlord</TableHead>
                  <TableHead className="text-[#6E6E73] font-medium text-[11px] uppercase tracking-wider py-4">Entity</TableHead>
                  <TableHead className="text-[#6E6E73] font-medium text-[11px] uppercase tracking-wider py-4">Portfolio</TableHead>
                  <TableHead className="text-[#6E6E73] font-medium text-[11px] uppercase tracking-wider py-4">Applied</TableHead>
                  <TableHead className="text-[#6E6E73] font-medium text-[11px] uppercase tracking-wider py-4">Status</TableHead>
                  <TableHead className="text-right text-[#6E6E73] font-medium text-[11px] uppercase tracking-wider pr-6 sm:pr-8 py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const start = (currentPage - 1) * itemsPerPage;
                  const paginated = filtered.slice(start, start + itemsPerPage);
                  return paginated.map((app) => {
                    const cfg = statusConfig[app.status] || statusConfig.PENDING;
                    return (
                      <TableRow 
                        key={app.id} 
                        onClick={() => router.push(`/dashboard/admin/owner-applications/${app.id}`)}
                        className="border-[#E5E5EA] hover:bg-[#F2F2F7] cursor-pointer transition-colors"
                      >
                        <TableCell className="font-medium text-[#1D1D1F] pl-6 sm:pl-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-sm shrink-0">
                              {app.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm hover:text-blue-600 transition-colors">{app.name}</p>
                              <p className="text-[#6E6E73] text-xs font-normal">{app.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-xs text-[#6E6E73] py-4">{app.entityType}</TableCell>
                        <TableCell className="font-medium text-xs text-[#6E6E73] py-4">{app.portfolioSize}</TableCell>
                        <TableCell className="font-normal text-xs text-[#6E6E73] py-4">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            {app.status === "PENDING" && <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>}
                            <Badge className={`${cfg.bg} ${cfg.color} border text-xs font-semibold px-2.5 py-1 rounded-lg`}>
                              {cfg.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6 sm:pr-8 py-4" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            size="sm" 
                            onClick={() => router.push(`/dashboard/admin/owner-applications/${app.id}`)} 
                            className="rounded-lg gap-1.5 font-medium bg-slate-900 hover:bg-slate-800 text-white px-3 h-8 text-xs transition-all shadow-2xs"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-300" /> Review Dossier
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          )}

          <PaginationBar
            currentPage={currentPage}
            totalPages={Math.ceil(filtered.length / itemsPerPage) || 1}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            itemLabel="applications"
          />
        </CardContent>
      </Card>
    </div>
  );
}

