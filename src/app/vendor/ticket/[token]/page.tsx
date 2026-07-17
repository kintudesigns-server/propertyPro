"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wrench, Clock, Calendar, CheckCircle2, AlertTriangle, User, Home, FileText, CheckCircle, ShieldAlert, UploadCloud, X, Building2, Lock, Star } from "lucide-react";
import { toast } from "sonner";

const timeSlots = [
  { value: "08:00", label: "8:00 AM", window: "Morning (8 AM - 12 PM)" },
  { value: "09:00", label: "9:00 AM", window: "Morning (8 AM - 12 PM)" },
  { value: "10:00", label: "10:00 AM", window: "Morning (8 AM - 12 PM)" },
  { value: "11:00", label: "11:00 AM", window: "Morning (8 AM - 12 PM)" },
  { value: "12:00", label: "12:00 PM", window: "Afternoon (12 PM - 4 PM)" },
  { value: "13:00", label: "1:00 PM", window: "Afternoon (12 PM - 4 PM)" },
  { value: "14:00", label: "2:00 PM", window: "Afternoon (12 PM - 4 PM)" },
  { value: "15:00", label: "3:00 PM", window: "Afternoon (12 PM - 4 PM)" },
  { value: "16:00", label: "4:00 PM", window: "Evening (4 PM - 7 PM)" },
  { value: "17:00", label: "5:00 PM", window: "Evening (4 PM - 7 PM)" },
  { value: "18:00", label: "6:00 PM", window: "Evening (4 PM - 7 PM)" },
  { value: "19:00", label: "7:00 PM", window: "Evening (4 PM - 7 PM)" },
];

const getPreferredWindow = (prefTimesStr: string) => {
  if (!prefTimesStr) return "Anytime";
  if (prefTimesStr.includes("Morning")) return "Morning (8 AM - 12 PM)";
  if (prefTimesStr.includes("Afternoon")) return "Afternoon (12 PM - 4 PM)";
  if (prefTimesStr.includes("Evening")) return "Evening (4 PM - 7 PM)";
  return "Anytime";
};

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
  const [diagnosisPhotos, setDiagnosisPhotos] = useState<string[]>([]);
  const [repairPhotos, setRepairPhotos] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const [bankName, setBankName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"STRIPE" | "CASH" | "CHECK">("STRIPE");
  const [isQuickFix, setIsQuickFix] = useState(false);
  const [workflowPath, setWorkflowPath] = useState<"ESTIMATE" | "QUICK_FIX" | null>(null);

  const getLatestRejectionReason = (notes: string) => {
    if (!notes || !notes.includes("Estimate Rejected")) return null;
    const lines = notes.split("\n");
    const rejectionLine = lines.find(l => l.includes("Estimate Rejected"));
    if (!rejectionLine) return null;
    const match = rejectionLine.match(/"([^"]+)"/);
    return match ? match[1] : "Revision requested by property owner";
  };

  const fetchTicket = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendor/ticket?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setRequest(data);
        setEstimatedLabor(data.estimatedLabor || "");
        setEstimatedMaterials(data.estimatedMaterials || "");
        
        // Auto-fill final costs with approved estimate if not already set in DB
        setFinalLabor(data.finalLabor || data.estimatedLabor || "");
        setFinalMaterials(data.finalMaterials || data.estimatedMaterials || "");
        
        setVendorReportedFault(data.vendorReportedFault || false);
        setInspectorNotes(data.inspectorNotes || "");
        setReceiptPhotos(data.receiptPhotos || []);
        setDiagnosisPhotos(data.diagnosisPhotos || []);
        setRepairPhotos(data.repairPhotos || []);
        
        if (data.estimatedLabor || data.estimatedMaterials || data.status === "AWAITING_APPROVAL") {
          setWorkflowPath("ESTIMATE");
        } else if (data.status === "RESOLVED" || data.status === "CLOSED" || data.status === "PENDING_TENANT_CONFIRMATION") {
          setWorkflowPath("QUICK_FIX");
          setIsQuickFix(true);
        }

        if (data.externalVendor) {
          if (data.externalVendor.bankName === "CASH") {
            setPayoutMethod("CASH");
            setBankName("CASH");
            setRoutingNumber("");
            setAccountNumber("");
          } else if (data.externalVendor.bankName === "CHECK") {
            setPayoutMethod("CHECK");
            setBankName("CHECK");
            setRoutingNumber("");
            setAccountNumber("");
          } else {
            setPayoutMethod("STRIPE");
            setBankName(data.externalVendor.bankName || "");
            setRoutingNumber(data.externalVendor.routingNumber || "");
            setAccountNumber(data.externalVendor.accountNumber || "");
          }
        }

        if (data.scheduledDate) {
          const d = new Date(data.scheduledDate);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          setSelectedDate(`${yyyy}-${mm}-${dd}`);
          
          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          setSelectedTime(`${hh}:${min}`);
        } else if (data.preferredTimes) {
          if (data.preferredTimes.includes("|")) {
            const parts = data.preferredTimes.split("|");
            const prefDateStr = parts[0].trim();
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateRegex.test(prefDateStr)) {
              setSelectedDate(prefDateStr);
            }
          } else {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateRegex.test(data.preferredTimes.trim())) {
              setSelectedDate(data.preferredTimes.trim());
            }
          }
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
          diagnosisPhotos,
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

  const handleSaveBankDetails = async () => {
    let payload: any = { token };
    if (payoutMethod === "CASH") {
      payload.bankName = "CASH";
      payload.routingNumber = "";
      payload.accountNumber = "";
    } else if (payoutMethod === "CHECK") {
      payload.bankName = "CHECK";
      payload.routingNumber = "";
      payload.accountNumber = "";
    } else {
      if (!bankName || !routingNumber || !accountNumber) {
        toast.error("Please fill in all bank details before saving.");
        return;
      }
      payload.bankName = bankName;
      payload.routingNumber = routingNumber;
      payload.accountNumber = accountNumber;
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/vendor/ticket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Payout preferences saved successfully!");
        fetchTicket();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save payout preferences");
      }
    } catch (err) {
      toast.error("Failed to save payout preferences");
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmSchedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select both a date and a time slot");
      return;
    }
    const combinedScheduledDate = `${selectedDate}T${selectedTime}`;
    setProcessing(true);
    try {
      const res = await fetch("/api/vendor/ticket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, scheduledDate: combinedScheduledDate }),
      });
      if (res.ok) {
        toast.success("Arrival scheduled! Tenant has been notified.");
        fetchTicket();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to schedule arrival");
      }
    } catch (err) {
      toast.error("Failed to schedule time");
    } finally {
      setProcessing(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!finalLabor || !finalMaterials) {
      toast.error("Please fill in final labor and materials costs");
      return;
    }
    
    // Receipt verification for material costs
    if (parseFloat(finalMaterials) > 0 && (!receiptPhotos || receiptPhotos.length === 0)) {
      toast.error("Please upload at least one receipt/invoice photo for material costs.");
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
          repairPhotos,
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

  const printWorkCertificate = () => {
    const el = document.getElementById("work-certificate-print");
    if (!el) return;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Work Completion Certificate – ${request?.title || "Job"}</title>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; font-size: 13px; padding: 32px; }
          .cert-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #1e293b; margin-bottom: 24px; }
          .cert-title { font-size: 22px; font-weight: 900; color: #1e293b; }
          .cert-subtitle { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 4px; }
          .badge { display: inline-block; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; border-radius: 6px; padding: 3px 10px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px; }
          .logo { font-size: 14px; font-weight: 900; color: #2563eb; letter-spacing: -0.5px; }
          .logo-sub { font-size: 10px; color: #94a3b8; }
          h2 { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-bottom: 24px; }
          .info-item label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 2px; }
          .info-item span { font-size: 13px; font-weight: 600; color: #1e293b; }
          .photos-section { margin-bottom: 24px; }
          .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
          .photos-grid img { width: 100%; height: 140px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; }
          .photo-label { font-size: 10px; color: #64748b; margin-top: 4px; text-align: center; }
          .financials { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
          .fin-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
          .fin-row:last-child { border-bottom: none; }
          .fin-row.total { font-weight: 900; font-size: 15px; padding-top: 10px; color: #059669; }
          .payout-box { border-radius: 10px; padding: 14px; margin-bottom: 24px; font-size: 12px; }
          .payout-paid { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
          .payout-pending { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
          .footer { border-top: 2px solid #e2e8f0; padding-top: 16px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
          .footer-note { font-size: 10px; color: #94a3b8; }
          .sig-line { border-bottom: 1px solid #cbd5e1; width: 180px; margin-bottom: 4px; height: 28px; }
          .sig-label { font-size: 10px; color: #64748b; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        ${el.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
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
  const isScheduled = !!request.scheduledDate;
  const isApproved = request.status === "APPROVED" || request.status === "REPAIR_SCHEDULED" || request.status === "IN_PROGRESS" || request.status === "RESOLVED" || request.status === "PENDING_TENANT_CONFIRMATION" || request.status === "CLOSED";
  const isReadyForWork = isScheduled && (request.tenantConfirmedSchedule || request.entryPermission) && !request.rescheduleRequested;

  const isEmergency = request.priority === "EMERGENCY";
  const limit = isEmergency
    ? Number(request.unit?.property?.owner?.emergencyOverrideLimit || 1500)
    : Number(request.unit?.property?.owner?.approvalThreshold || 200);

  const preferredWindow = getPreferredWindow(request?.preferredTimes || "");
  const filteredTimeSlots = timeSlots.filter(slot => {
    if (preferredWindow === "Anytime") return true;
    return slot.window === preferredWindow;
  });


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
            {/* Quick Actions for Mobile / Field Technicians */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <a 
                href={`tel:${request.tenant?.phone || ""}`}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition text-center border ${
                  request.tenant?.phone 
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100" 
                    : "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100"
                }`}
                onClick={(e) => {
                  if (!request.tenant?.phone) e.preventDefault();
                }}
              >
                📞 Call Tenant: {request.tenant?.name || "No phone"}
              </a>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${request.unit.property.address}, ${request.unit.property.city}, ${request.unit.property.state} ${request.unit.property.zip}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 py-3 px-4 rounded-xl font-bold text-xs transition text-center"
              >
                📍 Open GPS Directions
              </a>
            </div>

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
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-blue-600 animate-spin-slow" /> Vendor Maintenance console
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Please complete the steps in order to manage and resolve this ticket.</p>
                </div>

                {/* Inspector Reference Estimate Hint */}
                {(request.inspectorEstimateLabor != null || request.inspectorEstimateMaterials != null) && (
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔍</span>
                      <span className="text-xs font-bold text-teal-800 uppercase tracking-wide">Inspector Pre-Assessment on File</span>
                    </div>
                    <p className="text-xs font-semibold text-teal-700 leading-relaxed">
                      A property inspector has previously assessed this job. Their estimated fair cost is{" "}
                      <strong className="text-teal-900">
                        ${(Number(request.inspectorEstimateLabor || 0) + Number(request.inspectorEstimateMaterials || 0)).toFixed(2)}
                      </strong>
                      {" "}(Labor: ${Number(request.inspectorEstimateLabor || 0).toFixed(2)} + Materials: ${Number(request.inspectorEstimateMaterials || 0).toFixed(2)}).
                      Please ensure your quote reflects the actual scope of work.
                    </p>
                  </div>
                )}

                {getLatestRejectionReason(request.inspectorNotes) && request.status === "DIAGNOSIS_SCHEDULED" && (

                  <div className="p-4 bg-rose-50 border-l-4 border-l-rose-500 border-rose-100 rounded-r-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span className="text-xs font-bold text-rose-850 uppercase tracking-wide">Estimate Revision Requested</span>
                    </div>
                    <p className="text-xs font-semibold text-rose-700 leading-relaxed italic bg-white p-3 rounded-lg border border-rose-100/50">
                      &ldquo;{getLatestRejectionReason(request.inspectorNotes)}&rdquo;
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                      The property owner requested revisions on your initial quote. Please update labor/material costs in Step 2 and submit a revised estimate.
                    </p>
                  </div>
                )}

                {/* Horizontal Step Progress Bar */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center md:items-start gap-4 md:gap-2">
                  <div className="flex items-center w-full md:w-auto gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all duration-300 ${
                      isScheduled 
                        ? "bg-emerald-600 text-white shadow-sm font-bold" 
                        : "bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse font-bold"
                    }`}>
                      {isScheduled ? "✓" : "1"}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 leading-tight">Schedule Visit</p>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {isScheduled ? "Completed" : "Action Required"}
                      </p>
                    </div>
                  </div>

                  <div className="hidden md:block h-[1px] flex-1 bg-slate-200 self-center mx-2" />

                  <div className="flex items-center w-full md:w-auto gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all duration-300 ${
                      !isScheduled 
                        ? "bg-slate-200 text-slate-400 font-bold" 
                        : workflowPath 
                          ? "bg-emerald-600 text-white shadow-sm font-bold" 
                          : "bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse font-bold"
                    }`}>
                      {workflowPath ? "✓" : "2"}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 leading-tight">Choose Path</p>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {!isScheduled ? "Locked" : workflowPath ? "Completed" : "Action Required"}
                      </p>
                    </div>
                  </div>

                  <div className="hidden md:block h-[1px] flex-1 bg-slate-200 self-center mx-2" />

                  <div className="flex items-center w-full md:w-auto gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all duration-300 ${
                      !workflowPath 
                        ? "bg-slate-200 text-slate-400 font-bold" 
                        : workflowPath === "QUICK_FIX" 
                          ? "bg-slate-200 text-slate-600 border border-slate-300 font-bold"
                          : isApproved 
                            ? "bg-emerald-600 text-white shadow-sm font-bold" 
                            : isAwaitingApproval 
                              ? "bg-amber-500 text-white animate-pulse font-bold" 
                              : "bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse font-bold"
                    }`}>
                      {workflowPath === "QUICK_FIX" ? "⚡" : isApproved ? "✓" : "3"}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 leading-tight">Cost Estimate</p>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {!workflowPath 
                          ? "Locked" 
                          : workflowPath === "QUICK_FIX" 
                            ? "Bypassed" 
                            : isApproved 
                              ? "Approved" 
                              : isAwaitingApproval 
                                ? "Awaiting Approval" 
                                : "Action Required"}
                      </p>
                    </div>
                  </div>

                  <div className="hidden md:block h-[1px] flex-1 bg-slate-200 self-center mx-2" />

                  <div className="flex items-center w-full md:w-auto gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all duration-300 ${
                      request.status === "RESOLVED" || request.status === "CLOSED" || request.status === "PENDING_TENANT_CONFIRMATION"
                        ? "bg-emerald-600 text-white shadow-sm font-bold"
                        : (workflowPath === "QUICK_FIX" || (workflowPath === "ESTIMATE" && isApproved))
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse font-bold"
                          : "bg-slate-200 text-slate-400 font-bold"
                    }`}>
                      {request.status === "RESOLVED" || request.status === "CLOSED" || request.status === "PENDING_TENANT_CONFIRMATION" ? "✓" : "4"}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 leading-tight">Complete Repair</p>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {request.status === "RESOLVED" || request.status === "CLOSED" || request.status === "PENDING_TENANT_CONFIRMATION"
                          ? "Completed"
                          : (workflowPath === "QUICK_FIX" || (workflowPath === "ESTIMATE" && isApproved))
                            ? "Action Required"
                            : "Locked"}
                      </p>
                    </div>
                  </div>
                </div>


                <div className="space-y-6">
                  {/* General Notes */}
                  <div>
                    <Label htmlFor="notes" className="text-slate-700 font-bold text-xs">Inspector / Diagnosis Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Specify findings, diagnostic details, or tasks completed..."
                      value={inspectorNotes}
                      onChange={(e) => setInspectorNotes(e.target.value)}
                      className="mt-1 bg-white border-slate-200 rounded-xl text-sm"
                    />
                  </div>

                  {/* Step 1: Schedule Visit */}
                  {!isScheduled ? (
                    <div className="p-5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-indigo-900 flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">1</span>
                            Schedule Arrival Date & Time
                          </h4>
                          <p className="text-xs text-indigo-700 mt-1">
                            Review the tenant's preferred times and lock in your arrival slot.
                          </p>
                        </div>
                        <Badge className="bg-indigo-100 text-indigo-800 border-none font-bold text-[10px] uppercase">Required first</Badge>
                      </div>
                      
                      <div className="bg-white/80 p-3 rounded-lg border border-indigo-50 text-xs text-slate-600 space-y-1">
                        <p><strong>Tenant's Preferred Times:</strong> {request.preferredTimes || "No preference"}</p>
                        <p><strong>Access Permission:</strong> {request.entryPermission ? "✅ Permission to enter if not home" : "❌ Tenant MUST be home"}</p>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-indigo-900 text-xs font-bold block">Select Appointment Date & Time</Label>
                        <div className="flex flex-col md:flex-row gap-2">
                          <div className="flex-1">
                            <Input
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="bg-white border-indigo-200 rounded-xl text-sm w-full h-10"
                            />
                          </div>
                          
                          <div className="flex-1">
                            <select
                              value={selectedTime}
                              onChange={(e) => setSelectedTime(e.target.value)}
                              className="bg-white border border-indigo-200 rounded-xl text-sm w-full h-10 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                            >
                              <option value="">Select Time Slot</option>
                              {filteredTimeSlots.map(slot => (
                                <option key={slot.value} value={slot.value}>{slot.label}</option>
                              ))}
                            </select>
                          </div>

                          <Button 
                            onClick={handleConfirmSchedule}
                            disabled={processing || !selectedDate || !selectedTime}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 px-6 text-xs shrink-0"
                          >
                            Confirm Time
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-[11px] text-indigo-700 leading-normal border-t border-indigo-100/50 pt-3">
                        <strong>Not Available?</strong> If you are not available during the tenant's preferred times, please select the next closest slot that works for you or contact them directly to coordinate:
                        <div className="mt-2 p-2 bg-indigo-100/40 rounded border border-indigo-100/50 flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs font-semibold text-slate-800">
                          <span>Tenant: {request.tenant.name} ({request.tenant.phone || request.tenant.email})</span>
                          <span>Owner: {request.unit.property.owner.name} ({request.unit.property.owner.email})</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-emerald-50/30 border border-emerald-100 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">✓</span>
                          1. Schedule Arrival Date & Time
                        </h4>
                        <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px] uppercase">Scheduled</Badge>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <p className="text-xs text-slate-400 font-bold uppercase">Arrival Appointment</p>
                            <p className="text-sm font-bold text-slate-800">
                              {new Date(request.scheduledDate).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {/* Tenant Confirmation Status */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                          <span className="text-slate-500 font-medium">Tenant Response Status:</span>
                          {request.rescheduleRequested ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 animate-pulse">
                              🚨 Reschedule Requested: "{request.rescheduleReason}"
                            </span>
                          ) : request.entryPermission ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              ✅ Auto-Confirmed (Key Release Granted)
                            </span>
                          ) : request.tenantConfirmedSchedule ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              ✅ Tenant Confirmed Availability
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                              ⚠️ Awaiting Tenant Confirmation
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
                          <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-white border-slate-200 rounded-xl text-xs h-9 flex-1 sm:w-36"
                          />
                          <select
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl text-xs h-9 px-2 focus:outline-none focus:ring-2 focus:ring-slate-500 font-semibold text-slate-800 flex-1 sm:w-36"
                          >
                            <option value="">Select Time</option>
                            {filteredTimeSlots.map(slot => (
                              <option key={slot.value} value={slot.value}>{slot.label}</option>
                            ))}
                          </select>
                          <Button 
                            size="sm"
                            onClick={handleConfirmSchedule}
                            disabled={processing || !selectedDate || !selectedTime}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs h-9 px-4 shrink-0"
                          >
                            Reschedule
                          </Button>
                        </div>
                      </div>
                    )}
                                       {/* Workflow Path Selection */}
                  {isScheduled && !workflowPath && (
                    !isReadyForWork ? (
                      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                        <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                          <Lock className="h-4 w-4 text-amber-500" /> Select Repair Workflow Path
                        </h4>
                        <div className="p-5 bg-amber-50/30 border border-amber-200/50 rounded-xl space-y-3">
                          <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-amber-600" /> Awaiting Appointment Confirmation
                          </p>
                          <p className="text-xs text-slate-600 leading-normal">
                            {request.rescheduleRequested 
                              ? "The tenant has requested to reschedule this appointment. Please select a new slot above and coordinate with them."
                              : "This appointment time is waiting for the tenant's confirmation. Once confirmed (or if the tenant has granted entry permission), you can select the repair path and submit costs."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                        <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-indigo-500" /> What kind of job is this?
                        </h4>
                        <div className="bg-blue-50 border border-blue-150 p-4 rounded-xl text-xs text-blue-900 leading-normal">
                          <p className="font-bold mb-1">💵 Pre-Approved Repair Budget: ${limit.toFixed(2)}</p>
                          <p className="text-blue-800 font-medium">
                            If the total parts & labor cost is under <strong>${limit.toFixed(2)}</strong>, choose <strong>Small Job (Quick Fix)</strong> to resolve right away and get paid immediately. Otherwise, select <strong>Large Job</strong> to submit an estimate for owner approval first.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          <button
                            type="button"
                            onClick={() => setWorkflowPath("ESTIMATE")}
                            className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/10 text-left transition flex flex-col justify-between h-full space-y-3 group cursor-pointer"
                          >
                            <div>
                              <span className="inline-flex items-center justify-center p-2 rounded-xl bg-indigo-50 text-indigo-600 mb-2 group-hover:scale-105 transition-transform">
                                <FileText className="h-5 w-5" />
                              </span>
                              <h5 className="font-bold text-sm text-slate-800">Large Job (Requires Cost Estimate)</h5>
                              <p className="text-xs text-slate-450 mt-1 leading-normal">
                                Select this if parts and labor will exceed <strong>${limit.toFixed(2)}</strong>. You must submit your estimate, which the owner will review and approve before you start work.
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 mt-2">
                              Choose Large Job →
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setWorkflowPath("QUICK_FIX");
                              setIsQuickFix(true);
                            }}
                            className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/10 text-left transition flex flex-col justify-between h-full space-y-3 group cursor-pointer"
                          >
                            <div>
                              <span className="inline-flex items-center justify-center p-2 rounded-xl bg-emerald-50 text-emerald-600 mb-2 group-hover:scale-105 transition-transform">
                                <CheckCircle2 className="h-5 w-5" />
                              </span>
                              <h5 className="font-bold text-sm text-slate-800">Small Job (Quick Fix / Below Budget)</h5>
                              <p className="text-xs text-slate-450 mt-1 leading-normal">
                                Select this if the issue is already resolved or can be resolved immediately for under <strong>${limit.toFixed(2)}</strong>. Skip estimate approval and enter actual final costs directly.
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 mt-2">
                              Choose Small Job →
                            </span>
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  {(() => {
                    if (!isScheduled) {
                      return (
                        <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-3 opacity-60 pointer-events-none">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-slate-400 flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">2</span>
                              Submit Cost Estimate
                            </h4>
                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Locked
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">Owner approval is required if the estimate exceeds the limit.</p>
                          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center gap-1.5 mt-2">
                            <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" /> Complete Step 1 (Schedule Appointment) to unlock
                          </div>
                        </div>
                      );
                    }

                    if (!isReadyForWork) {
                      return (
                        <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-3 opacity-60 pointer-events-none">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-slate-400 flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">2</span>
                              Submit Cost Estimate
                            </h4>
                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Locked
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">Owner approval is required if the estimate exceeds the limit.</p>
                          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center gap-1.5 mt-2">
                            <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Awaiting tenant confirmation of appointment to unlock
                          </div>
                        </div>
                      );
                    }

                    if (!workflowPath) {
                      return (
                        <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-3 opacity-60 pointer-events-none">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-slate-400 flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">2</span>
                              Submit Cost Estimate
                            </h4>
                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Locked
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">Owner approval is required if the estimate exceeds the limit.</p>
                          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center gap-1.5 mt-2">
                            <Wrench className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> Select repair workflow path to unlock
                          </div>
                        </div>
                      );
                    }

                    if (workflowPath === "QUICK_FIX") {
                      return (
                        <div className="p-5 bg-slate-50/60 border border-slate-200 rounded-xl flex justify-between items-center">
                          <div className="space-y-1">
                            <h4 className="font-bold text-sm text-slate-500 flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">2</span>
                              Submit Cost Estimate (Bypassed)
                            </h4>
                            <p className="text-xs text-slate-400">You chose the Quick-Fix path. Immediate repair and resolution are active.</p>
                          </div>
                          {!isClosed && !isPendingConfirmation && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setWorkflowPath(null);
                                setIsQuickFix(false);
                              }}
                              className="text-xs font-bold text-indigo-650 border-indigo-200 hover:bg-indigo-50/50 rounded-xl h-8 cursor-pointer"
                            >
                              Change Path
                            </Button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="p-5 bg-slate-50/60 border border-slate-200 rounded-xl space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span>
                              Submit Cost Estimate
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">Submit estimates if owner approval is required before starting repairs.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isAwaitingApproval && !isApproved && !request.estimatedLabor && !request.estimatedMaterials && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                  setWorkflowPath(null);
                                  setIsQuickFix(false);
                                }}
                                className="text-xs font-bold text-slate-500 hover:text-slate-700 h-7 px-2.5 rounded-lg border border-slate-200 cursor-pointer"
                              >
                                Change Path
                              </Button>
                            )}
                            {isAwaitingApproval && (
                              <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[10px] uppercase">Awaiting Owner Approval</Badge>
                            )}
                            {isApproved && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px] uppercase">Estimate Approved</Badge>
                            )}
                            {!isAwaitingApproval && !isApproved && (request.estimatedLabor || request.estimatedMaterials) && (
                              <Badge className="bg-blue-100 text-blue-800 border-none font-bold text-[10px] uppercase">Estimate Submitted</Badge>
                            )}
                          </div>
                        </div>

                        {isAwaitingApproval && (
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800 leading-relaxed">
                            <strong>⚠️ Cost Control Warning:</strong> Your estimate of <strong>${(Number(request.estimatedLabor || 0) + Number(request.estimatedMaterials || 0)).toFixed(2)}</strong> exceeds the owner's auto-approval limit. Please wait for the owner to approve before completing the repair.
                          </div>
                        )}

                        {isApproved && (request.estimatedLabor || request.estimatedMaterials) && (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-850 leading-relaxed">
                            <strong>✓ Approved:</strong> Your estimate of <strong>${(Number(request.estimatedLabor || 0) + Number(request.estimatedMaterials || 0)).toFixed(2)}</strong> is approved. You may proceed with the repairs.
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="estLabor" className="text-slate-700 text-xs font-bold">Est. Labor ($)</Label>
                            <Input
                              id="estLabor"
                              type="number"
                              placeholder="0.00"
                              value={estimatedLabor}
                              onChange={(e) => setEstimatedLabor(e.target.value)}
                              className="mt-1 bg-white border-slate-200 rounded-xl text-sm"
                              disabled={isAwaitingApproval || isApproved}
                            />
                          </div>
                          <div>
                            <Label htmlFor="estMaterials" className="text-slate-700 text-xs font-bold">Est. Materials ($)</Label>
                            <Input
                              id="estMaterials"
                              type="number"
                              placeholder="0.00"
                              value={estimatedMaterials}
                              onChange={(e) => setEstimatedMaterials(e.target.value)}
                              className="mt-1 bg-white border-slate-200 rounded-xl text-sm"
                              disabled={isAwaitingApproval || isApproved}
                            />
                          </div>
                        </div>
                        
                        <div className="bg-white border border-slate-100 rounded-xl p-4 mt-2">
                          <Label className="font-bold text-slate-800 mb-2 block text-xs flex items-center gap-1.5">
                            📸 Diagnosis Photos (Before Starting Work)
                          </Label>
                          {diagnosisPhotos.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {diagnosisPhotos.map((url, i) => (
                                <div key={i} className="relative h-16 w-16 rounded-lg border border-slate-200 overflow-hidden group">
                                  <img src={url} alt="Diagnosis" className="object-cover w-full h-full" />
                                  <button
                                    type="button"
                                    onClick={() => setDiagnosisPhotos(diagnosisPhotos.filter((_, idx) => idx !== i))}
                                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer group">
                            <UploadCloud className="h-6 w-6 text-slate-500 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-slate-600">Tap/Click to upload "Before" photos</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  const file = e.target.files[0];
                                  const loadingToast = toast.loading("Uploading photo...");
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setDiagnosisPhotos([...diagnosisPhotos, reader.result as string]);
                                    toast.dismiss(loadingToast);
                                    toast.success("Diagnosis photo uploaded!");
                                  };
                                  reader.onerror = () => {
                                    toast.dismiss(loadingToast);
                                    toast.error("Failed to read file");
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        
                        {!isAwaitingApproval && !isApproved && (
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                              onClick={handleSubmitEstimate}
                              disabled={processing}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                            >
                              {processing ? "Submitting..." : "Submit Estimate"}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Step 3: Complete & Resolve Repair */}
                  {!isScheduled ? (
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-3 opacity-60 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-400 flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">3</span>
                          Complete & Resolve Repair
                        </h4>
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Fill in final actual costs and select if tenant liability applies.</p>
                      <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center gap-1.5 mt-2">
                        <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" /> Complete Step 1 (Schedule Appointment) to unlock
                      </div>
                    </div>
                  ) : !isReadyForWork ? (
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-3 opacity-60 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-400 flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">3</span>
                          Complete & Resolve Repair
                        </h4>
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Fill in final actual costs and select if tenant liability applies.</p>
                      <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center gap-1.5 mt-2">
                        <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Awaiting tenant confirmation of appointment to unlock
                      </div>
                    </div>
                  ) : !workflowPath ? (
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-3 opacity-60 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-400 flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">3</span>
                          Complete & Resolve Repair
                        </h4>
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Fill in final actual costs and select if tenant liability applies.</p>
                      <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center gap-1.5 mt-2">
                        <Wrench className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> Select repair workflow path to unlock
                      </div>
                    </div>
                  ) : workflowPath === "ESTIMATE" && !isApproved ? (
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-3 opacity-60 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-400 flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">3</span>
                          Complete & Resolve Repair
                        </h4>
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Fill in final actual costs and select if tenant liability applies.</p>
                      <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center gap-1.5 mt-2">
                        {isAwaitingApproval ? (
                          <span className="flex items-center gap-1.5 text-amber-600">
                            <AlertTriangle className="h-3.5 w-3.5" /> Estimate Awaiting Owner Approval
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-indigo-600">
                            <ShieldAlert className="h-3.5 w-3.5" /> Please submit estimate and get owner approval first
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-emerald-50/30 border border-emerald-100 rounded-xl space-y-4">
                      <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">3</span>
                        Complete & Resolve Repair
                      </h4>
                      <p className="text-xs text-slate-500">Fill in final actual costs, upload receipts, and note any tenant liability/negligence.</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="finalLabor" className="text-slate-700 text-xs font-bold">Final Labor ($)</Label>
                          <Input
                            id="finalLabor"
                            type="number"
                            placeholder="0.00"
                            value={finalLabor}
                            onChange={(e) => setFinalLabor(e.target.value)}
                            className="mt-1 bg-white border-slate-200 rounded-xl text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="finalMaterials" className="text-slate-700 text-xs font-bold">Final Materials ($)</Label>
                          <Input
                            id="finalMaterials"
                            type="number"
                            placeholder="0.00"
                            value={finalMaterials}
                            onChange={(e) => setFinalMaterials(e.target.value)}
                            className="mt-1 bg-white border-slate-200 rounded-xl text-sm"
                          />
                        </div>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-xl p-4 mt-2">
                        <Label className="font-bold text-slate-800 mb-2 block text-xs flex items-center gap-1.5">
                          🧾 Invoice / Material Receipts (For refund/parts)
                        </Label>
                        {receiptPhotos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {receiptPhotos.map((url, i) => (
                              <div key={i} className="relative h-16 w-16 rounded-lg border border-slate-200 overflow-hidden group">
                                <img src={url} alt="Receipt" className="object-cover w-full h-full" />
                                <button
                                  type="button"
                                  onClick={() => setReceiptPhotos(receiptPhotos.filter((_, idx) => idx !== i))}
                                  className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer group">
                          <UploadCloud className="h-6 w-6 text-slate-500 mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-slate-600">Tap/Click to upload "Receipt" photos</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                const file = e.target.files[0];
                                const loadingToast = toast.loading("Uploading receipt...");
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setReceiptPhotos([...receiptPhotos, reader.result as string]);
                                  toast.dismiss(loadingToast);
                                  toast.success("Receipt uploaded!");
                                };
                                reader.onerror = () => {
                                  toast.dismiss(loadingToast);
                                  toast.error("Failed to read file");
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-xl p-4 mt-2">
                        <Label className="font-bold text-slate-800 mb-2 block text-xs flex items-center gap-1.5">
                          📸 Completion Photos (After Repair is Done)
                        </Label>
                        {repairPhotos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {repairPhotos.map((url, i) => (
                              <div key={i} className="relative h-16 w-16 rounded-lg border border-slate-200 overflow-hidden group">
                                <img src={url} alt="Repair" className="object-cover w-full h-full" />
                                <button
                                  type="button"
                                  onClick={() => setRepairPhotos(repairPhotos.filter((_, idx) => idx !== i))}
                                  className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer group">
                          <UploadCloud className="h-6 w-6 text-slate-500 mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-slate-600">Tap/Click to upload "After" photos</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                const file = e.target.files[0];
                                const loadingToast = toast.loading("Uploading photo...");
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setRepairPhotos([...repairPhotos, reader.result as string]);
                                  toast.dismiss(loadingToast);
                                  toast.success("Repair photo uploaded!");
                                };
                                reader.onerror = () => {
                                  toast.dismiss(loadingToast);
                                  toast.error("Failed to read file");
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 mt-2">
                        <div className="flex items-start gap-2">
                          <ShieldAlert className="h-4 w-4 text-orange-500 mt-0.5 animate-pulse" />
                          <div>
                            <Label className="font-bold text-slate-800 block text-xs">Tenant Liability / Damage</Label>
                            <span className="text-[10px] text-slate-500 font-medium">Is this issue due to tenant negligence or abuse?</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={vendorReportedFault}
                          onChange={(e) => setVendorReportedFault(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>

                      <Button
                        onClick={handleResolveTicket}
                        disabled={processing}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                      >
                        {processing ? "Updating..." : "Mark Resolved & Notify Tenant"}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {isPendingConfirmation && (
              <Card className="p-6 bg-blue-50/70 border border-blue-100 text-blue-900 rounded-2xl shadow-sm text-center space-y-4">
                <CheckCircle2 className="h-10 w-10 text-blue-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-blue-900">Repair Awaiting Verification</h3>
                  <p className="text-xs text-blue-700 max-w-md mx-auto leading-relaxed">
                    Great job! Work details and costs of <strong>${(Number(request.finalLabor || 0) + Number(request.finalMaterials || 0)).toFixed(2)}</strong> have been submitted. This ticket is currently waiting for the tenant to verify the repair.
                  </p>
                </div>
              </Card>
            )}

            {isClosed && (
              <Card className="p-6 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl shadow-sm space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-105 flex items-center justify-center text-slate-550">
                    <CheckCircle className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">Ticket Completed & Closed</h3>
                    <p className="text-xs text-slate-500 mt-0.5">This maintenance request is completed and finalized.</p>
                  </div>
                </div>

                {/* Tenant Review & Feedback */}
                {request.tenantRating !== null && request.tenantRating !== undefined && (
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> Tenant Feedback &amp; Rating
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= (request.tenantRating || 0)
                                ? "text-amber-500 fill-amber-500"
                                : "text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-700">({request.tenantRating} / 5)</span>
                    </div>
                    {request.tenantFeedback ? (
                      <p className="text-xs font-medium text-slate-600 italic bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                        &ldquo;{request.tenantFeedback}&rdquo;
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No written feedback was provided by the tenant.</p>
                    )}
                  </div>
                )}

                {/* Vendor Payout Settlement Block */}
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payout Settlement Status</h4>
                  {request.vendorExpenseTransactionId ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-3 text-xs">
                      <div className="flex items-center justify-between font-bold text-emerald-800">
                        <span className="flex items-center gap-1.5">💸 Payout Confirmed & Sent</span>
                        <span className="font-mono text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          REF: VENDOR_PAY_{request.id.slice(-6)}
                        </span>
                      </div>
                      <p className="text-emerald-700 leading-relaxed font-medium">
                        Payment was successfully processed by the property owner and recorded in the system ledger.
                      </p>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100/50 space-y-1.5 font-semibold text-slate-700 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-450">Amount Disbursed:</span>
                          <span className="font-extrabold text-slate-900">${(Number(request.finalLabor || 0) + Number(request.finalMaterials || 0)).toFixed(2)} USD</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-450">Settlement Method:</span>
                          <span>
                            {request.transaction?.reference?.endsWith("_STRIPE") ? "Direct Deposit (ACH)" :
                             request.transaction?.reference?.endsWith("_CHECK") ? "Written Check" : "Physical Cash"}
                          </span>
                        </div>
                        {request.transaction?.createdAt && (
                          <div className="flex justify-between">
                            <span className="text-slate-450">Settlement Date:</span>
                            <span>{new Date(request.transaction.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-emerald-100/30 rounded-lg text-[10px] text-emerald-800 leading-normal font-medium">
                        {request.transaction?.reference?.endsWith("_STRIPE") 
                          ? "ℹ️ Funds have been transferred electronically. ACH settlement typically takes 1-3 business days depending on your bank."
                          : "ℹ️ Payment was settled offline. Please confirm receipt of physical check or cash from the property owner."}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-amber-850">
                        <span>⏳ Awaiting Payout Settlement</span>
                        <span className="font-mono text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Pending Owner</span>
                      </div>
                      <p className="text-amber-700 leading-relaxed font-medium">
                        Your final repair invoice of <strong>${(Number(request.finalLabor || 0) + Number(request.finalMaterials || 0)).toFixed(2)}</strong> has been registered. The owner is processing the payment.
                      </p>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Make sure your bank details below are correct to enable electronic Direct Deposit payouts. You will receive an email confirmation once the payout is sent.
                      </p>
                    </div>
                  )}
                </div>

                {/* Download Work Completion Certificate Button */}
                <div className="border-t border-slate-200 pt-4">
                  <button
                    onClick={printWorkCertificate}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs h-10 shadow-sm transition-all"
                  >
                    <FileText className="h-4 w-4" />
                    Download Work Completion Certificate (PDF)
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1.5 font-medium">Includes job details, before &amp; after photos, and payment record</p>
                </div>
              </Card>
            )}

            {/* Hidden Print Certificate — only rendered when ticket is CLOSED */}
            {isClosed && (
              <div id="work-certificate-print" style={{ display: "none" }}>
                {/* Certificate Header */}
                <div className="cert-header">
                  <div>
                    <div className="cert-title">Work Completion Certificate</div>
                    <div className="cert-subtitle">Issued by PropertyPro · Maintenance Management Platform</div>
                    <div style={{ marginTop: "8px" }}><span className="badge">✓ CLOSED &amp; FINALIZED</span></div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="logo">PropertyPro</div>
                    <div className="logo-sub">Maintenance Portal</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>Ticket ID: {request.id.split("-")[0].toUpperCase()}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Date: {new Date().toLocaleDateString(undefined, { dateStyle: "long" })}</div>
                  </div>
                </div>

                {/* Job Details */}
                <h2>Job Information</h2>
                <div className="info-grid">
                  <div className="info-item"><label>Job Title</label><span>{request.title}</span></div>
                  <div className="info-item"><label>Category</label><span>{request.category}</span></div>
                  <div className="info-item"><label>Property</label><span>{request.unit?.property?.name || "N/A"}</span></div>
                  <div className="info-item"><label>Unit</label><span>{request.unit?.name || "N/A"}</span></div>
                  <div className="info-item"><label>Technician / Vendor</label><span>{request.externalVendor?.name || "N/A"}</span></div>
                  <div className="info-item"><label>Technician Email</label><span>{request.externalVendor?.email || "N/A"}</span></div>
                  <div className="info-item"><label>Repair Date</label><span>{request.repairDate ? new Date(request.repairDate).toLocaleDateString(undefined, { dateStyle: "long" }) : (request.scheduledDate ? new Date(request.scheduledDate).toLocaleDateString(undefined, { dateStyle: "long" }) : "N/A")}</span></div>
                  <div className="info-item"><label>Job Status</label><span>Completed &amp; Closed</span></div>
                </div>

                {/* Issue Description */}
                <h2>Issue Description</h2>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", marginBottom: "20px", fontSize: "13px", lineHeight: "1.6", color: "#475569" }}>
                  {request.description}
                </div>

                {/* Before Photos — Diagnosis */}
                {request.diagnosisPhotos && request.diagnosisPhotos.length > 0 && (
                  <div className="photos-section">
                    <h2>Before Work — Diagnosis Photos</h2>
                    <div className="photos-grid">
                      {request.diagnosisPhotos.map((url: string, i: number) => (
                        <div key={i}>
                          <img src={url} alt={`Diagnosis ${i + 1}`} />
                          <div className="photo-label">Before Photo {i + 1}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* After Photos — Repair */}
                {request.repairPhotos && request.repairPhotos.length > 0 && (
                  <div className="photos-section">
                    <h2>After Work — Repair Completed Photos</h2>
                    <div className="photos-grid">
                      {request.repairPhotos.map((url: string, i: number) => (
                        <div key={i}>
                          <img src={url} alt={`Repair ${i + 1}`} />
                          <div className="photo-label">After Photo {i + 1}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Receipt / Invoice Photos */}
                {request.receiptPhotos && request.receiptPhotos.length > 0 && (
                  <div className="photos-section">
                    <h2>Material Receipts &amp; Invoices</h2>
                    <div className="photos-grid">
                      {request.receiptPhotos.map((url: string, i: number) => (
                        <div key={i}>
                          <img src={url} alt={`Receipt ${i + 1}`} />
                          <div className="photo-label">Receipt {i + 1}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial Summary */}
                <h2>Financial Summary</h2>
                <div className="financials">
                  <div className="fin-row"><span>Estimated Labor</span><span>${Number(request.estimatedLabor || 0).toFixed(2)}</span></div>
                  <div className="fin-row"><span>Estimated Materials</span><span>${Number(request.estimatedMaterials || 0).toFixed(2)}</span></div>
                  <div className="fin-row"><span>Final Labor (Billed)</span><span>${Number(request.finalLabor || 0).toFixed(2)}</span></div>
                  <div className="fin-row"><span>Final Materials (Billed)</span><span>${Number(request.finalMaterials || 0).toFixed(2)}</span></div>
                  <div className="fin-row total"><span>Total Invoice Amount</span><span>${(Number(request.finalLabor || 0) + Number(request.finalMaterials || 0)).toFixed(2)} USD</span></div>
                </div>

                {/* Payout Status */}
                <h2>Payout Settlement</h2>
                <div className={`payout-box ${request.vendorExpenseTransactionId ? "payout-paid" : "payout-pending"}`}>
                  {request.vendorExpenseTransactionId ? (
                    <>
                      <div style={{ fontWeight: "800", marginBottom: "6px" }}>✓ Payment Disbursed by Owner</div>
                      <div>Amount: <strong>${(Number(request.finalLabor || 0) + Number(request.finalMaterials || 0)).toFixed(2)} USD</strong></div>
                      <div style={{ marginTop: "4px", fontSize: "11px" }}>Reference Code: VENDOR_PAY_{request.id.slice(-6)}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: "800", marginBottom: "6px" }}>⏳ Payout Pending Owner Processing</div>
                      <div>Your invoice of <strong>${(Number(request.finalLabor || 0) + Number(request.finalMaterials || 0)).toFixed(2)} USD</strong> has been submitted and is awaiting owner disbursement.</div>
                    </>
                  )}
                </div>

                {/* Technician Notes */}
                {request.inspectorNotes && (
                  <>
                    <h2>Technician Notes</h2>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", marginBottom: "20px", fontSize: "12px", color: "#475569", lineHeight: "1.6" }}>
                      {request.inspectorNotes}
                    </div>
                  </>
                )}

                {/* Tenant Rating if available */}
                {request.tenantRating && (
                  <>
                    <h2>Tenant Satisfaction Rating</h2>
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "12px", marginBottom: "20px", fontSize: "12px", color: "#92400e" }}>
                      <strong>Rating: {request.tenantRating} / 5 stars</strong>
                      {request.tenantFeedback && <div style={{ marginTop: "6px" }}>&#8220;{request.tenantFeedback}&#8221;</div>}
                    </div>
                  </>
                )}

                {/* Footer with signature lines */}
                <div className="footer">
                  <div>
                    <div className="sig-line"></div>
                    <div className="sig-label">Technician / Vendor Signature</div>
                  </div>
                  <div>
                    <div className="sig-line"></div>
                    <div className="sig-label">Property Owner Signature</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="footer-note">This certificate was auto-generated by PropertyPro.</div>
                    <div className="footer-note">Keep this document for your tax and work records.</div>
                    <div className="footer-note" style={{ marginTop: "4px" }}>Ticket: {request.id}</div>
                  </div>
                </div>
              </div>
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

            <Card className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-500" /> Payout Preferences
              </h3>
              
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">How do you want to be paid?</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("STRIPE")}
                    className={`py-2 px-3 rounded-lg text-[11px] font-extrabold transition text-center ${
                      payoutMethod === "STRIPE"
                        ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-850"
                    }`}
                  >
                    🏦 Bank ACH
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("CASH")}
                    className={`py-2 px-3 rounded-lg text-[11px] font-extrabold transition text-center ${
                      payoutMethod === "CASH"
                        ? "bg-white text-emerald-700 shadow-sm border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-850"
                    }`}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("CHECK")}
                    className={`py-2 px-3 rounded-lg text-[11px] font-extrabold transition text-center ${
                      payoutMethod === "CHECK"
                        ? "bg-white text-amber-700 shadow-sm border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-850"
                    }`}
                  >
                    ✉️ Check
                  </button>
                </div>
              </div>

              {payoutMethod === "STRIPE" ? (
                <div className="space-y-3 pt-2">
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Enter your banking details so the property owner can transfer repair funds directly to your account.
                  </p>
                  <div>
                    <Label htmlFor="bankName" className="text-slate-600 text-[10px] font-bold uppercase">Bank Name</Label>
                    <Input
                      id="bankName"
                      placeholder="e.g. Chase Bank"
                      value={bankName === "CASH" || bankName === "CHECK" ? "" : bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="mt-1 bg-white border-slate-200 rounded-xl text-xs h-8 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="routingNumber" className="text-slate-600 text-[10px] font-bold uppercase">Routing Number</Label>
                    <Input
                      id="routingNumber"
                      placeholder="9 digits"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      className="mt-1 bg-white border-slate-200 rounded-xl text-xs h-8 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountNumber" className="text-slate-600 text-[10px] font-bold uppercase">Account Number</Label>
                    <Input
                      id="accountNumber"
                      placeholder="Account number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="mt-1 bg-white border-slate-200 rounded-xl text-xs h-8 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-normal space-y-1.5 mt-2">
                  <p className="font-semibold">
                    {payoutMethod === "CASH" ? "💵 Cash Payout Preference" : "✉️ Offline Check Preference"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {payoutMethod === "CASH" 
                      ? "You selected to receive payment in cash. The property owner will coordinate with you to pay you in cash once the work is verified."
                      : "You selected to receive payment via physical check. The owner will write you a check upon repair completion."}
                  </p>
                </div>
              )}

              <Button
                onClick={handleSaveBankDetails}
                disabled={processing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-8 mt-2 shadow-sm"
              >
                {processing ? "Saving..." : "Save Payout Preference"}
              </Button>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
