"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, User, PhoneCall, Briefcase, FileText, CheckCircle2, XCircle, Trash2, Edit, Calendar, Mail, Phone, Shield } from "lucide-react";
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
    return <div className="p-10 text-center font-extrabold text-xs text-slate-500 font-sans">Loading Tenant Details...</div>;
  }
  if (!tenant) return null;

  const isActive = tenant.leases?.some((l: any) => l.status === "ACTIVE");
  const activeLease = tenant.leases?.find((l: any) => l.status === "ACTIVE");
  const allInvoices = tenant.leases?.flatMap((l: any) => l.invoices) || [];
  const profilePic = tenant.user?.image || tenant.image || tenant.avatar;

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col gap-1.5">
          <Link href="/dashboard/tenants" className="text-xs font-extrabold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors w-fit">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Tenants
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{tenant.name}</h1>
            <div className="flex items-center gap-1.5">
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-2xs ${
                isActive || tenant.tenantStatus === "Active" 
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                  : tenant.tenantStatus === "Approved" 
                  ? "bg-slate-100 text-slate-800 border border-slate-200" 
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}>
                {isActive ? "Active" : tenant.tenantStatus || "Pending Review"}
              </span>
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-black text-[10px] uppercase tracking-wider shadow-2xs">
                Tenant since {new Date(tenant.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          <Link href={`/dashboard/tenants/${tenant.id}/edit`} className="flex-1 md:flex-none">
            <Button variant="outline" className="w-full border-slate-200 text-slate-900 hover:bg-slate-50 shadow-2xs rounded-xl h-9 font-black text-xs px-4 cursor-pointer">
              <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit Tenant
            </Button>
          </Link>
          <Button 
            disabled={isActive}
            onClick={handleDelete}
            className={`flex-1 md:flex-none bg-white border shadow-2xs rounded-xl h-9 font-black text-xs px-4 cursor-pointer ${isActive ? 'text-slate-400 border-slate-200 opacity-50 cursor-not-allowed' : 'text-rose-600 border-rose-200 hover:bg-rose-50'}`}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans wide on large screens) */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {/* Personal Information */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-700" />
              <h2 className="font-black text-slate-900 text-base tracking-tight">Personal Information</h2>
            </div>
            <CardContent className="p-6 space-y-6">
              {/* Profile Card Header */}
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center p-4 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-2xs">
                {profilePic ? (
                  <img 
                    src={profilePic} 
                    alt={tenant.name} 
                    className="h-20 w-20 rounded-2xl object-cover border-2 border-slate-200 shadow-2xs shrink-0" 
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-slate-900 text-white border-2 border-slate-200 flex items-center justify-center font-black text-2xl shadow-2xs shrink-0">
                    {tenant.name ? tenant.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <div>
                  <h3 className="font-black text-slate-900 text-xl tracking-tight">{tenant.name}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Tenant ID: <span className="font-mono font-bold text-slate-900">{tenant.id.substring(0, 8).toUpperCase()}</span></p>
                </div>
              </div>

              {/* Spacious Key-Value Field Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-2xs">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">First Name</p>
                  <p className="font-black text-slate-900 text-xs">{tenant.name.split(" ")[0] || tenant.name}</p>
                </div>
                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-2xs">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Last Name</p>
                  <p className="font-black text-slate-900 text-xs">{tenant.name.split(" ").slice(1).join(" ") || "-"}</p>
                </div>
                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-2xs">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Email Address</p>
                  <p className="font-black text-slate-900 text-xs truncate" title={tenant.email}>{tenant.email}</p>
                </div>
                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-2xs">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Phone Number</p>
                  <p className="font-black text-slate-900 text-xs">{tenant.phone || "Not provided"}</p>
                </div>
                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-2xs">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Date of Birth</p>
                  <p className="font-black text-slate-900 text-xs">{tenant.dob || "-"}</p>
                </div>
                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-2xs">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Credit Score</p>
                  <p className="font-black text-slate-900 text-xs">{tenant.creditScore || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice History */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-700" />
              <h2 className="font-black text-slate-900 text-base tracking-tight">Invoice History</h2>
            </div>
            <CardContent className="p-0">
              {allInvoices.length > 0 ? (
                <Table className="w-full">
                  <TableHeader className="bg-slate-50/70 border-b border-slate-200/80">
                    <TableRow>
                      <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Invoice ID</TableHead>
                      <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Amount</TableHead>
                      <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Due Date</TableHead>
                      <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {allInvoices.map((inv: any) => (
                      <TableRow key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="py-4 px-6 font-mono text-xs text-slate-900 font-bold">{inv.id.substring(0,8)}</TableCell>
                        <TableCell className="py-4 px-6 font-black text-slate-900 text-xs">${Number(inv.amount).toFixed(2)}</TableCell>
                        <TableCell className="py-4 px-6 font-semibold text-slate-600 text-xs">{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-2xs ${
                            inv.status === "PAID" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}>
                            {inv.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-16 text-center">
                  <FileText className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <p className="font-black text-slate-900 text-base">No Invoices Found</p>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">This tenant currently has no billing history.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 span wide) */}
        <div className="col-span-1 space-y-6">
          
          {/* Tenant Status Management */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-black text-slate-900 text-sm tracking-tight">Tenant Status</h2>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-2xs ${
                isActive || tenant.tenantStatus === "Active" 
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                  : tenant.tenantStatus === "Approved" 
                  ? "bg-slate-100 text-slate-800 border border-slate-200" 
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}>
                {isActive ? "Active" : tenant.tenantStatus || "Pending Review"}
              </span>
            </div>
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Last Updated</span>
                <span className="font-black text-slate-900">{new Date(tenant.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl h-9 shadow-xs cursor-pointer">
                  Change Status
                </Button>
                {isActive && (
                  <Button variant="outline" className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 font-black text-xs rounded-xl h-9 shadow-2xs cursor-pointer">
                    Terminate Lease
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Move Dates */}
          {isActive && activeLease && (
            <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-700" />
                <h2 className="font-black text-slate-900 text-sm tracking-tight">Lease Details</h2>
              </div>
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Move-in Date</span>
                  <span className="font-black text-slate-900 text-xs">{new Date(activeLease.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Unit</span>
                  <Link href={`/dashboard/properties/${activeLease.unit.propertyId}/units/${activeLease.unitId}`} className="font-black text-slate-900 text-xs hover:underline">
                    {activeLease.unit.name}
                  </Link>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rent</span>
                  <span className="font-black text-slate-900 text-xs">${Number(activeLease.monthlyRent).toFixed(2)}/mo</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Employment Information */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-700" />
              <h2 className="font-black text-slate-900 text-sm tracking-tight">Employment Information</h2>
            </div>
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Employer</span>
                <span className="font-black text-slate-900 text-xs">{tenant.employer || "-"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Job Title</span>
                <span className="font-black text-slate-900 text-xs">{tenant.position || "-"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Annual Income</span>
                <span className="font-black text-slate-900 text-xs">{tenant.annualIncome ? `$${Number(tenant.annualIncome).toLocaleString()}` : "-"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-slate-700" />
              <h2 className="font-black text-slate-900 text-sm tracking-tight">Emergency Contact</h2>
            </div>
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Name</span>
                <span className="font-black text-slate-900 text-xs">{tenant.emergencyName || "-"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Relationship</span>
                <span className="font-black text-slate-900 text-xs">{tenant.emergencyRelationship || "-"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Phone</span>
                <span className="font-black text-slate-900 text-xs">{tenant.emergencyPhone || "-"}</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
