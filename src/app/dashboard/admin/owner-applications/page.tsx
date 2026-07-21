"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Loader2, Search, RefreshCw, CheckCircle2, XCircle, Clock, Eye, FileText,
  Building2, Globe, Phone, Mail, Users, ChevronRight, Filter, ExternalLink
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-20 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Owner Applications</h1>
          <p className="text-[#6E6E73] mt-0.5">Review and manage owner account requests</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchApplications} className="text-[#6E6E73]">
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Pending Review", count: stats.pending, color: "text-amber-700", bg: "bg-amber-100", border: "border-amber-200", icon: Clock },
          { label: "Under Review", count: stats.underReview, color: "text-blue-700", bg: "bg-blue-100", border: "border-blue-200", icon: Search },
          { label: "Approved", count: stats.approved, color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-200", icon: CheckCircle2 },
          { label: "Rejected", count: stats.rejected, color: "text-red-700", bg: "bg-red-100", border: "border-red-200", icon: XCircle },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5 relative overflow-hidden group`}>
            <s.icon className={`absolute -right-4 -bottom-4 h-24 w-24 opacity-10 group-hover:opacity-20 transition-opacity ${s.color}`} />
            <div className="relative z-10 flex flex-col justify-between h-full space-y-2">
              <div className="flex items-center gap-2">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <p className={`font-bold text-sm ${s.color}`}>{s.label}</p>
              </div>
              <p className={`text-4xl font-black tracking-tight ${s.color}`}>{s.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-slate-200 p-2 rounded-[1.25rem] shadow-sm flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applications by name or email..." className="pl-10 h-12 w-full rounded-xl border-none bg-slate-50 focus-visible:ring-0 shadow-inner font-medium text-slate-800" />
        </div>
        <div className="h-8 w-px bg-slate-200 hidden md:block mx-1"></div>
        <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide px-1">
          {["ALL", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${statusFilter === s ? 'bg-slate-900 text-white shadow-md' : 'bg-transparent text-[#6E6E73] hover:bg-slate-100 hover:text-slate-900'}`}>
              {s === "ALL" ? "All Applications" : s === "UNDER_REVIEW" ? "Under Review" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-[#6E6E73] font-medium">No applications found</p>
          </div>
        ) : (
          filtered.map(app => {
            const cfg = statusConfig[app.status] || statusConfig.PENDING;
            return (
              <div key={app.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-200 transition-all cursor-default group relative overflow-hidden">
                {app.status === "PENDING" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>}
                
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {app.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-base">{app.name}</p>
                    <p className="text-[#6E6E73] text-sm font-medium">{app.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-8 text-sm text-[#6E6E73] flex-1 justify-between md:justify-center">
                  <div>
                    <p className="text-[#8E8E93] text-[11px] font-bold uppercase tracking-wider mb-0.5">Entity</p>
                    <p className="font-bold text-slate-800">{app.entityType}</p>
                  </div>
                  <div>
                    <p className="text-[#8E8E93] text-[11px] font-bold uppercase tracking-wider mb-0.5">Portfolio</p>
                    <p className="font-bold text-slate-800">{app.portfolioSize}</p>
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-[#8E8E93] text-[11px] font-bold uppercase tracking-wider mb-0.5">Applied</p>
                    <p className="font-bold text-slate-800">{new Date(app.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 justify-between md:justify-end">
                  <div className="flex items-center gap-2">
                    {app.status === "PENDING" && <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>}
                    <Badge className={`${cfg.bg} ${cfg.color} border-0 text-xs font-black px-3 py-1 rounded-full shadow-sm`}>{cfg.label}</Badge>
                  </div>
                  <Button size="sm" onClick={() => { setSelectedApp(app); setAdminNotes(app.adminNotes || ""); }} className="rounded-xl gap-2 font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 h-10 shadow-md">
                    <Eye className="h-4 w-4" /> Review
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

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
