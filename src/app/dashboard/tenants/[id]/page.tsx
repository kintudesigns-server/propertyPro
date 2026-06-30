"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, User, PhoneCall, Briefcase, FileText, CheckCircle2, XCircle, Trash2, Edit, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function TenantDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const res = await fetch(`/api/tenants?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          setTenant(data);
        } else {
          toast.error("Tenant not found");
          router.push("/dashboard/tenants");
        }
      } catch (err) {
        toast.error("Error loading tenant details");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTenant();
  }, [id, router]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this tenant? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/tenants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Tenant deleted successfully");
        router.push("/dashboard/tenants");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete tenant");
      }
    } catch (err) {
      toast.error("An error occurred while deleting");
    }
  };

  if (loading) {
    return <div className="p-10 text-center font-bold text-[#64748B]">Loading Tenant Details...</div>;
  }
  if (!tenant) return null;

  const isActive = tenant.leases?.some((l: any) => l.status === "ACTIVE");
  const activeLease = tenant.leases?.find((l: any) => l.status === "ACTIVE");
  const allInvoices = tenant.leases?.flatMap((l: any) => l.invoices) || [];

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-col gap-2">
          <Link href="/dashboard/tenants" className="text-sm font-bold text-[#64748B] hover:text-[#3B82F6] flex items-center gap-2 mb-2 transition-colors w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to Tenants
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">{tenant.name}</h1>
            <div className="flex items-center gap-2">
              <Badge className={isActive || tenant.tenantStatus === "Active" ? "bg-[#DCFCE7] text-[#16A34A] hover:bg-[#DCFCE7] border-0 rounded-lg px-3 py-1 font-bold shadow-sm" : tenant.tenantStatus === "Approved" ? "bg-[#EFF6FF] text-[#3B82F6] hover:bg-[#EFF6FF] border-0 rounded-lg px-3 py-1 font-bold shadow-sm" : "bg-[#FEF9C3] text-[#CA8A04] hover:bg-[#FEF9C3] border-0 rounded-lg px-3 py-1 font-bold shadow-sm"}>
                {isActive ? "Active" : tenant.tenantStatus || "Pending Review"}
              </Badge>
              <Badge className="bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] rounded-lg px-3 py-1 font-bold shadow-sm">
                Tenant since {new Date(tenant.createdAt).toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <Link href={`/dashboard/tenants/${tenant.id}/edit`} className="flex-1 md:flex-none">
            <Button variant="outline" className="w-full border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] shadow-sm rounded-xl h-11 font-bold px-6">
              <Edit className="h-4 w-4 mr-2" /> Edit Tenant
            </Button>
          </Link>
          <Button 
            disabled={isActive}
            onClick={handleDelete}
            className={`flex-1 md:flex-none bg-white border shadow-sm rounded-xl h-11 font-bold px-6 ${isActive ? 'text-gray-400 border-gray-200 opacity-50 cursor-not-allowed' : 'text-red-500 border-red-200 hover:bg-red-50'}`}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans wide on large screens) */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {/* Personal Information */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
              <User className="h-5 w-5 text-[#3B82F6]" />
              <h2 className="font-bold text-[#0F172A] text-lg">Personal Information</h2>
            </div>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                <div className="h-24 w-24 rounded-full bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center font-black text-4xl ring-4 ring-[#EFF6FF]/50 shrink-0">
                  {tenant.name ? tenant.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <h3 className="font-extrabold text-[#0F172A] text-2xl">{tenant.name}</h3>
                  <p className="text-sm font-semibold text-[#64748B] mt-1">Tenant ID: {tenant.id.substring(0, 8).toUpperCase()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
                  <div className="text-sm font-bold text-[#64748B]">First Name</div>
                  <div className="font-semibold text-[#0F172A]">{tenant.name.split(" ")[0] || tenant.name}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
                  <div className="text-sm font-bold text-[#64748B]">Last Name</div>
                  <div className="font-semibold text-[#0F172A]">{tenant.name.split(" ").slice(1).join(" ") || "-"}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
                  <div className="text-sm font-bold text-[#64748B]">Email</div>
                  <div className="font-semibold text-[#0F172A] truncate" title={tenant.email}>{tenant.email}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
                  <div className="text-sm font-bold text-[#64748B]">Phone</div>
                  <div className="font-semibold text-[#0F172A]">{tenant.phone || "Not provided"}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
                  <div className="text-sm font-bold text-[#64748B]">Date of Birth</div>
                  <div className="font-semibold text-[#0F172A]">{tenant.dob || "-"}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
                  <div className="text-sm font-bold text-[#64748B]">Credit Score</div>
                  <div className="font-semibold text-[#0F172A]">{tenant.creditScore || "-"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice History */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#3B82F6]" />
              <h2 className="font-bold text-[#0F172A] text-lg">Invoice History</h2>
            </div>
            <CardContent className="p-0">
              {allInvoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#E2E8F0] bg-[#F8FAFC]">
                      <TableHead className="font-bold text-[#64748B]">Invoice ID</TableHead>
                      <TableHead className="font-bold text-[#64748B]">Amount</TableHead>
                      <TableHead className="font-bold text-[#64748B]">Due Date</TableHead>
                      <TableHead className="font-bold text-[#64748B]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allInvoices.map((inv: any) => (
                      <TableRow key={inv.id} className="border-b border-[#E2E8F0]">
                        <TableCell className="font-semibold">{inv.id.substring(0,8)}</TableCell>
                        <TableCell className="font-bold">${Number(inv.amount).toFixed(2)}</TableCell>
                        <TableCell>{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={inv.status === "PAID" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#EF4444]"}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-16 text-center">
                  <FileText className="h-10 w-10 text-[#CBD5E1] mx-auto mb-3" />
                  <p className="font-semibold text-[#0F172A]">No Invoices Found</p>
                  <p className="text-sm text-[#64748B] mt-1">This tenant currently has no billing history.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 span wide) */}
        <div className="col-span-1 space-y-6">
          
          {/* Tenant Status Management */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center justify-between">
              <h2 className="font-bold text-[#0F172A] text-base">Tenant Status</h2>
              <Badge className={isActive || tenant.tenantStatus === "Active" ? "bg-[#DCFCE7] text-[#16A34A] border-0" : tenant.tenantStatus === "Approved" ? "bg-[#EFF6FF] text-[#3B82F6] border-0" : "bg-[#FEF9C3] text-[#CA8A04] border-0"}>
                {isActive ? "Active" : tenant.tenantStatus || "Pending Review"}
              </Badge>
            </div>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-[#F1F5F9] pb-3">
                <span className="font-bold text-[#64748B]">Last Updated</span>
                <span className="font-semibold text-[#0F172A]">{new Date(tenant.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="pt-2 flex flex-col gap-3">
                <Button className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold rounded-xl h-11">
                  Change Status
                </Button>
                {isActive && (
                  <Button variant="outline" className="w-full text-[#EF4444] border-red-200 hover:bg-red-50 font-bold rounded-xl h-11">
                    Terminate Lease
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Move Dates */}
          {isActive && activeLease && (
            <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#3B82F6]" />
                <h2 className="font-bold text-[#0F172A] text-base">Lease Details</h2>
              </div>
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                  <span className="text-sm font-bold text-[#64748B]">Move-in Date</span>
                  <span className="font-semibold text-[#0F172A]">{new Date(activeLease.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                  <span className="text-sm font-bold text-[#64748B]">Unit</span>
                  <Link href={`/dashboard/properties/${activeLease.unit.propertyId}/units/${activeLease.unitId}`} className="font-semibold text-[#3B82F6] hover:underline">
                    {activeLease.unit.name}
                  </Link>
                </div>
                <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                  <span className="text-sm font-bold text-[#64748B]">Rent</span>
                  <span className="font-semibold text-[#0F172A]">${Number(activeLease.monthlyRent).toFixed(2)}/mo</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Employment Information */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#3B82F6]" />
              <h2 className="font-bold text-[#0F172A] text-base">Employment Information</h2>
            </div>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                <span className="text-sm font-bold text-[#64748B]">Employer</span>
                <span className="font-semibold text-[#0F172A]">{tenant.employer || "-"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                <span className="text-sm font-bold text-[#64748B]">Job Title</span>
                <span className="font-semibold text-[#0F172A]">{tenant.position || "-"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                <span className="text-sm font-bold text-[#64748B]">Annual Income</span>
                <span className="font-semibold text-[#0F172A]">{tenant.annualIncome ? `$${Number(tenant.annualIncome).toLocaleString()}` : "-"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-[#3B82F6]" />
              <h2 className="font-bold text-[#0F172A] text-base">Emergency Contact</h2>
            </div>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                <span className="text-sm font-bold text-[#64748B]">Name</span>
                <span className="font-semibold text-[#0F172A]">{tenant.emergencyName || "-"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                <span className="text-sm font-bold text-[#64748B]">Relationship</span>
                <span className="font-semibold text-[#0F172A]">{tenant.emergencyRelationship || "-"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                <span className="text-sm font-bold text-[#64748B]">Phone</span>
                <span className="font-semibold text-[#0F172A]">{tenant.emergencyPhone || "-"}</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
