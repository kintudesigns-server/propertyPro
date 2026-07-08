"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wrench, Clock, Calendar, CheckCircle2, AlertTriangle, User, Home, FileText, CheckCircle, ShieldAlert, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

export default function VendorTicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = React.use(params);
  const router = useRouter();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Form states
  const [estimatedLabor, setEstimatedLabor] = useState("");
  const [estimatedMaterials, setEstimatedMaterials] = useState("");
  const [finalLabor, setFinalLabor] = useState("");
  const [finalMaterials, setFinalMaterials] = useState("");
  const [vendorReportedFault, setVendorReportedFault] = useState(false);
  const [inspectorNotes, setInspectorNotes] = useState("");
  const [receiptPhotos, setReceiptPhotos] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");

  const fetchTicket = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendor/ticket?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setRequest(data);
        setEstimatedLabor(data.estimatedLabor || "");
        setEstimatedMaterials(data.estimatedMaterials || "");
        setFinalLabor(data.finalLabor || "");
        setFinalMaterials(data.finalMaterials || "");
        setVendorReportedFault(data.vendorReportedFault || false);
        setInspectorNotes(data.inspectorNotes || "");
        setReceiptPhotos(data.receiptPhotos || []);
        if (data.scheduledDate) {
          // Format date for datetime-local input YYYY-MM-DDThh:mm
          const d = new Date(data.scheduledDate);
          setScheduledDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        }
      } else {
        toast.error("Invalid token or request not found");
      }
    } catch (err) {
      toast.error("Failed to load request");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [token]);

  const handleSubmitEstimate = async () => {
    if (!estimatedLabor || !estimatedMaterials) {
      toast.error("Please fill in both labor and materials estimates");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch("/api/vendor/ticket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          estimatedLabor,
          estimatedMaterials,
          inspectorNotes,
          status: "SUBMIT_ESTIMATE",
        }),
      });

      if (res.ok) {
        toast.success("Estimate submitted successfully!");
        fetchTicket();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit estimate");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!finalLabor || !finalMaterials) {
      toast.error("Please fill in final labor and materials costs");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch("/api/vendor/ticket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          finalLabor,
          finalMaterials,
          vendorReportedFault,
          inspectorNotes,
          receiptPhotos,
          status: "RESOLVED",
        }),
      });

      if (res.ok) {
        toast.success("Ticket marked as completed and pending tenant review!");
        fetchTicket();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update ticket");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-bold">Loading maintenance details...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">Invalid or Expired Link</h2>
          <p className="text-sm text-slate-500">This magic link has expired or the token is invalid. Please contact the property owner to get a new link.</p>
        </Card>
      </div>
    );
  }

  const isClosed = request.status === "CLOSED";
  const isPendingConfirmation = request.status === "PENDING_TENANT_CONFIRMATION";
  const isAwaitingApproval = request.status === "AWAITING_APPROVAL";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Portal Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Vendor Portal</span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{request.title}</h1>
              <p className="text-slate-500 text-xs mt-0.5">Ticket ID: {request.id.split("-")[0]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={
              request.priority === "EMERGENCY" ? "bg-red-50 text-red-700 border border-red-200" :
              request.priority === "HIGH" ? "bg-orange-50 text-orange-700 border border-orange-200" :
              "bg-slate-100 text-slate-700 border border-slate-200"
            }>
              {request.priority} PRIORITY
            </Badge>
            <Badge variant="outline" className="rounded-full font-bold capitalize px-3 py-1 text-xs">
              {request.status.toLowerCase().replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Details Column */}
          <div className="md:col-span-2 space-y-6">
            <Card className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
              <div>
                <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" /> Issue Description
                </h3>
                <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                  {request.description}
                </p>
                {request.photos && request.photos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {request.photos.map((photo: string, i: number) => (
                      <a key={i} href={photo} target="_blank" rel="noreferrer" className="block relative h-20 w-20 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-500 transition-all">
                        <img src={photo} alt="Issue photo" className="object-cover w-full h-full" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="flex gap-3">
                  <Home className="h-5 w-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Location</p>
                    <p className="font-semibold text-slate-800 text-sm">{request.unit.property.name} - Unit {request.unit.name}</p>
                    <a 
                      href={`https://maps.google.com/?q=${encodeURIComponent(`${request.unit.property.address}, ${request.unit.property.city}, ${request.unit.property.state} ${request.unit.property.zip}`)}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      {request.unit.property.address}, {request.unit.property.city}, {request.unit.property.state} {request.unit.property.zip}
                    </a>
                  </div>
                </div>
                <div className="flex gap-3">
                  <User className="h-5 w-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Tenant Details</p>
                    <p className="font-semibold text-slate-800 text-sm">{request.tenant.name}</p>
                    <p className="text-xs text-slate-500">{request.tenant.phone || request.tenant.email}</p>
                  </div>
                </div>
              </div>

              {/* Safety & Access Block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <p className="text-[10px] font-black text-orange-800 uppercase tracking-wide">Pets in Unit</p>
                  <p className="font-bold text-orange-950 text-sm mt-0.5">{request.hasPets === "Yes" ? "⚠️ Yes, animals present" : "None reported"}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-[10px] font-black text-blue-800 uppercase tracking-wide">Entry Permission</p>
                  <p className="font-bold text-blue-950 text-sm mt-0.5">{request.entryPermission ? "✅ Can enter if not home" : "❌ Tenant must be home"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Tenant Requested Time</p>
                  <p className="font-bold text-slate-700 text-xs mt-0.5 leading-tight">{request.preferredTimes || "No preference"}</p>
                </div>
              </div>
            </Card>

            {/* Vendor Work Console */}
            {!isClosed && !isPendingConfirmation && (
              <Card className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-600" /> Maintenance Console
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notes">Technician / Diagnosis Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Specify findings, diagnostic details, or completed tasks..."
                      value={inspectorNotes}
                      onChange={(e) => setInspectorNotes(e.target.value)}
                      className="mt-1 bg-white border-slate-200 rounded-xl"
                    />
                  </div>

                  {/* Section: Schedule Arrival */}
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-4">
                    <h4 className="font-bold text-sm text-indigo-900">1. Schedule Arrival</h4>
                    <p className="text-xs text-indigo-800">
                      <strong>Tenant Note: </strong> 
                      {request.entryPermission ? "Permission granted to enter if not home." : "Tenant MUST be home."}
                    </p>
                    <div>
                      <Label htmlFor="schedule" className="text-indigo-900">Select Date & Time</Label>
                      <div className="flex gap-2 items-center mt-1">
                        <Input
                          id="schedule"
                          type="datetime-local"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="bg-white border-indigo-200 rounded-xl flex-1"
                        />
                        <Button 
                          onClick={async () => {
                            if (!scheduledDate) return toast.error("Please select a date and time");
                            setProcessing(true);
                            try {
                              const res = await fetch("/api/vendor/ticket", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ token, scheduledDate }),
                              });
                              if (res.ok) {
                                toast.success("Arrival scheduled! Tenant has been notified.");
                                fetchTicket();
                              } else throw new Error("Failed to schedule");
                            } catch (err) {
                              toast.error("Failed to schedule time");
                            } finally {
                              setProcessing(false);
                            }
                          }}
                          disabled={processing || !scheduledDate}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                        >
                          Confirm Time
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Section: Estimate submission */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                    <h4 className="font-bold text-sm text-slate-800">2. Submit Cost Estimate</h4>
                    <p className="text-xs text-slate-500">Owner approval is required if the total estimate exceeds the cost control threshold.</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="estLabor">Est. Labor ($)</Label>
                        <Input
                          id="estLabor"
                          type="number"
                          placeholder="0.00"
                          value={estimatedLabor}
                          onChange={(e) => setEstimatedLabor(e.target.value)}
                          className="mt-1 bg-white border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="estMaterials">Est. Materials ($)</Label>
                        <Input
                          id="estMaterials"
                          type="number"
                          placeholder="0.00"
                          value={estimatedMaterials}
                          onChange={(e) => setEstimatedMaterials(e.target.value)}
                          className="mt-1 bg-white border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleSubmitEstimate}
                      disabled={processing || isAwaitingApproval}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                    >
                      {processing ? "Submitting..." : isAwaitingApproval ? "Awaiting Owner Approval" : "Submit Estimate"}
                    </Button>
                  </div>

                  {/* Section: Complete work */}
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-4">
                    <h4 className="font-bold text-sm text-emerald-900">3. Complete & Resolve Repair</h4>
                    <p className="text-xs text-emerald-800">Fill in final actual costs and select if tenant liability applies.</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="finalLabor" className="text-emerald-950">Final Labor ($)</Label>
                        <Input
                          id="finalLabor"
                          type="number"
                          placeholder="0.00"
                          value={finalLabor}
                          onChange={(e) => setFinalLabor(e.target.value)}
                          className="mt-1 bg-white border-emerald-100 rounded-xl focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="finalMaterials" className="text-emerald-950">Final Materials ($)</Label>
                        <Input
                          id="finalMaterials"
                          type="number"
                          placeholder="0.00"
                          value={finalMaterials}
                          onChange={(e) => setFinalMaterials(e.target.value)}
                          className="mt-1 bg-white border-emerald-100 rounded-xl focus:border-emerald-500 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="bg-white border border-emerald-100 rounded-xl p-4 mt-2">
                      <Label className="font-bold text-emerald-950 mb-2 block">Upload Material Receipts</Label>
                      {receiptPhotos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {receiptPhotos.map((url, i) => (
                            <div key={i} className="relative h-16 w-16 rounded-lg border border-slate-200 overflow-hidden group">
                              <img src={url} alt="Receipt" className="object-cover w-full h-full" />
                              <button
                                onClick={() => setReceiptPhotos(receiptPhotos.filter((_, idx) => idx !== i))}
                                className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-emerald-200 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer group">
                        <UploadCloud className="h-6 w-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-emerald-700">Click to upload receipts</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            // Mock file upload delay
                            if (e.target.files && e.target.files.length > 0) {
                              const loadingToast = toast.loading("Uploading receipt...");
                              setTimeout(() => {
                                setReceiptPhotos([...receiptPhotos, "https://placehold.co/400x600/png?text=Receipt"]);
                                toast.dismiss(loadingToast);
                                toast.success("Receipt uploaded!");
                              }, 1000);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-100 mt-2">
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="h-4 w-4 text-orange-500 mt-0.5" />
                        <div>
                          <Label className="font-bold text-slate-800 block text-xs">Tenant Liability / Damage</Label>
                          <span className="text-[10px] text-slate-500">Is this issue due to tenant negligence or abuse?</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={vendorReportedFault}
                        onChange={(e) => setVendorReportedFault(e.target.checked)}
                        className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>

                    <Button
                      onClick={handleResolveTicket}
                      disabled={processing}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                    >
                      {processing ? "Updating..." : "Mark Resolved & Notify Tenant"}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {isPendingConfirmation && (
              <Card className="p-6 bg-blue-50 border border-blue-100 text-blue-800 rounded-2xl shadow-sm text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-blue-500 mx-auto" />
                <h3 className="font-bold text-lg text-blue-900">Repair Completed</h3>
                <p className="text-sm">Work details and costs have been submitted. This ticket is currently waiting for tenant satisfaction verification.</p>
              </Card>
            )}

            {isClosed && (
              <Card className="p-6 bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl shadow-sm text-center space-y-2">
                <CheckCircle className="h-10 w-10 text-slate-400 mx-auto" />
                <h3 className="font-bold text-lg text-slate-800">Ticket Closed</h3>
                <p className="text-sm">This maintenance request is completed and closed.</p>
              </Card>
            )}
          </div>

          {/* Cost Log Sidebar */}
          <div className="space-y-6">
            <Card className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
              <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">Financial Records</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Estimated Budget</p>
                  <p className="font-black text-slate-800 text-lg">
                    ${(Number(request.estimatedLabor || 0) + Number(request.estimatedMaterials || 0)).toFixed(2)}
                  </p>
                  <span className="text-[10px] text-slate-500">Labor: ${request.estimatedLabor || "0.00"} | Materials: ${request.estimatedMaterials || "0.00"}</span>
                </div>
                
                {request.finalLabor || request.finalMaterials ? (
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Final Repair Invoice</p>
                    <p className="font-black text-emerald-600 text-lg">
                      ${(Number(request.finalLabor || 0) + Number(request.finalMaterials || 0)).toFixed(2)}
                    </p>
                    <span className="text-[10px] text-slate-500">Labor: ${request.finalLabor || "0.00"} | Materials: ${request.finalMaterials || "0.00"}</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic font-medium">No final costs logged yet.</p>
                )}
              </div>
            </Card>

            <Card className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">Timeline</h3>
              <div className="space-y-3">
                <div className="flex gap-2 items-start text-xs">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-700">Created</p>
                    <p className="text-slate-500">{new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                {request.scheduledDate && (
                  <div className="flex gap-2 items-start text-xs">
                    <Clock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-700">Scheduled Date</p>
                      <p className="text-slate-500">{new Date(request.scheduledDate).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
