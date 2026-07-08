"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Receipt, Search, Plus, MoreVertical, CheckCircle, XCircle, Trash2, FileText, Download, TrendingUp, AlertCircle, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { generateSingleInvoicePDF } from "@/lib/pdfGenerator";

export default function InvoicesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const isTenant = role === "TENANT";

  const [invoices, setInvoices] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    leaseId: "",
    amount: "",
    dueDate: "",
    status: "UNPAID"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, leaseRes] = await Promise.all([
        fetch("/api/invoices"),
        fetch(isTenant ? "/api/leases" : "/api/leases")
      ]);
      
      if (invRes.ok) setInvoices(await invRes.json());
      if (!isTenant && leaseRes.ok) {
        const allLeases = await leaseRes.json();
        setLeases(allLeases.filter((l: any) => l.status === "ACTIVE"));
      }
    } catch (err) {
      toast.error("Failed to load invoices data");
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
        setFormData({ leaseId: "", amount: "", dueDate: "", status: "UNPAID" });
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

  const filteredInvoices = invoices.filter(inv => {
    const searchString = `${inv.id} ${inv.lease?.tenant?.name} ${inv.lease?.unit?.property?.name}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Calculate KPIs
  const totalCollected = invoices.filter(i => i.status === "PAID").reduce((sum, i) => sum + Number(i.amount), 0);
  const totalOutstanding = invoices.filter(i => i.status === "UNPAID").reduce((sum, i) => sum + Number(i.amount), 0);
  const totalOverdue = invoices.filter(i => i.status === "OVERDUE").reduce((sum, i) => sum + Number(i.amount), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID": return <Badge className="bg-[#DCFCE7] text-[#16A34A] border-0 hover:bg-[#DCFCE7]">Paid</Badge>;
      case "UNPAID": return <Badge className="bg-[#FEF9C3] text-[#CA8A04] border-0 hover:bg-[#FEF9C3]">Unpaid</Badge>;
      case "OVERDUE": return <Badge className="bg-[#FEE2E2] text-[#DC2626] border-0 hover:bg-[#FEE2E2]">Overdue</Badge>;
      case "VOID": return <Badge className="bg-gray-100 text-gray-600 border-0 hover:bg-gray-100">Void</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Invoices</h1>
          <p className="text-[#64748B] text-sm mt-1">
            {isTenant ? "View your rent statements and transaction invoices." : "Manage billing, track payments, and generate invoices."}
          </p>
        </div>
        {!isTenant && (
          <Button onClick={() => setIsModalOpen(true)} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm rounded-xl h-11 px-6 font-bold flex items-center gap-2">
            <Plus className="h-5 w-5" /> Create Invoice
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="h-24 w-24 text-[#10B981]" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-[#10B981]">
                <CheckCircle className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-[#64748B]">{isTenant ? "Total Paid" : "Total Collected"}</h3>
            </div>
            <div className="text-3xl font-black text-[#0F172A]">${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-sm font-semibold text-[#10B981] mt-2">Payments marked as PAID</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="h-24 w-24 text-[#F59E0B]" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#F59E0B]">
                <Receipt className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-[#64748B]">Outstanding Balance</h3>
            </div>
            <div className="text-3xl font-black text-[#0F172A]">${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-sm font-semibold text-[#F59E0B] mt-2">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertCircle className="h-24 w-24 text-[#EF4444]" />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[#FEE2E2] flex items-center justify-center text-[#EF4444]">
                <XCircle className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-[#64748B]">Total Overdue</h3>
            </div>
            <div className="text-3xl font-black text-[#0F172A]">${totalOverdue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-sm font-semibold text-[#EF4444] mt-2">Requires immediate action</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#E2E8F0] flex flex-col md:flex-row justify-between items-center gap-4 bg-[#F8FAFC]/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
            <Input 
              placeholder="Search by invoice ID, tenant, or property..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6]"
            />
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                <TableHead className="font-bold text-[#64748B]">Invoice ID</TableHead>
                <TableHead className="font-bold text-[#64748B]">Property & Tenant</TableHead>
                <TableHead className="font-bold text-[#64748B]">Issue Date</TableHead>
                <TableHead className="font-bold text-[#64748B]">Due Date</TableHead>
                <TableHead className="font-bold text-[#64748B]">Gross Amount</TableHead>
                {!isTenant && <TableHead className="font-bold text-[#64748B]">Net Earnings</TableHead>}
                <TableHead className="font-bold text-[#64748B]">Status</TableHead>
                <TableHead className="text-right font-bold text-[#64748B]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-[#64748B] font-bold">Loading invoices...</TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-[#64748B] font-bold">No invoices found.</TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="border-[#E2E8F0] hover:bg-[#F8FAFC]/50 transition-colors">
                    <TableCell className="font-semibold text-[#0F172A]">
                      INV-{inv.id.substring(0, 6).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-[#0F172A]">{inv.lease?.unit?.property?.name || "Unknown Property"}</div>
                      <div className="text-sm font-semibold text-[#64748B]">{inv.lease?.tenant?.name || "Unknown Tenant"}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-[#64748B]">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-semibold text-[#64748B]">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-black text-[#0F172A]">
                      ${Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    {!isTenant && (
                      <TableCell className="font-bold text-green-600">
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
                        <DropdownMenuTrigger className="h-8 w-8 p-0 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0] inline-flex items-center justify-center rounded-lg transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#E2E8F0] p-1 shadow-lg">
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsDetailModalOpen(true);
                            }} 
                            className="cursor-pointer font-semibold text-[#0F172A] rounded-lg"
                          >
                            <Eye className="mr-2 h-4 w-4 text-[#94A3B8]" /> View Details
                          </DropdownMenuItem>

                          <DropdownMenuItem 
                            onClick={() => {
                              generateSingleInvoicePDF(inv);
                              toast.success("Invoice PDF download initiated");
                            }} 
                            className="cursor-pointer font-semibold text-[#0F172A] rounded-lg"
                          >
                            <Download className="mr-2 h-4 w-4 text-[#94A3B8]" /> Download PDF
                          </DropdownMenuItem>
                          
                          {isTenant ? (
                            (inv.status === "UNPAID" || inv.status === "OVERDUE") && (
                              <DropdownMenuItem onClick={() => router.push("/dashboard/payments/pay-rent")} className="cursor-pointer font-semibold text-[#3B82F6] rounded-lg">
                                <Receipt className="mr-2 h-4 w-4 text-[#94A3B8]" /> Pay Invoice
                              </DropdownMenuItem>
                            )
                          ) : (
                            <>
                              {inv.status !== "PAID" && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(inv.id, "PAID")} className="cursor-pointer font-semibold text-[#16A34A] rounded-lg">
                                  <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                                </DropdownMenuItem>
                              )}
                              {inv.status !== "OVERDUE" && inv.status !== "PAID" && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(inv.id, "OVERDUE")} className="cursor-pointer font-semibold text-[#DC2626] rounded-lg">
                                  <AlertCircle className="mr-2 h-4 w-4" /> Mark Overdue
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem onClick={() => handleDelete(inv.id)} className="cursor-pointer font-semibold text-red-500 rounded-lg hover:text-red-600 focus:text-red-600 focus:bg-red-50 mt-1">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Invoice
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!isTenant && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md bg-white rounded-2xl p-0 border-0 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <DialogTitle className="text-xl font-bold text-[#0F172A]">Create New Invoice</DialogTitle>
            </div>
            
            <form onSubmit={handleCreateInvoice} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Select Lease <span className="text-red-500">*</span></label>
                <select 
                  required
                  className="w-full h-11 bg-white border border-[#E2E8F0] rounded-xl px-4 text-sm font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#3B82F6]"
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

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Invoice Amount ($) <span className="text-red-500">*</span></label>
                <Input 
                  required
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1500.00" 
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="h-11 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Due Date <span className="text-red-500">*</span></label>
                <Input 
                  required
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  className="h-11 rounded-xl bg-white border-[#E2E8F0] focus-visible:ring-[#3B82F6] font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#0F172A]">Initial Status</label>
                <select 
                  className="w-full h-11 bg-white border border-[#E2E8F0] rounded-xl px-4 text-sm font-semibold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="UNPAID">Unpaid</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>

              <DialogFooter className="pt-4 border-t border-[#F1F5F9] mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-11 font-bold px-6 border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 font-bold px-6 bg-[#3B82F6] hover:bg-[#2563EB] text-white">
                  {isSubmitting ? "Creating..." : "Create Invoice"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Invoice Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white rounded-2xl p-0 border-0 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {selectedInvoice && (
            <>
              <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
                <div>
                  <DialogTitle className="text-xl font-bold text-[#0F172A]">
                    Invoice Detail
                  </DialogTitle>
                  <p className="text-[#64748B] text-xs font-semibold mt-1">
                    INV-{selectedInvoice.id.substring(0, 6).toUpperCase()}
                  </p>
                </div>
                <div className="flex gap-2 mr-6">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg font-bold border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50 flex items-center gap-1"
                    onClick={() => {
                      generateSingleInvoicePDF(selectedInvoice);
                      toast.success("Invoice PDF download initiated");
                    }}
                  >
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </Button>
                  {isTenant && (selectedInvoice.status === "UNPAID" || selectedInvoice.status === "OVERDUE") && (
                    <Button
                      size="sm"
                      className="h-8 rounded-lg font-bold bg-[#3B82F6] hover:bg-[#2563EB] text-white flex items-center gap-1"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        router.push("/dashboard/payments/pay-rent");
                      }}
                    >
                      Pay Now
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Status & Amount */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-[#E2E8F0]">
                  <div>
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Gross Rent Billed</p>
                    <p className="text-xl font-black text-[#0F172A] mt-0.5">
                      ${Number(selectedInvoice.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {!isTenant && selectedInvoice.status === "PAID" && selectedInvoice.adminFee !== null && (
                  <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <div>
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Platform Fee (Commission)</p>
                      <p className="text-base font-bold text-blue-900 mt-0.5">
                        -${Number(selectedInvoice.adminFee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Net Payout Received</p>
                      <p className="text-xl font-black text-green-700 mt-0.5">
                        ${Number(selectedInvoice.netToOwner).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Key Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Issue Date</p>
                    <p className="text-sm font-semibold text-[#0F172A] mt-1">
                      {new Date(selectedInvoice.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Due Date</p>
                    <p className="text-sm font-semibold text-[#0F172A] mt-1">
                      {new Date(selectedInvoice.dueDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <hr className="border-[#E2E8F0]" />

                {/* Property & Tenant Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Property Details</p>
                    <p className="text-sm font-bold text-[#0F172A]">{selectedInvoice.lease?.unit?.property?.name || "N/A"}</p>
                    <p className="text-xs font-semibold text-[#64748B] mt-0.5">
                      {selectedInvoice.lease?.unit?.name?.toLowerCase().includes("unit") 
                        ? selectedInvoice.lease?.unit?.name 
                        : `Unit ${selectedInvoice.lease?.unit?.name || "N/A"}`}
                    </p>
                    <p className="text-xs text-[#94A3B8] mt-1">{selectedInvoice.lease?.unit?.property?.address || ""}</p>
                    <p className="text-xs text-[#94A3B8]">{selectedInvoice.lease?.unit?.property?.city || ""}, {selectedInvoice.lease?.unit?.property?.state || ""} {selectedInvoice.lease?.unit?.property?.zip || selectedInvoice.lease?.unit?.property?.zipCode || ""}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Billed To</p>
                    <p className="text-sm font-bold text-[#0F172A]">{selectedInvoice.lease?.tenant?.name || "N/A"}</p>
                    <p className="text-xs font-semibold text-[#64748B] mt-0.5">{selectedInvoice.lease?.tenant?.email || "N/A"}</p>
                    <p className="text-xs font-semibold text-[#64748B]">{selectedInvoice.lease?.tenant?.phone || ""}</p>
                  </div>
                </div>

                <hr className="border-[#E2E8F0]" />

                {/* Invoice Items */}
                <div>
                  <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Line Items</p>
                  <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                          <th className="p-3 font-bold text-[#64748B]">Description</th>
                          <th className="p-3 font-bold text-[#64748B] text-center">Qty</th>
                          <th className="p-3 font-bold text-[#64748B] text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-3">
                            <p className="font-bold text-[#0F172A]">Residential Rental Invoice</p>
                            <p className="text-xs text-[#64748B] mt-0.5">Charges related to lease tenancy and billing schedule</p>
                          </td>
                          <td className="p-3 text-center font-semibold text-[#64748B]">1</td>
                          <td className="p-3 text-right font-bold text-[#0F172A]">
                            ${Number(selectedInvoice.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[#E2E8F0] bg-slate-50 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl h-11 font-bold px-6 border-[#E2E8F0] text-[#0F172A] hover:bg-slate-100"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
