"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Building, Calendar, DollarSign, FileDown, FileText, User, MapPin, Phone, Mail, CheckCircle, Clock, XCircle, MoreVertical, CreditCard, UploadCloud, Settings, ShieldAlert, ArrowUpRight } from "lucide-react";
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

  useEffect(() => {
    const fetchLease = async () => {
      try {
        const res = await fetch('/api/leases');
        if (res.ok) {
          const data = await res.json();
          const found = data.find((l: any) => l.id === params.id);
          if (found) setLease(found);
          else toast.error("Lease not found");
        }
      } catch (err) {
        toast.error("Failed to load lease details");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchLease();
  }, [params.id]);

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

  const totalLeaseValue = Number(lease.monthlyRent || 0) * 12; // Approximation for demo
  const amountPaid = Number(lease.monthlyRent || 0) * 3; // Approximation for demo
  const paymentProgress = Math.round((amountPaid / totalLeaseValue) * 100) || 0;

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
            <Button 
              onClick={() => generateLeasePDF(lease)}
              className="h-10 rounded-xl font-bold bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm flex-1 md:flex-none"
            >
              <FileDown className="mr-2 h-4 w-4" /> Download PDF
            </Button>
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
                  <DropdownMenuItem className="cursor-pointer font-bold text-[#EF4444] rounded-lg py-2.5 focus:text-[#EF4444] focus:bg-[#FEE2E2]">
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
                    <div className="h-12 w-12 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-center font-black text-[#0F172A]">
                      {lease.unit?.name || "-"}
                    </div>
                    <div>
                      <p className="text-base font-bold text-[#0F172A]">Unit {lease.unit?.name}</p>
                      <div className="flex items-center gap-2 mt-1">
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
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <span className="font-bold text-[#64748B] text-sm">Monthly Rent</span>
                  <span className="text-lg font-black text-[#0F172A]">${Number(lease.monthlyRent || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <span className="font-bold text-[#64748B] text-sm">Security Deposit</span>
                  <span className="text-base font-black text-[#0F172A]">${Number(lease.deposit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <span className="font-bold text-[#64748B] text-sm">Late Fee</span>
                  <span className="text-base font-black text-[#0F172A]">$50.00</span>
                </div>
              </div>
            </Card>

            <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-[24px] p-6">
              <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2 mb-6">
                <ShieldAlert className="h-5 w-5 text-[#8B5CF6]" /> Security Deposit
              </h2>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-[#F5F3FF] text-[#8B5CF6] flex items-center justify-center shrink-0">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#64748B]">Status</p>
                  <p className="text-lg font-black text-[#0F172A]">Collected</p>
                </div>
              </div>
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
              <p className="text-2xl font-black text-[#0F172A]">${Number(lease.monthlyRent || 0).toLocaleString()}</p>
            </Card>
            <Card className="p-5 rounded-[20px] shadow-sm border-[#E2E8F0]">
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Overdue</p>
              <p className="text-2xl font-black text-[#EF4444]">$0.00</p>
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
              <Button variant="outline" className="h-9 rounded-lg text-xs font-bold border-[#E2E8F0]">View All</Button>
            </div>
            <div className="p-6">
              {/* Dummy rows for visual replica */}
              {[1, 2, 3].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-4 border-b border-[#F1F5F9] last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-[#ECFDF5] text-[#10B981] rounded-full flex items-center justify-center">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#0F172A] text-sm">Monthly Rent Payment</p>
                      <p className="text-xs font-medium text-[#64748B] mt-0.5">Paid on {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#0F172A]">${Number(lease.monthlyRent || 0).toLocaleString()}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-[#DCFCE7] text-[#10B981] text-[10px] font-bold rounded-md uppercase">Paid</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Documents Tab Content */}
      {activeTab === 'documents' && (
        <Card className="p-10 rounded-[24px] shadow-sm border-[#E2E8F0] flex flex-col items-center justify-center text-center min-h-[400px]">
          <div className="h-20 w-20 bg-[#F1F5F9] rounded-full flex items-center justify-center text-[#94A3B8] mb-6">
            <UploadCloud className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-bold text-[#0F172A] mb-2">No documents attached</h3>
          <p className="text-[#64748B] max-w-sm mb-6 font-medium">Upload signed lease agreements, addendums, or condition reports here.</p>
          <Button className="bg-[#3B82F6] hover:bg-[#2563EB] h-11 px-6 rounded-xl font-bold shadow-sm">
            Upload Document
          </Button>
        </Card>
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
              <Button variant="outline" className="w-full justify-start h-12 rounded-xl border-[#E2E8F0] font-bold text-[#0F172A]">
                <XCircle className="h-4 w-4 mr-3 text-[#EF4444]" /> Terminate Lease
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
    </div>
  );
}
