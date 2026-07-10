"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, XCircle, FileText, User, Building, PhoneCall, Briefcase, Calendar, Paperclip, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";

export default function ApplicationDetailsPage() {
  const { appId } = useParams();
  const router = useRouter();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    let reason = "";
    if (newStatus === "REJECTED") {
      const input = window.prompt("Please provide a reason for rejecting this application (this will be emailed to the applicant):");
      if (input === null) return; // User cancelled
      reason = input.trim();
    }
    
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
    return <div className="p-10 text-center font-bold text-[#64748B]">Loading Application...</div>;
  }
  if (!app) return null;

  return (
    <div className="w-full max-w-5xl mx-auto pt-6 space-y-6 pb-24">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-col gap-2">
          <Link href="/dashboard/tenants/applications" className="text-sm font-bold text-[#64748B] hover:text-[#3B82F6] flex items-center gap-2 mb-2 transition-colors w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to Applications
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Application Details</h1>
            <Badge className={`border-0 rounded-lg px-3 py-1 font-bold shadow-sm ${
              app.status === "APPROVED" ? "bg-[#DCFCE7] text-[#16A34A]" :
              app.status === "REJECTED" ? "bg-[#FEE2E2] text-[#EF4444]" :
              "bg-[#FEF9C3] text-[#CA8A04]"
            }`}>
              {app.status}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-[#64748B]">App ID: {app.id}</p>
        </div>

        {app.status === "PENDING" && (
          <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <Button 
              disabled={updating}
              onClick={() => handleStatusChange("REJECTED")}
              className="flex-1 md:flex-none bg-white text-red-500 border border-red-200 hover:bg-red-50 shadow-sm rounded-xl h-11 font-bold px-6"
            >
              <XCircle className="h-4 w-4 mr-2" /> Reject
            </Button>
            <Button 
              disabled={updating}
              onClick={() => handleStatusChange("APPROVED")}
              className="flex-1 md:flex-none bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm rounded-xl h-11 font-bold px-6"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
            </Button>
          </div>
        )}

        {app.status === "APPROVED" && (
          <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <Link href={`/dashboard/leases/new?appId=${app.id}`}>
              <Button className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-bold h-11 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors text-sm">
                <FileText className="h-4 w-4" /> Create Lease Draft
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#64748B] uppercase">Submitted</p>
              <p className="font-extrabold text-[#0F172A] text-base">{new Date(app.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#64748B] uppercase">Target Move-In Date</p>
              <p className="font-extrabold text-[#0F172A] text-base">{app.moveInDate ? new Date(app.moveInDate).toLocaleDateString() : "Immediate"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shrink-0">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#64748B] uppercase">Requested Duration</p>
              <p className="font-extrabold text-[#0F172A] text-base">{app.leaseDuration} Months</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
            <User className="h-5 w-5 text-[#3B82F6]" />
            <h2 className="font-bold text-[#0F172A] text-lg">Applicant Info</h2>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Full Name</div>
              <div className="font-semibold text-[#0F172A]">{app.name}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Email</div>
              <div className="font-semibold text-[#0F172A]">{app.email}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Phone</div>
              <div className="font-semibold text-[#0F172A]">{app.phone}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-sm font-bold text-[#64748B]">Occupants</div>
              <div className="font-semibold text-[#0F172A]">{app.occupantsCount || 1} people</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
            <Building className="h-5 w-5 text-[#3B82F6]" />
            <h2 className="font-bold text-[#0F172A] text-lg">Target Property</h2>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Property Name</div>
              <div className="font-semibold text-[#0F172A]">{app.unit?.property?.name || "N/A"}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Unit</div>
              <div className="font-semibold text-[#0F172A]">{app.unit?.name || "N/A"}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Rent Amount</div>
              <div className="font-semibold text-[#0F172A]">${Number(app.unit?.rentAmount || 0).toFixed(2)}/mo</div>
            </div>
            <Link href={`/dashboard/properties/${app.unit?.property?.id}`}>
              <Button variant="outline" className="w-full font-bold border-[#E2E8F0] mt-2">View Property</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Financial & Employment Info */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#3B82F6]" />
            <h2 className="font-bold text-[#0F172A] text-lg">Employment & Income</h2>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Employer Name</div>
              <div className="font-semibold text-[#0F172A]">{app.employerName || "Not Provided"}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Job Title</div>
              <div className="font-semibold text-[#0F172A]">{app.jobTitle || "Not Provided"}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-sm font-bold text-[#64748B]">Monthly Income</div>
              <div className="font-semibold text-[#0F172A]">
                {app.monthlyIncome ? `$${Number(app.monthlyIncome).toLocaleString()}` : "Not Provided"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Previous Landlord Reference */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-[#3B82F6]" />
            <h2 className="font-bold text-[#0F172A] text-lg">Landlord Reference</h2>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Landlord Name</div>
              <div className="font-semibold text-[#0F172A]">{app.prevLandlordName || "N/A"}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Contact Info</div>
              <div className="font-semibold text-[#0F172A]">
                {app.prevLandlordPhone || app.prevLandlordEmail
                  ? `${app.prevLandlordPhone || ""} ${app.prevLandlordEmail ? `(${app.prevLandlordEmail})` : ""}`
                  : "N/A"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-sm font-bold text-[#64748B]">Reason for Moving</div>
              <div className="font-semibold text-[#0F172A]">{app.reasonForMoving || "N/A"}</div>
            </div>
          </CardContent>
        </Card>

        {/* Pets & Vehicles */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden md:col-span-2">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#3B82F6]" />
            <h2 className="font-bold text-[#0F172A] text-lg">Compliance, Pets & Parking</h2>
          </div>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
                <div className="text-sm font-bold text-[#64748B]">Pets Count</div>
                <div className="font-semibold text-[#0F172A]">{app.petsCount || 0} pets</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm font-bold text-[#64748B]">Pet Details</div>
                <div className="font-semibold text-[#0F172A]">{app.petDetails || "None"}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 pb-4">
                <div className="text-sm font-bold text-[#64748B]">Vehicle Info</div>
                <div className="font-semibold text-[#0F172A]">{app.vehicleInfo || "No Vehicles"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supporting Documents */}
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden md:col-span-2">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-[#3B82F6]" />
            <h2 className="font-bold text-[#0F172A] text-lg">Supporting Documents</h2>
            <span className="ml-auto text-xs font-bold text-[#64748B] bg-slate-100 px-2.5 py-1 rounded-full">
              {Array.isArray(app.documents) ? app.documents.length : 0} file{Array.isArray(app.documents) && app.documents.length !== 1 ? "s" : ""}
            </span>
          </div>
          <CardContent className="p-6">
            {Array.isArray(app.documents) && app.documents.length > 0 ? (
              <div className="flex flex-col gap-3">
                {app.documents.map((url: string, idx: number) => {
                  const fileName = url.split("/").pop()?.split("?")[0] || `Document ${idx + 1}`;
                  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
                  const isPdf = /\.pdf$/i.test(url);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                    >
                      {/* Icon */}
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isImage ? "bg-purple-50" : isPdf ? "bg-red-50" : "bg-blue-50"
                      }`}>
                        <FileText className={`h-5 w-5 ${
                          isImage ? "text-purple-500" : isPdf ? "text-red-500" : "text-blue-500"
                        }`} />
                      </div>
                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#0F172A] truncate">{decodeURIComponent(fileName)}</p>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          {isImage ? "Image" : isPdf ? "PDF Document" : "Document"} · Uploaded by applicant
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Open
                        </a>
                        <a
                          href={url}
                          download
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                  <Paperclip className="h-6 w-6 text-slate-400" />
                </div>
                <p className="font-bold text-[#0F172A] text-sm">No documents uploaded</p>
                <p className="text-xs text-[#64748B] mt-1">The applicant did not attach any supporting documents.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
