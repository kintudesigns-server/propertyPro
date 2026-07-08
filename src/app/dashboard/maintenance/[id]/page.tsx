"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wrench, Clock, Calendar, CheckCircle2, User, Home, Building, FileText, X, Camera } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { DispatchVendorModal } from "@/components/maintenance/DispatchVendorModal";

export default function MaintenanceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const { data: session } = useSession();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState<string>("");

  const fetchTicket = () => {
    setLoading(true);
    fetch(`/api/maintenance?id=${id}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setRequest(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: request.id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(`Request status updated to ${newStatus}`);
      fetchTicket();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#64748B] font-semibold">Loading ticket details...</div>;
  }

  if (!request) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#0F172A]">Ticket Not Found</h2>
        <Link href="/dashboard/maintenance">
          <Button variant="outline">Back to Requests</Button>
        </Link>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "EMERGENCY": return "bg-red-100 text-red-700 border-red-200";
      case "HIGH": return "bg-orange-100 text-orange-700 border-orange-200";
      case "MEDIUM": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "LOW": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED": return "bg-blue-100 text-blue-700";
      case "ASSIGNED": return "bg-purple-100 text-purple-700";
      case "RESOLVED": return "bg-green-100 text-green-700";
      case "CLOSED": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="h-10 w-10 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] shadow-sm transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Request Details</h1>
          <p className="text-sm font-medium text-[#64748B] mt-0.5">Ticket ID: {request.id.split("-")[0]}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200 overflow-hidden">
            {/* Beautiful Gradient Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/20 text-white backdrop-blur-md border border-white/10 shadow-sm">
                      {request.category}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm border ${
                      request.priority === "EMERGENCY" ? "bg-red-500/80 text-white border-red-400/50" :
                      request.priority === "HIGH" ? "bg-orange-500/80 text-white border-orange-400/50" :
                      "bg-white/20 text-white border-white/10"
                    }`}>
                      {request.priority} PRIORITY
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm border ${
                      request.status === "SUBMITTED" ? "bg-blue-400/30 text-blue-50 border-blue-300/30" :
                      request.status === "ASSIGNED" ? "bg-purple-500/80 text-white border-purple-400/50" :
                      request.status === "RESOLVED" ? "bg-emerald-500/80 text-white border-emerald-400/50" :
                      "bg-slate-500/80 text-white border-slate-400/50"
                    }`}>
                      STATUS: {request.status}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black tracking-tight">{request.title}</h2>
                </div>
                <div className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
                  <Wrench className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">

              <div className="">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Issue Description
                </h3>
                <p className="text-[15px] font-medium text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm whitespace-pre-wrap">
                  {request.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5">
                  <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Preferred Schedule
                  </h3>
                  <p className="text-[15px] font-bold text-blue-900 leading-tight">
                    {request.preferredTimes || "No preferred times specified"}
                  </p>
                </div>
                <div className={`${request.entryPermission ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'} border rounded-2xl p-5`}>
                  <h3 className={`text-[11px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${request.entryPermission ? 'text-emerald-500' : 'text-rose-400'}`}>
                    <Home className="h-4 w-4" /> Entry Permission
                  </h3>
                  <p className={`text-[15px] font-bold leading-tight ${request.entryPermission ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {request.entryPermission ? "✅ Granted (Can enter if not home)" : "❌ Must be home"}
                  </p>
                </div>
              </div>
              
              {request.photos && request.photos.length > 0 && (
                <div className="pt-4">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Attached Evidence
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {request.photos.map((photo: string, i: number) => (
                      <a key={i} href={photo} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <img src={photo} alt="Issue photo" className="h-32 w-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

            {/* Financial Approval Block for Owner */}
            {(session?.user as any)?.role === "OWNER" && request.status === "AWAITING_APPROVAL" && (
              <div className="p-5 bg-orange-50 border border-orange-200 rounded-xl mt-6">
                <h3 className="font-bold text-orange-900 mb-2">Estimate Requires Approval</h3>
                <p className="text-sm text-orange-800 mb-4">The inspector has submitted a repair estimate. You must approve it before work can begin.</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white p-3 rounded-lg border border-orange-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">Est. Labor</p>
                    <p className="font-black text-lg text-slate-900">${request.estimatedLabor || "0.00"}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-orange-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">Est. Materials</p>
                    <p className="font-black text-lg text-slate-900">${request.estimatedMaterials || "0.00"}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => handleUpdateStatus("APPROVED")} disabled={processing} className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
                    Approve Work & Budget
                  </Button>
                  <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">Reject Estimate</Button>
                </div>
              </div>
            )}

            {/* Tenant Satisfaction block */}
            {(session?.user as any)?.role === "TENANT" && request.status === "PENDING_TENANT_CONFIRMATION" && (
              <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl mt-6">
                <h3 className="font-bold text-blue-950 mb-2">Confirm Repair Completion</h3>
                <p className="text-sm text-blue-800 mb-4">The technician has marked the issue as fixed. Please confirm if everything is resolved to your satisfaction.</p>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Rate your experience (1 to 5 stars)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-bold border transition-all ${
                            rating === star ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {star}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Feedback (Optional)</label>
                    <textarea
                      className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white"
                      placeholder="e.g. Technician was polite and clean..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={async () => {
                        setProcessing(true);
                        try {
                          const res = await fetch("/api/maintenance", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: request.id,
                              status: "CLOSED",
                              tenantRating: rating,
                              tenantFeedback: feedback
                            }),
                          });
                          if (!res.ok) throw new Error("Failed to close request");
                          fetchTicket();
                        } catch (err: any) {
                          toast.error(err.message);
                        } finally {
                          setProcessing(false);
                        }
                      }}
                      disabled={processing}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      Yes, it's fixed!
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setProcessing(true);
                        try {
                          const res = await fetch("/api/maintenance", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: request.id,
                              status: "ASSIGNED",
                              inspectorNotes: "Tenant reported the issue is still broken."
                            }),
                          });
                          if (!res.ok) throw new Error("Failed to reopen request");
                          fetchTicket();
                        } catch (err: any) {
                          toast.error(err.message);
                        } finally {
                          setProcessing(false);
                        }
                      }}
                      disabled={processing}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      No, it's still broken
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Chargeback & Vendor Expense Block for Owner */}
            {(session?.user as any)?.role === "OWNER" && (request.status === "PENDING_TENANT_CONFIRMATION" || request.status === "CLOSED") && (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl mt-6 space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-600" /> Cost & Liability Control
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase font-bold">Labor Cost</p>
                    <p className="font-black text-lg text-slate-900">${request.finalLabor || request.estimatedLabor || "0.00"}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase font-bold">Materials Cost</p>
                    <p className="font-black text-lg text-slate-900">${request.finalMaterials || request.estimatedMaterials || "0.00"}</p>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Liability Determination</p>
                  <p className="text-sm font-medium text-slate-800">
                    Technician opinion: <span className="font-bold">{request.vendorReportedFault ? "Tenant Negligence" : "Normal Wear & Tear"}</span>
                  </p>
                </div>

                {!request.ownerApprovedChargeback ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-slate-500">If you determine this damage was tenant fault, approving chargeback will automatically generate an invoice of ${(Number(request.finalLabor || 0) + Number(request.finalMaterials || 0)).toFixed(2)} for the tenant.</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          setProcessing(true);
                          try {
                            const res = await fetch("/api/maintenance", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: request.id, ownerApprovedChargeback: true }),
                            });
                            if (!res.ok) throw new Error("Failed to approve chargeback");
                            fetchTicket();
                          } catch (err: any) {
                            toast.error(err.message);
                          } finally {
                            setProcessing(false);
                          }
                        }}
                        disabled={processing}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      >
                        Approve Chargeback to Tenant
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          setProcessing(true);
                          try {
                            const res = await fetch("/api/maintenance", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: request.id, status: "CLOSED" }),
                            });
                            if (!res.ok) throw new Error("Failed to close");
                            fetchTicket();
                          } catch (err: any) {
                            toast.error(err.message);
                          } finally {
                            setProcessing(false);
                          }
                        }}
                        disabled={processing}
                        className="border-slate-200 text-slate-800 hover:bg-slate-100"
                      >
                        Close without Tenant Chargeback
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-between">
                    <span>✓ Tenant Chargeback Approved & Invoiced</span>
                    {request.chargebackInvoiceId && (
                      <Link href={`/dashboard/invoices`} className="underline font-bold hover:text-emerald-950">
                        View Invoice
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>


        {/* Right Column - Meta Data */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200 p-6 space-y-6">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Location & Tenant</h3>
            
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-500">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Property</p>
                  <p className="font-bold text-slate-900 leading-tight mt-0.5">{request.unit.property.name}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-500">
                  <Home className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Unit</p>
                  <p className="font-bold text-slate-900 leading-tight mt-0.5">{request.unit.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-500">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Reported By</p>
                  <p className="font-bold text-slate-900 leading-tight mt-0.5">{request.tenant.name}</p>
                  <p className="text-[11px] font-medium text-slate-500">{request.tenant.phone || request.tenant.email}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-200 p-6 space-y-6">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Assignment Details</h3>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <Wrench className="h-5 w-5 text-[#94A3B8] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#64748B] uppercase">Technician</p>
                  {request.inspector ? (
                    <>
                      <p className="font-semibold text-[#0F172A] text-sm">{request.inspector.name}</p>
                      <p className="text-xs font-medium text-[#64748B]">{request.inspector.phone || "No phone provided"}</p>
                    </>
                  ) : request.externalVendor ? (
                    <>
                      <p className="font-semibold text-blue-600 text-sm flex items-center gap-1"><Wrench className="h-3 w-3" /> {request.externalVendor.name}</p>
                      <p className="text-xs font-medium text-[#64748B]">{request.externalVendor.phone || "No phone provided"}</p>
                    </>
                  ) : (
                    <p className="font-semibold text-[#94A3B8] text-sm italic">Unassigned</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Calendar className="h-5 w-5 text-[#94A3B8] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#64748B] uppercase">Created At</p>
                  <p className="font-semibold text-[#0F172A] text-sm">{format(new Date(request.createdAt), "PPp")}</p>
                </div>
              </div>
              {request.scheduledDate && (
                <div className="flex gap-3">
                  <Clock className="h-5 w-5 text-[#3B82F6] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#64748B] uppercase">Scheduled For</p>
                    <p className="font-semibold text-[#0F172A] text-sm">{format(new Date(request.scheduledDate), "PPp")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vendor Dispatch Section for Owner/Inspector */}
          {((session?.user as any)?.role === "OWNER" || (session?.user as any)?.role === "SUPERADMIN") && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <h3 className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-[#3B82F6]" /> External Vendor Dispatch
                </h3>
              </div>
              <p className="text-xs text-[#64748B]">Automatically notify a 3rd-party vendor (e.g. plumbing company) to handle this request. They will receive a magic link to view details and submit estimates without needing to log in.</p>
              
              <div className="flex gap-2 items-center">
                <DispatchVendorModal ticketId={request.id} onDispatched={fetchTicket} isReassign={!!request.externalVendor} />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 border-[#E2E8F0] text-[#64748B]"
                  onClick={() => {
                    navigator.clipboard.writeText(typeof window !== "undefined" ? `${window.location.origin}/vendor/ticket/${request.vendorMagicToken || ""}` : "");
                    toast.success("Magic link copied to clipboard!");
                  }}
                >
                  Copy Link Manually
                </Button>
              </div>

              {request.externalVendor && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center group">
                  <div>
                    <p className="text-[11px] font-bold text-blue-800 uppercase">Dispatched To</p>
                    <p className="text-sm font-bold text-blue-900">{request.externalVendor.name}</p>
                    <p className="text-xs font-medium text-blue-700">{request.externalVendor.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-blue-200 text-blue-800 text-[10px] font-bold rounded uppercase">Active</span>
                    <button 
                      onClick={async () => {
                        if (!confirm("Are you sure you want to cancel the dispatch for this vendor?")) return;
                        setProcessing(true);
                        try {
                          const res = await fetch("/api/maintenance", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: request.id, externalVendorId: null, status: "SUBMITTED" }),
                          });
                          if (!res.ok) throw new Error("Failed to remove vendor");
                          toast.success("Vendor dispatch cancelled");
                          fetchTicket();
                        } catch (err: any) {
                          toast.error(err.message);
                        } finally {
                          setProcessing(false);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 flex items-center justify-center rounded border border-red-200 bg-white transition-colors"
                      title="Cancel Dispatch"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
