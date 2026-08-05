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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ReasonModal } from "@/components/ui/ReasonModal";
import { KpiCard } from "@/components/ui/KpiCard";

export default function AdminPropertiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Approval confirm modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [pendingApproveId, setPendingApproveId] = useState<string | null>(null);
  const [pendingApproveStatus, setPendingApproveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/properties");
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProperties(sorted);
      } else {
        toast.error("Failed to fetch properties");
      }
    } catch {
      toast.error("Error fetching properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchProperties();
    }
  }, [status]);

  const handleUpdateStatus = async (id: string, approvalStatus: string, reason?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/properties/approval", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: id, status: approvalStatus, rejectionReason: reason }),
      });

      if (res.ok) {
        toast.success(`Property marked as ${approvalStatus}`);
        fetchProperties();
        setShowRejectModal(false);
        setRejectionReason("");
        setSelectedPropertyId(null);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update property status");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const triggerRejectionReason = (id: string) => {
    setSelectedPropertyId(id);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const triggerApprovalConfirmation = (id: string, statusVal: string) => {
    setPendingApproveId(id);
    setPendingApproveStatus(statusVal);
    setShowApproveModal(true);
  };

  const handleConfirmApproval = () => {
    if (pendingApproveId && pendingApproveStatus) {
      handleUpdateStatus(pendingApproveId, pendingApproveStatus);
      setShowApproveModal(false);
      setPendingApproveId(null);
      setPendingApproveStatus(null);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#EF4444]" />
        <p className="text-[#6E6E73] font-bold text-sm uppercase tracking-wider">Loading properties ledger...</p>
      </div>
    );
  }

  const filteredProperties = properties.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term
      ? true
      : p.name?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term) ||
        p.owner?.name?.toLowerCase().includes(term) ||
        p.owner?.email?.toLowerCase().includes(term);

    const matchesStatus = statusFilter === "ALL" ? true : p.approvalStatus === statusFilter;

    return matchesSearch && matchesStatus;
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
            <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Approve Properties</h1>
            <p className="text-[#6E6E73] text-sm mt-0.5 font-normal">Review, approve or reject platform properties listed by owners</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={fetchProperties} className="text-[#6E6E73] hover:bg-[#F2F2F7]">
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stats Grid — Standardized KpiCards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KpiCard title="Pending Review" value={pending} subtext="Requires administrative action" icon={Clock} variant="amber" />
        <KpiCard title="Approved Properties" value={approved} subtext="Visible on public listings" icon={Building} variant="emerald" />
        <KpiCard title="Total Listed" value={total} subtext="Registered on PropertyPro" icon={Building} variant="blue" />
      </div>

      {/* Filter and Ledger */}
      <Card className="bg-white border border-[#E5E5EA] shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-[24px] overflow-hidden">
        <CardHeader className="border-b border-[#E5E5EA] pb-5 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 sm:p-8">
          <div>
            <CardTitle className="text-lg font-semibold text-[#1D1D1F]">Properties Register</CardTitle>
            <CardDescription className="text-[#6E6E73] font-normal text-xs mt-0.5">Verify listings authenticity and set approval status.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
            {/* Status Segment Filter */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto border border-slate-200/30">
              {["ALL", "PENDING", "APPROVED", "REJECTED"].map((statusOption) => (
                <button
                  key={statusOption}
                  onClick={() => setStatusFilter(statusOption)}
                  className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === statusOption
                      ? "bg-white text-slate-800 shadow-2xs"
                      : "text-[#6E6E73] hover:text-slate-800"
                  }`}
                >
                  {statusOption === "ALL"
                    ? "All"
                    : statusOption === "PENDING"
                    ? "Pending"
                    : statusOption === "APPROVED"
                    ? "Approved"
                    : "Rejected"}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
              <Input
                placeholder="Search properties or owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-white border-[#E5E5EA] focus:ring-[#EF4444] text-[#1D1D1F] font-normal text-sm shadow-sm placeholder:text-[#8E8E93]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredProperties.length === 0 ? (
            <div className="text-center py-20 text-[#6E6E73]">
              <Building className="h-14 w-14 mx-auto text-slate-200 mb-3" />
              <p className="font-semibold text-base">No properties matching filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#E5E5EA] hover:bg-transparent bg-slate-50/20">
                  <TableHead className="text-[#6E6E73] font-medium text-[11px] uppercase tracking-wider pl-6 sm:pl-8 py-4">Property</TableHead>
                  <TableHead className="text-[#6E6E73] font-medium text-[11px] uppercase tracking-wider py-4">Location</TableHead>
                  <TableHead className="text-[#6E6E73] font-medium text-[11px] uppercase tracking-wider py-4">Owner</TableHead>
                  <TableHead className="text-[#6E6E73] font-medium text-[11px] uppercase tracking-wider py-4">Status</TableHead>
                  <TableHead className="text-right text-[#6E6E73] font-medium text-[11px] uppercase tracking-wider pr-6 sm:pr-8 py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.map((p) => (
                  <TableRow key={p.id} className="border-[#E5E5EA] hover:bg-[#F2F2F7]">
                    <TableCell className="font-medium text-[#1D1D1F] pl-6 sm:pl-8 py-4">
                      <div className="flex items-center gap-3">
                        {p.coverPhoto ? (
                          <img src={p.coverPhoto} alt={p.name} className="h-10 w-10 rounded-xl object-cover border border-slate-100 shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-[#8E8E93] shrink-0">
                            <Building className="h-5 w-5" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-semibold text-sm leading-snug">{p.name}</span>
                          <span className="text-[11px] text-[#8E8E93] font-normal">
                            {p.type || "Apartment"} • Registered {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#6E6E73] font-normal py-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#8E8E93]" />
                        {p.city}, {p.country}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <p className="font-medium text-[#1D1D1F] text-xs">{p.owner?.name || "N/A"}</p>
                      <p className="text-[11px] text-[#6E6E73] flex items-center gap-1 mt-1 font-normal">
                        <Mail className="h-3 w-3" />
                        {p.owner?.email || ""}
                      </p>
                    </TableCell>
                    <TableCell className="py-4">
                      {p.approvalStatus === "APPROVED" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg px-2.5 py-1 font-semibold">Approved</Badge>
                      ) : p.approvalStatus === "REJECTED" ? (
                        <div className="flex flex-col gap-1">
                          <Badge className="bg-rose-50 text-rose-700 border border-rose-100 rounded-lg px-2.5 py-1 font-semibold w-fit">Rejected</Badge>
                          {p.rejectionReason && (
                            <span className="text-[10px] text-[#8E8E93] font-normal max-w-[200px] truncate" title={p.rejectionReason}>
                              Reason: {p.rejectionReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border border-amber-100 rounded-lg px-2.5 py-1 font-bold">Pending Review</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6 sm:pr-8 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 rounded-full hover:bg-[#F2F2F7] flex items-center justify-center text-[#6E6E73] transition-colors focus:outline-none ml-auto">
                          <MoreVertical className="h-4 w-4 text-[#6E6E73]" />
                          <span className="sr-only">Open actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white border border-[#E5E5EA] shadow-md rounded-xl p-1 z-50">
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/properties/${p.id}`)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#1D1D1F] rounded-lg hover:bg-[#F5F5F7] cursor-pointer"
                          >
                            <Eye className="h-4 w-4 text-[#6E6E73]" />
                            View Details
                          </DropdownMenuItem>
 
                          {p.approvalStatus === "PENDING" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => triggerApprovalConfirmation(p.id, "APPROVED")}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-emerald-600 rounded-lg hover:bg-emerald-50 cursor-pointer"
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => triggerRejectionReason(p.id)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
 
                          {p.approvalStatus === "APPROVED" && (
                            <DropdownMenuItem
                              onClick={() => triggerRejectionReason(p.id)}
                              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                              Revoke Approval
                            </DropdownMenuItem>
                          )}
 
                          {p.approvalStatus === "REJECTED" && (
                            <DropdownMenuItem
                              onClick={() => triggerApprovalConfirmation(p.id, "APPROVED")}
                              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-emerald-600 rounded-lg hover:bg-emerald-50 cursor-pointer"
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
 
      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={showApproveModal}
        onOpenChange={setShowApproveModal}
        title="Approve Property Listing"
        description="Are you sure you want to approve this property? Doing so will enable public rental listings and activate it inside the owner's managed portfolio."
        confirmLabel="Approve Property"
        confirmVariant="default"
        onConfirm={handleConfirmApproval}
      />

      {/* Rejection/Revocation Reason Modal */}
      <ReasonModal
        open={showRejectModal}
        onOpenChange={setShowRejectModal}
        title="Reject Property Listing"
        description="Please provide the exact reason for rejection or revocation. The property owner will receive this explanation via notification and email."
        placeholder="Enter rejection reason (at least 5 characters)..."
        onConfirm={async (reason) => {
          if (selectedPropertyId) {
            await handleUpdateStatus(selectedPropertyId, "REJECTED", reason);
          }
        }}
      />
    </div>
  );
}
