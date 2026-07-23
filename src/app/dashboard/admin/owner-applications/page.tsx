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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
        <Loader2 className="h-10 w-10 animate-spin text-[#EF4444]" />
        <p className="text-[#6E6E73] font-bold text-sm uppercase tracking-wider">Loading owner applications...</p>
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
            <h1 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">Owner Applications</h1>
            <p className="text-[#6E6E73] text-base mt-0.5">Review and manage owner account requests</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={fetchApplications} className="text-[#6E6E73] hover:bg-[#F2F2F7]">
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[20px] overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-300 relative">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-black text-[#8E8E93] uppercase tracking-widest leading-none mt-1">Pending Review</p>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-3xl font-black text-amber-600 mb-1 leading-none">{stats.pending}</p>
            <p className="text-xs text-[#6E6E73] font-semibold mt-2">Requires administrative action</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[20px] overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-300 relative">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-black text-[#8E8E93] uppercase tracking-widest leading-none mt-1">Under Review</p>
              <Search className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-black text-blue-600 mb-1 leading-none">{stats.underReview}</p>
            <p className="text-xs text-[#6E6E73] font-semibold mt-2">Currently being verified</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[20px] overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-300 relative">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-black text-[#8E8E93] uppercase tracking-widest leading-none mt-1">Approved</p>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-emerald-600 mb-1 leading-none">{stats.approved}</p>
            <p className="text-xs text-[#6E6E73] font-semibold mt-2">Access granted to platform</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[20px] overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-300 relative">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-black text-[#8E8E93] uppercase tracking-widest leading-none mt-1">Rejected</p>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-3xl font-black text-red-600 mb-1 leading-none">{stats.rejected}</p>
            <p className="text-xs text-[#6E6E73] font-semibold mt-2">Denied application requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Register Ledger */}
      <Card className="bg-white border border-[#E5E5EA] shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden">
        <CardHeader className="border-b border-[#E5E5EA] pb-5 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 sm:p-8">
          <div>
            <CardTitle className="text-lg font-black text-[#1D1D1F]">Applications Register</CardTitle>
            <CardDescription className="text-[#6E6E73] font-medium text-xs mt-0.5">Verify landlord credentials and set approval status.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
            {/* Status Segment Filter */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto border border-slate-200/30">
              {["ALL", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((statusOption) => (
                <button
                  key={statusOption}
                  onClick={() => setStatusFilter(statusOption)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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
                className="pl-10 h-10 rounded-xl bg-white border-[#E5E5EA] focus:ring-[#EF4444] text-[#1D1D1F] font-semibold text-sm shadow-sm placeholder:text-[#8E8E93]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-[#6E6E73]">
              <FileText className="h-14 w-14 mx-auto text-slate-200 mb-3" />
              <p className="font-extrabold text-base">No applications matching filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#E5E5EA] hover:bg-transparent bg-slate-50/20">
                  <TableHead className="text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider pl-6 sm:pl-8 py-4">Landlord</TableHead>
                  <TableHead className="text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider py-4">Entity</TableHead>
                  <TableHead className="text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider py-4">Portfolio</TableHead>
                  <TableHead className="text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider py-4">Applied</TableHead>
                  <TableHead className="text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider py-4">Status</TableHead>
                  <TableHead className="text-right text-[#6E6E73] font-extrabold text-[10px] uppercase tracking-wider pr-6 sm:pr-8 py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((app) => {
                  const cfg = statusConfig[app.status] || statusConfig.PENDING;
                  return (
                    <TableRow key={app.id} className="border-[#E5E5EA] hover:bg-[#F2F2F7]">
                      <TableCell className="font-bold text-[#1D1D1F] pl-6 sm:pl-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg shrink-0">
                            {app.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{app.name}</p>
                            <p className="text-[#6E6E73] text-xs font-semibold">{app.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-[#1D1D1F] py-4">{app.entityType}</TableCell>
                      <TableCell className="font-bold text-[#1D1D1F] py-4">{app.portfolioSize}</TableCell>
                      <TableCell className="font-semibold text-[#6E6E73] py-4">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          {app.status === "PENDING" && <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>}
                          <Badge className={`${cfg.bg} ${cfg.color} border text-xs font-extrabold px-2.5 py-1 rounded-lg`}>
                            {cfg.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6 sm:pr-8 py-4">
                        <Button 
                          size="sm" 
                          onClick={() => { setSelectedApp(app); setAdminNotes(app.adminNotes || ""); }} 
                          className="rounded-xl gap-2 font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 h-9 shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" /> Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900">{selectedApp.name}</h2>
                <p className="text-[#6E6E73] text-sm">{selectedApp.entityType} · Applied {new Date(selectedApp.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
              <Badge className={`${statusConfig[selectedApp.status].bg} ${statusConfig[selectedApp.status].color} border text-xs font-bold px-2.5 py-1 rounded-lg`}>{statusConfig[selectedApp.status].label}</Badge>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* KYB Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-[#8E8E93] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[#6E6E73] text-xs font-medium">Email</p>
                    <a href={`mailto:${selectedApp.email}`} className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-semibold flex items-center gap-1">
                      {selectedApp.email} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-[#8E8E93] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[#6E6E73] text-xs font-medium">Phone</p>
                    <a href={`tel:${selectedApp.phone}`} className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-semibold flex items-center gap-1">
                      {selectedApp.phone} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Users className="h-4 w-4 text-[#8E8E93] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[#6E6E73] text-xs font-medium">Portfolio Size</p>
                    <p className="text-slate-900 text-sm font-semibold">{selectedApp.portfolioSize}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <FileText className="h-4 w-4 text-[#8E8E93] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[#6E6E73] text-xs font-medium">Current Software</p>
                    {selectedApp.currentSoftware ? (
                      <p className="text-slate-900 text-sm font-semibold">{selectedApp.currentSoftware}</p>
                    ) : (
                      <p className="text-[#8E8E93] italic text-sm font-semibold">None reported</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Building2 className="h-4 w-4 text-[#8E8E93] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[#6E6E73] text-xs font-medium">Entity Type</p>
                    <p className="text-slate-900 text-sm font-semibold">{selectedApp.entityType}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Globe className="h-4 w-4 text-[#8E8E93] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[#6E6E73] text-xs font-medium">Website</p>
                    {selectedApp.website ? (
                      <a 
                        href={selectedApp.website.startsWith("http") ? selectedApp.website : `https://${selectedApp.website}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-semibold flex items-center gap-1"
                      >
                        {selectedApp.website} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="text-[#8E8E93] italic text-sm font-semibold">Not provided</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Admin Notes (Internal)</label>
                <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Optional notes for your team..." />
              </div>

              {/* Rejection reason (shown only when rejecting) */}
              {selectedApp.status !== "REJECTED" && selectedApp.status !== "APPROVED" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Rejection Reason <span className="text-[#8E8E93] font-normal">(Required if rejecting)</span></label>
                  <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={2} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" placeholder="Explain why the application was rejected..." />
                </div>
              )}

              {/* Show rejection reason if application is already rejected */}
              {selectedApp.status === "REJECTED" && selectedApp.rejectionReason && (
                <div className="bg-red-50 border border-red-200 text-red-950 p-4 rounded-xl space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-red-800">Rejection Reason</p>
                  <p className="text-sm font-semibold">{selectedApp.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Action Buttons in Footer */}
            <div className="p-6 border-t border-slate-100 flex flex-wrap gap-3 shrink-0 bg-slate-50/50 rounded-b-3xl">
              <Button variant="outline" className="rounded-xl font-semibold" onClick={() => { setSelectedApp(null); setRejectionReason(""); setAdminNotes(""); }}>
                Cancel
              </Button>
              {selectedApp.status === "PENDING" && (
                <Button variant="outline" disabled={actionLoading} onClick={() => handleAction(selectedApp.id, "UNDER_REVIEW")} className="rounded-xl font-semibold text-blue-600 border-blue-200 hover:bg-blue-50">
                  <Clock className="h-4 w-4 mr-1.5" /> Mark Under Review
                </Button>
              )}
              {selectedApp.status !== "APPROVED" && selectedApp.status !== "REJECTED" && (
                <>
                  <Button 
                    disabled={actionLoading} 
                    onClick={() => {
                      if (!rejectionReason.trim()) {
                        toast.error("Please provide a rejection reason");
                      } else {
                        setShowConfirmReject(true);
                      }
                    }} 
                    className="rounded-xl font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />} Reject
                  </Button>
                  <Button 
                    disabled={actionLoading} 
                    onClick={() => setShowConfirmApprove(true)} 
                    className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white ml-auto"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />} Approve & Create Account
                  </Button>
                </>
              )}
            </div>
          </div>

          <ConfirmDialog
            open={showConfirmApprove}
            onOpenChange={setShowConfirmApprove}
            title="Approve Owner Application"
            description={`Are you sure you want to approve ${selectedApp.name}'s application? This will automatically create an Owner user account, associate their pricing tier, and send a welcome email.`}
            confirmLabel="Approve & Create Account"
            confirmVariant="default"
            onConfirm={() => handleAction(selectedApp.id, "APPROVE")}
          />

          <ConfirmDialog
            open={showConfirmReject}
            onOpenChange={setShowConfirmReject}
            title="Reject Owner Application"
            description={`Are you sure you want to reject ${selectedApp.name}'s application? An email explaining the rejection will be sent to them.`}
            confirmLabel="Confirm Rejection"
            confirmVariant="destructive"
            onConfirm={() => handleAction(selectedApp.id, "REJECT")}
          />
        </div>
      )}
    </div>
  );
}
