"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Building, Calendar, DollarSign, FileDown, FileText, User, MapPin, Phone, Mail, CheckCircle, Clock, XCircle, MoreVertical, CreditCard, UploadCloud, Settings, ShieldAlert, ArrowUpRight, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { generateLeasePDF } from "@/lib/pdfGenerator";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function LeaseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: session } = useSession();
  const isTenant = (session?.user as any)?.role === "TENANT";

  const [signing, setSigning] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [signatureConsent, setSignatureConsent] = useState(false);
  const [signStep, setSignStep] = useState(1); // 1=terms, 2=draw signature, 3=confirm
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [canvasSignatureData, setCanvasSignatureData] = useState<string | null>(null);
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

  const handleConfirmSignLease = async () => {
    if (!signatureName.trim() || !signatureConsent) {
      toast.error("Please provide your signature and agree to the terms.");
      return;
    }
    if (lease.tenant?.name && signatureName.trim().toLowerCase() !== lease.tenant.name.toLowerCase()) {
      toast.error("Signature must exactly match your legal name on file.");
      return;
    }

    // Use the captured signature from state (since canvas is unmounted in Step 3)
    const signatureImageUrl = canvasSignatureData;

    setSigning(true);
    try {
      const res = await fetch(`/api/leases/${lease.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureImageUrl }),
      });
      if (res.ok) {
        toast.success("Lease signed successfully! Welcome to your new home.");
        setShowSignModal(false);
        setSignStep(1);
        setHasScrolledTerms(false);
        setCanvasSignatureData(null);
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
    if (!confirm("Are you sure you want to terminate this lease? The unit will be marked as vacant, but the lease record will be preserved.")) return;
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
      case "EXPIRED": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#FEE2E2] text-[#EF4444] border border-[#FECACA] rounded-full text-xs font-bold shadow-sm"><XCircle className="h-3.5 w-3.5" /> Expired</span>;
      case "TERMINATED": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#FEE2E2] text-[#EF4444] border border-[#FECACA] rounded-full text-xs font-bold shadow-sm"><XCircle className="h-3.5 w-3.5" /> Terminated</span>;
      case "DRAFT": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] rounded-full text-xs font-bold shadow-sm"><FileText className="h-3.5 w-3.5" /> Draft</span>;
      default: return <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold shadow-sm">{status}</span>;
    }
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
      {isTenant && lease.status === "ACTIVE" && unpaidDepositInvoice && (
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
              {/* Step 2: Show Pay Deposit only after lease is ACTIVE */}
              {lease.status === "ACTIVE" && unpaidDepositInvoice && (
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
                  <DropdownMenuItem
                    onClick={handleTerminateLease}
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
        {(isTenant ? ['overview', 'payments', 'documents'] : ['overview', 'payments', 'documents', 'settings']).map(tab => (
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

          {(lease.status === "ACTIVE" || lease.status === "EXPIRED" || lease.status === "TERMINATED") ? (
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
              <p className="text-[#64748B] max-w-sm font-medium">The lease agreement must be signed and activated before the official PDF is available.</p>
            </Card>
          )}
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
                onClick={handleTerminateLease}
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
                        <p><strong className="text-slate-800">5. Renewal:</strong> You will be notified {lease.renewalNoticeDays || 60} days before the lease end date regarding renewal options.</p>
                        <p><strong className="text-slate-800">6. Privacy & Data:</strong> Your personal information is stored securely and used solely for property management purposes in accordance with applicable data protection laws.</p>
                        <p><strong className="text-slate-800">7. Electronic Signature:</strong> By signing below, you acknowledge this electronic signature is legally equivalent to a handwritten signature under applicable e-signature laws (ESIGN Act / UETA).</p>
                        <p><strong className="text-slate-800">8. Governing Law:</strong> This agreement shall be governed by the laws of the jurisdiction where the property is located.</p>
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

            {/* ── STEP 2: Draw Signature ── */}
            {signStep === 2 && (
              <>
                <div className="px-7 pt-5 pb-3">
                  <h3 className="text-base font-black text-slate-800">Draw Your Signature</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Use your mouse or finger to sign in the box below.</p>
                </div>
                <div className="px-7 pb-4 space-y-4 flex-1 overflow-y-auto">
                  {/* Signature Pad */}
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50 relative">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={200}
                      className="w-full touch-none cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    {!canvasSignatureData && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-slate-300 text-sm font-bold">Sign here...</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button onClick={clearCanvas} className="text-xs font-bold text-red-500 hover:text-red-600 underline">Clear & Redraw</button>
                  </div>

                  {/* Legal Name Confirmation */}
                  <div className="space-y-1.5">
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
                      if (!canvasSignatureData) { toast.error("Please draw your signature first."); return; }
                      if (!signatureName.trim()) { toast.error("Please type your legal name."); return; }
                      setSignStep(3);
                    }}
                    className="h-11 px-8 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Continue →
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
                    {canvasSignatureData && (
                      <img src={canvasSignatureData} alt="Signature Preview" className="w-full h-28 object-contain p-2 bg-white" />
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
                    onClick={handleConfirmSignLease}
                    disabled={signing || !signatureConsent}
                    className="h-11 px-8 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-40"
                  >
                    {signing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing...</> : '✓ Confirm & Sign Lease'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
