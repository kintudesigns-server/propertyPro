"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Eye, RefreshCw, FileText, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ReasonModal } from "@/components/ui/ReasonModal";

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [rejectAppId, setRejectAppId] = useState<string | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (error) {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appId: string, status: string, reason = "") => {

    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });

      if (res.ok) {
        toast.success(`Application updated to ${status}`);
        fetchApplications();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update application");
      }
    } catch (err) {
      toast.error("Error updating application status");
    }
  };

  const handleApproveAndDraft = async (app: any) => {
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (res.ok) {
        toast.success("Application approved! Opening Lease Creation Wizard...");
        router.push(
          `/dashboard/leases/new?appId=${app.id}&unitId=${app.unitId}&tenantName=${encodeURIComponent(
            app.name
          )}&tenantEmail=${encodeURIComponent(app.email)}&tenantPhone=${encodeURIComponent(app.phone)}`
        );
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to approve application");
      }
    } catch (err) {
      toast.error("Error approving application");
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    if (!confirm("Are you sure you want to delete this application? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Application deleted successfully");
        fetchApplications();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete application");
      }
    } catch (err) {
      toast.error("Error deleting application");
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const filteredApps = applications.filter(app => {
    const matchesSearch = app.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          app.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All Statuses" || app.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Tenant Applications</h1>
          <p className="text-[#64748B] text-sm mt-1">Review and manage tenant applications</p>
        </div>
        <Button onClick={fetchApplications} variant="outline" className="h-11 px-4 rounded-xl font-bold text-[#0F172A] border-[#E2E8F0] shadow-sm hover:bg-[#F8FAFC]">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
        <div className="p-5 flex flex-col md:flex-row gap-4 border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input 
              placeholder="Search applications..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-white border-[#E2E8F0] rounded-xl focus-visible:ring-1 focus-visible:ring-[#3B82F6] focus-visible:border-[#3B82F6]"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 bg-white border border-[#E2E8F0] rounded-xl px-4 text-sm font-semibold text-[#0F172A] outline-none min-w-[180px]"
          >
            <option>All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3B82F6] border-r-transparent"></div>
            <p className="mt-4 text-[#64748B] font-semibold">Loading applications...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                  <TableHead className="font-extrabold text-[#64748B] uppercase tracking-wider text-xs">Applicant</TableHead>
                  <TableHead className="font-extrabold text-[#64748B] uppercase tracking-wider text-xs">Property</TableHead>
                  <TableHead className="font-extrabold text-[#64748B] uppercase tracking-wider text-xs">Status</TableHead>
                  <TableHead className="font-extrabold text-[#64748B] uppercase tracking-wider text-xs">Application Date</TableHead>
                  <TableHead className="font-extrabold text-[#64748B] uppercase tracking-wider text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.map((app) => {
                  let badgeStyles = "bg-[#F8FAFC] text-[#64748B]";
                  if (app.status === "PENDING") badgeStyles = "bg-[#FEF9C3] text-[#CA8A04]";
                  if (app.status === "APPROVED") badgeStyles = "bg-[#DCFCE7] text-[#16A34A]";
                  if (app.status === "REJECTED") badgeStyles = "bg-[#FEE2E2] text-[#EF4444]";

                  return (
                    <TableRow key={app.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center font-bold text-lg shrink-0">
                            {app.name ? app.name.charAt(0).toUpperCase() : "A"}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[#0F172A] truncate">{app.name}</span>
                            <span className="text-xs text-[#64748B] truncate">{app.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/properties/${app.unit?.property?.id}`} className="hover:underline">
                          <div className="font-semibold text-[#0F172A]">{app.unit?.property?.name || "Unknown Property"}</div>
                        </Link>
                        <div className="text-xs text-[#64748B]">Unit {app.unit?.name || "N/A"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${badgeStyles} border-0 rounded-lg px-2.5 py-1 font-bold shadow-sm whitespace-nowrap`}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-[#0F172A]">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] inline-flex items-center justify-center rounded-lg cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-xl border-[#E2E8F0] p-1">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/applications/${app.id}`)} className="cursor-pointer font-semibold text-slate-700 rounded-lg">
                                <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                              </DropdownMenuItem>
                              {app.status === "PENDING" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleApproveAndDraft(app)} className="cursor-pointer font-bold text-[#16A34A] rounded-lg">
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-[#16A34A]" /> Approve & Draft Lease
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(app.id, "APPROVED")} className="cursor-pointer font-semibold text-[#0F172A] rounded-lg">
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-[#94A3B8]" /> Approve (Only)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setRejectAppId(app.id)} className="cursor-pointer font-semibold text-rose-600 rounded-lg">
                                    <XCircle className="mr-2 h-4 w-4 text-[#FDA4AF]" /> Reject Application
                                  </DropdownMenuItem>
                                </>
                              )}
                              {app.status === "APPROVED" && (
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/leases/new?appId=${app.id}&unitId=${app.unitId}&tenantName=${encodeURIComponent(app.name)}&tenantEmail=${encodeURIComponent(app.email)}&tenantPhone=${encodeURIComponent(app.phone)}`)} className="cursor-pointer font-bold text-[#3B82F6] rounded-lg">
                                  <FileText className="mr-2 h-4 w-4 text-[#3B82F6]" /> Draft Lease
                                </DropdownMenuItem>
                              )}
                              {app.status === "REJECTED" && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(app.id, "PENDING")} className="cursor-pointer font-semibold text-slate-700 rounded-lg">
                                  <RefreshCw className="mr-2 h-4 w-4 text-[#94A3B8]" /> Re-evaluate Application
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleDeleteApplication(app.id)} className="cursor-pointer font-semibold text-rose-600 rounded-lg">
                                <Trash2 className="mr-2 h-4 w-4 text-rose-600" /> Delete Application
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredApps.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-[#64748B]">
                      <FileText className="h-10 w-10 text-[#CBD5E1] mx-auto mb-3" />
                      <p className="font-semibold text-[#0F172A]">No applications found</p>
                      <p className="text-sm">Try adjusting your filters.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      <ReasonModal
        open={rejectAppId !== null}
        onOpenChange={(open) => { if (!open) setRejectAppId(null); }}
        title="Reject Application"
        description="Please provide a reason for rejecting this application. This reason will be emailed to the applicant."
        placeholder="Reason for rejection..."
        onConfirm={(reason) => { if (rejectAppId) handleUpdateStatus(rejectAppId, "REJECTED", reason); }}
      />
    </div>
  );
}
