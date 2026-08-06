"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Building2,
  PhoneCall,
  Briefcase,
  Paperclip,
  ExternalLink,
  Download,
  ShieldCheck,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { ReasonModal } from "@/components/ui/ReasonModal";

export default function ApplicationDetailsPage() {
  const { appId } = useParams();
  const router = useRouter();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const handleStatusChange = async (newStatus: string, reason = "") => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Application ${newStatus.toLowerCase()} successfully!`);
        setApp((prev: any) => ({ ...prev, status: newStatus }));
        if (data.redirectUrl) {
          router.push(data.redirectUrl);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update application status.");
      }
    } catch (err) {
      toast.error("Error updating application status.");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const res = await fetch(`/api/applications/${appId}`);
        if (res.ok) {
          const data = await res.json();
          setApp(data);
        } else {
          toast.error("Application not found");
          router.push("/dashboard/tenants/applications");
        }
      } catch (err) {
        toast.error("Error loading application");
      } finally {
        setLoading(false);
      }
    };
    if (appId) fetchApp();
  }, [appId, router]);

  if (loading) {
    return (
      <div className="p-12 text-center font-bold text-slate-500 flex flex-col items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
        Loading Application Dossier...
      </div>
    );
  }
  if (!app) return null;

  const rentAmount = Number(app.unit?.rentAmount || 0);
  const monthlyIncome = Number(app.monthlyIncome || 0);
  const incomeRatio = rentAmount > 0 && monthlyIncome > 0 ? (monthlyIncome / rentAmount).toFixed(1) : null;

  return (
    <div className="w-full max-w-4xl mx-auto pt-2 space-y-6 pb-24 px-4 sm:px-0 font-sans">
      
      {/* Header Action Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/tenants/applications"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
            title="Back to Applications"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight leading-none">
                {app.name}
              </h1>
              <Badge
                className={`rounded-lg px-2.5 py-0.5 font-extrabold text-[10px] uppercase shadow-xs border ${
                  app.status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : app.status === "REJECTED"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {app.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Applying for {app.unit?.property?.name || "Property"} — {app.unit?.name || "Unit"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => window.print()}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>

          {app.status === "PENDING" && (
            <>
              <Button
                disabled={updating}
                onClick={() => setShowRejectModal(true)}
                className="bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 shadow-xs rounded-xl h-9 font-bold px-4 text-xs cursor-pointer"
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
              </Button>
              <Button
                disabled={updating}
                onClick={() => handleStatusChange("APPROVED")}
                className="bg-slate-900 hover:bg-slate-800 text-white shadow-xs rounded-xl h-9 font-bold px-5 text-xs cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve
              </Button>
            </>
          )}

          {app.status === "APPROVED" && (
            <Link href={`/dashboard/leases/new?appId=${app.id}`}>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-xs text-xs cursor-pointer">
                <FileText className="h-3.5 w-3.5" /> Create Lease
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Rejection Notice Banner */}
      {app.status === "REJECTED" && app.rejectionReason && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 flex gap-3 items-start">
          <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-rose-900 text-sm mb-0.5">Rejection Decision Log</h4>
            <p className="text-rose-800 text-xs font-semibold leading-relaxed">
              {app.rejectionReason}
            </p>
          </div>
        </div>
      )}

      {/* ── SINGLE UNIFIED APPLICATION DOSSIER DOCUMENT ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-10">
        
        {/* Document Header Banner */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-slate-500 tracking-wider mb-1">
              <Building2 className="h-3.5 w-3.5 text-slate-700" />
              Official Rental Application Dossier
            </div>
            <h2 className="text-3xl font-semibold text-slate-900 tracking-tight">
              {app.name}
            </h2>
            <p className="text-xs text-[#6E6E73] font-normal mt-1">
              Submitted on <span className="text-slate-900 font-extrabold">{new Date(app.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span> • Ref: <span className="font-mono text-slate-700 select-all">{app.id}</span>
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 px-4 flex items-center gap-6 text-xs shrink-0 w-full sm:w-auto">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Unit</span>
              <span className="font-semibold text-slate-900">{app.unit?.property?.name} ({app.unit?.name})</span>
            </div>
            <div className="border-l border-slate-200 pl-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Rent</span>
              <span className="font-semibold text-slate-900">${rentAmount.toLocaleString()}/mo</span>
            </div>
          </div>
        </div>

        {/* Executive Summary Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Move-In</span>
            <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
              {app.moveInDate ? new Date(app.moveInDate).toLocaleDateString() : "Immediate"}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lease Duration</span>
            <span className="font-semibold text-slate-900 text-sm mt-0.5 block">{app.leaseDuration} Months</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Occupants</span>
            <span className="font-semibold text-slate-900 text-sm mt-0.5 block">{app.occupantsCount || 1} Person(s)</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Income Ratio</span>
            <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
              {incomeRatio ? `${incomeRatio}x Rent` : "N/A"}
            </span>
          </div>
        </div>

        {/* ── SECTION 1: APPLICANT PERSONAL PROFILE ── */}
        <div className="space-y-4 pt-2">
          {/* Distinct Section Header Banner */}
          <div className="bg-slate-100/90 border border-slate-200/90 p-3 px-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-900" />
              <h3 className="text-xs font-semibold uppercase text-slate-900 tracking-wider">
                1. Applicant Contact & Emergency Details
              </h3>
            </div>
            <span className="text-[10px] font-extrabold uppercase text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
              Section 1 of 5
            </span>
          </div>

          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                <span className="font-semibold text-slate-900 text-sm">{app.name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                <span className="font-bold text-slate-800">{app.email}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                <span className="font-bold text-slate-800">{app.phone}</span>
              </div>
            </div>

            <div className="border-t border-slate-200/80 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emergency Contact Name</span>
                <span className="font-bold text-slate-900">{app.emergencyContactName || "Not Provided"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emergency Phone</span>
                <span className="font-bold text-slate-900">{app.emergencyContactPhone || "Not Provided"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Relationship</span>
                <span className="font-bold text-slate-900">{app.emergencyContactRelation || "Not Provided"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* ── SECTION 2: FINANCIAL & EMPLOYMENT VERIFICATION ── */}
        <div className="space-y-4">
          <div className="bg-slate-100/90 border border-slate-200/90 p-3 px-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-900" />
              <h3 className="text-xs font-semibold uppercase text-slate-900 tracking-wider">
                2. Financial & Employment Profile
              </h3>
            </div>
            <span className="text-[10px] font-extrabold uppercase text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
              Section 2 of 5
            </span>
          </div>

          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Employer / Business</span>
              <span className="font-semibold text-slate-900 text-sm">{app.employerName || "Not Provided"}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Job Title</span>
              <span className="font-bold text-slate-800">{app.jobTitle || "Not Provided"}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gross Monthly Income</span>
              <span className="font-semibold text-slate-900 text-sm">
                {monthlyIncome > 0 ? `$${monthlyIncome.toLocaleString()}` : "Not Provided"}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* ── SECTION 3: GUARANTOR OR RENTAL HISTORY ── */}
        <div className="space-y-4">
          <div className="bg-slate-100/90 border border-slate-200/90 p-3 px-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-slate-900" />
              <h3 className="text-xs font-semibold uppercase text-slate-900 tracking-wider">
                3. {app.hasGuarantor ? "Guarantor Information" : "Previous Landlord Reference"}
              </h3>
            </div>
            <span className="text-[10px] font-extrabold uppercase text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
              Section 3 of 5
            </span>
          </div>

          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 sm:p-6">
            {app.hasGuarantor ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Guarantor Name</span>
                  <span className="font-semibold text-slate-900">{app.guarantorName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Phone</span>
                  <span className="font-bold text-slate-800">{app.guarantorPhone || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Email</span>
                  <span className="font-bold text-slate-800 truncate block">{app.guarantorEmail || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Income</span>
                  <span className="font-semibold text-slate-900">
                    {app.guarantorIncome ? `$${Number(app.guarantorIncome).toLocaleString()}/mo` : "N/A"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Landlord Name</span>
                  <span className="font-semibold text-slate-900">{app.prevLandlordName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Phone</span>
                  <span className="font-bold text-slate-800">{app.prevLandlordPhone || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Email</span>
                  <span className="font-bold text-slate-800 truncate block">{app.prevLandlordEmail || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reason for Moving</span>
                  <span className="font-semibold text-slate-700">{app.reasonForMoving || "N/A"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* ── SECTION 4: PETS, PARKING & COMPLIANCE CERTIFICATIONS ── */}
        <div className="space-y-4">
          <div className="bg-slate-100/90 border border-slate-200/90 p-3 px-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-900" />
              <h3 className="text-xs font-semibold uppercase text-slate-900 tracking-wider">
                4. Pets, Vehicles & Legal Consents
              </h3>
            </div>
            <span className="text-[10px] font-extrabold uppercase text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
              Section 4 of 5
            </span>
          </div>

          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Pets Count:</span>
                <span className="font-semibold text-slate-900">{app.petsCount || 0} pet(s)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Pet Details:</span>
                <span className="font-bold text-slate-800">{app.petDetails || "None"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Registered Vehicle:</span>
                <span className="font-bold text-slate-800">{app.vehicleInfo || "No Vehicles"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                app.backgroundCheckConsent ? "bg-emerald-50/80 border-emerald-200" : "bg-rose-50/80 border-rose-200"
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {app.backgroundCheckConsent ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-900">Background Ok</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-rose-600" />
                      <span className="text-rose-900">No Consent</span>
                    </>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-tight mt-1">Background & credit check authorized.</span>
              </div>

              <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                app.agreedToTerms ? "bg-emerald-50/80 border-emerald-200" : "bg-rose-50/80 border-rose-200"
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {app.agreedToTerms ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-900">Agreed Terms</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-rose-600" />
                      <span className="text-rose-900">Not Agreed</span>
                    </>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-tight mt-1">Certified info is true & correct.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* ── SECTION 5: SUPPORTING VERIFICATION DOCUMENTS ── */}
        <div className="space-y-4">
          <div className="bg-slate-100/90 border border-slate-200/90 p-3 px-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-slate-900" />
              <h3 className="text-xs font-semibold uppercase text-slate-900 tracking-wider">
                5. Attached Verification Documents
              </h3>
            </div>
            <span className="text-[10px] font-extrabold uppercase text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
              Section 5 of 5
            </span>
          </div>

          <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 sm:p-6">
            {(() => {
              // Infer employment status from jobTitle field (set during form submission)
              const jobTitleRaw = (app.jobTitle || "").toUpperCase();
              const isStudent = jobTitleRaw === "STUDENT";
              const isUnemployed = jobTitleRaw === "UNEMPLOYED";

              // Build document card list
              const docCards: { url: string; title: string; subtitle: string }[] = [];

              if (app.idDocumentUrl) {
                docCards.push({
                  url: app.idDocumentUrl,
                  title: "Government ID",
                  subtitle: "ID Card / Passport",
                });
              }

              if (app.incomeProofUrl) {
                docCards.push({
                  url: app.incomeProofUrl,
                  title: isStudent
                    ? "Proof of Student Enrollment"
                    : isUnemployed
                    ? "Proof of Assets / Bank Statement"
                    : "Proof of Income",
                  subtitle: isStudent
                    ? "Student ID / Enrollment Letter"
                    : isUnemployed
                    ? "Bank Statement / Asset Proof"
                    : "Pay Stubs / Tax Returns",
                });
              }

              // Guarantor documents — stored in documents[] at index 2 & 3
              if (app.hasGuarantor && Array.isArray(app.documents)) {
                const guarantorDocs = app.documents.filter(
                  (d: string) => d && d !== app.idDocumentUrl && d !== app.incomeProofUrl
                );
                if (guarantorDocs[0]) {
                  docCards.push({
                    url: guarantorDocs[0],
                    title: "Guarantor — Government ID",
                    subtitle: `${app.guarantorName || "Guarantor"} — ID Card / Passport`,
                  });
                }
                if (guarantorDocs[1]) {
                  docCards.push({
                    url: guarantorDocs[1],
                    title: "Guarantor — Proof of Income",
                    subtitle: `${app.guarantorName || "Guarantor"} — Pay Stubs / Tax Returns`,
                  });
                }
              }

              if (docCards.length === 0) {
                return (
                  <div className="p-6 text-center text-slate-500 text-xs font-semibold">
                    No supporting files attached with this application.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {docCards.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-900 truncate">{doc.title}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">{doc.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-800 transition-colors"
                          title="View Document"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <a
                          href={doc.url}
                          download
                          className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-800 transition-colors"
                          title="Download Document"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

      </div>

      <ReasonModal
        open={showRejectModal}
        onOpenChange={setShowRejectModal}
        title="Reject Application"
        description="Please provide a reason for rejecting this application. This reason will be emailed to the applicant."
        placeholder="Reason for rejection..."
        onConfirm={(reason) => handleStatusChange("REJECTED", reason)}
      />
    </div>
  );
}
