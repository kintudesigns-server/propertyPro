"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Mail, Phone, Calendar, DollarSign, Building, FileText, 
  CheckCircle2, Ban, ShieldAlert, Users, CreditCard, Wrench, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/admin/users/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          toast.error(data.error);
          router.push("/dashboard/admin/users");
        } else {
          setUser(data);
        }
      })
      .catch(() => toast.error("Failed to load user profile"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#3B82F6]" />
        <p className="text-[#64748B] font-bold text-sm uppercase tracking-wider">Loading user profile...</p>
      </div>
    );
  }

  if (!user) return null;

  const formatRole = (role: string) => {
    switch (role) {
      case "SUPERADMIN": return "Admin";
      case "OWNER": return "Property Owner";
      case "TENANT": return "Tenant";
      case "INSPECTOR": return "Inspector";
      default: return role;
    }
  };

  const maskSSN = (ssn?: string) => {
    if (!ssn) return "N/A";
    const cleaned = ssn.replace(/\D/g, "");
    return cleaned.length >= 4 ? `•••-••-${cleaned.slice(-4)}` : "•••-••-••••";
  };

  const maskAccount = (num?: string) => {
    if (!num) return "N/A";
    return num.length >= 4 ? `•••• ${num.slice(-4)}` : "•••• ••••";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/admin/users"
          className="p-2.5 bg-white border border-[#E2E8F0] rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">User Profile</h1>
          <p className="text-[#64748B] text-base mt-0.5">Unified view for {formatRole(user.role)} details</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar / Quick Info */}
        <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden text-center p-8">
            <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-3xl shadow-xl mb-4">
              {user.name?.charAt(0) || "U"}
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">{user.name}</h2>
            <p className="text-sm font-semibold text-[#64748B] mb-4">{user.email}</p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <Badge className="bg-[#E0F2FE] text-[#0369A1] border-0 rounded-lg px-3 py-1.5 font-bold">
                {formatRole(user.role)}
              </Badge>
              {user.tenantStatus === "Inactive" ? (
                <Badge className="bg-[#FEE2E2] text-[#EF4444] border-0 rounded-lg px-3 py-1.5 font-bold">
                  Inactive
                </Badge>
              ) : (
                <Badge className="bg-[#DCFCE7] text-[#16A34A] border-0 rounded-lg px-3 py-1.5 font-bold">
                  Active
                </Badge>
              )}
            </div>

            <div className="space-y-4 text-left border-t border-[#E2E8F0] pt-6">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-[#94A3B8]" />
                <span className="font-semibold text-[#0F172A]">{user.phone || "No phone provided"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-[#94A3B8]" />
                <span className="font-semibold text-[#0F172A]">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area with Tabs */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-2 flex gap-2 overflow-x-auto">
            <button 
              onClick={() => setActiveTab("overview")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${activeTab === "overview" ? "bg-slate-900 text-white shadow-md" : "text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A]"}`}
            >
              Overview & Background
            </button>
            
            {user.role === "TENANT" && (
              <button 
                onClick={() => setActiveTab("leases")}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${activeTab === "leases" ? "bg-slate-900 text-white shadow-md" : "text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A]"}`}
              >
                Lease History
              </button>
            )}

            {user.role === "OWNER" && (
              <button 
                onClick={() => setActiveTab("portfolio")}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${activeTab === "portfolio" ? "bg-slate-900 text-white shadow-md" : "text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A]"}`}
              >
                Property Portfolio
              </button>
            )}

            <button 
              onClick={() => setActiveTab("financials")}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${activeTab === "financials" ? "bg-slate-900 text-white shadow-md" : "text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A]"}`}
            >
              Financials & Bank
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="p-8 space-y-8">
                {user.role === "TENANT" ? (
                  <>
                    <div>
                      <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider mb-4">Tenant Background Check</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                          <p className="text-xs font-bold text-[#64748B]">Date of Birth</p>
                          <p className="font-semibold text-[#0F172A] mt-1">{user.dob || "N/A"}</p>
                        </div>
                        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                          <p className="text-xs font-bold text-[#64748B]">SSN (Masked)</p>
                          <p className="font-semibold text-[#0F172A] mt-1">{maskSSN(user.ssn)}</p>
                        </div>
                        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                          <p className="text-xs font-bold text-[#64748B]">Credit Score</p>
                          <p className="font-semibold text-indigo-600 mt-1">{user.creditScore || "N/A"}</p>
                        </div>
                        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                          <p className="text-xs font-bold text-[#64748B]">Employer & Position</p>
                          <p className="font-semibold text-[#0F172A] mt-1">{user.employer ? `${user.employer} (${user.position || "N/A"})` : "N/A"}</p>
                        </div>
                        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                          <p className="text-xs font-bold text-[#64748B]">Annual Income</p>
                          <p className="font-semibold text-emerald-600 mt-1">{user.annualIncome ? `$${Number(user.annualIncome).toLocaleString()}` : "N/A"}</p>
                        </div>
                        <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                          <p className="text-xs font-bold text-[#64748B]">Target Move-In</p>
                          <p className="font-semibold text-[#0F172A] mt-1">{user.targetMoveInDate || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider mb-4">Emergency Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                        <div>
                          <p className="text-xs font-bold text-[#64748B]">Name & Relationship</p>
                          <p className="font-semibold text-[#0F172A] mt-1">{user.emergencyName ? `${user.emergencyName} (${user.emergencyRelationship || "N/A"})` : "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#64748B]">Contact Info</p>
                          <p className="font-semibold text-[#0F172A] mt-1">
                            {user.emergencyPhone || ""} {user.emergencyEmail ? `| ${user.emergencyEmail}` : ""}
                            {!user.emergencyPhone && !user.emergencyEmail && "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : user.role === "OWNER" ? (
                  <div>
                    <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider mb-4">Subscription & Platform Tier</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 opacity-10">
                          <CreditCard className="w-24 h-24 text-blue-600" />
                        </div>
                        <p className="text-xs font-bold text-blue-800">Current Plan</p>
                        <p className="font-black text-xl text-blue-900 mt-1 capitalize truncate" title={user.pricingTier?.name || "Free Plan"}>
                          {user.pricingTier?.name || "Free Plan"}
                        </p>
                        <p className="text-xs font-semibold text-blue-600/80 mt-1">Platform Subscription</p>
                      </div>
                      
                      <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-[#E2E8F0]">
                        <p className="text-xs font-bold text-[#64748B]">Subscription Status</p>
                        <div className="mt-2">
                          {user.subscriptionStatus === "active" ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">Active</Badge>
                          ) : user.subscriptionStatus === "past_due" ? (
                            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0">Past Due</Badge>
                          ) : user.subscriptionStatus === "canceled" ? (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">Canceled</Badge>
                          ) : (
                            <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-0">No Active Subscription</Badge>
                          )}
                        </div>
                      </div>

                      <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-[#E2E8F0]">
                        <p className="text-xs font-bold text-[#64748B]">Stripe Customer ID</p>
                        <p className="font-mono text-sm text-[#0F172A] mt-2 font-semibold">
                          {user.stripeCustomerId || "Not configured"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider mb-4">Account Information</h3>
                    <p className="text-sm text-[#64748B]">This user is registered as a <span className="font-bold text-[#0F172A]">{formatRole(user.role)}</span>. Their specific workflow details are available in the other tabs.</p>
                  </div>
                )}
                
                {user.notes && (
                  <div>
                    <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider mb-4">Internal Admin Notes</h3>
                    <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-6 text-sm text-[#0F172A] font-medium leading-relaxed">
                      {user.notes}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LEASES TAB (Tenant) */}
            {activeTab === "leases" && user.role === "TENANT" && (
              <div className="p-8">
                <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider mb-4">Associated Leases</h3>
                {user.leases && user.leases.length > 0 ? (
                  <div className="space-y-4">
                    {user.leases.map((lease: any) => (
                      <div key={lease.id} className="border border-[#E2E8F0] p-5 rounded-2xl flex items-center justify-between bg-[#F8FAFC]">
                        <div>
                          <p className="font-bold text-[#0F172A] text-lg">{lease.unit?.property?.name || "Unknown Property"}</p>
                          <p className="text-sm font-semibold text-[#64748B]">Unit {lease.unit?.name || "N/A"} • ${Number(lease.monthlyRent).toLocaleString()}/mo</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-slate-200 text-slate-800 mb-2">{lease.status}</Badge>
                          <p className="text-xs font-bold text-[#94A3B8]">
                            {new Date(lease.startDate).toLocaleDateString()} - {new Date(lease.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-[#E2E8F0] rounded-2xl">
                    <p className="text-[#64748B] font-semibold">No lease records associated with this tenant.</p>
                  </div>
                )}
              </div>
            )}

            {/* PORTFOLIO TAB (Owner) */}
            {activeTab === "portfolio" && user.role === "OWNER" && (
              <div className="p-8">
                <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider mb-4">Owned Properties</h3>
                {user.ownedProperties && user.ownedProperties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {user.ownedProperties.map((prop: any) => (
                      <div key={prop.id} className="border border-[#E2E8F0] p-5 rounded-2xl flex items-start gap-4 bg-[#F8FAFC] hover:border-blue-300 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/properties/${prop.id}`)}>
                        <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                          <Building className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-[#0F172A]">{prop.name}</p>
                          <p className="text-sm font-medium text-[#64748B] mt-0.5">{prop.address}</p>
                          <p className="text-xs font-bold text-[#94A3B8] mt-1">{prop.city}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-[#E2E8F0] rounded-2xl">
                    <p className="text-[#64748B] font-semibold">No properties registered under this owner.</p>
                  </div>
                )}
              </div>
            )}

            {/* FINANCIALS TAB */}
            {activeTab === "financials" && (
              <div className="p-8 space-y-8">
                <div>
                  <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider mb-4">Ledger Balance</h3>
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 font-bold text-sm">Current Platform Balance</p>
                      <p className="text-4xl font-black mt-1">${Number(user.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                      <DollarSign className="h-7 w-7 text-white" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider mb-4">Connected Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F8FAFC] p-6 rounded-2xl border border-[#E2E8F0]">
                    <div>
                      <p className="text-xs font-bold text-[#64748B]">Bank Name</p>
                      <p className="font-semibold text-[#0F172A] mt-1">{user.bankName || "Not configured"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#64748B]">Account Holder</p>
                      <p className="font-semibold text-[#0F172A] mt-1">{user.accountName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#64748B]">Account Number</p>
                      <p className="font-semibold text-[#0F172A] mt-1">{maskAccount(user.accountNumber)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
