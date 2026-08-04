"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Receipt, Search, Plus, MoreVertical, CheckCircle, XCircle, Trash2, FileText, Download, TrendingUp, AlertCircle, Clock, Eye, SlidersHorizontal, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { generateSingleInvoicePDF } from "@/lib/pdfGenerator";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleLockedBanner from "@/components/subscription/ModuleLockedBanner";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";

export default function InvoicesPage() {
  const featureAccess = useFeatureAccess("view_invoices");
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const isTenant = role === "TENANT";
  const isOwner = role === "OWNER";
  const { allowed: moduleAllowed, loading: moduleLoading } = useModuleAccess("invoices");

  const [invoices, setInvoices] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    leaseId: "",
    amount: "",
    dueDate: "",
    status: "UNPAID",
    invoiceType: "RENT"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, leaseRes] = await Promise.all([
        fetch("/api/invoices"),
        fetch(isTenant ? "/api/leases" : "/api/leases")
      ]);
      
      if (invRes.ok) {
        setInvoices(await invRes.json());
      } else {
        // Sample preview invoices when module is locked / 403
        setInvoices([
          { id: "INV-2026-001", amount: 2450, status: "PAID", invoiceType: "RENT", dueDate: "2026-07-01", lease: { property: { name: "Sunset Heights Apartments" }, unit: { unitNumber: "4B" }, tenant: { name: "John Doe" } } },
          { id: "INV-2026-002", amount: 1850, status: "UNPAID", invoiceType: "RENT", dueDate: "2026-08-01", lease: { property: { name: "Oakridge Commercial Hub" }, unit: { unitNumber: "Suite 12" }, tenant: { name: "Alice Smith" } } },
          { id: "INV-2026-003", amount: 350, status: "PAID", invoiceType: "MAINTENANCE", dueDate: "2026-07-15", lease: { property: { name: "Maplewood Terrace" }, unit: { unitNumber: "Apt 2A" }, tenant: { name: "Robert Taylor" } } },
          { id: "INV-2026-004", amount: 50, status: "PAID", invoiceType: "LATE_FEE", dueDate: "2026-07-05", lease: { property: { name: "Highland Residences" }, unit: { unitNumber: "Unit 101" }, tenant: { name: "Emily Davis" } } },
        ]);
      }

      if (!isTenant && leaseRes.ok) {
        const allLeases = await leaseRes.json();
        setLeases(allLeases.filter((l: any) => l.status === "ACTIVE"));
      }
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leaseId || !formData.amount || !formData.dueDate) {
      toast.error("Please fill all required fields");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        toast.success("Invoice created successfully");
        setIsModalOpen(false);
        setFormData({ leaseId: "", amount: "", dueDate: "", status: "UNPAID", invoiceType: "RENT" });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create invoice");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/invoices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast.success(`Invoice marked as ${status}`);
        fetchData();
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      toast.error("Error updating invoice");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/invoices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Invoice deleted");
        fetchData();
      } else {
        toast.error("Failed to delete");
      }
    } catch (err) {
      toast.error("Error deleting invoice");
    }
  };

  const handleSendReminder = async (inv: any) => {
    if (!inv.lease?.tenant?.email) {
      toast.error("Tenant has no email address on file.");
      return;
    }

    const toastId = toast.loading("Sending payment reminder to tenant...");
    try {
      const emailRes = await fetch("/api/invoices/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: inv.lease.tenant.email,
          subject: `Urgent: Payment Reminder for Invoice INV-${inv.id.substring(0, 6).toUpperCase()}`,
          message: `Dear ${inv.lease.tenant.name},\n\nThis is a friendly reminder that you have an outstanding payment of $${Number(inv.amount).toFixed(2)} due on ${new Date(inv.dueDate).toLocaleDateString()} for property Unit ${inv.lease.unit?.name || ""}.\n\nPlease log in to your portal to make a payment online.\n\nThank you,\nManagement`,
          invoiceId: inv.id
        })
      });

      if (emailRes.ok) {
        toast.success("Payment reminder sent successfully!", { id: toastId });
      } else {
        throw new Error("Failed to dispatch email");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send reminder", { id: toastId });
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const searchString = `${inv.id} ${inv.lease?.tenant?.name} ${inv.lease?.unit?.property?.name}`.toLowerCase();
    if (!searchString.includes(searchTerm.toLowerCase())) return false;
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (typeFilter !== "all" && inv.invoiceType !== typeFilter) return false;
    return true;
  });

  const totalCollected = invoices.filter(i => i.status === "PAID").reduce((sum, i) => sum + Number(i.amount), 0);
  const totalOutstanding = invoices.filter(i => i.status === "UNPAID").reduce((sum, i) => sum + Number(i.amount), 0);
  const totalOverdue = invoices.filter(i => i.status === "OVERDUE").reduce((sum, i) => sum + Number(i.amount), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID": return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">Paid</span>;
      case "UNPAID": return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">Unpaid</span>;
      case "OVERDUE": return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">Overdue</span>;
      case "VOID": return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">Void</span>;
      default: return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">{status}</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    const safeType = type || "RENT";
    switch (safeType) {
      case "RENT": return <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">Rent</span>;
      case "DEPOSIT": return <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">Deposit</span>;
      case "LATE_FEE": return <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">Late Fee</span>;
      case "MAINTENANCE": return <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">Maintenance</span>;
      default: return <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">{safeType}</span>;
    }
  };

  const isTenantBlocked = isTenant && !featureAccess.allowed;

  return (
    <div className="relative font-sans">
      {isTenantBlocked && (
        <FeatureBlockedOverlay
          featureLabel="Rent Invoices & Receipts"
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}
      <div className={isTenantBlocked ? "pointer-events-none select-none blur-[2.5px] opacity-70" : ""}>
      <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            {isTenant ? "View your rent statements and transaction invoices." : "Manage billing, track payments, and generate invoices."}
          </p>
        </div>
        {!isTenant && (
          <Button onClick={() => setIsModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs h-9 px-4 rounded-xl shadow-xs transition-all cursor-pointer">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Invoice
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 shadow-xs rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">{isTenant ? "Total Paid" : "Total Collected"}</span>
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <p className="text-[11px] font-semibold text-emerald-800 mt-4 pt-3 border-t border-slate-100">Payments marked as PAID</p>
        </div>

        <div className="bg-white border border-slate-200 shadow-xs rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">Outstanding Balance</span>
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 shadow-2xs">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <p className="text-[11px] font-semibold text-amber-900 mt-4 pt-3 border-t border-slate-100">Awaiting payment</p>
        </div>

        <div className="bg-white border border-slate-200 shadow-xs rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800">Total Overdue</span>
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 shadow-2xs">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">${totalOverdue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <p className="text-[11px] font-semibold text-rose-800 mt-4 pt-3 border-t border-slate-100">Requires immediate action</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 shadow-xs rounded-3xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by invoice ID, tenant, or property..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-white border-slate-200 text-xs font-semibold text-slate-900 placeholder-slate-400 focus-visible:ring-slate-400 shadow-2xs"
              />
            </div>
            
            <div className="relative w-full sm:w-44">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 pl-3 pr-8 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none shadow-2xs cursor-pointer"
              >
                <option value="all">Status: All</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="VOID">Void</option>
              </select>
            </div>

            <div className="relative w-full sm:w-44">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full h-10 pl-3 pr-8 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-900 outline-none shadow-2xs cursor-pointer"
              >
                <option value="all">Type: All</option>
                <option value="RENT">Rent</option>
                <option value="DEPOSIT">Deposit</option>
                <option value="LATE_FEE">Late Fee</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 border-b border-slate-200/80">
              <TableRow>
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Invoice ID</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Property &amp; Tenant</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Type</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Issue Date</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Due Date</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Gross Amount</TableHead>
                {!isTenant && <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Net Earnings</TableHead>}
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Status</TableHead>
                <TableHead className="text-right font-extrabold text-[10px] uppercase text-slate-500 py-3.5 px-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isTenant ? 8 : 9} className="h-32 text-center text-slate-500 font-extrabold text-xs">Loading invoices...</TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isTenant ? 8 : 9} className="h-32 text-center text-slate-500 font-extrabold text-xs">No invoices found.</TableCell>
                </TableRow>
              ) : (
                (() => {
                  const start = (currentPage - 1) * itemsPerPage;
                  const paginated = filteredInvoices.slice(start, start + itemsPerPage);

                  return (
                    <>
                      {paginated.map((inv) => (
                        <TableRow key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-mono text-xs font-black text-slate-900">
                            INV-{inv.id.substring(0, 6).toUpperCase()}
                          </TableCell>
                          <TableCell>
                            <div className="font-extrabold text-xs text-slate-900">{inv.lease?.unit?.property?.name || "Unknown Property"}</div>
                            <div className="text-[11px] font-semibold text-slate-500">{inv.lease?.tenant?.name || "Unknown Tenant"}</div>
                          </TableCell>
                          <TableCell>
                            {getTypeBadge(inv.invoiceType)}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-500">
                            {new Date(inv.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-500">
                            {new Date(inv.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </TableCell>
                          <TableCell className="font-black text-xs text-slate-900">
                            ${Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          {!isTenant && (
                            <TableCell className="font-black text-xs text-emerald-700">
                              {inv.netToOwner 
                                ? `$${Number(inv.netToOwner).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                : "-"}
                            </TableCell>
                          )}
                          <TableCell>
                            {getStatusBadge(inv.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer">
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-2xl border-slate-200 p-1.5 shadow-xl font-sans">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setIsDetailModalOpen(true);
                                  }} 
                                  className="cursor-pointer font-extrabold text-xs text-slate-900 rounded-xl"
                                >
                                  <Eye className="mr-2 h-4 w-4 text-slate-400" /> View Details
                                </DropdownMenuItem>

                                <DropdownMenuItem 
                                  onClick={() => {
                                    generateSingleInvoicePDF(inv);
                                    toast.success("Invoice PDF download initiated");
                                  }} 
                                  className="cursor-pointer font-extrabold text-xs text-slate-900 rounded-xl"
                                >
                                  <Download className="mr-2 h-4 w-4 text-slate-400" /> Download PDF
                                </DropdownMenuItem>
                                
                                {isTenant ? (
                                  (inv.status === "UNPAID" || inv.status === "OVERDUE") && (
                                    <DropdownMenuItem onClick={() => router.push("/dashboard/payments/pay-rent")} className="cursor-pointer font-extrabold text-xs text-emerald-800 rounded-xl">
                                      <Receipt className="mr-2 h-4 w-4 text-emerald-600" /> Pay Invoice
                                    </DropdownMenuItem>
                                  )
                                ) : (
                                  <>
                                    {inv.status !== "PAID" && (
                                      <DropdownMenuItem onClick={() => handleSendReminder(inv)} className="cursor-pointer font-extrabold text-xs text-amber-800 rounded-xl">
                                        <Bell className="mr-2 h-4 w-4 text-amber-600" /> Send Reminder
                                      </DropdownMenuItem>
                                    )}
                                    {inv.status !== "PAID" && (
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(inv.id, "PAID")} className="cursor-pointer font-extrabold text-xs text-emerald-800 rounded-xl">
                                        <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Mark as Paid
                                      </DropdownMenuItem>
                                    )}
                                    {inv.status !== "OVERDUE" && inv.status !== "PAID" && (
                                      <DropdownMenuItem onClick={() => handleUpdateStatus(inv.id, "OVERDUE")} className="cursor-pointer font-extrabold text-xs text-rose-700 rounded-xl">
                                        <AlertCircle className="mr-2 h-4 w-4 text-rose-600" /> Mark Overdue
                                      </DropdownMenuItem>
                                    )}
                                    
                                    <DropdownMenuItem onClick={() => handleDelete(inv.id)} className="cursor-pointer font-extrabold text-xs text-rose-600 rounded-xl hover:bg-rose-50 mt-1">
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete Invoice
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  );
                })()
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Pagination */}
        <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-semibold">
            Showing <span className="font-extrabold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-extrabold text-slate-900">
              {Math.min(currentPage * itemsPerPage, filteredInvoices.length)}
            </span>{" "}
            of <span className="font-extrabold text-slate-900">{filteredInvoices.length}</span> invoices
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-extrabold text-slate-800 px-2">Page {currentPage} of {Math.ceil(filteredInvoices.length / itemsPerPage) || 1}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, Math.ceil(filteredInvoices.length / itemsPerPage) || 1))}
              disabled={currentPage === Math.ceil(filteredInvoices.length / itemsPerPage) || filteredInvoices.length === 0}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {!isTenant && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl p-0 border border-slate-200 shadow-2xl overflow-hidden font-sans">
            <div className="p-6 border-b border-slate-100 bg-slate-50/70">
              <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">Create New Invoice</DialogTitle>
            </div>
            
            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-900">Select Lease <span className="text-rose-500">*</span></label>
                <select 
                  required
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-slate-400 shadow-2xs"
                  value={formData.leaseId}
                  onChange={(e) => setFormData({...formData, leaseId: e.target.value})}
                >
                  <option value="">Select a lease...</option>
                  {leases.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.tenant?.name || "Unknown"} - {l.unit?.property?.name || "Unknown Property"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-900">Invoice Amount ($) <span className="text-rose-500">*</span></label>
                <Input 
                  required
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1500.00" 
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="h-10 rounded-xl bg-slate-50 border-slate-200 font-semibold text-xs text-slate-900 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-900">Due Date <span className="text-rose-500">*</span></label>
                <Input 
                  required
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  className="h-10 rounded-xl bg-slate-50 border-slate-200 font-semibold text-xs text-slate-900 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-900">Invoice Type</label>
                <select 
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-slate-400 shadow-2xs"
                  value={formData.invoiceType}
                  onChange={(e) => setFormData({...formData, invoiceType: e.target.value})}
                >
                  <option value="RENT">Rent</option>
                  <option value="DEPOSIT">Security Deposit</option>
                  <option value="LATE_FEE">Late Fee</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-900">Initial Status</label>
                <select 
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-slate-400 shadow-2xs"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="UNPAID">Unpaid</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-10 font-black text-xs px-6 border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl h-10 font-black text-xs px-6 bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer">
                  {isSubmitting ? "Creating..." : "Create Invoice"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Invoice Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white rounded-3xl p-0 border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-sans">
          {selectedInvoice && (
            <>
              <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
                <div>
                  <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">
                    Invoice Detail
                  </DialogTitle>
                  <p className="text-slate-500 text-xs font-extrabold mt-0.5 font-mono">
                    INV-{selectedInvoice.id.substring(0, 6).toUpperCase()}
                  </p>
                </div>
                <div className="flex gap-2 mr-6">
                  <Button
                    onClick={() => {
                      generateSingleInvoicePDF(selectedInvoice);
                      toast.success("Invoice PDF download initiated");
                    }}
                    className="h-8 rounded-xl font-black text-xs border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" /> Download PDF
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Gross Rent Billed</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">
                      ${Number(selectedInvoice.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Issue Date</p>
                    <p className="text-xs font-black text-slate-900 mt-1">
                      {new Date(selectedInvoice.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Due Date</p>
                    <p className="text-xs font-black text-slate-900 mt-1">
                      {new Date(selectedInvoice.dueDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <Button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl h-10 font-black text-xs px-6 border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </div>
    </div>
  );
}
