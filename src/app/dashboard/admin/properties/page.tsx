"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, X, Building, Loader2, RefreshCw, Shield, AlertTriangle, MapPin, Mail, Clock, Search, MoreVertical, Eye } from "lucide-react";
import { toast } from "sonner";

export default function AdminPropertiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/properties");
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      } else {
        toast.error("Failed to load properties.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching properties.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchProperties();
  }, [status]);

  const handlePropertyApproval = async (propertyId: string, statusText: string, reason?: string) => {
    try {
      const res = await fetch("/api/admin/properties/approval", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, status: statusText, rejectionReason: reason }),
      });
      if (res.ok) {
        toast.success(`Property ${statusText.toLowerCase()} successfully`);
        fetchProperties();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update property");
      }
    } catch {
      toast.error("Error updating property.");
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#EF4444]" />
        <p className="text-[#64748B] font-bold text-sm uppercase tracking-wider">Loading properties ledger...</p>
      </div>
    );
  }

  const filteredProperties = properties.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.city?.toLowerCase().includes(term) ||
      p.owner?.name?.toLowerCase().includes(term) ||
      p.owner?.email?.toLowerCase().includes(term)
    );
  });

  const total = properties.length;
  const pending = properties.filter((p) => p.approvalStatus === "PENDING").length;
  const approved = properties.filter((p) => p.approvalStatus === "APPROVED").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pt-6 pb-20 px-2 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-red-500 rounded-xl">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">Approve Properties</h1>
            <p className="text-[#64748B] text-base mt-0.5">Review, approve or reject platform properties listed by owners</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={fetchProperties} className="text-[#64748B] hover:bg-[#F8FAFC]">
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Pending Review</p>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-amber-600 mb-1">{pending}</p>
            <p className="text-xs text-[#64748B] font-medium">Requires administrative action</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Approved Properties</p>
              <Building className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600 mb-1">{approved}</p>
            <p className="text-xs text-[#64748B] font-medium">Visible on public listings</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Total Listed</p>
              <Building className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-blue-600 mb-1">{total}</p>
            <p className="text-xs text-[#64748B] font-medium">Registered on PropertyPro</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Ledger */}
      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl">
        <CardHeader className="border-b border-[#E2E8F0] pb-5 bg-[#F8FAFC]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-[#0F172A]">Properties Register</CardTitle>
            <CardDescription className="text-[#64748B]">Verify listings authenticity and set approval status.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search properties or owners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-white border-[#E2E8F0] focus:ring-[#EF4444] text-[#0F172A] font-semibold text-sm shadow-sm placeholder:text-slate-400"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredProperties.length === 0 ? (
            <div className="text-center py-20 text-[#64748B]">
              <Building className="h-14 w-14 mx-auto text-slate-200 mb-3" />
              <p className="font-extrabold text-base">No properties matching filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0] hover:bg-transparent">
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider pl-6">Property</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Location</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Owner</TableHead>
                  <TableHead className="text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-[#64748B] font-extrabold text-[10px] uppercase tracking-wider pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.map((p) => (
                  <TableRow key={p.id} className="border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    <TableCell className="font-bold text-[#0F172A] pl-6">{p.name}</TableCell>
                    <TableCell className="text-[#64748B] font-medium flex items-center gap-1 py-4">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {p.city}, {p.country}
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-[#0F172A]">{p.owner?.name || "N/A"}</p>
                      <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" />
                        {p.owner?.email || ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      {p.approvalStatus === "APPROVED" ? (
                        <Badge className="bg-[#DCFCE7] text-[#16A34A] border-0 rounded-lg px-2.5 py-1 font-bold">Approved</Badge>
                      ) : p.approvalStatus === "REJECTED" ? (
                        <Badge className="bg-[#FEE2E2] text-[#EF4444] border-0 rounded-lg px-2.5 py-1 font-bold">Rejected</Badge>
                      ) : (
                        <Badge className="bg-[#FEF9C3] text-[#CA8A04] border-0 rounded-lg px-2.5 py-1 font-bold">Pending</Badge>
                      )}
                    </TableCell>
                     <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 flex items-center justify-center text-[#64748B] transition-colors focus:outline-none ml-auto">

                            <MoreVertical className="h-4 w-4 text-[#64748B]" />
                            <span className="sr-only">Open actions</span>

                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white border border-[#E2E8F0] shadow-md rounded-xl p-1 z-50">
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#0F172A] rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            <Eye className="h-4 w-4 text-[#64748B]" />
                            View Details
                          </DropdownMenuItem>

                          {p.approvalStatus === "PENDING" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handlePropertyApproval(p.id, "APPROVED")}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-green-600 rounded-lg hover:bg-green-50 cursor-pointer"
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const reason = prompt("Enter rejection reason:");
                                  if (reason !== null) handlePropertyApproval(p.id, "REJECTED", reason);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}

                          {p.approvalStatus === "APPROVED" && (
                            <DropdownMenuItem
                              onClick={() => {
                                const reason = prompt("Enter rejection reason:");
                                if (reason !== null) handlePropertyApproval(p.id, "REJECTED", reason);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                              Revoke Approval
                            </DropdownMenuItem>
                          )}

                          {p.approvalStatus === "REJECTED" && (
                            <DropdownMenuItem
                              onClick={() => handlePropertyApproval(p.id, "APPROVED")}
                              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-green-600 rounded-lg hover:bg-green-50 cursor-pointer"
                            >
                              <Check className="h-4 w-4" />
                              Re-Approve
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
