"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Building, Calendar, DollarSign, FileDown, FileText, User, MapPin, Phone, Mail, CheckCircle, CheckCircle2, Clock, XCircle, MoreVertical, CreditCard, UploadCloud, Settings, ShieldAlert, ArrowUpRight, Loader2, Lock, KeyRound, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { generateLeasePDF } from "@/lib/pdfGenerator";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScheduleInspectionModal } from "@/components/modals/ScheduleInspectionModal";
import { SelfInspectionModal } from "@/components/modals/SelfInspectionModal";
import { BypassConfirmationModal } from "@/components/modals/BypassConfirmationModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function LeaseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: session } = useSession();
  const isTenant = (session?.user as any)?.role === "TENANT";
  const isOwner = (session?.user as any)?.role === "OWNER";
  const [activatingLease, setActivatingLease] = useState(false);

  const [inspectors, setInspectors] = useState<any[]>([]);
  const [scheduleInspectionType, setScheduleInspectionType] = useState<"FINAL" | "PRELIMINARY" | null>(null);

  // Self-Inspection State
  const [selfInspectMode, setSelfInspectMode] = useState<"final" | "preliminary" | null>(null);

  // Preliminary Walkthrough State
  const [showPrelimResultsModal, setShowPrelimResultsModal] = useState(false);
  const [showBypassModal, setShowBypassModal] = useState(false);

  // ConfirmDialog States
  const [showConfirmActivate, setShowConfirmActivate] = useState(false);
  const [showConfirmTerminate, setShowConfirmTerminate] = useState(false);
  const [showConfirmSkipPrelim, setShowConfirmSkipPrelim] = useState(false);

  const [showKeyReturnModal, setShowKeyReturnModal] = useState(false);
  const [actualMoveOutDate, setActualMoveOutDate] = useState("");
  const [confirmingKeyReturn, setConfirmingKeyReturn] = useState(false);

  useEffect(() => {
    if (isOwner) {
      fetch("/api/users?role=INSPECTOR")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to load inspectors");
        })
        .then((data) => setInspectors(data))
        .catch((err) => console.error(err));
    }
  }, [isOwner]);



  const handleConfirmKeyReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualMoveOutDate) {
      toast.error("Please select the actual move-out date");
      return;
    }
    setConfirmingKeyReturn(true);
    try {
      const res = await fetch(`/api/leases/${lease.id}/confirm-key-return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualMoveOutDate })
      });
      if (res.ok) {
        toast.success("Key return confirmed and legal deadline set!");
        setShowKeyReturnModal(false);
        setActualMoveOutDate("");
        fetchLease();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to confirm key return");
      }
    } catch {
      toast.error("Error confirming key return");
    } finally {
      setConfirmingKeyReturn(false);
    }
  };



  const handleActivateLease = async () => {
    setActivatingLease(true);
    try {
      const res = await fetch(`/api/leases/${lease.id}/activate`, { method: "POST" });
      if (res.ok) {
        toast.success("Lease activated! The unit is now marked as Occupied.");
        fetchLease();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to activate lease");
      }
    } catch {
      toast.error("Error activating lease");
    } finally {
      setActivatingLease(false);
    }
  };

  const [signing, setSigning] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [signatureConsent, setSignatureConsent] = useState(false);
  const [signStep, setSignStep] = useState(1); // 1=terms, 2=draw/type, 3=confirm, 4=otp
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [canvasSignatureData, setCanvasSignatureData] = useState<string | null>(null);
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("draw");
  const [typedSignature, setTypedSignature] = useState("");
  const [otp, setOtp] = useState("");
  
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const isDrawingRef = React.useRef(false);
  const lastPosRef = React.useRef({ x: 0, y: 0 });

  const fetchLease = async () => {
    try {
      const res = await fetch(`/api/leases/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setLease(data);
      } else {
        toast.error("Lease not found");
      }
    } catch (err) {
      toast.error("Failed to load lease details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) fetchLease();
  }, [params.id]);

  const handleRequestOtp = async () => {
    if (!signatureName.trim() || !signatureConsent) {
      toast.error("Please provide your signature and agree to the terms.");
      return;
    }
    if (lease.tenant?.name && signatureName.trim().toLowerCase() !== lease.tenant.name.toLowerCase()) {
      toast.error("Signature must exactly match your legal name on file.");
      return;
    }

    setSigning(true);
    try {
      const res = await fetch(`/api/leases/${lease.id}/send-otp`, { method: "POST" });
      if (res.ok) {
        toast.success("Verification code sent to your email.");
        setSignStep(4);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to send verification code.");
      }
    } catch (err) {
      toast.error("Error sending OTP.");
    } finally {
      setSigning(false);
    }
  };

  const handleVerifyOtpAndSign = async () => {
    if (!otp.trim() || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit verification code.");
      return;
    }

    // Determine the signature image URL
    let signatureImageUrl = canvasSignatureData;
    if (signatureMode === "type") {
      // Create a temporary canvas to render the typed signature
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 600;
      tempCanvas.height = 200;
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#F8FAFC"; // Light background
        ctx.fillRect(0, 0, 600, 200);
        ctx.fillStyle = "#1E293B"; // Dark ink
        ctx.font = "60px 'Caveat', cursive, Brush Script MT";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(typedSignature || signatureName, 300, 100);
        signatureImageUrl = tempCanvas.toDataURL();
      }
    }

    setSigning(true);
    try {
      const res = await fetch(`/api/leases/${lease.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureImageUrl, otp }),
      });
      if (res.ok) {
        toast.success("Lease signed successfully! Welcome to your new home.");
        setShowSignModal(false);
        setSignStep(1);
        setHasScrolledTerms(false);
        setCanvasSignatureData(null);
        setOtp("");
        fetchLease();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to sign lease.");
      }
    } catch (err) {
      toast.error("Error signing lease.");
    } finally {
      setSigning(false);
    }
  };

  // Canvas drawing helpers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastPosRef.current = { x: clientX - rect.left, y: clientY - rect.top };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPosRef.current = { x, y };
    setCanvasSignatureData(canvas.toDataURL());
  };

  const stopDrawing = () => { isDrawingRef.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setCanvasSignatureData(null);
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    toast.info("Preparing Stripe Checkout...");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to initiate payment");
      }
    } catch (err) {
      console.error(err);
      toast.error("Stripe Checkout failed.");
    }
  };

  const handleTerminateLease = async () => {
    try {
      const res = await fetch(`/api/leases/${lease.id}/terminate`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Lease terminated successfully");
        fetchLease();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to terminate lease");
      }
    } catch (err) {
      toast.error("Error terminating lease");
    }
  };

  const handleSkipPreliminaryWalkthrough = async () => {
    try {
      const res = await fetch(`/api/leases/${lease.id}/preliminary-inspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SKIP" })
      });
      if (res.ok) {
        toast.success("Preliminary Walkthrough skipped.");
        fetchLease();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to skip preliminary walkthrough");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to skip preliminary walkthrough");
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[60vh]">
      <div className="animate-spin h-8 w-8 border-4 border-[#3B82F6] border-t-transparent rounded-full"></div>
    </div>;
  }

  if (!lease) {
    return <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <FileText className="h-12 w-12 text-[#94A3B8]" />
      <h2 className="text-xl font-bold text-[#0F172A]">Lease Not Found</h2>
      <Button onClick={() => router.back()} className="mt-2">Go Back</Button>
    </div>;
  }


  const calculateProgress = () => {
    if (!lease.startDate || !lease.endDate) return 0;
    const start = new Date(lease.startDate).getTime();
    const end = new Date(lease.endDate).getTime();
    const now = new Date().getTime();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  let totalLeaseValue = 0;
  let amountPaid = 0;
  let upcomingDue = 0;
  let overdue = 0;

  if (lease) {
    if (lease.startDate && lease.endDate && lease.monthlyRent) {
      const start = new Date(lease.startDate);
      const end = new Date(lease.endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      totalLeaseValue = Number(lease.monthlyRent) * Math.max(1, months) + Number(lease.securityDeposit || 0);
    }
    
    amountPaid = lease.invoices?.filter((i: any) => i.status === "PAID").reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0;
    totalLeaseValue = Math.max(totalLeaseValue, amountPaid);
    
    upcomingDue = lease.invoices?.filter((i: any) => i.status === "UNPAID").reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0;
    overdue = lease.invoices?.filter((i: any) => i.status === "OVERDUE").reduce((sum: number, i: any) => sum + Number(i.amount), 0) || 0;
  }
  
  const paymentProgress = totalLeaseValue > 0 ? Math.round((amountPaid / totalLeaseValue) * 100) : 0;
  const unpaidDepositInvoice = lease.invoices?.find(
    (inv: any) =>
      lease.securityDeposit &&
      Number(inv.amount) === Number(lease.securityDeposit) &&
      inv.status === "UNPAID"
  );

  const getStatusBadge = (status: string) => {
    if (status === "ACTIVE" && unpaidDepositInvoice) {
      return <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-xs font-bold shadow-sm"><Clock className="h-3.5 w-3.5" /> Awaiting Deposit</span>;
    }
    switch (status) {
      case "ACTIVE": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#DCFCE7] text-[#10B981] border border-[#A7F3D0] rounded-full text-xs font-bold shadow-sm"><CheckCircle className="h-3.5 w-3.5" /> Active Lease</span>;
      case "PENDING_SIGNATURE": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#FEF3C7] text-[#F59E0B] border border-[#FDE68A] rounded-full text-xs font-bold shadow-sm"><Clock className="h-3.5 w-3.5" /> Pending Signature</span>;
      case "SIGNED": return <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full text-xs font-bold shadow-sm"><KeyRound className="h-3.5 w-3.5" /> Signed – Awaiting Move-In</span>;
      case "EXPIRED": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#FEE2E2] text-[#EF4444] border border-[#FECACA] rounded-full text-xs font-bold shadow-sm"><XCircle className="h-3.5 w-3.5" /> Expired</span>;
      case "TERMINATED": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#FEE2E2] text-[#EF4444] border border-[#FECACA] rounded-full text-xs font-bold shadow-sm"><XCircle className="h-3.5 w-3.5" /> Terminated</span>;
      case "DRAFT": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] rounded-full text-xs font-bold shadow-sm"><FileText className="h-3.5 w-3.5" /> Draft</span>;
      default: return <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold shadow-sm">{status}</span>;
    }
  };

  const getDaysUntilMoveIn = () => {
    if (!lease?.startDate) return 0;
    const start = new Date(lease.startDate);
    start.setHours(0,0,0,0);
    const now = new Date();
    now.setHours(0,0,0,0);
    return Math.ceil((start.getTime() - now.getTime()) / (1000 * 3600 * 24));
  };

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20 px-2 sm:px-0">
      {/* Top Nav */}
      <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]">
        <button onClick={() => router.back()} className="hover:text-[#0F172A] transition-colors flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Leases
        </button>
        <span>/</span>
        <span className="text-[#0F172A] truncate max-w-[200px]">Lease {lease.id.substring(0, 8)}...</span>
      </div>

      {/* ── PRE-MOVE-IN DASHBOARD ── */}
      {isTenant && lease.status === "SIGNED" && getDaysUntilMoveIn() > 0 && (
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 sm:p-10 shadow-xl text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10">
            <KeyRound className="w-64 h-64" />
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
              <div>
                <span className="bg-white/20 text-indigo-50 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-sm border border-white/10">Pre-Move-In Journey</span>
                <h2 className="text-3xl font-black mt-3">Welcome to your new home!</h2>
                <p className="text-indigo-100 mt-1 max-w-xl text-sm leading-relaxed">Your lease is signed and your move-in date is locked. Complete the onboarding checklist below to ensure a smooth transition into your new unit.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl text-center min-w-[140px] shrink-0">
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Move-in Date</p>
                <p className="text-4xl font-black">{getDaysUntilMoveIn()}</p>
                <p className="text-indigo-200 text-sm font-semibold">Days to go</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Your Onboarding Checklist</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 opacity-70">
                  <div className="h-8 w-8 rounded-full bg-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-5 w-5 text-indigo-900" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white line-through">Sign Lease Agreement</p>
                    <p className="text-xs text-indigo-200">Completed on {new Date(lease.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${!unpaidDepositInvoice ? 'bg-emerald-400' : 'bg-amber-400 border-2 border-white'}`}>
                    {!unpaidDepositInvoice ? <CheckCircle className="h-5 w-5 text-indigo-900" /> : <div className="h-2 w-2 rounded-full bg-amber-900" />}
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold ${!unpaidDepositInvoice ? 'text-white line-through opacity-70' : 'text-amber-300'}`}>Pay Security Deposit</p>
                    <p className="text-xs text-indigo-200">{!unpaidDepositInvoice ? 'Payment received' : 'Action required to secure the unit'}</p>
                  </div>
                  {unpaidDepositInvoice && (
                    <Button onClick={() => router.push(`/dashboard/payments/pay-rent`)} size="sm" className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-lg text-xs">
                      Pay Now
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-4 opacity-50">
                   <div className="h-8 w-8 rounded-full border-2 border-indigo-200 flex items-center justify-center shrink-0">
                   </div>
                   <div className="flex-1">
                     <p className="font-bold text-white">Pay First Month's Rent</p>
                     <p className="text-xs text-indigo-200">Invoice will be available on your start date ({new Date(lease.startDate).toLocaleDateString()})</p>
                   </div>
                </div>

                <div className="flex items-center gap-4 opacity-50">
                   <div className="h-8 w-8 rounded-full border-2 border-indigo-200 flex items-center justify-center shrink-0">
                   </div>
                   <div className="flex-1">
                     <p className="font-bold text-white">Pick up keys</p>
                     <p className="text-xs text-indigo-200">Available on move-in day after all payments clear</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Banner — Step 1: Sign first, Step 2: Pay deposit */}
      {isTenant && lease.status === "PENDING_SIGNATURE" && (
        <Card className="p-5 rounded-[20px] shadow-sm border bg-amber-50 border-amber-200 text-amber-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Step 1 of 2 — Signature Required
            </h4>
            <p className="text-sm font-semibold opacity-90 mt-1">
              Please review your lease agreement below and sign it to activate your tenancy.
              {unpaidDepositInvoice && ` After signing, you'll be prompted to pay the $${Number(lease.securityDeposit).toFixed(2)} security deposit.`}
            </p>
          </div>
          <Button
            onClick={() => setShowSignModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 px-5 rounded-xl text-xs shadow-sm self-stretch md:self-auto shrink-0"
          >
            Review & Sign Lease
          </Button>
        </Card>
      )}

      {/* Action Banner — Step 2: Pay deposit after signing */}
      {isTenant && (lease.status === "ACTIVE" || lease.status === "SIGNED") && unpaidDepositInvoice && (
        <Card className="p-5 rounded-[20px] shadow-sm border bg-blue-50 border-blue-200 text-blue-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-blue-500" />
              Step 2 of 2 — Security Deposit Due
            </h4>
            <p className="text-sm font-semibold opacity-90 mt-1">
              Lease signed! Now please pay your security deposit of <strong>${Number(lease.securityDeposit).toFixed(2)}</strong> to complete your move-in.
            </p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/payments/pay-rent')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-5 rounded-xl text-xs shadow-sm self-stretch md:self-auto shrink-0"
          >
            Pay Security Deposit
          </Button>
        </Card>
      )}

      {/* Owner banner: lease is SIGNED, awaiting physical move-in confirmation */}
      {isOwner && lease.status === "SIGNED" && (
        <Card className="p-5 rounded-[20px] shadow-sm border bg-indigo-50 border-indigo-200 text-indigo-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-500" />
              Tenant Has Signed — Confirm Key Handover
            </h4>
            <p className="text-sm font-semibold opacity-90 mt-1">
              The tenant has signed the lease. Once you hand over the physical keys, click the button to activate the lease and mark the unit as Occupied.
            </p>
          </div>
          <Button
            onClick={() => setShowConfirmActivate(true)}
            disabled={activatingLease}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-5 rounded-xl text-xs shadow-sm self-stretch md:self-auto shrink-0"
          >
            {activatingLease ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Confirm Keys Handed Over
          </Button>
        </Card>
      )}

      {/* Owner banner: Limbo State for Move-Out */}
      {isOwner && (lease.status === "NOTICE_GIVEN" || lease.status === "TERMINATED") && (
        <Card className="p-5 rounded-[20px] shadow-sm border bg-amber-50 border-amber-200 text-amber-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              {lease.status === "NOTICE_GIVEN" ? "Move-Out Pending" : "Lease Terminated"}
            </h4>
            <p className="text-sm font-semibold opacity-90 mt-1">
              {lease.status === "NOTICE_GIVEN"
                ? `Tenant is scheduled to move out on ${lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "TBD"}. Use the pipeline below to manage each step.`
                : "This lease has ended and the unit is vacant."}
            </p>
          </div>
          {lease.status === "TERMINATED" && (
            <Button
              onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 px-5 rounded-xl text-xs shadow-sm self-stretch md:self-auto shrink-0"
            >
              View Final Statement
            </Button>
          )}
        </Card>
      )}

      {/* Optional: Preliminary Walkthrough */}
      {isOwner && ["MOVE_OUT_REQUESTED", "KEYS_RETURNED"].includes(lease.moveOutStatus) && lease.preliminaryInspectionStatus !== "SKIPPED" && (
        <Card className="p-5 rounded-[20px] shadow-sm border bg-purple-50 border-purple-200 text-purple-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-purple-600" />
              Optional: Preliminary Walkthrough
            </h4>
            <p className="text-sm font-semibold opacity-90 mt-1">
              {lease.preliminaryInspectionStatus === "NONE" 
                ? "Offer the tenant a preliminary walkthrough to identify issues before they move out." 
                : lease.preliminaryInspectionStatus === "SCHEDULED" 
                  ? `Preliminary Walkthrough is scheduled for ${lease.preliminaryInspectionDate ? new Date(lease.preliminaryInspectionDate).toLocaleString() : "TBD"}.`
                  : "Preliminary Walkthrough has been completed."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {lease.preliminaryInspectionStatus === "NONE" && (
              <>
                <Button
                  onClick={() => setShowConfirmSkipPrelim(true)}
                  variant="outline"
                  className="bg-transparent border-purple-300 text-purple-700 hover:bg-purple-100 font-bold h-10 px-4 rounded-xl text-xs"
                >
                  Skip
                </Button>
                <Button
                  onClick={() => setScheduleInspectionType("PRELIMINARY")}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-10 px-5 rounded-xl text-xs shadow-sm"
                >
                  Schedule Walkthrough
                </Button>
              </>
            )}
            {lease.preliminaryInspectionStatus === "SCHEDULED" && (
              <Button
                onClick={() => {
                  if (lease.preliminaryInspectorId === (session?.user as any)?.id || !lease.preliminaryInspectorId) {
                    setSelfInspectMode("preliminary");
                  } else {
                    toast.error("This is assigned to another inspector.");
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-10 px-5 rounded-xl text-xs shadow-sm"
              >
                Start Walkthrough
              </Button>
            )}
            {lease.preliminaryInspectionStatus === "COMPLETED" && (
              <Button
                onClick={() => setShowPrelimResultsModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-10 px-5 rounded-xl text-xs shadow-sm"
              >
                View Results
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Owner Move-Out Pipeline — 4-Step Linear Wizard */}
      {isOwner && lease.status === "NOTICE_GIVEN" && (
        <Card className="rounded-[24px] shadow-sm border bg-white text-slate-800 overflow-hidden">
          {/* Panel Header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Move-Out Pipeline
              </span>
              <h3 className="text-lg font-black mt-2 text-slate-900">Unit Turnover — 4 Steps</h3>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">
                Tenant: <strong className="text-slate-900">{lease.tenant?.name}</strong>
                {" · "}Requested: <strong className="text-slate-900">{lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "TBD"}</strong>
              </p>
            </div>
            {lease.depositDueBy && (() => {
              const daysLeft = Math.ceil((new Date(lease.depositDueBy).getTime() - Date.now()) / 86400000);
              const urgent = daysLeft <= 5;
              return (
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-black shrink-0 ${urgent ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                  <Clock className="h-4 w-4" />
                  <div>
                    <p className="text-[9px] uppercase tracking-widest opacity-70">Deposit Deadline</p>
                    <p>{daysLeft <= 0 ? "⚠️ OVERDUE" : `${daysLeft} days left`}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Steps — always all 4 visible, just states change */}
          <div className="divide-y divide-slate-100">

            {/* ── STEP 1: Key Return ── */}
            {(() => {
              const done = !!lease.actualMoveOutDate;
              return (
                <div className={`px-6 py-4 flex items-start gap-4 ${done ? "opacity-60" : ""}`}>
                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs font-black ${done ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-blue-500 text-blue-600"}`}>
                    {done ? "✓" : "1"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-900">Key Return &amp; Move-Out Date</p>
                      {done
                        ? <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">Done</span>
                        : <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 shrink-0">Action Needed</span>
                      }
                    </div>
                    {done ? (
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        Keys confirmed on {new Date(lease.actualMoveOutDate).toLocaleDateString()}.
                        {lease.depositDueBy && <> Deposit due by <strong className="text-amber-600">{new Date(lease.depositDueBy).toLocaleDateString()}</strong>.</>}
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">
                          Confirm when keys are physically returned. This locks the move-out date and starts the 21-day legal deposit deadline.
                        </p>
                        <Button onClick={() => setShowKeyReturnModal(true)} className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9 px-4 rounded-xl shadow-none">
                          <KeyRound className="h-3.5 w-3.5 mr-1.5" />Confirm Key Return
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── STEP 2: Inspection ── */}
            {(() => {
              const keysReturned = !!lease.actualMoveOutDate;
              const DONE_STATUSES = ["INSPECTION_COMPLETED", "OWNER_REVIEWING", "TENANT_ACCEPTED", "TENANT_DISPUTED", "DISPUTE_FINALIZED", "COMPLETED"];
              const inspectionDone = DONE_STATUSES.includes(lease.moveOutStatus);
              const inspectionScheduled = lease.moveOutStatus === "INSPECTION_SCHEDULED";
              const locked = !keysReturned;
              const current = keysReturned && !inspectionDone;
              return (
                <div className={`px-6 py-4 flex items-start gap-4 ${locked ? "opacity-40" : inspectionDone ? "opacity-60" : ""}`}>
                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs font-black ${inspectionDone ? "bg-emerald-500 border-emerald-500 text-white" : current ? "bg-white border-blue-500 text-blue-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                    {inspectionDone ? "✓" : "2"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-900">Property Inspection</p>
                      {inspectionDone
                        ? <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">Completed</span>
                        : inspectionScheduled
                        ? <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 shrink-0">Scheduled</span>
                        : locked
                        ? <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">Locked</span>
                        : <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">Action Needed</span>
                      }
                    </div>
                    {inspectionDone ? (
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        Inspection report submitted{lease.inspectionDate ? ` on ${new Date(lease.inspectionDate).toLocaleDateString()}` : ""}.
                      </p>
                    ) : inspectionScheduled ? (
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        Scheduled for {new Date(lease.inspectionDate).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}.
                        {lease.moveOutInspector && <> Inspector: {lease.moveOutInspector.name}.</>}
                      </p>
                    ) : locked ? (
                      <p className="text-xs text-slate-400 font-semibold mt-1">Confirm key return first to unlock inspection.</p>
                    ) : (
                      <>
                        <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">
                          Keys returned. You can now schedule an inspection or skip it if no damages are suspected.
                        </p>
                        <div className="flex flex-col gap-3 mt-4">
                          <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setSelfInspectMode("final")} className="relative overflow-hidden flex flex-col items-start p-4 bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 hover:border-indigo-400 hover:shadow-sm rounded-2xl text-left transition-all duration-300 group">
                              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <CheckCircle2 className="h-12 w-12 text-indigo-600" />
                              </div>
                              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs mb-1.5 z-10">
                                <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </div>
                                Self-Inspect
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-[85%] z-10">Use our guided room-by-room checklist with photo uploads.</p>
                            </button>
                            
                            <button onClick={() => setScheduleInspectionType("FINAL")} className="relative overflow-hidden flex flex-col items-start p-4 bg-gradient-to-br from-slate-50 to-white border border-slate-200 hover:border-slate-400 hover:shadow-sm rounded-2xl text-left transition-all duration-300 group">
                              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Settings className="h-12 w-12 text-slate-600" />
                              </div>
                              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs mb-1.5 z-10">
                                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                  <Settings className="h-3.5 w-3.5" />
                                </div>
                                Assign Inspector
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-[85%] z-10">Send a professional inspector from your team to the unit.</p>
                            </button>
                          </div>

                          <button onClick={() => setShowBypassModal(true)} className="relative overflow-hidden flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-50 to-white border border-amber-200 hover:border-amber-400 hover:shadow-sm rounded-xl text-left transition-all duration-300 group">
                            <div className="flex flex-col z-10">
                              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-0.5">
                                <CheckCircle className="h-3.5 w-3.5" /> 
                                Skip Inspection (Refund Full Deposit)
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium">Bypass the physical inspection and advance directly to closing with zero deductions. Reason & acknowledgment required.</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-200 transition-colors shrink-0 z-10">
                              <ArrowUpRight className="h-4 w-4" />
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── STEP 3: Review & Price Deductions ── */}
            {(() => {
              const INSPECTION_DONE = ["INSPECTION_COMPLETED", "OWNER_REVIEWING", "TENANT_ACCEPTED", "TENANT_DISPUTED", "DISPUTE_FINALIZED", "COMPLETED"];
              const inspectionDone = INSPECTION_DONE.includes(lease.moveOutStatus);
              const settled = ["TENANT_ACCEPTED", "DISPUTE_FINALIZED"].includes(lease.moveOutStatus) || lease.status === "TERMINATED";
              const locked = !inspectionDone;
              const needsAction = ["OWNER_REVIEWING", "TENANT_DISPUTED"].includes(lease.moveOutStatus);
              return (
                <div className={`px-6 py-4 flex items-start gap-4 ${locked ? "opacity-40" : settled ? "opacity-60" : ""}`}>
                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs font-black ${settled ? "bg-emerald-500 border-emerald-500 text-white" : needsAction ? "bg-white border-blue-500 text-blue-600" : inspectionDone ? "bg-white border-amber-500 text-amber-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                    {settled ? "✓" : "3"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-900">Review &amp; Price Deductions</p>
                      {settled
                        ? <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">Done</span>
                        : lease.moveOutStatus === "TENANT_DISPUTED"
                        ? <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">Disputed</span>
                        : lease.moveOutStatus === "INSPECTION_COMPLETED"
                        ? <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 shrink-0">Tenant Reviewing</span>
                        : needsAction
                        ? <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">Action Needed</span>
                        : locked
                        ? <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">Locked</span>
                        : null
                      }
                    </div>
                    {locked ? (
                      <p className="text-xs text-slate-400 font-semibold mt-1">Complete the inspection first to unlock this step.</p>
                    ) : (
                      <>
                        <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">
                          {lease.moveOutStatus === "OWNER_REVIEWING"
                            ? "Inspection done. Price each damage item and send the statement to the tenant."
                            : lease.moveOutStatus === "TENANT_DISPUTED"
                            ? "Tenant disputed the charges. Review their reason and respond or revise amounts."
                            : lease.moveOutStatus === "INSPECTION_COMPLETED"
                            ? "Statement sent. Awaiting tenant acceptance (72-hour window)."
                            : settled
                            ? "Statement accepted by tenant."
                            : "Review and finalise deductions before sending to tenant."}
                        </p>
                        {!settled && (
                          <Button
                            onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)}
                            className={`mt-3 text-white text-xs font-bold h-9 px-4 rounded-xl shadow-none ${lease.moveOutStatus === "TENANT_DISPUTED" ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}`}
                          >
                            {lease.moveOutStatus === "OWNER_REVIEWING" ? "Price & Send Statement" : lease.moveOutStatus === "TENANT_DISPUTED" ? "Resolve Dispute" : "Open Final Statement"}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── STEP 4: Settle Deposit & Close ── */}
            {(() => {
              const settled = lease.status === "TERMINATED";
              const ready = ["TENANT_ACCEPTED", "DISPUTE_FINALIZED"].includes(lease.moveOutStatus);
              const locked = !ready && !settled;
              const originalDeposit = Number(lease.securityDeposit || 0);
              const totalDeducted = (lease.deductions || []).reduce((s: number, d: any) => s + Number(d.amount), 0);
              const refund = Math.max(0, originalDeposit - totalDeducted);
              return (
                <div className={`px-6 py-4 flex items-start gap-4 ${locked ? "opacity-40" : ""}`}>
                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs font-black ${settled ? "bg-emerald-500 border-emerald-500 text-white" : ready ? "bg-emerald-50 border-emerald-500 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                    {settled ? "✓" : "4"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-900">Settle Deposit &amp; Close Lease</p>
                      {settled
                        ? <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">Closed</span>
                        : ready
                        ? <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">Ready</span>
                        : <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">Locked</span>
                      }
                    </div>
                    {settled ? (
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        Lease closed. Refund of <strong className="text-emerald-600">${refund.toFixed(2)}</strong> issued via {lease.refundMethod === "ORIGINAL" ? "original payment method" : lease.refundMethod === "CHECK" ? "mailed check" : "bank transfer"}.
                      </p>
                    ) : ready ? (
                      <>
                        <p className="text-xs text-slate-500 font-semibold mt-1">
                          Tenant accepted. Issue the refund of <strong className="text-emerald-600">${refund.toFixed(2)}</strong> and officially close the lease.
                        </p>
                        <Button onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)} className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-4 rounded-xl shadow-none">
                          Finalize &amp; Process Refund
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 font-semibold mt-1">Tenant must accept the statement before you can settle the deposit.</p>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        </Card>
      )}

      {/* Tenant banner: Limbo State for Move-Out */}
      {isTenant && (lease.status === "NOTICE_GIVEN" || lease.status === "TERMINATED") && (
        <Card className="p-5 rounded-[20px] shadow-sm border bg-amber-50 border-amber-200 text-amber-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              {lease.status === "NOTICE_GIVEN" ? "Move-Out Scheduled" : "Lease Terminated"}
            </h4>
            <p className="text-sm font-semibold opacity-90 mt-1">
              {lease.status === "NOTICE_GIVEN" 
                ? `Your move-out is scheduled for ${lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "TBD"}. Please ensure the unit is deep cleaned, all personal items are removed, and keys are left on the kitchen counter to ensure a full deposit refund.`
                : "Your lease is officially terminated and the final security deposit statement has been processed."}
            </p>
          </div>
          {lease.status === "TERMINATED" && (
            <Button
              onClick={() => router.push(`/dashboard/tenant/leases/${lease.id}/move-out`)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 px-5 rounded-xl text-xs shadow-sm self-stretch md:self-auto shrink-0"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Final Deposit Statement
            </Button>
          )}
        </Card>
      )}

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[24px] shadow-sm border border-[#E2E8F0]">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[16px] flex items-center justify-center text-[#3B82F6] shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-[22px] font-black text-[#0F172A] leading-tight">Lease Agreement</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-bold text-[#64748B] tracking-wider uppercase">ID: {lease.id.substring(0,8)}</span>
              {getStatusBadge(lease.status)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {isTenant ? (
            <>
              {/* Step 1: Always show Sign button when pending */}
              {lease.status === "PENDING_SIGNATURE" && (
                <Button
                  onClick={() => setShowSignModal(true)}
                  className="h-10 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex-1 md:flex-none"
                >
                  Sign Lease
                </Button>
              )}
              {/* Step 2: Show Pay Deposit after lease is SIGNED or ACTIVE */}
              {(lease.status === "ACTIVE" || lease.status === "SIGNED") && unpaidDepositInvoice && (
                <Button
                  onClick={() => router.push('/dashboard/payments/pay-rent')}
                  className="h-10 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex-1 md:flex-none"
                >
                  <CreditCard className="mr-2 h-4 w-4" /> Pay Deposit (${Number(lease.securityDeposit).toFixed(2)})
                </Button>
              )}
              {unpaidDepositInvoice ? (
                <div className="group relative flex-1 md:flex-none">
                  <Button 
                    disabled
                    className="w-full h-10 rounded-xl font-bold bg-slate-100 text-slate-400 shadow-sm opacity-100"
                  >
                    <Lock className="mr-2 h-4 w-4" /> Locked
                  </Button>
                  <div className="absolute top-full mt-2 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center">
                    Pay security deposit to unlock lease documents
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={() => generateLeasePDF(lease)}
                  className="h-10 rounded-xl font-bold bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm flex-1 md:flex-none"
                >
                  <FileDown className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              )}
            </>
          ) : (
            <>
              {unpaidDepositInvoice ? (
                <div className="group relative flex-1 md:flex-none">
                  <Button 
                    disabled
                    className="w-full h-10 rounded-xl font-bold bg-slate-100 text-slate-400 shadow-sm opacity-100"
                  >
                    <Lock className="mr-2 h-4 w-4" /> Locked
                  </Button>
                  <div className="absolute top-full mt-2 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center right-0">
                    Awaiting tenant security deposit payment
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={() => generateLeasePDF(lease)}
                  className="h-10 rounded-xl font-bold bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm flex-1 md:flex-none"
                >
                  <FileDown className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              )}
              <Button variant="outline" className="h-10 rounded-xl font-bold bg-white hover:bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] shadow-sm flex-1 md:flex-none">
                Manage Payments
              </Button>
              <Button variant="outline" className="h-10 rounded-xl font-bold bg-white hover:bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] shadow-sm flex-1 md:flex-none">
                View Invoices
              </Button>
              <Button className="h-10 rounded-xl font-bold bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm flex-1 md:flex-none">
                Quick Invoice
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] shrink-0 transition-colors">
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl border-[#E2E8F0] p-1 shadow-lg">
                  <DropdownMenuItem onClick={() => generateLeasePDF(lease)} className="cursor-pointer font-bold text-[#0F172A] rounded-lg py-2.5">
                    <FileDown className="mr-2 h-4 w-4 text-[#94A3B8]" /> Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer font-bold text-[#0F172A] rounded-lg py-2.5">
                    <ArrowUpRight className="mr-2 h-4 w-4 text-[#94A3B8]" /> Full Invoice Page
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)}
                    className="cursor-pointer font-bold text-[#0F172A] rounded-lg py-2.5"
                  >
                    <ShieldAlert className="mr-2 h-4 w-4 text-[#F59E0B]" /> Process Move-Out & Refund
                  </DropdownMenuItem>
                  {lease.status === "SIGNED" && (
                    <DropdownMenuItem
                      onClick={() => setShowConfirmActivate(true)}
                      className="cursor-pointer font-bold text-indigo-600 rounded-lg py-2.5"
                    >
                      <KeyRound className="mr-2 h-4 w-4" /> Confirm Key Handover
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setShowConfirmTerminate(true)}
                    disabled={lease.status === "TERMINATED" || lease.status === "EXPIRED" || lease.status === "DRAFT"}
                    className="cursor-pointer font-bold text-[#EF4444] rounded-lg py-2.5 focus:text-[#EF4444] focus:bg-[#FEE2E2]"
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Terminate Lease
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-[#F1F5F9] rounded-[16px] w-max">
        {(() => {
          let baseTabs = isTenant ? ['overview', 'payments', 'documents'] : ['overview', 'payments', 'documents', 'settings'];
          if (lease.moveOutStatus !== "NONE") {
            baseTabs.push('move-out');
          }
          return baseTabs;
        })().map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${
              activeTab === tab 
                ? 'bg-white text-[#0F172A] shadow-sm' 
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {isOwner && lease.moveOutStatus !== "NONE" && (
              <Card className="bg-white border-amber-200 bg-amber-50/10 shadow-sm rounded-[24px] p-6 border-l-4 border-l-amber-500">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-amber-500" /> Active Move-Out Pipeline
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Current Status: <strong className="text-slate-800">{
                        lease.status === "TERMINATED" ? "Lease Closed / Terminated" :
                        lease.moveOutStatus === "MOVE_OUT_REQUESTED" ? "Move-Out Requested (Awaiting Action)" :
                        lease.moveOutStatus === "INSPECTION_SCHEDULED" ? "Inspection Scheduled" :
                        lease.moveOutStatus === "OWNER_REVIEWING" ? "Inspection Completed (Pending Your Price Review)" :
                        lease.moveOutStatus === "INSPECTION_COMPLETED" ? "Awaiting Tenant Review" :
                        lease.moveOutStatus === "TENANT_ACCEPTED" ? "Statement Accepted" :
                        lease.moveOutStatus === "TENANT_DISPUTED" ? "Deductions Disputed" :
                        lease.moveOutStatus === "DISPUTE_FINALIZED" ? "Dispute Finalized" :
                        lease.moveOutStatus
                      }</strong>
                    </p>
                  </div>
                  <Button 
                    onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-9 text-xs rounded-xl shadow-none shrink-0"
                  >
                    Manage Move-Out
                  </Button>
                </div>
                
                {/* Stepper bar */}
                <div className="flex items-center justify-between w-full mt-4 pt-4 border-t border-slate-100">
                  {["Request", "Inspection", "Owner Review", "Tenant Review", "Settle", "Closed"].map((lbl, idx) => {
                    const activeIdx = (() => {
                      if (lease.status === "TERMINATED") return 5;
                      if (["TENANT_ACCEPTED", "DISPUTE_FINALIZED"].includes(lease.moveOutStatus)) return 4;
                      if (lease.moveOutStatus === "INSPECTION_COMPLETED") return 3;
                      if (lease.moveOutStatus === "OWNER_REVIEWING") return 2;
                      if (lease.moveOutStatus === "INSPECTION_SCHEDULED") return 1;
                      return 0;
                    })();
                    const isCompleted = idx < activeIdx;
                    const isActive = idx === activeIdx;

                    return (
                      <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 relative">
                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${
                          isCompleted ? "bg-blue-600 border-blue-600 text-white" :
                          isActive ? "bg-white border-blue-600 text-blue-600 font-extrabold scale-110" :
                          "bg-white border-slate-200 text-slate-400"
                        }`}>
                          {isCompleted ? "✓" : idx + 1}
                        </div>
                        <span className={`text-[9px] font-black text-center ${
                          isActive ? "text-blue-600 font-bold" : "text-slate-400"
                        }`}>
                          {lbl}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] p-6">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2 mb-6">
                <Building className="h-5 w-5 text-[#3B82F6]" /> Property Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Property</p>
                  <p className="text-base font-bold text-[#0F172A]">{lease.unit?.property?.name || "Unknown Property"}</p>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-[#64748B] mt-1.5">
                    <MapPin className="h-4 w-4" />
                    {lease.unit?.property?.address}, {lease.unit?.property?.city}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Unit</p>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-center font-black text-[#0F172A] text-sm text-center p-1">
                      {lease.unit?.name ? lease.unit.name.replace(/Unit\s+/i, '').replace(/\s*\(.*?\)/, '') : "-"}
                    </div>
                    <div>
                      <p className="text-base font-bold text-[#0F172A]">
                        {lease.unit?.name?.toLowerCase().includes('unit') ? lease.unit.name : `Unit ${lease.unit?.name || ""}`}
                      </p>
                      <div className="flex items-center flex-wrap gap-2 mt-1">
                        <span className="text-[11px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md">{lease.unit?.rooms || 0} Bed</span>
                        <span className="text-[11px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md">{lease.unit?.bathrooms || 0} Bath</span>
                        <span className="text-[11px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md">{lease.unit?.sqFootage || 0} SqFt</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] p-6">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2 mb-6">
                <User className="h-5 w-5 text-[#3B82F6]" /> Tenant Information
              </h2>
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="h-20 w-20 rounded-[20px] bg-[#E2E8F0] border-4 border-white shadow-sm flex items-center justify-center text-2xl font-black text-[#64748B] shrink-0">
                  {lease.tenant?.name ? lease.tenant.name.substring(0,2).toUpperCase() : "U"}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 w-full">
                  <div>
                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">Full Name</p>
                    <p className="text-base font-bold text-[#0F172A]">{lease.tenant?.name || "Unknown Tenant"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">Role</p>
                    <span className="inline-flex bg-[#EFF6FF] text-[#3B82F6] text-xs font-bold px-2.5 py-1 rounded-md">Primary Tenant</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">Email</p>
                    <p className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#94A3B8]" /> {lease.tenant?.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">Phone</p>
                    <p className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[#94A3B8]" /> {lease.tenant?.phone || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] p-6">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2 mb-6">
                <FileText className="h-5 w-5 text-[#3B82F6]" /> Lease Terms & Rules
              </h2>
              <div className="space-y-4">
                <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
                  <h3 className="font-bold text-[#0F172A] text-sm mb-1">Standard Residential Agreement</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">This lease is a standard fixed-term residential agreement. Rent is due on the 1st of every month. A late fee will be applied on the 5th day of the month if rent is not received in full.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Pets Allowed</p>
                    <p className="text-sm font-black text-[#0F172A] mt-1">No</p>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Smoking</p>
                    <p className="text-sm font-black text-[#0F172A] mt-1">No</p>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Subletting</p>
                    <p className="text-sm font-black text-[#0F172A] mt-1">With Approval</p>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Insurance</p>
                    <p className="text-sm font-black text-[#0F172A] mt-1">Required</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] p-6">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2 mb-6">
                <Calendar className="h-5 w-5 text-[#F59E0B]" /> Lease Summary
              </h2>
              <div className="space-y-5">
                <div className="flex justify-between items-center pb-4 border-b border-[#F1F5F9]">
                  <div>
                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Start Date</p>
                    <p className="font-bold text-[#0F172A]">{lease.startDate ? new Date(lease.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'}) : "N/A"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">End Date</p>
                    <p className="font-bold text-[#0F172A]">{lease.endDate ? new Date(lease.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'}) : "N/A"}</p>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#0F172A] mb-2">
                    <span>Duration Progress</span>
                    <span>{calculateProgress()}%</span>
                  </div>
                  <div className="relative h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-[#F59E0B] rounded-full transition-all duration-1000"
                      style={{ width: `${calculateProgress()}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Tenant Preliminary Walkthrough Remedy List */}
            {isTenant && lease.preliminaryInspectionStatus === "COMPLETED" && lease.preliminaryDeductions && (
              <Card className="bg-white border-purple-200 shadow-sm rounded-[24px] p-6 space-y-4">
                <h2 className="text-lg font-bold text-purple-900 flex items-center gap-2 pb-3 border-b border-purple-100">
                  <ShieldAlert className="h-5 w-5 text-purple-600" /> Preliminary Walkthrough Results
                </h2>
                <div className="bg-purple-50 p-4 rounded-xl text-purple-800 text-sm font-medium mb-2">
                  <p>Your preliminary walkthrough was completed on {lease.preliminaryInspectionDate ? new Date(lease.preliminaryInspectionDate).toLocaleDateString() : "TBD"}. The following issues were flagged by the inspector.</p>
                  <p className="mt-2 font-bold text-purple-900">Please remedy these items before your final move-out date to avoid security deposit deductions.</p>
                </div>
                
                {Array.isArray(lease.preliminaryDeductions) && lease.preliminaryDeductions.length > 0 ? (
                  <div className="space-y-3">
                    {lease.preliminaryDeductions.map((d: any, idx: number) => (
                      <div key={idx} className="flex gap-3 items-start p-3 bg-white border border-slate-200 rounded-xl">
                        <div className="bg-amber-100 text-amber-600 h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <AlertCircle className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm">{d.description}</p>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Category: {d.category}</p>
                          {d.photoUrl && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-slate-100 max-w-[200px] shadow-sm bg-slate-50">
                              <img 
                                src={d.photoUrl} 
                                alt="Damage evidence" 
                                className="w-full h-32 object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                                onClick={() => window.open(d.photoUrl, '_blank')}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="font-bold text-sm">No issues were flagged during the preliminary walkthrough!</p>
                  </div>
                )}
              </Card>
            )}

            {/* Tenant Move-Out Status Timeline Widget */}
            {isTenant && lease.moveOutStatus !== "NONE" && (
              <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] p-6 space-y-6">
                <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2 pb-3 border-b border-[#F1F5F9]">
                  <Clock className="h-5 w-5 text-indigo-500" /> Move-Out Progress
                </h2>
                <div className="relative pl-6 border-l-2 border-slate-200 ml-3 space-y-6 text-sm">
                  {/* Step 1: Notice Submitted */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 h-4 w-4 rounded-full border-2 bg-white border-emerald-500 bg-emerald-500" />
                    <p className="font-bold text-slate-800">Notice Submitted</p>
                    <p className="text-xs text-slate-500">
                      {lease.moveOutRequestDate ? new Date(lease.moveOutRequestDate).toLocaleDateString() : ""}
                    </p>
                  </div>
                  {/* Step 2: Keys Confirmed */}
                  <div className="relative">
                    <div className={`absolute -left-[31px] top-0.5 h-4 w-4 rounded-full border-2 bg-white ${
                      lease.keyReturnConfirmedAt ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"
                    }`} />
                    <p className="font-bold text-slate-800">Keys Confirmed</p>
                    <p className="text-xs text-slate-500">
                      {lease.keyReturnConfirmedAt
                        ? `Confirmed on ${new Date(lease.keyReturnConfirmedAt).toLocaleDateString()}`
                        : "Pending (Owner key return confirmation)"}
                    </p>
                  </div>
                  {/* Step 3: Inspection Completed */}
                  <div className="relative">
                    <div className={`absolute -left-[31px] top-0.5 h-4 w-4 rounded-full border-2 bg-white ${
                      ["INSPECTION_COMPLETED", "TENANT_ACCEPTED", "TENANT_DISPUTED", "DISPUTE_FINALIZED", "COMPLETED"].includes(lease.moveOutStatus)
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-slate-300 bg-white"
                    }`} />
                    <p className="font-bold text-slate-800">Inspection Completed</p>
                    <p className="text-xs text-slate-500">
                      {["INSPECTION_COMPLETED", "TENANT_ACCEPTED", "TENANT_DISPUTED", "DISPUTE_FINALIZED", "COMPLETED"].includes(lease.moveOutStatus)
                        ? "Inspection report ready for review"
                        : "Pending (Walkthrough scheduled)"}
                    </p>
                  </div>
                  {/* Step 4: Your Review */}
                  <div className="relative">
                    <div className={`absolute -left-[31px] top-0.5 h-4 w-4 rounded-full border-2 bg-white ${
                      ["TENANT_ACCEPTED", "COMPLETED"].includes(lease.moveOutStatus)
                        ? "border-emerald-500 bg-emerald-500"
                        : lease.moveOutStatus === "TENANT_DISPUTED"
                        ? "border-amber-500 bg-amber-500"
                        : lease.moveOutStatus === "DISPUTE_FINALIZED"
                        ? "border-red-500 bg-red-500"
                        : "border-slate-300 bg-white"
                    }`} />
                    <p className="font-bold text-slate-800">Your Review</p>
                    <div className="text-xs text-slate-500">
                      {lease.moveOutStatus === "INSPECTION_COMPLETED" && (
                        <div className="mt-2 space-y-1">
                          <p className="text-amber-600 font-bold">Action Required: Please review statement</p>
                          <Link href={`/dashboard/tenant/leases/${lease.id}/move-out`}>
                            <Button size="sm" className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs h-8 rounded-lg mt-1">
                              Review Statement
                            </Button>
                          </Link>
                        </div>
                      )}
                      {lease.moveOutStatus === "TENANT_ACCEPTED" && <p className="text-emerald-600 font-bold">Accepted</p>}
                      {lease.moveOutStatus === "TENANT_DISPUTED" && <p className="text-amber-600 font-bold">Disputed</p>}
                      {lease.moveOutStatus === "DISPUTE_FINALIZED" && <p className="text-red-650 font-bold">Dispute Finalized</p>}
                      {lease.moveOutStatus === "COMPLETED" && <p className="text-emerald-600 font-bold">Accepted</p>}
                      {!["INSPECTION_COMPLETED", "TENANT_ACCEPTED", "TENANT_DISPUTED", "DISPUTE_FINALIZED", "COMPLETED"].includes(lease.moveOutStatus) && "Pending inspection results"}
                    </div>
                  </div>
                  {/* Step 5: Deposit Refund Issued */}
                  <div className="relative">
                    <div className={`absolute -left-[31px] top-0.5 h-4 w-4 rounded-full border-2 bg-white ${
                      lease.moveOutStatus === "COMPLETED" ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"
                    }`} />
                    <p className="font-bold text-slate-800">Deposit Issued</p>
                    <p className="text-xs text-slate-500">
                      {lease.moveOutStatus === "COMPLETED" ? "Completed" : "Pending final statement processing"}
                    </p>
                  </div>
                </div>
              </Card>
            )}


            <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] p-6">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2 mb-6">
                <DollarSign className="h-5 w-5 text-[#10B981]" /> Financial Terms
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
                  <span className="font-bold text-[#64748B] text-sm">Monthly Rent</span>
                  <span className="text-base font-black text-[#0F172A]">${Number(lease.monthlyRent || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
                  <span className="font-bold text-[#64748B] text-sm">Security Deposit</span>
                  <span className="text-base font-black text-[#0F172A]">${Number(lease.securityDeposit || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
                  <span className="font-bold text-[#64748B] text-sm">Rent Due On</span>
                  <span className="text-base font-black text-[#0F172A]">Day {lease.rentDueDay || 1}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
                  <span className="font-bold text-[#64748B] text-sm">Grace Period</span>
                  <span className="text-base font-black text-[#0F172A]">{lease.gracePeriodDays || 5} Days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#64748B] text-sm">Late Fee</span>
                  <span className="text-base font-black text-[#0F172A]">
                    {lease.lateFeeAmount ? (
                      lease.lateFeeType === "PERCENTAGE" 
                        ? `${lease.lateFeeAmount}%` 
                        : `$${Number(lease.lateFeeAmount).toFixed(2)}`
                    ) : "None"}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] p-6 space-y-5">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2 pb-3 border-b border-[#F1F5F9]">
                <ShieldAlert className="h-5 w-5 text-indigo-500" /> Security Deposit Ledger
              </h2>

              {/* ── SECTION 1: Deposit Collection ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Deposit Collection</p>
                <div className="space-y-1.5 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between items-center">
                    <span>Required Amount:</span>
                    <span className="font-extrabold text-slate-900">${Number(lease.securityDeposit || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Paid:</span>
                    {(lease as any).depositPaidAt ? (
                      <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        ${Number((lease as any).depositPaidAmount || lease.securityDeposit || 0).toFixed(2)}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          {new Date((lease as any).depositPaidAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Awaiting Payment
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    {(() => {
                      const status = lease.depositStatus || "HELD";
                      const payout = lease.payoutRequests?.[0];
                      if (status === "HELD") return <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-200">Held in Escrow</span>;
                      if (status === "PENDING_ADMIN_PAYOUT" || payout?.status === "PENDING") return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded border border-amber-200 animate-pulse">Pending Disbursement</span>;
                      if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED" || payout?.status === "COMPLETED") return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200">Refunded</span>;
                      if (status === "FULLY_DEDUCTED") return <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-200">Fully Forfeited</span>;
                      return <span className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-bold rounded border border-slate-200">{status}</span>;
                    })()}
                  </div>
                </div>
              </div>

              {/* ── SECTION 2: Mid-Tenancy Deductions ── */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mid-Tenancy Deductions</p>
                  {(lease as any).depositDeductions?.length > 0 && (
                    <span className="text-[10px] text-red-600 font-bold">
                      -{(lease as any).depositDeductions.reduce((s: number, d: any) => s + Number(d.amount), 0).toFixed(2)}
                    </span>
                  )}
                </div>
                {(lease as any).depositDeductions?.length > 0 ? (
                  <div className="space-y-2">
                    {(lease as any).depositDeductions.map((d: any) => {
                      // Extract maintenance ticket ID from reference like DEPOSIT_DEDUCT_xxxxxx
                      const ticketRef = d.reference?.replace("DEPOSIT_DEDUCT_", "") || "";
                      return (
                        <div key={d.id} className="bg-red-50/60 border border-red-100 rounded-lg p-2.5 space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-600 font-semibold">
                              {new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} — Maintenance (Tenant Fault)
                            </span>
                            <span className="text-red-600 font-extrabold">-${Number(d.amount).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-mono">Ref: {d.reference}</span>
                            <Link
                              href={isTenant ? "/dashboard/maintenance/my-requests" : `/dashboard/maintenance?search=${ticketRef}`}
                              className="text-indigo-600 hover:underline font-bold"
                            >
                              View Ticket →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No deductions during tenancy.</p>
                )}

                {/* Current Balance */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs font-bold">
                  <span className="text-slate-700">Current Balance:</span>
                  <span className={`text-base font-black ${Number((lease as any).depositBalance || 0) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                    ${Number((lease as any).depositBalance || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* ── SECTION 3: Move-Out Deductions ── */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Move-Out Deductions</p>
                {Array.isArray(lease.deductions) && lease.deductions.length > 0 ? (
                  <div className="space-y-1.5">
                    {lease.deductions.map((d: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-red-50/50 p-2 rounded-lg border border-red-100/50 text-[11px]">
                        <span className="text-red-950 font-bold">
                          {d.description}
                          {d.photoUrl && (
                            <a href={d.photoUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-indigo-600 hover:underline">(Proof)</a>
                          )}
                        </span>
                        <span className="text-red-600 font-extrabold">-${Number(d.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    {lease.moveOutStatus === "NONE" ? "None logged — completed at move-out inspection." : "No move-out deductions recorded."}
                  </p>
                )}
              </div>

              {/* ── SECTION 4: Deposit Summary ── */}
              {(() => {
                const original = Number(lease.securityDeposit || 0);
                const midDeductions = (lease as any).depositDeductions?.reduce((s: number, d: any) => s + Number(d.amount), 0) || 0;
                const moveOutDeductions = Array.isArray(lease.deductions) ? lease.deductions.reduce((s: number, d: any) => s + Number(d.amount), 0) : 0;
                const estimatedRefund = Math.max(0, original - midDeductions - moveOutDeductions);
                const isFinalised = ["REFUNDED", "PARTIALLY_REFUNDED", "FULLY_DEDUCTED"].includes(lease.depositStatus || "");

                return (
                  <div className="space-y-1.5 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Deposit Summary</p>
                    <div className="space-y-1 text-[11px] font-semibold text-slate-600">
                      <div className="flex justify-between"><span>Original Deposit:</span><span className="font-extrabold text-slate-900">${original.toFixed(2)}</span></div>
                      {midDeductions > 0 && <div className="flex justify-between"><span>Mid-Tenancy Deductions:</span><span className="font-extrabold text-red-600">-${midDeductions.toFixed(2)}</span></div>}
                      {moveOutDeductions > 0 && <div className="flex justify-between"><span>Move-Out Deductions:</span><span className="font-extrabold text-red-600">-${moveOutDeductions.toFixed(2)}</span></div>}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm">
                      <span className="font-bold text-slate-900">{isFinalised ? "Final Refund:" : "Estimated Refund:"}</span>
                      <span className="text-base font-black text-emerald-600">${estimatedRefund.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Payout Disbursement Details */}
              {(() => {
                const payout = lease.payoutRequests?.[0];
                if (!payout) return null;
                return (
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Refund Disbursement Details</p>
                    <div className="space-y-1.5 text-[11px] font-semibold text-slate-600">
                      <div className="flex justify-between"><span>Payout Method:</span><span className="font-bold text-slate-900">{payout.bankName}</span></div>
                      <div className="flex justify-between"><span>Recipient Account:</span><span className="font-bold text-slate-900">{payout.accountName} (***{payout.accountNumber?.slice(-4) || "N/A"})</span></div>
                      {payout.disbursedAt && <div className="flex justify-between"><span>Disbursed Date:</span><span className="font-bold text-slate-900">{new Date(payout.disbursedAt).toLocaleDateString()}</span></div>}
                      {lease.refundRef && <div className="flex justify-between"><span>Reference / Check #:</span><span className="font-bold text-slate-900">{lease.refundRef}</span></div>}
                    </div>
                    {payout.status === "COMPLETED" && payout.proofUrl && (
                      <Button variant="outline" size="sm" className="w-full text-[11px] h-8 font-bold border-indigo-200 text-indigo-600 bg-indigo-50/30 hover:bg-indigo-50 rounded-lg" onClick={() => window.open(payout.proofUrl, "_blank")}>
                        <FileText className="h-3.5 w-3.5 mr-1.5" /> View Admin Payout Proof
                      </Button>
                    )}
                  </div>
                );
              })()}

              {/* Process Move-Out button — owner only */}
              {!isTenant && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl mt-1"
                  onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)}
                >
                  <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" /> Process Move-Out &amp; Refund
                </Button>
              )}
            </Card>

          </div>
        </div>
      )}

      {/* Payments Tab Content */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 rounded-[20px] shadow-sm border-[#E2E8F0]">
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Total Paid</p>
              <p className="text-2xl font-black text-[#0F172A]">${amountPaid.toLocaleString()}</p>
            </Card>
            <Card className="p-5 rounded-[20px] shadow-sm border-[#E2E8F0]">
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Upcoming Due</p>
              <p className="text-2xl font-black text-[#0F172A]">${upcomingDue.toLocaleString()}</p>
            </Card>
            <Card className="p-5 rounded-[20px] shadow-sm border-[#E2E8F0]">
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Overdue</p>
              <p className="text-2xl font-black text-[#EF4444]">${overdue.toLocaleString()}</p>
            </Card>
            <Card className="p-5 rounded-[20px] shadow-sm border-[#E2E8F0]">
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Total Lease Value</p>
              <p className="text-2xl font-black text-[#0F172A]">${totalLeaseValue.toLocaleString()}</p>
            </Card>
          </div>

          <Card className="p-6 rounded-[24px] shadow-sm border-[#E2E8F0]">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="font-bold text-[#0F172A] text-lg">Payment Progress</h3>
                <p className="text-sm font-medium text-[#64748B]">Amount paid against total expected lease value</p>
              </div>
              <p className="font-black text-[#10B981] text-lg">{paymentProgress}% Paid</p>
            </div>
            <div className="relative h-4 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-[#10B981] rounded-full transition-all duration-1000"
                style={{ width: `${paymentProgress}%` }}
              />
            </div>
          </Card>

          <Card className="p-0 rounded-[24px] shadow-sm border-[#E2E8F0] overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex justify-between items-center">
              <h3 className="font-bold text-[#0F172A] text-lg">Recent Payments</h3>
              <Button variant="outline" className="h-9 rounded-lg text-xs font-bold border-[#E2E8F0]" onClick={() => router.push(isTenant ? "/dashboard/payments/pay-rent" : "/dashboard/accounting/transactions")}>View All</Button>
            </div>
            <div className="p-6">
              {(() => {
                const paidInvoices = lease.invoices?.filter((inv: any) => inv.status === "PAID").sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()) || [];
                
                if (paidInvoices.length === 0) {
                  return (
                    <div className="text-center py-6">
                      <p className="text-sm font-medium text-[#64748B]">No recent payments found.</p>
                    </div>
                  );
                }
                
                return paidInvoices.map((inv: any, i: number) => (
                  <div key={inv.id || i} className="flex justify-between items-center py-4 border-b border-[#F1F5F9] last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-[#ECFDF5] text-[#10B981] rounded-full flex items-center justify-center shrink-0">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#0F172A] text-sm truncate">{Number(inv.amount) === Number(lease.securityDeposit) ? 'Security Deposit' : 'Rent Payment'}</p>
                        <p className="text-xs font-medium text-[#64748B] mt-0.5 truncate">Due on {new Date(inv.dueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-[#0F172A]">${Number(inv.amount || 0).toLocaleString()}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-[#DCFCE7] text-[#10B981] text-[10px] font-bold rounded-md uppercase">Paid</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </Card>
        </div>
      )}

      {/* Documents Tab Content */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-[24px] shadow-sm border border-[#E2E8F0]">
            <div>
              <h3 className="font-bold text-[#0F172A] text-lg">Lease Documents</h3>
              <p className="text-sm font-medium text-[#64748B]">Manage contracts, addendums, and condition reports</p>
            </div>
            <Button className="bg-[#3B82F6] hover:bg-[#2563EB] h-10 px-4 rounded-xl font-bold shadow-sm">
              <UploadCloud className="h-4 w-4 mr-2" /> Upload Document
            </Button>
          </div>

          {(lease.status === "ACTIVE" || lease.status === "SIGNED" || lease.status === "EXPIRED" || lease.status === "TERMINATED" || lease.status === "NOTICE_GIVEN") ? (
            <div className="space-y-4">
              <Card className="p-0 rounded-[24px] shadow-sm border-[#E2E8F0] overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-center py-4 border-b border-[#F1F5F9] last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0 border border-red-100">
                        <FileDown className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#0F172A] text-base truncate">Signed Lease Agreement</p>
                        <p className="text-xs font-medium text-[#64748B] mt-0.5 truncate">Auto-generated PDF • {new Date(lease.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {unpaidDepositInvoice ? (
                        <>
                          <span className="hidden md:inline-flex px-2.5 py-1 bg-slate-100 text-slate-500 text-[11px] font-bold rounded-lg uppercase tracking-wider mr-2 border border-slate-200">Locked</span>
                          <Button 
                            disabled
                            variant="outline" 
                            className="h-10 rounded-xl text-sm font-bold border-[#E2E8F0] text-slate-400 bg-slate-50 shadow-sm opacity-100 cursor-not-allowed"
                          >
                            <Lock className="h-4 w-4 mr-2" /> Locked
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="hidden md:inline-flex px-2.5 py-1 bg-[#ECFDF5] text-[#10B981] text-[11px] font-bold rounded-lg uppercase tracking-wider mr-2">Signed</span>
                          <Button 
                            onClick={() => generateLeasePDF(lease)}
                            variant="outline" 
                            className="h-10 rounded-xl text-sm font-bold border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50 shadow-sm"
                          >
                            Download
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Tenant Signature Record */}
              {lease.signatureImageUrl && (
                <Card className="p-0 rounded-[24px] shadow-sm border-[#E2E8F0] overflow-hidden relative">
                  {unpaidDepositInvoice && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center border border-slate-200 rounded-[24px]">
                      <div className="bg-slate-800 text-white p-4 rounded-2xl shadow-xl flex flex-col items-center max-w-[280px] text-center">
                        <Lock className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="font-bold text-sm">Signature Locked</p>
                        <p className="text-xs text-slate-300 mt-1">Pay the security deposit to unlock the full signature record.</p>
                      </div>
                    </div>
                  )}
                  <div className="px-6 py-4 border-b border-[#F1F5F9] flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h3 className="font-bold text-[#0F172A]">Tenant Signature Record</h3>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        Signed by {lease.tenant?.name} on {lease.signedAt ? new Date(lease.signedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-200 uppercase tracking-wider">Verified ✓</span>
                  </div>
                  <div className="p-6 flex flex-col items-center gap-4">
                    <div className="w-full max-w-sm bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-inner">
                      <img
                        src={lease.signatureImageUrl}
                        alt="Tenant Signature"
                        className="w-full h-32 object-contain p-3"
                      />
                      <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/50">
                        <p className="text-xs font-black text-slate-700">{lease.tenant?.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{lease.signedAt ? new Date(lease.signedAt).toLocaleString() : ''}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-semibold text-center max-w-sm">
                      This signature was electronically captured and is legally binding under the ESIGN Act / UETA.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-10 rounded-[24px] shadow-sm border-[#E2E8F0] flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="h-20 w-20 bg-[#F1F5F9] rounded-full flex items-center justify-center text-[#94A3B8] mb-6">
                <FileText className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">No signed lease available</h3>
              <p className="text-[#64748B] max-w-sm font-medium">The lease agreement must be signed before the official document is available.</p>
            </Card>
          )}
        </div>
      )}

      {/* Move-Out Tab Content */}
      {activeTab === 'move-out' && lease.moveOutStatus !== "NONE" && (
        <div className="space-y-6">
          <Card className="p-6 rounded-[24px] shadow-sm border-[#E2E8F0]">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-[#F59E0B]" /> Move-Out Request Details
                </h2>
                <p className="text-sm text-[#64748B] mt-1 font-medium">
                  {isOwner 
                    ? "Review the tenant's move-out request and generate a final disposition statement."
                    : "Your move-out request has been submitted and is currently being processed."}
                </p>
              </div>
              {isOwner && (
                <Button onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)} className="bg-[#0F172A] text-white hover:bg-[#1E293B] rounded-xl font-bold h-10 px-5 shadow-sm">
                  Generate Final Statement
                </Button>
              )}
            </div>

            {lease.isShortNotice && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-red-900">Short Notice Detected</h3>
                    <p className="text-sm text-red-700 mt-1">The tenant requested a move-out date that is less than the required {lease.moveOutNoticeDays} days notice. You may apply an Early Termination Fee of ${Number(lease.earlyTerminationFee || 0).toFixed(2)} on their final statement.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Requested Move-Out Date</p>
                <p className="text-base font-black text-[#0F172A] mt-1">{lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Reason for Moving</p>
                <p className="text-base font-bold text-[#0F172A] mt-1">{lease.moveOutReason || 'N/A'}</p>
              </div>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] md:col-span-2">
                <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Forwarding Address</p>
                <p className="text-sm font-bold text-[#0F172A] mt-1 whitespace-pre-wrap">{lease.forwardingAddress || 'Not provided'}</p>
                <p className="text-[10px] text-amber-600 font-bold uppercase mt-2">* Required for mailing the security deposit refund</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Settings Tab Content */}
      {activeTab === 'settings' && !isTenant && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 rounded-[24px] shadow-sm border-[#E2E8F0]">
            <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2 mb-6">
              <Settings className="h-5 w-5 text-[#3B82F6]" /> Lease Status Management
            </h2>
            <p className="text-sm text-[#64748B] mb-6 font-medium leading-relaxed">
              Manually transition the lease status. This action might trigger automated emails to the tenant depending on your platform settings.
            </p>
            <div className="space-y-4">
              <Button variant="outline" className="w-full justify-start h-12 rounded-xl border-[#E2E8F0] font-bold text-[#0F172A]">
                <CheckCircle className="h-4 w-4 mr-3 text-[#10B981]" /> Mark as Active
              </Button>
              <Button
                onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)}
                variant="outline"
                className="w-full justify-start h-12 rounded-xl border-[#E2E8F0] font-bold text-[#0F172A]"
              >
                <ShieldAlert className="h-4 w-4 mr-3 text-[#F59E0B]" /> Process Move-Out & Refund
              </Button>
              <Button
                onClick={() => setShowConfirmTerminate(true)}
                disabled={lease.status === "TERMINATED" || lease.status === "EXPIRED" || lease.status === "DRAFT"}
                variant="outline"
                className="w-full justify-start h-12 rounded-xl border-[#E2E8F0] font-bold text-[#0F172A] text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-3" /> Terminate Lease
              </Button>
            </div>
          </Card>

          <Card className="p-6 rounded-[24px] shadow-sm border-[#E2E8F0]">
            <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2 mb-6">
              <ShieldAlert className="h-5 w-5 text-[#F59E0B]" /> Permissions Overview
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <p className="text-xs font-bold text-[#94A3B8] uppercase">Can Edit</p>
                <p className="text-sm font-black text-[#10B981] mt-1">Yes</p>
              </div>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <p className="text-xs font-bold text-[#94A3B8] uppercase">Can Renew</p>
                <p className="text-sm font-black text-[#10B981] mt-1">Yes</p>
              </div>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <p className="text-xs font-bold text-[#94A3B8] uppercase">Can Sign</p>
                <p className="text-sm font-black text-[#EF4444] mt-1">No (Already Active)</p>
              </div>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <p className="text-xs font-bold text-[#94A3B8] uppercase">Collect Rent</p>
                <p className="text-sm font-black text-[#10B981] mt-1">Yes</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── 3-STEP E-SIGNATURE MODAL ─── */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[28px] shadow-2xl flex flex-col border border-slate-200 overflow-hidden" style={{ maxHeight: '92vh' }}>
            
            {/* Modal Header with Step Indicator */}
            <div className="px-7 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
              <div>
                <h2 className="text-xl font-black text-slate-900">Sign Lease Agreement</h2>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">Unit {lease.unit?.name} · {lease.unit?.property?.name}</p>
              </div>
              <div className="flex items-center gap-3">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-black transition-all ${
                    s < signStep ? 'bg-emerald-500 text-white' : s === signStep ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {s < signStep ? <CheckCircle className="h-4 w-4" /> : s}
                  </div>
                ))}
              </div>
            </div>

            {/* ── STEP 1: Terms & Conditions ── */}
            {signStep === 1 && (
              <>
                <div className="px-7 pt-5 pb-2">
                  <h3 className="text-base font-black text-slate-800">Read & Agree to Lease Terms</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Scroll to the bottom to proceed.</p>
                </div>
                <div
                  className="mx-7 mb-4 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50"
                  style={{ maxHeight: '50vh' }}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
                      setHasScrolledTerms(true);
                    }
                  }}
                >
                  <div className="p-5 space-y-5 text-sm text-slate-600 leading-relaxed">
                    {/* Platform Standard Terms */}
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black">P</span>
                        Platform Standard Terms
                      </h4>
                      <div className="space-y-2 text-xs">
                        <p><strong className="text-slate-800">1. Rent Payment:</strong> Rent is due on Day {lease.rentDueDay || 1} of each month. A grace period of {lease.gracePeriodDays || 5} days applies. Late fees of {lease.lateFeeType === 'PERCENTAGE' ? `${lease.lateFeeAmount}%` : `$${Number(lease.lateFeeAmount || 0).toFixed(2)}`} will be charged after the grace period.</p>
                        <p><strong className="text-slate-800">2. Security Deposit:</strong> A security deposit of ${Number(lease.securityDeposit || 0).toFixed(2)} is required. This will be held and refunded subject to the unit condition upon move-out.</p>
                        <p><strong className="text-slate-800">3. Maintenance:</strong> Tenants must report any maintenance issues promptly. Damage caused by tenant negligence may be deducted from the security deposit.</p>
                        <p><strong className="text-slate-800">4. Early Termination:</strong> Early termination before {new Date(lease.endDate).toLocaleDateString()} may result in a fee of ${Number(lease.earlyTerminationFee || 0).toFixed(2)}.</p>
                        <p><strong className="text-slate-800">5. Move-Out Notice:</strong> The Tenant agrees to provide a minimum of {lease.moveOutNoticeDays || 30} days written notice prior to terminating this lease or moving out.</p>
                        <p><strong className="text-slate-800">6. Renewal:</strong> You will be notified {lease.renewalNoticeDays || 60} days before the lease end date regarding renewal options.</p>
                        <p><strong className="text-slate-800">7. Privacy & Data:</strong> Your personal information is stored securely and used solely for property management purposes in accordance with applicable data protection laws.</p>
                        <p><strong className="text-slate-800">8. Electronic Signature:</strong> By signing below, you acknowledge this electronic signature is legally equivalent to a handwritten signature under applicable e-signature laws (ESIGN Act / UETA).</p>
                        <p><strong className="text-slate-800">9. Governing Law:</strong> This agreement shall be governed by the laws of the jurisdiction where the property is located.</p>
                      </div>
                    </div>

                    {/* Owner Custom Terms */}
                    {lease.customTerms && (
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm mb-2 flex items-center gap-2">
                          <span className="w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[10px] font-black">O</span>
                          Property-Specific Terms (Added by Owner)
                        </h4>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 whitespace-pre-wrap">
                          {lease.customTerms}
                        </div>
                      </div>
                    )}

                    {/* Lease Financial Summary */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                      <h4 className="font-extrabold text-indigo-900 text-sm mb-3">Lease Financial Summary</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                        <div><span className="text-slate-500">Monthly Rent:</span> <strong className="text-slate-900">${Number(lease.monthlyRent || 0).toLocaleString()}</strong></div>
                        <div><span className="text-slate-500">Security Deposit:</span> <strong className="text-slate-900">${Number(lease.securityDeposit || 0).toLocaleString()}</strong></div>
                        <div><span className="text-slate-500">Start Date:</span> <strong className="text-slate-900">{new Date(lease.startDate).toLocaleDateString()}</strong></div>
                        <div><span className="text-slate-500">End Date:</span> <strong className="text-slate-900">{new Date(lease.endDate).toLocaleDateString()}</strong></div>
                      </div>
                    </div>

                    <div className="text-center py-2 text-[11px] text-slate-400 font-semibold border-t border-slate-200 pt-4">
                      ✓ You've reached the end of the terms.
                    </div>
                  </div>
                </div>
                <div className="px-7 py-4 border-t border-slate-100 flex justify-between items-center">
                  <button onClick={() => setShowSignModal(false)} className="text-sm font-bold text-slate-400 hover:text-slate-600">Cancel</button>
                  <Button
                    onClick={() => setSignStep(2)}
                    disabled={!hasScrolledTerms}
                    className="h-11 px-8 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40"
                  >
                    {hasScrolledTerms ? 'I Have Read — Continue →' : 'Scroll to Read All Terms'}
                  </Button>
                </div>
              </>
            )}

            {/* ── STEP 2: Draw or Type Signature ── */}
            {signStep === 2 && (
              <>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap');`}</style>
                <div className="px-7 pt-5 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-800">Your Signature</h3>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">Choose how you want to sign your lease.</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setSignatureMode('draw')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${signatureMode === 'draw' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Draw
                      </button>
                      <button
                        onClick={() => setSignatureMode('type')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${signatureMode === 'type' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Type
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="px-7 pb-4 space-y-4 flex-1 overflow-y-auto">
                  {/* Signature Input Area */}
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50 relative h-[200px] flex items-center justify-center">
                    {signatureMode === 'draw' ? (
                      <>
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={200}
                          className="w-full h-full touch-none cursor-crosshair z-10"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                        {!canvasSignatureData && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                            <p className="text-slate-300 text-sm font-bold">Sign here...</p>
                          </div>
                        )}
                        <div className="absolute bottom-3 right-4 z-20">
                          <button onClick={clearCanvas} className="text-xs font-bold text-slate-400 hover:text-slate-600 bg-white/80 px-2 py-1 rounded backdrop-blur">Clear</button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full p-6 flex flex-col justify-center">
                        <input
                          type="text"
                          placeholder="Type your name here..."
                          value={typedSignature}
                          onChange={(e) => setTypedSignature(e.target.value)}
                          className="w-full bg-transparent text-center outline-none text-[#1E293B] placeholder:text-slate-300"
                          style={{ fontFamily: "'Caveat', cursive", fontSize: "56px" }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      <ShieldAlert className="inline h-3.5 w-3.5 text-slate-400 mr-1 -mt-0.5" />
                      By signing, you consent to legally binding electronic signatures. Your IP address and timestamp will be cryptographically attached to the final record to ensure non-repudiation under the ESIGN Act and UETA.
                    </p>
                  </div>

                  {/* Legal Name Confirmation */}
                  <div className="space-y-1.5 pt-2">
                    <label className="block text-sm font-bold text-slate-700">Confirm Full Legal Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Type your full legal name to confirm"
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-medium text-slate-900 text-sm"
                    />
                    <p className="text-[11px] font-semibold text-slate-400">Must exactly match: <strong className="text-slate-700">{lease.tenant?.name}</strong></p>
                  </div>
                </div>
                <div className="px-7 py-4 border-t border-slate-100 flex justify-between">
                  <Button variant="outline" onClick={() => setSignStep(1)} className="h-11 px-6 rounded-2xl font-bold border-slate-200">← Back</Button>
                  <Button
                    onClick={() => {
                      if (signatureMode === 'draw' && !canvasSignatureData) { toast.error("Please draw your signature first."); return; }
                      if (signatureMode === 'type' && !typedSignature.trim()) { toast.error("Please type your signature first."); return; }
                      if (!signatureName.trim()) { toast.error("Please type your legal name."); return; }
                      setSignStep(3);
                    }}
                    className="h-11 px-8 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Review & Continue →
                  </Button>
                </div>
              </>
            )}

            {/* ── STEP 3: Final Confirmation ── */}
            {signStep === 3 && (
              <>
                <div className="px-7 pt-5 pb-3">
                  <h3 className="text-base font-black text-slate-800">Confirm & Sign</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Review your signature before final submission.</p>
                </div>
                <div className="px-7 pb-4 space-y-5 flex-1 overflow-y-auto">
                  {/* Signature Preview */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Signature Preview</p>
                    </div>
                    {signatureMode === 'draw' && canvasSignatureData ? (
                      <img src={canvasSignatureData} alt="Signature Preview" className="w-full h-28 object-contain p-2 bg-white" />
                    ) : (
                      <div className="w-full h-28 flex items-center justify-center bg-white">
                        <span style={{ fontFamily: "'Caveat', cursive", fontSize: "48px" }} className="text-[#1E293B]">
                          {typedSignature || signatureName}
                        </span>
                      </div>
                    )}
                    <div className="bg-slate-50 px-4 py-2 border-t border-slate-200">
                      <p className="text-xs font-bold text-slate-800">{signatureName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{new Date().toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Final Checkbox */}
                  <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <input
                      type="checkbox" id="finalConsent"
                      checked={signatureConsent}
                      onChange={(e) => setSignatureConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                    />
                    <label htmlFor="finalConsent" className="text-xs font-semibold text-indigo-900 cursor-pointer leading-relaxed">
                      I, <strong>{signatureName || '___'}</strong>, acknowledge that this electronic signature is the legally binding equivalent of my handwritten signature under ESIGN/UETA law. I have read and agree to all terms of this lease agreement for <strong>Unit {lease.unit?.name}</strong> at <strong>{lease.unit?.property?.name}</strong>.
                    </label>
                  </div>
                </div>
                <div className="px-7 py-4 border-t border-slate-100 flex justify-between">
                  <Button variant="outline" onClick={() => setSignStep(2)} className="h-11 px-6 rounded-2xl font-bold border-slate-200">← Back</Button>
                  <Button
                    onClick={handleRequestOtp}
                    disabled={signing || !signatureConsent}
                    className="h-11 px-8 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-40"
                  >
                    {signing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : 'Request OTP & Continue →'}
                  </Button>
                </div>
              </>
            )}

            {/* ── STEP 4: OTP Verification ── */}
            {signStep === 4 && (
              <>
                <div className="px-7 pt-5 pb-3">
                  <h3 className="text-base font-black text-slate-800">Verify Your Identity</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">We sent a 6-digit code to your email.</p>
                </div>
                <div className="px-7 pb-4 space-y-5 flex-1 overflow-y-auto">
                  <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-2xl">
                    <Mail className="h-12 w-12 text-indigo-500 mb-4" />
                    <p className="text-sm font-bold text-slate-700 text-center mb-4">
                      Enter the 6-digit verification code sent to <br />
                      <span className="text-indigo-600">{lease.tenant?.email}</span>
                    </p>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="------"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-[280px] text-center text-4xl tracking-[0.4em] font-mono font-black px-4 py-4 rounded-xl border-2 border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none text-slate-900 bg-white placeholder:text-slate-300"
                    />
                    <button onClick={handleRequestOtp} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline mt-4">
                      Didn't receive it? Resend Code
                    </button>
                  </div>
                </div>
                <div className="px-7 py-4 border-t border-slate-100 flex justify-between">
                  <Button variant="outline" onClick={() => setSignStep(3)} className="h-11 px-6 rounded-2xl font-bold border-slate-200">← Back</Button>
                  <Button
                    onClick={handleVerifyOtpAndSign}
                    disabled={signing || otp.length !== 6}
                    className="h-11 px-8 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-40"
                  >
                    {signing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</> : '✓ Verify & Sign Lease'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ScheduleInspectionModal
        leaseId={params.id as string}
        open={scheduleInspectionType !== null}
        onOpenChange={(open) => { if (!open) setScheduleInspectionType(null); }}
        onSuccess={fetchLease}
        moveOutDate={lease?.moveOutDate}
        defaultType={scheduleInspectionType ?? "FINAL"}
      />
      <SelfInspectionModal
        leaseId={params.id as string}
        unit={lease?.unit}
        open={selfInspectMode !== null}
        onOpenChange={(open) => { if (!open) setSelfInspectMode(null); }}
        onSuccess={fetchLease}
        isPreliminary={selfInspectMode === "preliminary"}
        preliminaryDeductions={selfInspectMode === "preliminary" ? undefined : lease?.preliminaryDeductions}
      />
      <BypassConfirmationModal
        leaseId={params.id as string}
        open={showBypassModal}
        onOpenChange={setShowBypassModal}
        onSuccess={fetchLease}
      />
      <ConfirmDialog
        open={showConfirmActivate}
        onOpenChange={setShowConfirmActivate}
        title="Confirm Key Handover"
        description="Confirm that the tenant has physically received the keys and has moved in. This will activate the lease and mark the unit as Occupied."
        confirmLabel="Confirm Activation"
        confirmVariant="default"
        onConfirm={handleActivateLease}
      />
      <ConfirmDialog
        open={showConfirmTerminate}
        onOpenChange={setShowConfirmTerminate}
        title="Terminate Lease"
        description="Are you sure you want to terminate this lease? The unit will be marked as vacant, but the lease record will be preserved."
        confirmLabel="Terminate Lease"
        confirmVariant="destructive"
        onConfirm={handleTerminateLease}
      />
      <ConfirmDialog
        open={showConfirmSkipPrelim}
        onOpenChange={setShowConfirmSkipPrelim}
        title="Skip Preliminary Walkthrough"
        description="Are you sure you want to skip the preliminary walkthrough?"
        confirmLabel="Skip Walkthrough"
        confirmVariant="destructive"
        onConfirm={handleSkipPreliminaryWalkthrough}
      />
      <Dialog open={showKeyReturnModal} onOpenChange={setShowKeyReturnModal}>
        <DialogContent className="bg-white border-0 text-slate-800 rounded-3xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Confirm Key Handover</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-400">
              Record the actual move-out date to start the deposit return timer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmKeyReturn} className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actual Move-Out Date</Label>
              <Input
                type="date"
                required
                value={actualMoveOutDate}
                onChange={(e) => setActualMoveOutDate(e.target.value)}
                className="bg-slate-50 border-slate-200 rounded-xl h-11"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowKeyReturnModal(false)}
                className="flex-1 border border-slate-200 rounded-xl h-11 text-xs font-bold text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={confirmingKeyReturn}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 text-xs font-bold"
              >
                {confirmingKeyReturn ? "Confirming..." : "Confirm Key Return"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preliminary Walkthrough Modals are handled by unified consolidated modals above */}

      <Dialog open={showPrelimResultsModal} onOpenChange={setShowPrelimResultsModal}>
        <DialogContent className="bg-white border-0 text-slate-800 rounded-3xl max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-900">
              <ShieldAlert className="h-5 w-5 text-purple-600" /> Preliminary Walkthrough Results
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Findings logged during the preliminary walkthrough inspection.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4 max-h-[60vh] overflow-y-auto pr-1">
            {lease?.preliminaryInspectionNotes && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">General Notes</p>
                <p className="text-sm font-semibold text-slate-700">{lease.preliminaryInspectionNotes}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Flagged Issues ({lease?.preliminaryDeductions?.length || 0})</p>
              {Array.isArray(lease?.preliminaryDeductions) && lease.preliminaryDeductions.length > 0 ? (
                lease.preliminaryDeductions.map((d: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-slate-50/50 border border-slate-200 rounded-2xl">
                    <div className="bg-amber-100 text-amber-600 h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                      <AlertCircle className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm">{d.description}</p>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Category: {d.category}</p>
                      {d.photoUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-slate-100 max-w-[150px]">
                          <img 
                            src={d.photoUrl} 
                            alt="Damage evidence" 
                            className="w-full h-24 object-cover cursor-zoom-in"
                            onClick={() => window.open(d.photoUrl, '_blank')}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <CheckCircle className="h-5 w-5" />
                  <p className="font-bold text-sm">No issues were flagged during the preliminary walkthrough!</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
