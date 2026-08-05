"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Building, Calendar, DollarSign, FileDown, FileText, User, MapPin, Phone, Mail, CheckCircle, CheckCircle2, Clock, XCircle, MoreVertical, CreditCard, UploadCloud, Settings, ShieldAlert, ArrowUpRight, Loader2, Lock, KeyRound, AlertCircle, TrendingUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
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
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";

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
  const { allowed: documentsAllowed } = useModuleAccess("documents");

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
        ctx.fillStyle = "#F2F2F7"; // Light background
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
      <div className="animate-spin h-8 w-8 border-4 border-[#007AFF] border-t-transparent rounded-full"></div>
    </div>;
  }

  if (!lease) {
    return <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <FileText className="h-12 w-12 text-[#94A3B8]" />
      <h2 className="text-xl font-semibold text-[#1D1D1F]">Lease Not Found</h2>
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
      inv.invoiceType === "DEPOSIT" &&
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
      case "DRAFT": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#F1F5F9] text-[#6E6E73] border border-[#E5E5EA] rounded-full text-xs font-bold shadow-sm"><FileText className="h-3.5 w-3.5" /> Draft</span>;
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
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 font-sans">
        <Link
          href={isTenant ? "/dashboard/tenant/leases" : "/dashboard/leases"}
          className="hover:text-slate-900 transition-colors flex items-center gap-1 font-medium text-xs text-slate-700 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Leases
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-black truncate max-w-[200px]">Lease {lease.id.substring(0, 8)}...</span>
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
        <Card className="p-5 rounded-3xl shadow-2xs border bg-amber-50/80 border-amber-200 text-amber-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-sans">
          <div>
            <h4 className="text-base font-semibold text-amber-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-700" />
              {lease.status === "NOTICE_GIVEN" ? "Move-Out Pending" : "Lease Terminated"}
            </h4>
            <p className="text-xs font-normal text-amber-800 mt-1">
              {lease.status === "NOTICE_GIVEN"
                ? `Tenant is scheduled to move out on ${lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "TBD"}. Use the pipeline below to manage each step.`
                : "This lease has ended and the unit is vacant."}
            </p>
          </div>
          {lease.status === "TERMINATED" && (
            <Button
              onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)}
              className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer"
            >
              View Final Statement
            </Button>
          )}
        </Card>
      )}

      {/* Optional: Preliminary Walkthrough */}
      {isOwner && ["MOVE_OUT_REQUESTED", "KEYS_RETURNED"].includes(lease.moveOutStatus) && lease.preliminaryInspectionStatus !== "SKIPPED" && (
        <Card className="p-5 rounded-3xl shadow-2xs border bg-purple-50/80 border-purple-200 text-purple-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-sans">
          <div>
            <h4 className="text-base font-semibold text-purple-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-purple-600" />
              Optional: Preliminary Walkthrough
            </h4>
            <p className="text-xs font-normal text-purple-800 mt-1">
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
                  className="h-9 border border-purple-200 bg-white text-purple-900 hover:bg-purple-50 font-medium text-xs px-4 rounded-xl shadow-2xs cursor-pointer"
                >
                  Skip
                </Button>
                <Button
                  onClick={() => setScheduleInspectionType("PRELIMINARY")}
                  className="h-9 bg-purple-900 hover:bg-purple-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer"
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
                className="h-9 bg-purple-900 hover:bg-purple-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer"
              >
                Start Walkthrough
              </Button>
            )}
            {lease.preliminaryInspectionStatus === "COMPLETED" && (
              <Button
                onClick={() => setShowPrelimResultsModal(true)}
                className="h-9 bg-purple-900 hover:bg-purple-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer"
              >
                View Results
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Owner Move-Out Pipeline — 4-Step Linear Wizard */}
      {isOwner && lease.status === "NOTICE_GIVEN" && (
        <Card className="rounded-3xl shadow-xs border border-slate-200 bg-white text-[#1D1D1F] overflow-hidden font-sans">
          {/* Panel Header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                Move-Out Pipeline
              </span>
              <h3 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight mt-2">Unit Turnover — 4 Steps</h3>
              <p className="text-xs font-normal text-[#6E6E73] mt-0.5">
                Tenant: <strong className="font-semibold text-[#1D1D1F]">{lease.tenant?.name}</strong>
                {" · "}Requested: <strong className="font-semibold text-[#1D1D1F]">{lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : "TBD"}</strong>
              </p>
            </div>
            {lease.depositDueBy && (() => {
              const daysLeft = Math.ceil((new Date(lease.depositDueBy).getTime() - Date.now()) / 86400000);
              const urgent = daysLeft <= 5;
              return (
                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs shadow-2xs shrink-0 ${urgent ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
                  <Clock className="h-4 w-4 text-amber-700" />
                  <div>
                    <p className="text-[10px] font-normal text-amber-700 uppercase tracking-wider">Deposit Deadline</p>
                    <p className="font-semibold text-xs text-amber-900">{daysLeft <= 0 ? "⚠️ OVERDUE" : `${daysLeft} days left`}</p>
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
                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold ${done ? "bg-emerald-600 border-emerald-600 text-white" : "bg-slate-900 border-slate-900 text-white"}`}>
                    {done ? "✓" : "1"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold text-[#1D1D1F] tracking-tight">Key Return &amp; Move-Out Date</p>
                      {done
                        ? <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs shrink-0">Done</span>
                        : <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs shrink-0">Action Needed</span>
                      }
                    </div>
                    {done ? (
                      <p className="text-xs text-[#6E6E73] font-normal mt-1">
                        Keys confirmed on {new Date(lease.actualMoveOutDate).toLocaleDateString()}.
                        {lease.depositDueBy && <> Deposit due by <strong className="font-semibold text-[#1D1D1F]">{new Date(lease.depositDueBy).toLocaleDateString()}</strong>.</>}
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-[#6E6E73] font-normal mt-1 leading-relaxed">
                          Confirm when keys are physically returned. This locks the move-out date and starts the 21-day legal deposit deadline.
                        </p>
                        <Button onClick={() => setShowKeyReturnModal(true)} className="mt-3 h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer flex items-center gap-1.5">
                          <KeyRound className="h-3.5 w-3.5" />Confirm Key Return
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
                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold ${inspectionDone ? "bg-emerald-600 border-emerald-600 text-white" : current ? "bg-white border-blue-600 text-blue-600" : "bg-slate-50 border-slate-200 text-[#6E6E73]"}`}>
                    {inspectionDone ? "✓" : "2"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold text-[#1D1D1F] tracking-tight">Property Inspection</p>
                      {inspectionDone
                        ? <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs shrink-0">Completed</span>
                        : inspectionScheduled
                        ? <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs shrink-0">Scheduled</span>
                        : locked
                        ? <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs shrink-0">Locked</span>
                        : <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs shrink-0">Action Needed</span>
                      }
                    </div>
                    {inspectionDone ? (
                      <p className="text-xs text-[#6E6E73] font-normal mt-1">
                        Inspection report submitted{lease.inspectionDate ? ` on ${new Date(lease.inspectionDate).toLocaleDateString()}` : ""}.
                      </p>
                    ) : inspectionScheduled ? (
                      <p className="text-xs text-[#6E6E73] font-normal mt-1">
                        Scheduled for {new Date(lease.inspectionDate).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}.
                        {lease.moveOutInspector && <> Inspector: {lease.moveOutInspector.name}.</>}
                      </p>
                    ) : locked ? (
                      <p className="text-xs text-[#6E6E73] font-normal mt-1">Confirm key return first to unlock inspection.</p>
                    ) : (
                      <>
                        <p className="text-xs text-[#6E6E73] font-normal mt-1 leading-relaxed">
                          Keys returned. You can now schedule an inspection or skip it if no damages are suspected.
                        </p>
                        <div className="flex flex-col gap-3 mt-4">
                          <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setSelfInspectMode("final")} className="relative overflow-hidden flex flex-col items-start p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-left transition-all group cursor-pointer shadow-2xs">
                              <div className="flex items-center gap-2 text-[#1D1D1F] font-semibold text-xs mb-1.5">
                                <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </div>
                                Self-Inspect
                              </div>
                              <p className="text-xs font-normal text-[#6E6E73] leading-relaxed">Use our guided room-by-room checklist with photo uploads.</p>
                            </button>
                            
                            <button onClick={() => setScheduleInspectionType("FINAL")} className="relative overflow-hidden flex flex-col items-start p-4 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-left transition-all group cursor-pointer shadow-2xs">
                              <div className="flex items-center gap-2 text-[#1D1D1F] font-semibold text-xs mb-1.5">
                                <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                                  <Settings className="h-3.5 w-3.5" />
                                </div>
                                Assign Inspector
                              </div>
                              <p className="text-xs font-normal text-[#6E6E73] leading-relaxed">Send a professional inspector from your team to the unit.</p>
                            </button>
                          </div>

                          <button onClick={() => setShowBypassModal(true)} className="relative overflow-hidden flex items-center justify-between p-3.5 bg-amber-50/50 border border-amber-200 hover:border-amber-300 rounded-2xl text-left transition-all group cursor-pointer shadow-2xs">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-xs mb-0.5">
                                <CheckCircle className="h-3.5 w-3.5 text-amber-700" /> 
                                Skip Inspection (Refund Full Deposit)
                              </div>
                              <p className="text-xs font-normal text-[#6E6E73]">Bypass physical inspection and advance directly to closing with zero deductions.</p>
                            </div>
                            <div className="h-7 w-7 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                              <ArrowUpRight className="h-3.5 w-3.5" />
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
                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold ${settled ? "bg-emerald-600 border-emerald-600 text-white" : needsAction ? "bg-white border-blue-600 text-blue-600" : inspectionDone ? "bg-white border-amber-600 text-amber-600" : "bg-slate-50 border-slate-200 text-[#6E6E73]"}`}>
                    {settled ? "✓" : "3"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold text-[#1D1D1F] tracking-tight">Review &amp; Price Deductions</p>
                      {settled
                        ? <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs shrink-0">Done</span>
                        : lease.moveOutStatus === "TENANT_DISPUTED"
                        ? <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs shrink-0">Disputed</span>
                        : lease.moveOutStatus === "INSPECTION_COMPLETED"
                        ? <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs shrink-0">Tenant Reviewing</span>
                        : needsAction
                        ? <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs shrink-0">Action Needed</span>
                        : locked
                        ? <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs shrink-0">Locked</span>
                        : null
                      }
                    </div>
                    {locked ? (
                      <p className="text-xs text-[#6E6E73] font-normal mt-1">Complete the inspection first to unlock this step.</p>
                    ) : (
                      <>
                        <p className="text-xs text-[#6E6E73] font-normal mt-1 leading-relaxed">
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
                            className="mt-3 h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer flex items-center gap-1.5"
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
                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold ${settled ? "bg-emerald-600 border-emerald-600 text-white" : ready ? "bg-emerald-50 border-emerald-600 text-emerald-800" : "bg-slate-50 border-slate-200 text-[#6E6E73]"}`}>
                    {settled ? "✓" : "4"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold text-[#1D1D1F] tracking-tight">Settle Deposit &amp; Close Lease</p>
                      {settled
                        ? <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs shrink-0">Closed</span>
                        : ready
                        ? <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs shrink-0">Ready</span>
                        : <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs shrink-0">Locked</span>
                      }
                    </div>
                    {settled ? (
                      <p className="text-xs text-[#6E6E73] font-normal mt-1">
                        Lease closed. Refund of <strong className="font-semibold text-[#1D1D1F]">${refund.toFixed(2)}</strong> issued via {lease.refundMethod === "ORIGINAL" ? "original payment method" : lease.refundMethod === "CHECK" ? "mailed check" : "bank transfer"}.
                      </p>
                    ) : ready ? (
                      <>
                        <p className="text-xs text-[#6E6E73] font-normal mt-1">
                          Tenant accepted. Issue the refund of <strong className="font-semibold text-emerald-700">${refund.toFixed(2)}</strong> and officially close the lease.
                        </p>
                        <Button onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)} className="mt-3 h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer flex items-center gap-1.5">
                          Finalize &amp; Process Refund
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-[#6E6E73] font-normal mt-1">Tenant must accept the statement before you can settle the deposit.</p>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        </Card>
      )}

      {/* Tenant banner: Limbo State for Move-Out */}
      {isTenant && (lease.status === "NOTICE_GIVEN" || lease.status === "TERMINATED") && (lease.status === "TERMINATED" || !lease.keyReturnConfirmedAt) && (
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs font-sans">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-900 shrink-0 shadow-2xs">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Lease Agreement</h1>
            <div className="flex items-center gap-2.5 mt-0.5">
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">ID: {lease.id.substring(0,8)}</span>
              {getStatusBadge(lease.status)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {isTenant ? (
            <>
              {/* Step 1: Always show Sign button when pending */}
              {lease.status === "PENDING_SIGNATURE" && (
                <Button
                  onClick={() => setShowSignModal(true)}
                  className="h-9 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex-1 md:flex-none cursor-pointer"
                >
                  Sign Lease
                </Button>
              )}
              {/* Step 2: Show Pay Deposit after lease is SIGNED or ACTIVE */}
              {(lease.status === "ACTIVE" || lease.status === "SIGNED") && unpaidDepositInvoice && (
                <Button
                  onClick={() => router.push('/dashboard/payments/pay-rent')}
                  className="h-9 rounded-xl font-black text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-xs flex-1 md:flex-none cursor-pointer"
                >
                  <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Pay Deposit (${Number(lease.securityDeposit).toFixed(2)})
                </Button>
              )}
              {unpaidDepositInvoice ? (
                <div className="group relative flex-1 md:flex-none">
                  <Button 
                    disabled
                    className="w-full h-9 rounded-xl font-medium text-xs bg-slate-100 text-slate-400 shadow-2xs opacity-100"
                  >
                    <Lock className="mr-1.5 h-3.5 w-3.5" /> Locked
                  </Button>
                  <div className="absolute top-full mt-2 w-48 p-2 bg-slate-900 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center font-bold">
                    Pay security deposit to unlock lease documents
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={() => generateLeasePDF(lease)}
                  className="h-9 rounded-xl font-black text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-xs flex-1 md:flex-none cursor-pointer"
                >
                  <FileDown className="mr-1.5 h-3.5 w-3.5" /> Download PDF
                </Button>
              )}
            </>
          ) : (
            <>
              {unpaidDepositInvoice ? (
                <div className="group relative flex-1 md:flex-none">
                  <Button 
                    disabled
                    className="w-full h-9 rounded-xl font-medium text-xs bg-slate-100 text-slate-400 shadow-2xs opacity-100"
                  >
                    <Lock className="mr-1.5 h-3.5 w-3.5" /> Locked
                  </Button>
                  <div className="absolute top-full mt-2 w-48 p-2 bg-slate-900 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center right-0 font-bold">
                    Awaiting tenant security deposit payment
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={() => generateLeasePDF(lease)}
                  className="h-9 rounded-xl font-black text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-xs flex-1 md:flex-none cursor-pointer"
                >
                  <FileDown className="mr-1.5 h-3.5 w-3.5" /> Download PDF
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setActiveTab('payments')}
                className="h-9 rounded-xl font-medium text-xs bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-2xs flex-1 md:flex-none cursor-pointer"
              >
                Manage Payments
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveTab('payments')}
                className="h-9 rounded-xl font-medium text-xs bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-2xs flex-1 md:flex-none cursor-pointer"
              >
                View Invoices
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/financials/invoices/new?leaseId=${lease.id}`)}
                className="h-9 rounded-xl font-medium text-xs bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-2xs flex-1 md:flex-none cursor-pointer"
              >
                <Plus className="mr-1 h-3.5 w-3.5 text-slate-500" /> Quick Invoice
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-900 shrink-0 transition-colors cursor-pointer">
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-200 p-1 shadow-xl font-sans">
                  <DropdownMenuItem onClick={() => generateLeasePDF(lease)} className="cursor-pointer font-medium text-xs text-slate-900 rounded-xl py-2">
                    <FileDown className="mr-2 h-4 w-4 text-slate-400" /> Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer font-medium text-xs text-slate-900 rounded-xl py-2">
                    <ArrowUpRight className="mr-2 h-4 w-4 text-slate-400" /> Full Invoice Page
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)}
                    className="cursor-pointer font-medium text-xs text-slate-900 rounded-xl py-2"
                  >
                    <ShieldAlert className="mr-2 h-4 w-4 text-amber-600" /> Process Move-Out &amp; Refund
                  </DropdownMenuItem>
                  {lease.status === "SIGNED" && (
                    <DropdownMenuItem
                      onClick={() => setShowConfirmActivate(true)}
                      className="cursor-pointer font-medium text-xs text-slate-900 rounded-xl py-2"
                    >
                      <KeyRound className="mr-2 h-4 w-4 text-slate-400" /> Confirm Key Handover
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setShowConfirmTerminate(true)}
                    disabled={lease.status === "TERMINATED" || lease.status === "EXPIRED" || lease.status === "DRAFT"}
                    className="cursor-pointer font-medium text-xs text-rose-600 rounded-xl py-2"
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Terminate Lease
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Tab Switcher — Standardized Segment Control */}
      <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl w-fit border border-slate-200/30">
        {(() => {
          let baseTabs = isTenant ? ['overview', 'payments', 'documents'] : ['overview', 'payments', 'documents', 'settings'];
          if (lease.moveOutStatus !== "NONE") {
            baseTabs.push('move-out');
          }
          return baseTabs;
        })().map(tab => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? "bg-white text-[#1D1D1F] shadow-2xs"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              {tab === "move-out" ? "Move-Out" : tab}
            </button>
          );
        })}
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {lease.moveOutStatus !== "NONE" && (
              <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl p-6 font-sans">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-amber-600" /> Active Move-Out Pipeline
                    </h2>
                    <p className="text-xs text-[#6E6E73] font-normal mt-1">
                      Current Status: <strong className="text-slate-900 font-extrabold">{
                        lease.status === "TERMINATED" ? "Lease Closed / Terminated" :
                        lease.moveOutStatus === "MOVE_OUT_REQUESTED" ? "Move-Out Requested" :
                        lease.moveOutStatus === "INSPECTION_SCHEDULED" ? "Walkthrough Scheduled" :
                        lease.moveOutStatus === "OWNER_REVIEWING" ? "Inspection Completed (Owner Pricing Review)" :
                        lease.moveOutStatus === "INSPECTION_COMPLETED" ? "Awaiting Tenant Review & Sign-off" :
                        lease.moveOutStatus === "TENANT_ACCEPTED" ? "Statement Accepted" :
                        lease.moveOutStatus === "TENANT_DISPUTED" ? "Deductions Disputed" :
                        lease.moveOutStatus === "DISPUTE_FINALIZED" ? "Dispute Finalized" :
                        lease.moveOutStatus
                      }</strong>
                    </p>
                  </div>
                  {isTenant ? (
                    <Link href={`/dashboard/tenant/leases/${lease.id}/move-out`}>
                      <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium h-9 text-xs rounded-xl shadow-xs shrink-0 cursor-pointer">
                        {lease.moveOutStatus === "INSPECTION_COMPLETED" ? "⚡ Review Statement & Deductions" : "View Move-Out Details"}
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-black h-9 text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
                    >
                      Manage Move-Out
                    </Button>
                  )}
                </div>
                
                {/* Stepper bar with Framer Motion Neon Green Line */}
                {(() => {
                  const steps = ["Request", "Inspection", "Owner Review", "Tenant Review", "Settle", "Closed"];
                  const activeIdx = (() => {
                    if (lease.status === "TERMINATED") return 5;
                    if (["TENANT_ACCEPTED", "DISPUTE_FINALIZED"].includes(lease.moveOutStatus)) return 4;
                    if (lease.moveOutStatus === "INSPECTION_COMPLETED") return 3;
                    if (lease.moveOutStatus === "OWNER_REVIEWING") return 2;
                    if (lease.moveOutStatus === "INSPECTION_SCHEDULED") return 1;
                    return 0;
                  })();
                  const fillPercent = (activeIdx / (steps.length - 1)) * 100;

                  return (
                    <div className="relative w-full mt-4 pt-4 border-t border-slate-100">
                      {/* Background track line */}
                      <div className="absolute top-[30px] left-5 right-5 h-1.5 bg-slate-100 rounded-full z-0 border border-slate-200/60" />
                      {/* Framer motion animated light class green line */}
                      <motion.div
                        className="absolute top-[30px] left-5 h-1.5 bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-400 rounded-full z-0 border border-emerald-400/80 shadow-2xs"
                        initial={{ width: "0%" }}
                        animate={{ width: `calc(${fillPercent}% * 0.92)` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />

                      <div className="relative z-10 flex items-center justify-between w-full">
                        {steps.map((lbl, idx) => {
                          const isCompleted = idx < activeIdx;
                          const isActive = idx === activeIdx;

                          return (
                            <div key={idx} className="flex flex-col items-center gap-1.5 relative">
                              <motion.div
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: isActive ? 1.15 : 1, opacity: 1 }}
                                transition={{ duration: 0.3, delay: idx * 0.08 }}
                                className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all ${
                                  isCompleted
                                    ? "bg-emerald-100 border-emerald-400 text-slate-900 shadow-2xs"
                                    : isActive
                                    ? "bg-emerald-200 border-emerald-400 text-slate-900 shadow-2xs ring-4 ring-emerald-100"
                                    : "bg-white border-slate-200 text-slate-400"
                                }`}
                              >
                                {isCompleted ? "✓" : idx + 1}
                              </motion.div>
                              <span
                                className={`text-[10px] font-extrabold text-center tracking-tight transition-colors ${
                                  isCompleted || isActive ? "text-slate-900 font-black" : "text-slate-400"
                                }`}
                              >
                                {lbl}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </Card>
            )}

            {/* ─── PROPERTY HERO BANNER WITH LIGHT WHITE GLASS EFFECT ─── */}
            {(() => {
              const coverImg =
                lease.unit?.property?.coverPhoto ||
                (lease.unit?.property?.images && lease.unit.property.images.length > 0
                  ? lease.unit.property.images[0]
                  : null);

              return (
                <div className="relative rounded-[28px] overflow-hidden shadow-sm border border-slate-200/80 bg-white text-slate-900 min-h-[220px] flex flex-col justify-between p-6 sm:p-7">
                  {/* Background Cover Image with Light Gradient White Overlay */}
                  {coverImg ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                      style={{ backgroundImage: `url(${coverImg})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/60 backdrop-blur-[2px]" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.08),transparent_60%)]" />
                    </div>
                  )}

                  {/* Foreground Content */}
                  <div className="relative z-10 flex flex-col justify-between h-full space-y-5">
                    {/* Top Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold tracking-wider uppercase bg-slate-900 text-white shadow-xs">
                        <Building className="h-3.5 w-3.5 text-indigo-400" />
                        Property Information
                      </span>

                      {lease.unit?.property?.id && (
                        <Link href={`/listings?search=${encodeURIComponent(lease.unit.property.name || "")}`} target="_blank">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white/90 hover:bg-white border-slate-200/90 shadow-xs rounded-xl transition-all"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5 mr-1 text-slate-500" /> View Listing Details
                          </Button>
                        </Link>
                      )}
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
                      {/* Property Title & Address (Left 7 Cols) */}
                      <div className="lg:col-span-7 space-y-2">
                        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                          {lease.unit?.property?.name || "Unknown Property"}
                        </h1>
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600">
                          <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>
                            {lease.unit?.property?.address}
                            {lease.unit?.property?.city ? `, ${lease.unit.property.city}` : ""}
                            {lease.unit?.property?.state ? `, ${lease.unit.property.state}` : ""}
                            {lease.unit?.property?.zip ? ` ${lease.unit.property.zip}` : ""}
                          </span>
                        </div>
                      </div>

                      {/* Unit Specs Card Badge (Right 5 Cols) */}
                      <div className="lg:col-span-5 bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-md rounded-2xl p-4 space-y-3 shrink-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                            Leased Unit Details
                          </span>
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shrink-0">
                            Assigned Unit
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                            {lease.unit?.name ? lease.unit.name.replace(/Unit\s+/i, '').replace(/\s*\(.*?\)/, '') : "-"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-slate-900 truncate">
                              {lease.unit?.name?.toLowerCase().includes('unit') ? lease.unit.name : `Unit ${lease.unit?.name || ""}`}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium truncate">{lease.unit?.type || "Residential Unit"}</p>
                          </div>
                        </div>

                        {/* 3 Specs Pills in a clean, non-overflowing grid */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
                          <div className="bg-slate-100/90 border border-slate-200 px-1.5 py-1 rounded-xl text-[11px] font-extrabold text-slate-700 truncate">
                            {lease.unit?.rooms ?? 0} Bed
                          </div>
                          <div className="bg-slate-100/90 border border-slate-200 px-1.5 py-1 rounded-xl text-[11px] font-extrabold text-slate-700 truncate">
                            {lease.unit?.bathrooms ?? 0} Bath
                          </div>
                          <div className="bg-slate-100/90 border border-slate-200 px-1.5 py-1 rounded-xl text-[11px] font-extrabold text-slate-700 truncate">
                            {lease.unit?.sqFootage ?? 0} SqFt
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ─── TENANT INFORMATION CARD ─── */}
            <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl p-6 space-y-4 font-sans">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 tracking-tight">
                  <User className="h-4 w-4 text-slate-700" /> Tenant Information
                </h2>
                <span className="inline-flex items-center gap-1 bg-slate-100 text-[#6E6E73] border border-slate-200/80 text-xs font-medium px-2.5 py-0.5 rounded-lg shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Primary Tenant
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white shadow-xs flex items-center justify-center text-lg font-semibold shrink-0 overflow-hidden border border-slate-200">
                  {lease.tenant?.avatar || (lease.tenant as any)?.image ? (
                    <img
                      src={lease.tenant.avatar || (lease.tenant as any).image}
                      alt={lease.tenant?.name || "Tenant profile photo"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    lease.tenant?.name ? lease.tenant.name.substring(0, 2).toUpperCase() : "U"
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 w-full text-xs">
                  <div>
                    <p className="text-xs font-normal text-[#6E6E73] mb-0.5">Full Name</p>
                    <p className="text-xs font-semibold text-[#1D1D1F]">{lease.tenant?.name || "Unknown Tenant"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-normal text-[#6E6E73] mb-0.5">Contact Status</p>
                    <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active Renter
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-normal text-[#6E6E73] mb-0.5">Email Address</p>
                    <p className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {lease.tenant?.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-normal text-[#6E6E73] mb-0.5">Phone Number</p>
                    <p className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5 truncate">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {lease.tenant?.phone || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* ─── LEASE TERMS & RULES CARD ─── */}
            <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl p-6 space-y-4 font-sans">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100 tracking-tight">
                <FileText className="h-4 w-4 text-slate-700" /> Lease Terms &amp; Rules
              </h2>
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                  <h3 className="font-semibold text-slate-900 text-xs mb-1">Standard Residential Agreement</h3>
                  <p className="text-xs text-[#6E6E73] leading-relaxed font-normal">
                    This lease is a standard fixed-term residential agreement. Rent is due on the 1st of every month. A late fee will be applied on the 5th day of the month if rent is not received in full.
                  </p>
                </div>

                {/* 4 Visual Rule Badges */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="bg-rose-50/70 border border-rose-200/80 p-3 rounded-2xl text-center space-y-1 shadow-2xs">
                    <p className="text-xs font-normal text-rose-800">Pets Allowed</p>
                    <p className="text-xs font-semibold text-rose-700 flex items-center justify-center gap-1">
                      <XCircle className="h-3.5 w-3.5 text-rose-600" /> No Pets
                    </p>
                  </div>

                  <div className="bg-rose-50/70 border border-rose-200/80 p-3 rounded-2xl text-center space-y-1 shadow-2xs">
                    <p className="text-xs font-normal text-rose-800">Smoking</p>
                    <p className="text-xs font-semibold text-rose-700 flex items-center justify-center gap-1">
                      <XCircle className="h-3.5 w-3.5 text-rose-600" /> Strictly No
                    </p>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-2xl text-center space-y-1 shadow-2xs">
                    <p className="text-xs font-normal text-amber-900">Subletting</p>
                    <p className="text-xs font-semibold text-amber-800 flex items-center justify-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> With Approval
                    </p>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-2xl text-center space-y-1 shadow-2xs">
                    <p className="text-xs font-normal text-emerald-900">Insurance</p>
                    <p className="text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Required
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6 font-sans">
            {/* ─── LEASE SUMMARY CARD ─── */}
            <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100 tracking-tight">
                <Calendar className="h-4 w-4 text-slate-700" /> Lease Summary
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-normal text-[#6E6E73] mb-1">Start Date</p>
                    <p className="font-semibold text-[#1D1D1F] text-xs">{lease.startDate ? new Date(lease.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'}) : "N/A"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-normal text-[#6E6E73] mb-1">End Date</p>
                    <p className="font-semibold text-[#1D1D1F] text-xs">{lease.endDate ? new Date(lease.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'}) : "N/A"}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-[#1D1D1F]">
                    <span>Lease Term Progress</span>
                    <span className="text-emerald-600 font-semibold">{calculateProgress()}%</span>
                  </div>
                  <div className="relative h-2.5 bg-slate-100/90 rounded-full overflow-hidden border border-slate-200/70 p-0.5 shadow-2xs">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                      initial={{ width: "0%" }}
                      animate={{ width: `${calculateProgress()}%` }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Tenant Preliminary Walkthrough Remedy List */}
            {isTenant && lease.preliminaryInspectionStatus === "COMPLETED" && lease.preliminaryDeductions && (
              <Card className="bg-white border border-purple-200 shadow-xs rounded-3xl p-6 space-y-4">
                <h2 className="text-base font-black text-purple-950 flex items-center gap-2 pb-3 border-b border-purple-100 tracking-tight">
                  <ShieldAlert className="h-4 w-4 text-purple-600" /> Preliminary Walkthrough Results
                </h2>
                <div className="bg-purple-50 p-4 rounded-2xl text-purple-900 text-xs font-semibold mb-2">
                  <p>Your preliminary walkthrough was completed on {lease.preliminaryInspectionDate ? new Date(lease.preliminaryInspectionDate).toLocaleDateString() : "TBD"}. The following issues were flagged by the inspector.</p>
                  <p className="mt-2 font-black text-purple-950">Please remedy these items before your final move-out date to avoid security deposit deductions.</p>
                </div>
                
                {Array.isArray(lease.preliminaryDeductions) && lease.preliminaryDeductions.length > 0 ? (
                  <div className="space-y-3">
                    {lease.preliminaryDeductions.map((d: any, idx: number) => (
                      <div key={idx} className="flex gap-3 items-start p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                        <div className="bg-amber-100 text-amber-600 h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-xs">{d.description}</p>
                          <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider mt-1">Category: {d.category}</p>
                          {d.photoUrl && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-slate-100 max-w-[200px] shadow-2xs bg-slate-50">
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
                  <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <p className="font-extrabold text-xs">No issues were flagged during the preliminary walkthrough!</p>
                  </div>
                )}
              </Card>
            )}

            {/* Tenant Move-Out Status Timeline Widget */}
            {isTenant && lease.moveOutStatus !== "NONE" && (
              <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl p-6 space-y-5 font-sans">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2 tracking-tight">
                    <Clock className="h-4 w-4 text-slate-700" /> Move-Out Progress
                  </h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                    Active Pipeline
                  </span>
                </div>

                <div className="relative pl-7 space-y-6 text-xs font-semibold">
                  {/* Vertical Connecting Track Line */}
                  <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-slate-200" />

                  {/* Step 1: Notice Submitted */}
                  <div className="relative flex items-start gap-3">
                    <div className="absolute -left-[27px] top-0.5 h-6 w-6 rounded-full border-2 bg-emerald-100 border-emerald-400 text-slate-900 shadow-2xs flex items-center justify-center text-[10px] font-black z-10">
                      ✓
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-xs">1. Move-Out Notice Submitted</p>
                      <p className="text-slate-500 text-[11px] font-semibold mt-0.5">
                        {lease.moveOutRequestDate ? new Date(lease.moveOutRequestDate).toLocaleDateString() : "Logged"}
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Walkthrough Inspection */}
                  {(() => {
                    const isDone = ["INSPECTION_COMPLETED", "TENANT_ACCEPTED", "TENANT_DISPUTED", "DISPUTE_FINALIZED", "COMPLETED"].includes(lease.moveOutStatus);
                    return (
                      <div className="relative flex items-start gap-3">
                        <div className={`absolute -left-[27px] top-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black z-10 transition-all ${
                          isDone ? "bg-emerald-100 border-emerald-400 text-slate-900 shadow-2xs" : "bg-white border-slate-300 text-slate-400"
                        }`}>
                          {isDone ? "✓" : "2"}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-xs">2. Walkthrough Inspection</p>
                          <p className="text-slate-500 text-[11px] font-semibold mt-0.5">
                            {isDone ? "Inspection report completed" : "Walkthrough inspection scheduled"}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Step 3: Statement Review */}
                  {(() => {
                    const isAccepted = ["TENANT_ACCEPTED", "COMPLETED"].includes(lease.moveOutStatus);
                    const isDisputed = lease.moveOutStatus === "TENANT_DISPUTED";
                    const isDisputeFinal = lease.moveOutStatus === "DISPUTE_FINALIZED";
                    const isNeedsReview = lease.moveOutStatus === "INSPECTION_COMPLETED";

                    return (
                      <div className="relative flex items-start gap-3">
                        <div className={`absolute -left-[27px] top-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black z-10 transition-all ${
                          isAccepted ? "bg-emerald-100 border-emerald-400 text-slate-900 shadow-2xs" :
                          isDisputed ? "bg-amber-100 border-amber-400 text-amber-950 shadow-2xs" :
                          isDisputeFinal ? "bg-rose-100 border-rose-400 text-rose-950 shadow-2xs" :
                          isNeedsReview ? "bg-amber-100 border-amber-400 text-amber-950 ring-4 ring-amber-100 shadow-2xs" :
                          "bg-white border-slate-300 text-slate-400"
                        }`}>
                          {isAccepted ? "✓" : "3"}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-slate-900 text-xs">3. Disposition Statement Review</p>
                          {isNeedsReview && (
                            <div className="mt-2 p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl shadow-2xs space-y-2">
                              <p className="text-amber-900 font-extrabold text-[11px]">⚡ Action Required: Please review final charges</p>
                              <Link href={`/dashboard/tenant/leases/${lease.id}/move-out`} className="block">
                                <Button size="sm" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-8 rounded-xl shadow-xs cursor-pointer">
                                  Review Statement &amp; Deductions
                                </Button>
                              </Link>
                            </div>
                          )}
                          {isAccepted && <p className="text-emerald-800 text-[11px] font-extrabold mt-0.5">Statement Accepted ✓</p>}
                          {isDisputed && <p className="text-amber-800 text-[11px] font-extrabold mt-0.5">Dispute Submitted (Under Review)</p>}
                          {isDisputeFinal && <p className="text-rose-800 text-[11px] font-extrabold mt-0.5">Dispute Finalized</p>}
                          {!isNeedsReview && !isAccepted && !isDisputed && !isDisputeFinal && (
                            <p className="text-slate-500 text-[11px] font-semibold mt-0.5">Awaiting inspection results &amp; pricing</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Step 4: Keys Handover */}
                  {(() => {
                    const isKeyDone = !!lease.keyReturnConfirmedAt;
                    return (
                      <div className="relative flex items-start gap-3">
                        <div className={`absolute -left-[27px] top-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black z-10 transition-all ${
                          isKeyDone ? "bg-emerald-100 border-emerald-400 text-slate-900 shadow-2xs" : "bg-white border-slate-300 text-slate-400"
                        }`}>
                          {isKeyDone ? "✓" : "4"}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-xs">4. Keys Handover &amp; Return</p>
                          <p className="text-slate-500 text-[11px] font-semibold mt-0.5">
                            {isKeyDone
                              ? `Confirmed on ${new Date(lease.keyReturnConfirmedAt).toLocaleDateString()}`
                              : "Handover keys to property manager"}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Step 5: Deposit Settlement */}
                  {(() => {
                    const isClosed = lease.moveOutStatus === "COMPLETED" || lease.status === "TERMINATED";
                    return (
                      <div className="relative flex items-start gap-3">
                        <div className={`absolute -left-[27px] top-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black z-10 transition-all ${
                          isClosed ? "bg-emerald-100 border-emerald-400 text-slate-900 shadow-2xs" : "bg-white border-slate-300 text-slate-400"
                        }`}>
                          {isClosed ? "✓" : "5"}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-xs">5. Security Deposit Settlement</p>
                          <p className="text-slate-500 text-[11px] font-semibold mt-0.5">
                            {isClosed ? "Deposit refund / settlement complete" : "Awaiting final statement processing"}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </Card>
            )}

            {/* ─── FINANCIAL TERMS CARD ─── */}
            <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100 tracking-tight">
                <DollarSign className="h-4 w-4 text-emerald-700" /> Financial Terms
              </h2>
              <div className="space-y-3 text-xs font-medium text-slate-600">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <span className="text-xs font-normal text-[#6E6E73]">Monthly Rent</span>
                  <span className="text-xs font-semibold text-[#1D1D1F]">${Number(lease.monthlyRent || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <span className="text-xs font-normal text-[#6E6E73]">Security Deposit</span>
                  <span className="text-xs font-semibold text-[#1D1D1F]">${Number(lease.securityDeposit || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <span className="text-xs font-normal text-[#6E6E73]">Rent Due On</span>
                  <span className="font-semibold text-[#1D1D1F] text-xs">Day {lease.rentDueDay || 1}</span>
                </div>
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <span className="text-xs font-normal text-[#6E6E73]">Grace Period</span>
                  <span className="font-semibold text-[#1D1D1F] text-xs">{lease.gracePeriodDays || 5} Days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-normal text-[#6E6E73]">Late Fee</span>
                  <span className="font-semibold text-[#1D1D1F] text-xs">
                    {lease.lateFeeAmount ? (
                      lease.lateFeeType === "PERCENTAGE" 
                        ? `${lease.lateFeeAmount}%` 
                        : `$${Number(lease.lateFeeAmount).toFixed(2)}`
                    ) : "None"}
                  </span>
                </div>
              </div>
            </Card>

          </div>
        </div>

        {/* Security Deposit Ledger — Full Width Card */}
        <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl p-6 space-y-6 mt-6 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 tracking-tight">
              <ShieldAlert className="h-4 w-4 text-slate-700" /> Security Deposit Ledger
            </h2>
            {!isTenant && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-medium border-slate-200 text-slate-900 hover:bg-slate-50 shadow-2xs rounded-xl shrink-0 cursor-pointer"
                onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)}
              >
                <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" /> Process Move-Out &amp; Refund
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* ── SECTION 1: Deposit Collection ── */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3">
              <p className="text-xs font-normal text-[#6E6E73]">Deposit Collection</p>
              <div className="space-y-2 text-xs font-medium text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Required Amount:</span>
                  <span className="font-semibold text-[#1D1D1F]">${Number(lease.securityDeposit || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Paid:</span>
                  {(lease as any).depositPaidAt ? (
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      ${Number((lease as any).depositPaidAmount || lease.securityDeposit || 0).toFixed(2)}
                      <span className="text-[10px] text-[#6E6E73] font-normal ml-1">
                        {new Date((lease as any).depositPaidAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Awaiting Payment
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span>Status:</span>
                  {(() => {
                    const status = lease.depositStatus || "HELD";
                    const payout = lease.payoutRequests?.[0];
                    if (status === "HELD") return <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-medium rounded border border-indigo-200">Held in Escrow</span>;
                    if (status === "PENDING_ADMIN_PAYOUT" || payout?.status === "PENDING") return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-medium rounded border border-amber-200 animate-pulse">Pending Disbursement</span>;
                    if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED" || payout?.status === "COMPLETED") return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded border border-emerald-200">Refunded</span>;
                    if (status === "FULLY_DEDUCTED") return <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-medium rounded border border-red-200">Fully Forfeited</span>;
                    return <span className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-medium rounded border border-slate-200">{status}</span>;
                  })()}
                </div>
              </div>
            </div>

            {/* ── SECTION 2: Mid-Tenancy Deductions ── */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-normal text-[#6E6E73]">Mid-Tenancy Deductions</p>
                  {(lease as any).depositDeductions?.length > 0 && (
                    <span className="text-xs text-red-600 font-semibold">
                      -{(lease as any).depositDeductions.reduce((s: number, d: any) => s + Number(d.amount), 0).toFixed(2)}
                    </span>
                  )}
                </div>
                {(lease as any).depositDeductions?.length > 0 ? (
                  <div className="space-y-2">
                    {(lease as any).depositDeductions.map((d: any) => {
                      const ticketRef = d.reference?.replace("DEPOSIT_DEDUCT_", "") || "";
                      return (
                        <div key={d.id} className="bg-red-50/60 border border-red-100 rounded-lg p-2 space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-600 font-medium truncate max-w-[140px]">
                              {new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} — Maint.
                            </span>
                            <span className="text-red-600 font-semibold">-${Number(d.amount).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[#6E6E73]">
                            <span className="font-mono">Ref: {d.reference}</span>
                            <Link
                              href={isTenant ? "/dashboard/maintenance/my-requests" : `/dashboard/maintenance?search=${ticketRef}`}
                              className="text-indigo-600 hover:underline font-medium"
                            >
                              View →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#6E6E73] font-normal italic">No deductions during tenancy.</p>
                )}
              </div>

              {/* Current Balance */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/80 text-xs font-medium mt-2">
                <span className="text-[#3C3C43]">Current Balance:</span>
                <span className={`text-sm font-semibold ${Number((lease as any).depositBalance || 0) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                  ${Number((lease as any).depositBalance || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* ── SECTION 3: Move-Out Deductions ── */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3">
              <p className="text-xs font-normal text-[#6E6E73]">Move-Out Deductions</p>
              {Array.isArray(lease.deductions) && lease.deductions.length > 0 ? (
                <div className="space-y-1.5">
                  {lease.deductions.map((d: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-red-50/50 p-2 rounded-lg border border-red-100/50 text-[11px]">
                      <span className="text-red-950 font-medium truncate max-w-[130px]">
                        {d.description}
                        {d.photoUrl && (
                          <a href={d.photoUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-indigo-600 hover:underline">(Proof)</a>
                        )}
                      </span>
                      <span className="text-red-600 font-semibold">-${Number(d.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6E6E73] font-normal italic">
                  {lease.moveOutStatus === "NONE" ? "None logged — completed at move-out." : "No move-out deductions recorded."}
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
                <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-normal text-[#6E6E73]">Deposit Summary</p>
                    <div className="space-y-1.5 text-[11px] font-medium text-slate-600">
                      <div className="flex justify-between"><span>Original Deposit:</span><span className="font-semibold text-[#1D1D1F]">${original.toFixed(2)}</span></div>
                      {midDeductions > 0 && <div className="flex justify-between"><span>Mid Deductions:</span><span className="font-semibold text-red-600">-${midDeductions.toFixed(2)}</span></div>}
                      {moveOutDeductions > 0 && <div className="flex justify-between"><span>Move-Out Deductions:</span><span className="font-semibold text-red-600">-${moveOutDeductions.toFixed(2)}</span></div>}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/80 text-xs font-medium mt-2">
                    <span className="text-[#1D1D1F]">{isFinalised ? "Final Refund:" : "Est. Refund:"}</span>
                    <span className="text-sm font-semibold text-emerald-600">${estimatedRefund.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Payout Disbursement Details */}
          {(() => {
            const payout = lease.payoutRequests?.[0];
            if (!payout) return null;
            return (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <p className="text-[10px] font-extrabold text-[#8E8E93] uppercase tracking-wider">Refund Disbursement Details</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[11px] font-semibold text-slate-600 bg-indigo-50/30 p-3.5 rounded-xl border border-indigo-100/60">
                  <div><span className="text-slate-400 block text-[10px] font-bold uppercase">Payout Method</span><span className="font-bold text-slate-900">{payout.bankName}</span></div>
                  <div><span className="text-slate-400 block text-[10px] font-bold uppercase">Recipient Account</span><span className="font-bold text-slate-900">{payout.accountName} (***{payout.accountNumber?.slice(-4) || "N/A"})</span></div>
                  {payout.disbursedAt && <div><span className="text-slate-400 block text-[10px] font-bold uppercase">Disbursed Date</span><span className="font-bold text-slate-900">{new Date(payout.disbursedAt).toLocaleDateString()}</span></div>}
                  {lease.refundRef && <div><span className="text-slate-400 block text-[10px] font-bold uppercase">Reference / Check #</span><span className="font-bold text-slate-900">{lease.refundRef}</span></div>}
                </div>
                {payout.status === "COMPLETED" && payout.proofUrl && (
                  <Button variant="outline" size="sm" className="w-full text-[11px] h-8 font-medium border-indigo-200 text-indigo-600 bg-indigo-50/30 hover:bg-indigo-50 rounded-lg" onClick={() => window.open(payout.proofUrl, "_blank")}>
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> View Admin Payout Proof
                  </Button>
                )}
              </div>
            );
          })()}
        </Card>
        </div>
      )}

      {/* Payments Tab Content */}
      {activeTab === 'payments' && (
        <div className="space-y-6 font-sans">
          {/* 4 Premium SaaS Animated KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Paid */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="relative overflow-hidden bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-normal text-[#6E6E73]">Total Paid</span>
                <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 flex items-center justify-center shadow-2xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">${amountPaid.toLocaleString()}</p>
                <p className="text-xs font-normal text-emerald-700 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Settled Payments
                </p>
              </div>
            </motion.div>

            {/* Card 2: Upcoming Due */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="relative overflow-hidden bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-normal text-[#6E6E73]">Upcoming Due</span>
                <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 flex items-center justify-center shadow-2xs">
                  <Clock className="h-4 w-4 text-slate-700" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">${upcomingDue.toLocaleString()}</p>
                <p className="text-xs font-normal text-[#6E6E73] flex items-center gap-1 mt-1">
                  Scheduled Next Cycle
                </p>
              </div>
            </motion.div>

            {/* Card 3: Overdue */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`relative overflow-hidden bg-white p-5 rounded-3xl border shadow-xs space-y-3 ${
                overdue > 0 ? "border-rose-300 bg-rose-50/30" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-normal text-[#6E6E73]">Overdue</span>
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shadow-2xs border ${
                  overdue > 0 ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-400 border-slate-200"
                }`}>
                  <AlertCircle className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className={`text-3xl font-semibold tracking-tight ${overdue > 0 ? "text-rose-600" : "text-[#1D1D1F]"}`}>
                  ${overdue.toLocaleString()}
                </p>
                <p className={`text-xs font-normal flex items-center gap-1 mt-1 ${overdue > 0 ? "text-rose-600" : "text-[#6E6E73]"}`}>
                  {overdue > 0 ? "Immediate Attention Required" : "No Overdue Balances"}
                </p>
              </div>
            </motion.div>

            {/* Card 4: Total Lease Value */}
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="relative overflow-hidden bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-normal text-[#6E6E73]">Total Lease Value</span>
                <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 flex items-center justify-center shadow-2xs">
                  <DollarSign className="h-4 w-4 text-slate-700" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">${totalLeaseValue.toLocaleString()}</p>
                <p className="text-xs font-normal text-[#6E6E73] flex items-center gap-1 mt-1">
                  Full Contract Value
                </p>
              </div>
            </motion.div>
          </div>

          {/* Glowing Neon Framer Motion Progress Bar */}
          <Card className="p-6 rounded-3xl shadow-xs border border-slate-200 bg-white space-y-4 font-sans">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900 text-base tracking-tight flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-700" /> Payment Progress
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Amount paid against total expected lease value</p>
              </div>

              {/* Glowing Neon Percentage Badge */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 px-3 py-1 rounded-md text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {paymentProgress}% Paid
              </motion.div>
            </div>

            {/* Neon Glowing Framer Motion Bar */}
            <div className="relative h-4 bg-slate-100 rounded-full p-0.5 border border-slate-200/80 overflow-hidden shadow-2xs">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: `${paymentProgress}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="relative h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 shadow-[0_0_14px_rgba(16,185,129,0.5)] overflow-hidden"
              >
                {/* Shimmer animation overlay */}
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/2"
                />
              </motion.div>
            </div>
          </Card>

          <Card className="p-0 rounded-3xl shadow-xs border border-slate-200 bg-white overflow-hidden font-sans">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 text-base tracking-tight">Recent Payments</h3>
              <Button variant="outline" className="h-8 px-3 rounded-xl text-xs font-medium border-slate-200 bg-white text-slate-900 shadow-2xs hover:bg-slate-50 cursor-pointer" onClick={() => router.push(isTenant ? "/dashboard/payments/pay-rent" : "/dashboard/accounting/transactions")}>View All</Button>
            </div>
            <div className="p-6">
              {(() => {
                const paidInvoices = lease.invoices?.filter((inv: any) => inv.status === "PAID").sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()) || [];
                
                if (paidInvoices.length === 0) {
                  return (
                    <div className="text-center py-6">
                      <p className="text-xs font-normal text-[#6E6E73]">No recent payments found.</p>
                    </div>
                  );
                }
                
                return paidInvoices.map((inv: any, i: number) => (
                  <div key={inv.id || i} className="flex justify-between items-center py-3.5 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3.5">
                      <div className="h-9 w-9 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1D1D1F] text-xs truncate">{inv.invoiceType === "DEPOSIT" ? 'Security Deposit' : 'Rent Payment'}</p>
                        <p className="text-xs font-normal text-[#6E6E73] mt-0.5 truncate">Due on {new Date(inv.dueDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-[#1D1D1F] text-xs">${Number(inv.amount || 0).toLocaleString()}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-medium rounded-md uppercase border border-emerald-200 tracking-wider shadow-2xs">Paid</span>
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
        <div className="space-y-6 font-sans">
          {/* Module access guard for Owners */}
          {isOwner && !documentsAllowed ? (
            <ModuleLockedBanner module="documents" />
          ) : (
            <>
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-xs border border-slate-200">
            <div>
              <h3 className="font-semibold text-slate-900 text-base tracking-tight">Lease Documents</h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Manage contracts, addendums, and condition reports</p>
            </div>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 rounded-xl font-medium text-xs shadow-xs cursor-pointer">
              <UploadCloud className="h-4 w-4 mr-2" /> Upload Document
            </Button>
          </div>

          {(lease.status === "ACTIVE" || lease.status === "SIGNED" || lease.status === "EXPIRED" || lease.status === "TERMINATED" || lease.status === "NOTICE_GIVEN") ? (
            <div className="space-y-4">
              <Card className="p-0 rounded-3xl shadow-xs border border-slate-200 bg-white overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs">
                        <FileDown className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">Signed Lease Agreement</p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate">Auto-generated PDF • {new Date(lease.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {unpaidDepositInvoice ? (
                        <>
                          <span className="hidden md:inline-flex px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-md uppercase tracking-wider mr-2 border border-slate-200 shadow-2xs">Locked</span>
                          <Button 
                            disabled
                            variant="outline" 
                            className="h-9 rounded-xl text-xs font-medium border-slate-200 text-slate-400 bg-slate-50 shadow-2xs opacity-100 cursor-not-allowed"
                          >
                            <Lock className="h-3.5 w-3.5 mr-1.5" /> Locked
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="hidden md:inline-flex px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-black rounded-md uppercase tracking-wider mr-2 border border-emerald-200 shadow-2xs">Signed</span>
                          <Button 
                            onClick={() => generateLeasePDF(lease)}
                            variant="outline" 
                            className="h-9 rounded-xl text-xs font-black border-slate-200 text-slate-900 hover:bg-slate-50 shadow-2xs cursor-pointer"
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
                <Card className="p-0 rounded-3xl shadow-xs border border-slate-200 bg-white overflow-hidden relative font-sans">
                  {unpaidDepositInvoice && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center border border-slate-200 rounded-3xl">
                      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-col items-center max-w-[280px] text-center">
                        <Lock className="h-7 w-7 text-slate-400 mb-2" />
                        <p className="font-black text-sm">Signature Locked</p>
                        <p className="text-xs text-slate-300 mt-1 font-medium">Pay the security deposit to unlock the full signature record.</p>
                      </div>
                    </div>
                  )}
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">Tenant Signature Record</h3>
                      <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
                        Signed by {lease.tenant?.name} on {lease.signedAt ? new Date(lease.signedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-black rounded-md border border-emerald-200 uppercase tracking-wider shadow-2xs">Verified ✓</span>
                  </div>
                  <div className="p-6 flex flex-col items-center gap-4">
                    <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                      <img
                        src={lease.signatureImageUrl}
                        alt="Tenant Signature"
                        className="w-full h-32 object-contain p-3"
                      />
                      <div className="border-t border-slate-100 px-4 py-2 bg-slate-50">
                        <p className="text-xs font-black text-slate-900">{lease.tenant?.name}</p>
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
            <Card className="p-10 rounded-3xl shadow-xs border border-slate-200 bg-white flex flex-col items-center justify-center text-center min-h-[300px] font-sans">
              <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4 border border-slate-200 shadow-2xs">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">No signed lease available</h3>
              <p className="text-xs font-semibold text-slate-500 max-w-sm">The lease agreement must be signed before the official document is available.</p>
            </Card>
          )}
          </>
          )}
        </div>
      )}

      {/* Move-Out Tab Content */}
      {activeTab === 'move-out' && lease.moveOutStatus !== "NONE" && (
        <div className="space-y-6 font-sans">
          <Card className="p-6 rounded-3xl shadow-xs border border-slate-200 bg-white space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600" /> Move-Out Request Details
                </h2>
                <p className="text-xs text-[#6E6E73] mt-1 font-normal">
                  {isOwner 
                    ? "Review the tenant's move-out request and generate a final disposition statement."
                    : "Your move-out request has been submitted and is currently being processed."}
                </p>
              </div>
              {isOwner && (
                <Button onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)} className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-medium text-xs h-9 px-4 shadow-xs cursor-pointer">
                  Generate Final Statement
                </Button>
              )}
            </div>

            {lease.isShortNotice && (
              <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl shadow-2xs">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-rose-950 text-sm">Short Notice Detected</h3>
                    <p className="text-xs font-normal text-rose-800 mt-1">The tenant requested a move-out date that is less than the required {lease.moveOutNoticeDays} days notice. You may apply an Early Termination Fee of ${Number(lease.earlyTerminationFee || 0).toFixed(2)} on their final statement.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p className="text-xs font-normal text-[#6E6E73]">Requested Move-Out Date</p>
                <p className="text-xs font-semibold text-[#1D1D1F] mt-1">{lease.moveOutDate ? new Date(lease.moveOutDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p className="text-xs font-normal text-[#6E6E73]">Reason for Moving</p>
                <p className="text-xs font-semibold text-[#1D1D1F] mt-1">{lease.moveOutReason || 'N/A'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs md:col-span-2">
                <p className="text-xs font-normal text-[#6E6E73]">Forwarding Address</p>
                <p className="text-xs font-semibold text-[#1D1D1F] mt-1 whitespace-pre-wrap">{lease.forwardingAddress || 'Not provided'}</p>
                <p className="text-xs text-amber-800 font-normal mt-2">* Required for mailing the security deposit refund</p>
              </div>
            </div>
          </Card>
        </div>
      )}


      {/* Settings Tab Content */}
      {activeTab === 'settings' && !isTenant && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
          <Card className="p-6 rounded-3xl shadow-xs border border-slate-200 bg-white">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4 text-slate-700" /> Lease Status Management
            </h2>
            <p className="text-xs text-[#6E6E73] mb-6 font-normal leading-relaxed">
              Manually transition the lease status. This action might trigger automated emails to the tenant depending on your platform settings.
            </p>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-11 rounded-xl border-slate-200 font-medium text-xs text-slate-900 hover:bg-slate-50 shadow-2xs cursor-pointer">
                <CheckCircle className="h-4 w-4 mr-2.5 text-emerald-600" /> Mark as Active
              </Button>
              <Button
                onClick={() => router.push(`/dashboard/leases/${lease.id}/move-out`)}
                variant="outline"
                className="w-full justify-start h-11 rounded-xl border-slate-200 font-medium text-xs text-slate-900 hover:bg-slate-50 shadow-2xs cursor-pointer"
              >
                <ShieldAlert className="h-4 w-4 mr-2.5 text-amber-600" /> Process Move-Out &amp; Refund
              </Button>
              <Button
                onClick={() => setShowConfirmTerminate(true)}
                disabled={lease.status === "TERMINATED" || lease.status === "EXPIRED" || lease.status === "DRAFT"}
                variant="outline"
                className="w-full justify-start h-11 rounded-xl border-slate-200 font-medium text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 shadow-2xs cursor-pointer"
              >
                <XCircle className="h-4 w-4 mr-2.5 text-rose-600" /> Terminate Lease
              </Button>
            </div>
          </Card>

          <Card className="p-6 rounded-3xl shadow-xs border border-slate-200 bg-white">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2 mb-6">
              <ShieldAlert className="h-4 w-4 text-amber-600" /> Permissions Overview
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p className="text-xs font-normal text-[#6E6E73]">Can Edit</p>
                <p className="text-xs font-semibold text-emerald-700 mt-1">Yes</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p className="text-xs font-normal text-[#6E6E73]">Can Renew</p>
                <p className="text-xs font-semibold text-emerald-700 mt-1">Yes</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p className="text-xs font-normal text-[#6E6E73]">Can Sign</p>
                <p className="text-xs font-semibold text-rose-600 mt-1">No (Already Active)</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p className="text-xs font-normal text-[#6E6E73]">Collect Rent</p>
                <p className="text-xs font-semibold text-emerald-700 mt-1">Yes</p>
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
                <p className="text-xs font-normal text-[#8E8E93] mt-0.5">Unit {lease.unit?.name} · {lease.unit?.property?.name}</p>
              </div>
              <div className="flex items-center gap-3">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-black transition-all ${
                    s < signStep ? 'bg-emerald-500 text-white' : s === signStep ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-[#8E8E93]'
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
                  <p className="text-xs font-normal text-[#8E8E93] mt-0.5">Scroll to the bottom to proceed.</p>
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
                      <h4 className="font-semibold text-slate-900 text-sm mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black">P</span>
                        Platform Standard Terms
                      </h4>
                      <div className="space-y-2 text-xs">
                        <p><strong className="text-[#1D1D1F]">1. Rent Payment:</strong> Rent is due on Day {lease.rentDueDay || 1} of each month. A grace period of {lease.gracePeriodDays || 5} days applies. Late fees of {lease.lateFeeType === 'PERCENTAGE' ? `${lease.lateFeeAmount}%` : `$${Number(lease.lateFeeAmount || 0).toFixed(2)}`} will be charged after the grace period.</p>
                        <p><strong className="text-[#1D1D1F]">2. Security Deposit:</strong> A security deposit of ${Number(lease.securityDeposit || 0).toFixed(2)} is required. This will be held and refunded subject to the unit condition upon move-out.</p>
                        <p><strong className="text-[#1D1D1F]">3. Maintenance:</strong> Tenants must report any maintenance issues promptly. Damage caused by tenant negligence may be deducted from the security deposit.</p>
                        <p><strong className="text-[#1D1D1F]">4. Early Termination:</strong> Early termination before {new Date(lease.endDate).toLocaleDateString()} may result in a fee of ${Number(lease.earlyTerminationFee || 0).toFixed(2)}.</p>
                        <p><strong className="text-[#1D1D1F]">5. Move-Out Notice:</strong> The Tenant agrees to provide a minimum of {lease.moveOutNoticeDays || 30} days written notice prior to terminating this lease or moving out.</p>
                        <p><strong className="text-[#1D1D1F]">6. Renewal:</strong> You will be notified {lease.renewalNoticeDays || 60} days before the lease end date regarding renewal options.</p>
                        <p><strong className="text-[#1D1D1F]">7. Privacy & Data:</strong> Your personal information is stored securely and used solely for property management purposes in accordance with applicable data protection laws.</p>
                        <p><strong className="text-[#1D1D1F]">8. Electronic Signature:</strong> By signing below, you acknowledge this electronic signature is legally equivalent to a handwritten signature under applicable e-signature laws (ESIGN Act / UETA).</p>
                        <p><strong className="text-[#1D1D1F]">9. Governing Law:</strong> This agreement shall be governed by the laws of the jurisdiction where the property is located.</p>
                      </div>
                    </div>

                    {/* Owner Custom Terms */}
                    {lease.customTerms && (
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm mb-2 flex items-center gap-2">
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
                        <div><span className="text-[#6E6E73]">Monthly Rent:</span> <strong className="text-[#1D1D1F]">${Number(lease.monthlyRent || 0).toLocaleString()}</strong></div>
                        <div><span className="text-[#6E6E73]">Security Deposit:</span> <strong className="text-[#1D1D1F]">${Number(lease.securityDeposit || 0).toLocaleString()}</strong></div>
                        <div><span className="text-[#6E6E73]">Start Date:</span> <strong className="text-[#1D1D1F]">{new Date(lease.startDate).toLocaleDateString()}</strong></div>
                        <div><span className="text-[#6E6E73]">End Date:</span> <strong className="text-[#1D1D1F]">{new Date(lease.endDate).toLocaleDateString()}</strong></div>
                      </div>
                    </div>

                    <div className="text-center py-2 text-[11px] text-[#8E8E93] font-normal border-t border-slate-200 pt-4">
                      ✓ You've reached the end of the terms.
                    </div>
                  </div>
                </div>
                <div className="px-7 py-4 border-t border-slate-100 flex justify-between items-center">
                  <button onClick={() => setShowSignModal(false)} className="text-sm font-bold text-[#8E8E93] hover:text-slate-600">Cancel</button>
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
                      <p className="text-xs font-normal text-[#8E8E93] mt-0.5">Choose how you want to sign your lease.</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setSignatureMode('draw')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${signatureMode === 'draw' ? 'bg-white shadow-sm text-indigo-600' : 'text-[#6E6E73] hover:text-slate-700'}`}
                      >
                        Draw
                      </button>
                      <button
                        onClick={() => setSignatureMode('type')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${signatureMode === 'type' ? 'bg-white shadow-sm text-indigo-600' : 'text-[#6E6E73] hover:text-slate-700'}`}
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
                          <button onClick={clearCanvas} className="text-xs font-medium text-[#8E8E93] hover:text-slate-600 bg-white/80 px-2 py-1 rounded backdrop-blur">Clear</button>
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
                    <p className="text-[11px] text-[#6E6E73] leading-relaxed font-medium">
                      <ShieldAlert className="inline h-3.5 w-3.5 text-[#8E8E93] mr-1 -mt-0.5" />
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
                    <p className="text-[11px] font-normal text-[#8E8E93]">Must exactly match: <strong className="text-[#3C3C43]">{lease.tenant?.name}</strong></p>
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
                  <p className="text-xs font-normal text-[#8E8E93] mt-0.5">Review your signature before final submission.</p>
                </div>
                <div className="px-7 pb-4 space-y-5 flex-1 overflow-y-auto">
                  {/* Signature Preview */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                      <p className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Your Signature Preview</p>
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
                      <p className="text-[10px] text-[#8E8E93] font-semibold">{new Date().toLocaleString()}</p>
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
                    className="h-11 px-8 rounded-2xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-40"
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
                  <p className="text-xs font-normal text-[#8E8E93] mt-0.5">We sent a 6-digit code to your email.</p>
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
                    <button onClick={handleRequestOtp} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 underline mt-4">
                      Didn't receive it? Resend Code
                    </button>
                  </div>
                </div>
                <div className="px-7 py-4 border-t border-slate-100 flex justify-between">
                  <Button variant="outline" onClick={() => setSignStep(3)} className="h-11 px-6 rounded-2xl font-bold border-slate-200">← Back</Button>
                  <Button
                    onClick={handleVerifyOtpAndSign}
                    disabled={signing || otp.length !== 6}
                    className="h-11 px-8 rounded-2xl font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-40"
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
        <DialogContent className="bg-white border border-slate-200 text-slate-900 rounded-3xl max-w-md p-6 font-sans shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900 tracking-tight">Confirm Key Handover</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500">
              Record the actual move-out date to start the deposit return timer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmKeyReturn} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Actual Move-Out Date</Label>
              <Input
                type="date"
                required
                value={actualMoveOutDate}
                onChange={(e) => setActualMoveOutDate(e.target.value)}
                className="bg-slate-50 border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 rounded-xl h-10 text-xs font-bold text-slate-900"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowKeyReturnModal(false)}
                className="flex-1 border border-slate-200 rounded-xl h-10 text-xs font-black text-slate-900 hover:bg-slate-50 shadow-2xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={confirmingKeyReturn}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 text-xs font-medium shadow-xs cursor-pointer"
              >
                {confirmingKeyReturn ? "Confirming..." : "Confirm Key Return"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preliminary Walkthrough Modals are handled by unified consolidated modals above */}

      <Dialog open={showPrelimResultsModal} onOpenChange={setShowPrelimResultsModal}>
        <DialogContent className="bg-white border border-slate-200 text-slate-900 rounded-3xl max-w-lg p-6 font-sans shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-slate-900 tracking-tight">
              <ShieldAlert className="h-5 w-5 text-amber-600" /> Preliminary Walkthrough Results
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500">
              Findings logged during the preliminary walkthrough inspection.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4 max-h-[60vh] overflow-y-auto pr-1">
            {lease?.preliminaryInspectionNotes && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider mb-1">General Notes</p>
                <p className="text-xs font-semibold text-slate-700">{lease.preliminaryInspectionNotes}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Flagged Issues ({lease?.preliminaryDeductions?.length || 0})</p>
              {Array.isArray(lease?.preliminaryDeductions) && lease.preliminaryDeductions.length > 0 ? (
                lease.preliminaryDeductions.map((d: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-2xs">
                    <div className="bg-amber-100 text-amber-600 h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-xs">{d.description}</p>
                      <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider mt-1">Category: {d.category}</p>
                      {d.photoUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-w-[150px] shadow-2xs">
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
                <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <p className="font-extrabold text-xs">No issues were flagged during the preliminary walkthrough!</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
