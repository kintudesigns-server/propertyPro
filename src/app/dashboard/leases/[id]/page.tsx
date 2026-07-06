"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Building, Calendar, DollarSign, FileDown, FileText, User, MapPin, Phone, Mail, CheckCircle, Clock, XCircle, MoreVertical, CreditCard, UploadCloud, Settings, ShieldAlert, ArrowUpRight, Loader2 } from "lucide-react";
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

    setSigning(true);
    try {
      const res = await fetch(`/api/leases/${lease.id}/sign`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Lease signed successfully! Welcome to your new home.");
        setShowSignModal(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#DCFCE7] text-[#10B981] rounded-full text-xs font-bold shadow-sm"><CheckCircle className="h-3.5 w-3.5" /> Active Lease</span>;
      case "PENDING_SIGNATURE": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#FEF3C7] text-[#F59E0B] rounded-full text-xs font-bold shadow-sm"><Clock className="h-3.5 w-3.5" /> Pending Signature</span>;
      case "EXPIRED": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#FEE2E2] text-[#EF4444] rounded-full text-xs font-bold shadow-sm"><XCircle className="h-3.5 w-3.5" /> Expired</span>;
      case "TERMINATED": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#FEE2E2] text-[#EF4444] rounded-full text-xs font-bold shadow-sm"><XCircle className="h-3.5 w-3.5" /> Terminated</span>;
      case "DRAFT": return <span className="flex items-center gap-1.5 px-3 py-1 bg-[#F1F5F9] text-[#64748B] rounded-full text-xs font-bold shadow-sm"><FileText className="h-3.5 w-3.5" /> Draft</span>;
      default: return <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold shadow-sm">{status}</span>;
    }
  };

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

      {/* Action Banner for pending signature leases */}
      {isTenant && lease.status === "PENDING_SIGNATURE" && (
        <Card className={`p-5 rounded-[20px] shadow-sm border ${
          unpaidDepositInvoice 
            ? "bg-red-50 border-red-200 text-red-900" 
            : "bg-amber-50 border-amber-200 text-amber-900"
        } flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              <ShieldAlert className={`h-5 w-5 ${unpaidDepositInvoice ? "text-red-500" : "text-amber-500"}`} />
              {unpaidDepositInvoice ? "Security Deposit Required" : "Signature Required"}
            </h4>
            <p className="text-sm font-semibold opacity-90 mt-1">
              {unpaidDepositInvoice 
                ? `You must pay the security deposit of $${Number(lease.securityDeposit).toFixed(2)} before you can sign your lease.`
                : "You have verified your lease agreement and paid the security deposit. Please sign the lease contract to activate your tenancy."
              }
            </p>
          </div>
          {unpaidDepositInvoice ? (
            <Button
              onClick={() => handlePayInvoice(unpaidDepositInvoice.id)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-5 rounded-xl text-xs shadow-sm self-stretch md:self-auto shrink-0"
            >
              Pay Security Deposit
            </Button>
          ) : (
            <Button
              onClick={() => setShowSignModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 px-5 rounded-xl text-xs shadow-sm self-stretch md:self-auto shrink-0"
            >
              Review & Sign Lease
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
              {lease.status === "PENDING_SIGNATURE" && (
                <>
                  {unpaidDepositInvoice ? (
                    <Button
                      onClick={() => handlePayInvoice(unpaidDepositInvoice.id)}
                      className="h-10 rounded-xl font-bold bg-[#10B981] hover:bg-[#059669] text-white shadow-sm flex-1 md:flex-none"
                    >
                      <CreditCard className="mr-2 h-4 w-4" /> Pay Deposit (${Number(lease.securityDeposit).toFixed(2)})
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setShowSignModal(true)}
                      className="h-10 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex-1 md:flex-none"
                    >
                      Sign Lease
                    </Button>
                  )}
                </>
              )}
              <Button 
                onClick={() => generateLeasePDF(lease)}
                className="h-10 rounded-xl font-bold bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm flex-1 md:flex-none"
              >
                <FileDown className="mr-2 h-4 w-4" /> Download PDF
              </Button>
            </>
          ) : (
            <>
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

            <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] p-6 space-y-6">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2 pb-3 border-b border-[#F1F5F9]">
                <ShieldAlert className="h-5 w-5 text-indigo-500" /> Security Deposit Ledger
              </h2>
              
              {/* Deposit Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Deposit Status</span>
                {(() => {
                  const status = lease.depositStatus || "HELD";
                  const payout = lease.payoutRequests?.[0];
                  
                  if (status === "HELD") {
                    return <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200">Held (Collected)</span>;
                  }
                  if (status === "PENDING_ADMIN_PAYOUT" || (payout && payout.status === "PENDING")) {
                    return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 animate-pulse">Pending Admin Payout</span>;
                  }
                  if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED" || (payout && payout.status === "COMPLETED")) {
                    return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">Completed (Disbursed)</span>;
                  }
                  if (status === "FULLY_DEDUCTED") {
                    return <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200">Fully Forfeited</span>;
                  }
                  return <span className="px-2.5 py-1 bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200">{status}</span>;
                })()}
              </div>

              {/* Deposit Amount Breakdown */}
              <div className="space-y-2 text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Original Security Deposit:</span>
                  <span className="font-extrabold text-slate-900">${Number(lease.securityDeposit || lease.deposit || 0).toFixed(2)}</span>
                </div>

                {/* Render Deductions if present */}
                {Array.isArray(lease.deductions) && lease.deductions.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Itemized Damage Deductions</p>
                    {lease.deductions.map((d: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-red-50/50 p-2 rounded-lg border border-red-100/50 text-[11px]">
                        <span className="text-red-950 font-bold">
                          {d.description}
                          {d.photoUrl && (
                            <a href={d.photoUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-indigo-600 hover:underline">
                              (Proof)
                            </a>
                          )}
                        </span>
                        <span className="text-red-600 font-extrabold">-${Number(d.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Final Refund Calculation */}
                {(() => {
                  const original = Number(lease.securityDeposit || lease.deposit || 0);
                  const totalDeductions = Array.isArray(lease.deductions) 
                    ? lease.deductions.reduce((sum: number, d: any) => sum + Number(d.amount), 0)
                    : 0;
                  const refundAmount = original - totalDeductions;

                  return (
                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-900">Calculated Refund:</span>
                      <span className="text-base font-black text-emerald-600">${Math.max(0, refundAmount).toFixed(2)}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Payout & Receipt Audit Trail */}
              {(() => {
                const payout = lease.payoutRequests?.[0];
                if (!payout) return null;

                return (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Refund Disbursement Details</p>
                    <div className="space-y-1.5 text-[11px] font-semibold text-slate-600">
                      <div className="flex justify-between">
                        <span>Payout Method:</span>
                        <span className="font-bold text-slate-900">{payout.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recipient Account:</span>
                        <span className="font-bold text-slate-900">{payout.accountName} (***{payout.accountNumber?.slice(-4) || "N/A"})</span>
                      </div>
                      {payout.disbursedAt && (
                        <div className="flex justify-between">
                          <span>Disbursed Date:</span>
                          <span className="font-bold text-slate-900">{new Date(payout.disbursedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {lease.refundRef && (
                        <div className="flex justify-between">
                          <span>Reference / Check #:</span>
                          <span className="font-bold text-slate-900">{lease.refundRef}</span>
                        </div>
                      )}
                    </div>

                    {/* View Proof & Refund Receipt button */}
                    {payout.status === "COMPLETED" && (
                      <div className="space-y-2 pt-2">
                        {payout.proofUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-[11px] h-8 font-bold border-indigo-200 text-indigo-600 bg-indigo-50/30 hover:bg-indigo-50 rounded-lg flex items-center justify-center gap-1.5"
                            onClick={() => window.open(payout.proofUrl, "_blank")}
                          >
                            <FileText className="h-3.5 w-3.5" /> View Admin Payout Proof
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-[11px] h-8 font-bold border-slate-200 text-slate-700 bg-slate-50/50 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-1.5"
                          onClick={() => {
                            // Find receipt document in lease documents or fall back
                            toast.info("Notice document is accessible in the Documents tab.");
                          }}
                        >
                          <FileDown className="h-3.5 w-3.5" /> View Refund Receipt Document
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
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
                    <span className="hidden md:inline-flex px-2.5 py-1 bg-[#ECFDF5] text-[#10B981] text-[11px] font-bold rounded-lg uppercase tracking-wider mr-2">Signed</span>
                    <Button 
                      onClick={() => generateLeasePDF(lease)}
                      variant="outline" 
                      className="h-10 rounded-xl text-sm font-bold border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50 shadow-sm"
                    >
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
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

      {/* E-Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900">Sign Lease Agreement</h2>
              <button 
                onClick={() => setShowSignModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-sm font-semibold text-amber-900">
                <p>By electronically signing this document, you are legally binding yourself to the terms and conditions outlined in the lease agreement for <strong>Unit {lease.unit?.name}</strong> at <strong>{lease.unit?.property?.name}</strong>.</p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700">Digital Signature <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Type your full legal name"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium text-slate-900"
                />
                <p className="text-[11px] font-medium text-slate-500">Must exactly match: <strong>{lease.tenant?.name}</strong></p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="consent"
                  checked={signatureConsent}
                  onChange={(e) => setSignatureConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                />
                <label htmlFor="consent" className="text-sm font-medium text-slate-700 cursor-pointer leading-snug">
                  I acknowledge that this electronic signature is the legally binding equivalent of my handwritten signature. I have read, understand, and agree to all terms outlined in the Residential Lease Agreement.
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSignModal(false)}
                className="h-11 px-6 rounded-xl font-bold border-slate-200 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSignLease}
                disabled={signing || !signatureName.trim() || !signatureConsent}
                className="h-11 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signing ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Signing...</span>
                ) : (
                  "Confirm & Sign Lease"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
