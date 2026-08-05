"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Eye, RefreshCw, FileText, CheckCircle2, XCircle, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ReasonModal } from "@/components/ui/ReasonModal";

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [rejectAppId, setRejectAppId] = useState<string | null>(null);

  const [isPausedAccount, setIsPausedAccount] = useState(false);
  const [pausedPlanName, setPausedPlanName] = useState<string | null>(null);
  const [blockProcessApplications, setBlockProcessApplications] = useState(false);

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
    if (blockProcessApplications) {
      toast.error("Your account is currently paused. Processing applications is restricted.");
      return;
    }

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
    if (blockProcessApplications) {
      toast.error("Your account is currently paused. Processing applications is restricted.");
      return;
    }
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
    const checkSubscription = async () => {
      try {
        const userRes = await fetch("/api/users");
        if (userRes.ok) {
          const userData = await userRes.json();
          const rulesRes = await fetch("/api/subscription/rules");
          if (rulesRes.ok) {
            const rules = await rulesRes.json();
            if (rules.isPaused && rules.blockProcessApplications) {
              setIsPausedAccount(true);
              setPausedPlanName(userData.pricingTier?.name || null);
              setBlockProcessApplications(true);
            }
          }
        }
      } catch (err) {
        console.error("Subscription check failed on applications page:", err);
      }
    };
    checkSubscription();
  }, []);

  const filteredApps = applications.filter(app => {
    const matchesSearch = app.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          app.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All Statuses" || app.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      
      {isPausedAccount && blockProcessApplications && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs flex items-start gap-3.5">
          <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-amber-950 text-sm">Application Processing Suspended</h4>
            <p className="text-xs text-amber-900 mt-1 font-semibold leading-relaxed">
              Your subscription is currently paused. You can view applicant details, but approving or rejecting applications is temporarily restricted.
            </p>
            <p className="text-xs text-amber-900 mt-1.5 font-medium">
              Reactivate your subscription in{" "}
              <a href="/dashboard/owner/billing" className="underline font-bold hover:text-amber-950">
                Billing Settings
              </a>{" "}
              to resume application processing.
            </p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Tenant Applications</h1>
          <p className="text-xs text-[#6E6E73] font-normal mt-0.5">Review and manage tenant rental applications</p>
        </div>
        <Button onClick={fetchApplications} variant="outline" className="h-9 px-3.5 rounded-xl font-medium text-xs text-slate-700 bg-white border-slate-200 shadow-xs hover:bg-slate-50 cursor-pointer">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      <Card className="bg-white border-slate-200 shadow-xs rounded-3xl overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-3 border-b border-slate-100 bg-slate-50/50">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by applicant name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white border-slate-200 rounded-xl font-semibold text-xs text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 shadow-xs"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 bg-white border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none min-w-[180px] shadow-xs cursor-pointer"
          >
            <option>All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-900 border-r-transparent mb-2"></div>
            <p className="text-xs text-slate-500 font-bold">Loading tenant applications...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200/80 bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Applicant</TableHead>
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Target Unit & Property</TableHead>
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Status</TableHead>
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5">Submitted Date</TableHead>
                  <TableHead className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] py-3.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.map((app) => {
                  let badgeStyles = "bg-slate-100 text-slate-700 border-slate-200";
                  if (app.status === "PENDING") badgeStyles = "bg-amber-50 text-amber-800 border-amber-200";
                  if (app.status === "APPROVED") badgeStyles = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  if (app.status === "REJECTED") badgeStyles = "bg-rose-50 text-rose-700 border-rose-200";

                  return (
                    <TableRow key={app.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black text-xs shrink-0 border border-slate-200/80">
                            {app.name ? app.name.charAt(0).toUpperCase() : "A"}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-900 text-xs truncate">{app.name}</span>
                            <span className="text-[11px] text-slate-500 font-medium truncate">{app.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Link href={`/dashboard/properties/${app.unit?.property?.id}`} className="hover:underline">
                          <div className="font-bold text-slate-900 text-xs">{app.unit?.property?.name || "Unknown Property"}</div>
                        </Link>
                        <div className="text-[11px] text-slate-500 font-medium">Unit {app.unit?.name || "N/A"}</div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge className={`${badgeStyles} border rounded-lg px-2.5 py-0.5 font-extrabold text-[10px] uppercase shadow-2xs whitespace-nowrap`}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 font-semibold text-slate-700 text-xs">
                        {new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-200 p-1.5 shadow-xl">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/applications/${app.id}`)} className="cursor-pointer font-bold text-xs text-slate-800 rounded-xl py-2">
                                <Eye className="mr-2 h-4 w-4 text-slate-500" /> View Details
                              </DropdownMenuItem>
                              {app.status === "PENDING" && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => !blockProcessApplications && handleApproveAndDraft(app)} 
                                    className={`font-bold text-xs rounded-xl py-2 ${blockProcessApplications ? 'text-slate-400 cursor-not-allowed opacity-50' : 'text-emerald-700 cursor-pointer'}`}
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Approve & Draft Lease {blockProcessApplications && "🔒"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => !blockProcessApplications && handleUpdateStatus(app.id, "APPROVED")} 
                                    className={`font-bold text-xs rounded-xl py-2 ${blockProcessApplications ? 'text-slate-400 cursor-not-allowed opacity-50' : 'text-slate-800 cursor-pointer'}`}
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-slate-500" /> Approve (Only) {blockProcessApplications && "🔒"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      if (blockProcessApplications) {
                                        toast.error("Your account is currently paused. Processing applications is restricted.");
                                        return;
                                      }
                                      setRejectAppId(app.id);
                                    }} 
                                    className={`font-bold text-xs rounded-xl py-2 ${blockProcessApplications ? 'text-slate-400 cursor-not-allowed opacity-50' : 'text-rose-600 cursor-pointer'}`}
                                  >
                                    <XCircle className="mr-2 h-4 w-4 text-rose-500" /> Reject Application {blockProcessApplications && "🔒"}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {app.status === "APPROVED" && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    if (blockProcessApplications) {
                                      toast.error("Your account is currently paused. Processing applications is restricted.");
                                      return;
                                    }
                                    router.push(`/dashboard/leases/new?appId=${app.id}&unitId=${app.unitId}&tenantName=${encodeURIComponent(app.name)}&tenantEmail=${encodeURIComponent(app.email)}&tenantPhone=${encodeURIComponent(app.phone)}`);
                                  }} 
                                  className={`font-bold text-xs rounded-xl py-2 ${blockProcessApplications ? 'text-slate-400 cursor-not-allowed opacity-50' : 'text-slate-900 cursor-pointer'}`}
                                >
                                  <FileText className="mr-2 h-4 w-4 text-slate-700" /> Draft Lease {blockProcessApplications && "🔒"}
                                </DropdownMenuItem>
                              )}
                              {app.status === "REJECTED" && (
                                <DropdownMenuItem 
                                  onClick={() => !blockProcessApplications && handleUpdateStatus(app.id, "PENDING")} 
                                  className={`font-bold text-xs rounded-xl py-2 ${blockProcessApplications ? 'text-slate-400 cursor-not-allowed opacity-50' : 'text-slate-800 cursor-pointer'}`}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4 text-slate-500" /> Re-evaluate Application {blockProcessApplications && "🔒"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleDeleteApplication(app.id)} className="cursor-pointer font-bold text-xs text-rose-600 rounded-xl py-2">
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
                    <TableCell colSpan={5} className="text-center py-16 text-slate-500">
                      <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="font-semibold text-slate-900 text-sm">No applications found</p>
                      <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search query or status filter.</p>
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
