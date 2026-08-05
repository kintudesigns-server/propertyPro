"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Building2, Mail, Phone, Globe, Calendar, Shield,
  CheckCircle2, XCircle, Clock, Copy, ExternalLink, AlertTriangle,
  Loader2, FileText, Check, X, RefreshCw, UserCheck, Briefcase,
  ChevronRight, ArrowUpRight, Share2
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface OwnerApplication {
  id: string;
  trackingId: string;
  name: string;
  email: string;
  phone: string;
  website?: string;
  entityType: string;
  portfolioSize: string;
  currentSoftware?: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  adminNotes?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedByAdminId?: string;
  createdUserId?: string;
  createdAt: string;
  updatedAt: string;
}

const REJECTION_REASONS = [
  "Unverifiable Entity Credentials",
  "Fraud Suspected / Suspicious Info",
  "Insufficient Unit Portfolio Size",
  "Duplicate Application",
  "Incomplete Contact Information",
  "Out of Scope Service Region",
  "Custom Reason",
];

export default function AdminOwnerApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params?.id as string;
  const { status: sessionStatus } = useSession();

  const [application, setApplication] = useState<OwnerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [customRejectionNote, setCustomRejectionNote] = useState("");

  const fetchApplication = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/owner-applications/${applicationId}`);
      if (res.ok) {
        const data = await res.json();
        setApplication(data);
        setAdminNotes(data.adminNotes || "");
      } else {
        toast.error("Application not found");
        router.push("/dashboard/admin/owner-applications");
      }
    } catch {
      toast.error("Failed to load application details");
    } finally {
      setLoading(false);
    }
  }, [applicationId, router]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchApplication();
    }
  }, [sessionStatus, fetchApplication]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Status transition handlers
  const handleApprove = async () => {
    if (!application) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/owner-applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE", adminNotes }),
      });
      if (res.ok) {
        toast.success("Application Approved! Owner account created & welcome email sent.");
        fetchApplication();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to approve application");
      }
    } catch {
      toast.error("Error approving application");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkUnderReview = async () => {
    if (!application) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/owner-applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UNDER_REVIEW", adminNotes }),
      });
      if (res.ok) {
        toast.success("Application marked as Under Review.");
        fetchApplication();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update status");
      }
    } catch {
      toast.error("Error updating status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!application) return;
    const finalReason = rejectionReason === "Custom Reason"
      ? customRejectionNote
      : customRejectionNote ? `${rejectionReason}: ${customRejectionNote}` : rejectionReason;

    if (!finalReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/owner-applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          rejectionReason: finalReason,
          adminNotes,
        }),
      });
      if (res.ok) {
        toast.success("Application rejected and applicant notified.");
        setShowRejectModal(false);
        fetchApplication();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to reject application");
      }
    } catch {
      toast.error("Error rejecting application");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotesOnly = async () => {
    if (!application) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/owner-applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: application.status === "PENDING" ? "UNDER_REVIEW" : application.status,
          adminNotes,
        }),
      });
      if (res.ok) {
        toast.success("Internal admin notes saved.");
        fetchApplication();
      } else {
        toast.error("Failed to save notes");
      }
    } catch {
      toast.error("Error saving notes");
    } finally {
      setSavingNotes(false);
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-bold text-sm">Loading application dossier...</p>
      </div>
    );
  }

  if (!application) return null;

  const daysAgo = Math.floor((Date.now() - new Date(application.createdAt).getTime()) / (1000 * 3600 * 24));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-6 pb-24 px-4 sm:px-6">

      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-normal text-[#6E6E73] mb-2">
            <button
              onClick={() => router.push("/dashboard/admin/owner-applications")}
              className="h-7 w-7 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => router.push("/dashboard/admin/owner-applications")}
              className="hover:text-[#1D1D1F] transition-colors"
            >
              Applications
            </button>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="text-[#1D1D1F] font-semibold">{application.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">
              Application Dossier
            </h1>
            {application.status === "PENDING" && (
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                Pending Review
              </span>
            )}
            {application.status === "UNDER_REVIEW" && (
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                Under Review
              </span>
            )}
            {application.status === "APPROVED" && (
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                Approved
              </span>
            )}
            {application.status === "REJECTED" && (
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
                Rejected
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(window.location.href, "Share link")}
            className="gap-2 border-slate-200 text-[#1D1D1F] hover:bg-slate-50 font-medium rounded-xl text-xs h-9 px-4 shadow-2xs cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5 text-slate-500" /> Share Dossier
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchApplication}
            className="text-slate-500 hover:bg-slate-100 rounded-xl h-9 w-9 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main 2-Column Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN (2/3 = 67%) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Applicant Hero Card */}
          <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 border border-slate-200/80 text-[#1D1D1F] font-semibold text-lg flex items-center justify-center shrink-0 shadow-2xs">
                  {application.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-[#1D1D1F] tracking-tight">{application.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                      {application.entityType}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E6E73] font-normal mt-1">
                    Submitted {new Date(application.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    {" "}({daysAgo === 0 ? "Today" : `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`})
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs font-normal text-[#6E6E73]">Tracking ID:</span>
                    <span className="font-mono text-xs font-semibold text-[#1D1D1F] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                      #{application.trackingId.slice(0, 8)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(application.trackingId, "Tracking ID")}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                      title="Copy full Tracking ID"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KYB & Business Credentials Card */}
          <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-700" />
              <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">KYB &amp; Contact Credentials</h3>
            </div>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Email */}
              <div className="space-y-1">
                <p className="text-xs font-normal text-[#6E6E73]">Email Address</p>
                <div className="flex items-center gap-2">
                  <a
                    href={`mailto:${application.email}`}
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1.5"
                  >
                    <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {application.email}
                  </a>
                  <button onClick={() => copyToClipboard(application.email, "Email")} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <p className="text-xs font-normal text-[#6E6E73]">Phone Number</p>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${application.phone}`}
                    className="text-xs font-semibold text-[#1D1D1F] hover:text-blue-600 flex items-center gap-1.5"
                  >
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {application.phone}
                  </a>
                  <button onClick={() => copyToClipboard(application.phone, "Phone")} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Entity Type */}
              <div className="space-y-1">
                <p className="text-xs font-normal text-[#6E6E73]">Entity Classification</p>
                <p className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {application.entityType}
                </p>
              </div>

              {/* Portfolio Size */}
              <div className="space-y-1">
                <p className="text-xs font-normal text-[#6E6E73]">Claimed Portfolio Footprint</p>
                <p className="text-xs font-semibold text-[#1D1D1F]">
                  🏢 {application.portfolioSize}
                </p>
              </div>

              {/* Current Software */}
              <div className="space-y-1">
                <p className="text-xs font-normal text-[#6E6E73]">Migrating From Software</p>
                <p className="text-xs font-semibold text-[#1D1D1F]">
                  {application.currentSoftware || "None / Manual Spreadsheets"}
                </p>
              </div>

              {/* Official Website */}
              <div className="space-y-1">
                <p className="text-xs font-normal text-[#6E6E73]">Official Website</p>
                {application.website ? (
                  <a
                    href={application.website.startsWith("http") ? application.website : `https://${application.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1.5"
                  >
                    <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {application.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="text-xs text-[#6E6E73] font-normal italic">Not provided</p>
                )}
              </div>

            </CardContent>
          </Card>

          {/* Application Lifecycle Audit & Timeline */}
          <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Verification History &amp; Audit Trail</h3>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">

                {/* Event 1: Submitted */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-slate-700 border-2 border-white ring-2 ring-slate-100" />
                  <p className="text-xs font-semibold text-[#1D1D1F]">Application Submitted</p>
                  <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
                    Received via public owner onboarding form on{" "}
                    {new Date(application.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Event 2: Last Reviewed / Updated */}
                {application.reviewedAt && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-slate-700 border-2 border-white ring-2 ring-slate-100" />
                    <p className="text-xs font-semibold text-[#1D1D1F]">
                      Status Marked: {application.status}
                    </p>
                    <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
                      Reviewed on {new Date(application.reviewedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Event 3: Account Created */}
                {application.createdUserId && (
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-100" />
                    <p className="text-xs font-semibold text-emerald-800">Owner User Provisioned</p>
                    <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
                      Account successfully created. Password reset setup link generated.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/admin/users?search=${application.email}`)}
                      className="mt-2 text-xs font-medium border-slate-200 text-[#1D1D1F] hover:bg-slate-50 rounded-xl cursor-pointer shadow-2xs"
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1.5" /> View Provisioned Profile
                    </Button>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN (1/3 = 33%) — Decision Desk */}
        <div className="space-y-6">

          {/* Decision Actions Desk */}
          <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-700" />
              <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Decision Desk</h3>
            </div>
            <CardContent className="p-6 space-y-4">

              {application.status === "APPROVED" ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="text-xs font-semibold text-emerald-900">Application Approved</p>
                  <p className="text-xs text-emerald-700 font-normal">
                    The owner account has been provisioned and welcome instructions were emailed.
                  </p>
                  <Button
                    onClick={() => router.push(`/dashboard/admin/users?search=${application.email}`)}
                    className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-xs cursor-pointer border-none"
                  >
                    Manage Owner User
                  </Button>
                </div>
              ) : application.status === "REJECTED" ? (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center space-y-2">
                  <XCircle className="h-8 w-8 text-rose-500 mx-auto" />
                  <p className="text-xs font-semibold text-rose-900">Application Rejected</p>
                  {application.rejectionReason && (
                    <p className="text-xs text-rose-700 font-normal bg-white/80 p-2.5 rounded-xl border border-rose-200 text-left">
                      <strong>Reason:</strong> {application.rejectionReason}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleMarkUnderReview}
                    disabled={actionLoading}
                    className="w-full mt-2 text-xs font-medium text-[#1D1D1F] border-slate-200 bg-white hover:bg-slate-50 rounded-xl cursor-pointer shadow-2xs"
                  >
                    Re-open &amp; Mark Under Review
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-[#6E6E73] font-normal leading-relaxed">
                    Review candidate credentials and select an authorization action:
                  </p>

                  {/* Primary Approve Button */}
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Approve &amp; Create Account
                      </>
                    )}
                  </Button>

                  {/* Secondary Under Review Button */}
                  {application.status !== "UNDER_REVIEW" && (
                    <Button
                      variant="outline"
                      onClick={handleMarkUnderReview}
                      disabled={actionLoading}
                      className="w-full h-9 border-slate-200 bg-white text-[#1D1D1F] hover:bg-slate-50 font-medium text-xs rounded-xl shadow-2xs cursor-pointer"
                    >
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Mark Under Review
                    </Button>
                  )}

                  {/* Danger Reject Button */}
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="w-full h-9 border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100 font-medium text-xs rounded-xl shadow-2xs cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1.5 text-rose-600" /> Reject Application
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>

          {/* Internal Admin Notes Card */}
          <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">Internal Admin Notes</h3>
              </div>
            </div>
            <CardContent className="p-6 space-y-3">
              <Textarea
                rows={4}
                placeholder="Write internal notes about background checks, phone call verification, or portfolio details..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 text-[#1D1D1F] font-normal text-xs p-3 shadow-2xs focus:outline-none focus:border-slate-400 resize-none"
              />
              <Button
                size="sm"
                onClick={handleSaveNotesOnly}
                disabled={savingNotes}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl h-9 border-none shadow-xs cursor-pointer"
              >
                {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Notes"}
              </Button>
            </CardContent>
          </Card>

        </div>

      </div>

      {/* Reject Application Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <XCircle className="h-5 w-5" /> Reject Owner Application
              </div>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                Select the primary reason for rejecting <strong className="text-slate-900">{application.name}</strong>. An email notification will be dispatched.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Rejection Reason *</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold px-3 focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Additional Context / Note (Optional)</label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Portfolio of 1 unit does not meet minimum enterprise threshold..."
                  value={customRejectionNote}
                  onChange={(e) => setCustomRejectionNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 text-slate-800 font-medium text-xs p-2.5"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 rounded-xl font-bold text-slate-700 h-10 border-slate-200 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="flex-1 rounded-xl font-medium bg-red-600 hover:bg-red-700 text-white h-10 text-xs"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
