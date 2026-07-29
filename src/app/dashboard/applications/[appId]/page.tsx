"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, XCircle, FileText, User, Building, PhoneCall, Briefcase, Calendar, Paperclip, ExternalLink, Download } from "lucide-react";
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
        // Use the individual GET endpoint which returns all fields including documents[]
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
    return <div className="p-10 text-center font-bold text-[#6E6E73]">Loading Application...</div>;
  }
  if (!app) return null;

  return (
    <div className="w-full max-w-5xl mx-auto pt-6 space-y-6 pb-24 px-4 sm:px-0">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 sm:p-8 rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
        <div className="flex flex-col gap-2">
          <Link href="/dashboard/tenants/applications" className="text-xs font-bold text-[#8E8E93] hover:text-blue-600 flex items-center gap-2 mb-1 transition-colors w-fit uppercase tracking-widest">
            <ArrowLeft className="h-4 w-4" /> Back to Applications
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Application Details</h1>
            <Badge className={`border-0 rounded-lg px-3 py-1 font-bold text-xs shadow-sm ${
              app.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" :
              app.status === "REJECTED" ? "bg-red-50 text-red-700" :
              "bg-amber-50 text-amber-700"
            }`}>
              {app.status}
            </Badge>
          </div>
          <p className="text-xs font-semibold text-[#8E8E93]">App ID: <span className="font-mono text-[#6E6E73] select-all">{app.id}</span></p>
        </div>

        {app.status === "PENDING" && (
          <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <Button 
              disabled={updating}
              onClick={() => setShowRejectModal(true)}
              className="flex-1 md:flex-none bg-white text-red-600 border border-red-100 hover:bg-red-50 shadow-sm rounded-xl h-11 font-bold px-6 cursor-pointer"
            >
              <XCircle className="h-4 w-4 mr-2" /> Reject
            </Button>
            <Button 
              disabled={updating}
              onClick={() => handleStatusChange("APPROVED")}
              className="flex-1 md:flex-none bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-md shadow-blue-500/10 rounded-xl h-11 font-bold px-6 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
            </Button>
          </div>
        )}

        {app.status === "APPROVED" && (
          <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <Link href={`/dashboard/leases/new?appId=${app.id}`} className="w-full md:w-auto">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 transition-colors text-sm cursor-pointer">
                <FileText className="h-4 w-4" /> Create Lease Draft
              </Button>
            </Link>
          </div>
        )}
      </div>

      {app.status === "REJECTED" && app.rejectionReason && (
        <div className="bg-red-50/50 border border-red-100 rounded-[20px] p-6 flex gap-4">
          <XCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-red-900 text-base mb-1">Rejection Details</h4>
            <p className="text-red-700 text-xs font-semibold leading-relaxed">
              {app.rejectionReason}
            </p>
          </div>
        </div>
      )}

      {/* Top Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Submitted", value: new Date(app.createdAt).toLocaleDateString(), Icon: Calendar, color: "text-blue-500 bg-blue-50" },
          { label: "Target Move-In Date", value: app.moveInDate ? new Date(app.moveInDate).toLocaleDateString() : "Immediate", Icon: Calendar, color: "text-indigo-500 bg-indigo-50" },
          { label: "Requested Duration", value: `${app.leaseDuration} Months`, Icon: Building, color: "text-violet-500 bg-violet-50" },
        ].map((card, i) => (
          <Card key={i} className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[20px] overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
                <card.Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">{card.label}</p>
                <p className="font-extrabold text-slate-800 text-base mt-0.5">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Applicant Info */}
        <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            <h2 className="font-black text-slate-800 text-base">Applicant Info</h2>
          </div>
          <CardContent className="p-6 space-y-4">
            {[
              { label: "Full Name", value: app.name },
              { label: "Email Address", value: app.email },
              { label: "Phone Number", value: app.phone },
              { label: "Expected Occupants", value: `${app.occupantsCount || 1} people` },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">{row.label}</span>
                <span className="font-extrabold text-slate-800 text-sm">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Target Property */}
        <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2">
              <Building className="h-5 w-5 text-indigo-500" />
              <h2 className="font-black text-slate-800 text-base">Target Property</h2>
            </div>
            <CardContent className="p-6 space-y-4">
              {[
                { label: "Property Name", value: app.unit?.property?.name || "N/A" },
                { label: "Selected Unit", value: app.unit?.name || "N/A" },
                { label: "Proposed Rent", value: `$${Number(app.unit?.rentAmount || 0).toLocaleString()}/mo` },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                  <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">{row.label}</span>
                  <span className="font-extrabold text-slate-800 text-sm">{row.value}</span>
                </div>
              ))}
            </CardContent>
          </div>
          <div className="p-6 pt-0 mt-auto">
            {app.unit?.property?.id && (
              <Link href={`/dashboard/properties/${app.unit.property.id}`}>
                <Button variant="outline" className="w-full font-bold border-slate-200 text-slate-700 bg-white hover:bg-[#F5F5F7] shadow-sm rounded-xl h-11 cursor-pointer">
                  View Property Portfolio
                </Button>
              </Link>
            )}
          </div>
        </Card>

        {/* Financial & Employment */}
        <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-violet-500" />
            <h2 className="font-black text-slate-800 text-base">Employment & Income</h2>
          </div>
          <CardContent className="p-6 space-y-4">
            {[
              { label: "Employer Name", value: app.employerName || "Not Provided" },
              { label: "Job Title", value: app.jobTitle || "Not Provided" },
              { label: "Monthly Income", value: app.monthlyIncome ? `$${Number(app.monthlyIncome).toLocaleString()}` : "Not Provided" },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">{row.label}</span>
                <span className="font-extrabold text-slate-800 text-sm">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Guarantor Info (Conditional) */}
        {app.hasGuarantor ? (
          <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2">
              <User className="h-5 w-5 text-amber-500" />
              <h2 className="font-black text-slate-800 text-base">Guarantor Information</h2>
            </div>
            <CardContent className="p-6 space-y-4">
              {[
                { label: "Guarantor Name", value: app.guarantorName || "N/A" },
                { label: "Contact Phone", value: app.guarantorPhone || "N/A" },
                { label: "Contact Email", value: app.guarantorEmail || "N/A" },
                { label: "Monthly Income", value: app.guarantorIncome ? `$${Number(app.guarantorIncome).toLocaleString()}/mo` : "N/A" },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                  <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">{row.label}</span>
                  <span className="font-extrabold text-slate-800 text-sm">{row.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          /* Landlord Reference */
          <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-[#007AFF]" />
              <h2 className="font-black text-slate-800 text-base">Landlord Reference</h2>
            </div>
            <CardContent className="p-6 space-y-4">
              {[
                { label: "Landlord Name", value: app.prevLandlordName || "N/A" },
                { label: "Contact Phone", value: app.prevLandlordPhone || "N/A" },
                { label: "Contact Email", value: app.prevLandlordEmail || "N/A" },
                { label: "Reason for Moving", value: app.reasonForMoving || "N/A" },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                  <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">{row.label}</span>
                  <span className="font-extrabold text-slate-800 text-sm">{row.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact */}
        <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-emerald-500" />
            <h2 className="font-black text-slate-800 text-base">Emergency Contact</h2>
          </div>
          <CardContent className="p-6 space-y-4">
            {[
              { label: "Contact Name", value: app.emergencyContactName || "N/A" },
              { label: "Phone Number", value: app.emergencyContactPhone || "N/A" },
              { label: "Relationship", value: app.emergencyContactRelation || "N/A" },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">{row.label}</span>
                <span className="font-extrabold text-slate-800 text-sm">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Compliance, Consents & Parking */}
        <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#007AFF]" />
            <h2 className="font-black text-slate-800 text-base">Compliance & Parking</h2>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">Pets Allowed Count</span>
              <span className="font-extrabold text-slate-800 text-sm">{app.petsCount || 0} pets</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">Pet Details</span>
              <span className="font-extrabold text-slate-800 text-sm">{app.petDetails || "None"}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">Parking Vehicle</span>
              <span className="font-extrabold text-slate-800 text-sm">{app.vehicleInfo || "No Vehicles"}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className={`p-3 rounded-xl border flex flex-col justify-between gap-1.5 ${
                app.backgroundCheckConsent ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {app.backgroundCheckConsent ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-800">Background Ok</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-800">No Background</span>
                    </>
                  )}
                </div>
                <span className="text-[10px] text-[#8E8E93] font-semibold leading-tight">Consent for background & credit checks.</span>
              </div>

              <div className={`p-3 rounded-xl border flex flex-col justify-between gap-1.5 ${
                app.agreedToTerms ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {app.agreedToTerms ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-800">Agreed to Terms</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-800">Not Agreed</span>
                    </>
                  )}
                </div>
                <span className="text-[10px] text-[#8E8E93] font-semibold leading-tight">Applicant certification correctness confirmation.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supporting Documents Vault */}
        <Card className="bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden md:col-span-2">
          <div className="p-6 border-b border-slate-100 bg-slate-50/20 flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-indigo-500" />
            <h2 className="font-black text-slate-800 text-base">Supporting Documents</h2>
            <span className="ml-auto text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-3 py-1 rounded-lg">
              {(app.idDocumentUrl ? 1 : 0) + (app.incomeProofUrl ? 1 : 0)} Files Verified
            </span>
          </div>
          <CardContent className="p-6">
            {!app.idDocumentUrl && !app.incomeProofUrl ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3 border border-slate-100">
                  <Paperclip className="h-6 w-6 text-[#8E8E93]" />
                </div>
                <p className="font-bold text-[#1D1D1F] text-sm">No documents uploaded</p>
                <p className="text-xs text-[#6E6E73] mt-1">The applicant did not attach any supporting documents.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {app.idDocumentUrl && (
                  <div className="flex flex-col gap-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-purple-50">
                        <FileText className="h-5 w-5 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">Government ID</p>
                        <p className="text-xs text-[#8E8E93] font-semibold mt-0.5">Uploaded ID Verification Card</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <a href={app.idDocumentUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-white border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" /> View ID
                      </a>
                      <a href={app.idDocumentUrl} download className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-[#F5F5F7] transition-colors">
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    </div>
                  </div>
                )}
                {app.incomeProofUrl && (
                  <div className="flex flex-col gap-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50">
                        <FileText className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">Proof of Income</p>
                        <p className="text-xs text-[#8E8E93] font-semibold mt-0.5">Pay stubs & Tax Returns</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <a href={app.incomeProofUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-white border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" /> View Proof
                      </a>
                      <a href={app.incomeProofUrl} download className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-[#F5F5F7] transition-colors">
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
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
