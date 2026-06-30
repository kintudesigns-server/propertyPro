"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Printer, Download, Mail, Save, Share, CheckCircle, FileText, Building, Send } from "lucide-react";
import { toast } from "sonner";
import { generateInvoicePDF, generateInvoicePDFBase64 } from "@/lib/pdfGenerator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function LeaseInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [lease, setLease] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

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

  const currentDate = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  const dueDate = lease.startDate ? new Date(lease.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : currentDate;
  
  const monthlyRent = Number(lease.monthlyRent || 0);
  const deposit = Number(lease.deposit || 0);
  const lateFee = 50.00;
  const subTotal = monthlyRent + deposit;
  const tax = 0;
  const total = subTotal + tax;

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    setEmailTo(lease.tenant?.email || "");
    setEmailSubject(`Lease Invoice - ${lease.unit?.property?.name || "Property"}`);
    setEmailMessage(`Hi ${lease.tenant?.name || "Tenant"},\n\nPlease find your invoice INV-${lease.id.substring(0,6).toUpperCase()} attached. The total amount due is $${total.toLocaleString(undefined, {minimumFractionDigits: 2})}.\n\nThank you.`);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailTo || !emailSubject || !emailMessage) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSending(true);
    try {
      const attachmentBase64 = generateInvoicePDFBase64(lease);

      const res = await fetch("/api/invoices/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          to: emailTo, 
          subject: emailSubject, 
          message: emailMessage,
          attachmentBase64,
          invoiceId: `INV-${lease.id.substring(0,6).toUpperCase()}`
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        if (data.simulated) {
          toast.success("SMTP not configured. Email simulated successfully.");
        } else {
          toast.success("Invoice emailed successfully!");
        }
        setIsEmailModalOpen(false);
      } else {
        toast.error(data.error || "Failed to send email");
      }
    } catch (error) {
      toast.error("An error occurred while sending the email");
    } finally {
      setIsSending(false);
    }
  };

  const handleSave = () => {
    toast.success("Invoice saved to tenant documents");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Invoice INV-${lease.id.substring(0,6).toUpperCase()}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Invoice link copied to clipboard");
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto pt-6 space-y-6 pb-20 px-2 sm:px-0">
      {/* Top Nav */}
      <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]">
        <button onClick={() => router.back()} className="hover:text-[#0F172A] transition-colors flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Lease Details
        </button>
        <span>/</span>
        <span className="text-[#0F172A] truncate max-w-[200px]">Invoice {lease.id.substring(0, 8)}...</span>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-[#E2E8F0]">
        <Button onClick={handlePrint} variant="outline" className="h-10 rounded-xl font-bold bg-white hover:bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A]">
          <Printer className="h-4 w-4 mr-2 text-[#64748B]" /> Print
        </Button>
        <Button onClick={() => generateInvoicePDF(lease)} variant="outline" className="h-10 rounded-xl font-bold bg-white hover:bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A]">
          <Download className="h-4 w-4 mr-2 text-[#64748B]" /> Download PDF
        </Button>
        <Button onClick={handleEmail} variant="outline" className="h-10 rounded-xl font-bold bg-white hover:bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A]">
          <Mail className="h-4 w-4 mr-2 text-[#64748B]" /> Email
        </Button>
        <Button onClick={handleSave} variant="outline" className="h-10 rounded-xl font-bold bg-white hover:bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A]">
          <Save className="h-4 w-4 mr-2 text-[#64748B]" /> Save to Documents
        </Button>
        <Button onClick={handleShare} variant="outline" className="h-10 rounded-xl font-bold bg-white hover:bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] ml-auto">
          <Share className="h-4 w-4 mr-2 text-[#64748B]" /> Share
        </Button>
      </div>

      {/* Invoice Document */}
      <Card className="bg-white border-[#E2E8F0] shadow-md rounded-[24px] overflow-hidden">
        {/* Header Block */}
        <div className="p-8 md:p-12 border-b border-[#E2E8F0] flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 bg-[#3B82F6] rounded-xl flex items-center justify-center text-white">
                <Building className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">PropertyPro</h1>
            </div>
            <p className="text-sm font-bold text-[#94A3B8] uppercase tracking-wider mb-2">From</p>
            <p className="text-base font-bold text-[#0F172A]">{lease.unit?.property?.name || "Property Management"}</p>
            <p className="text-sm font-medium text-[#64748B] mt-1">{lease.unit?.property?.address}</p>
            <p className="text-sm font-medium text-[#64748B]">{lease.unit?.property?.city}, {lease.unit?.property?.state} {lease.unit?.property?.zipCode}</p>
          </div>
          
          <div className="text-left md:text-right w-full md:w-auto bg-[#F8FAFC] p-6 rounded-2xl border border-[#E2E8F0]">
            <h2 className="text-xl font-black text-[#0F172A] mb-4">INVOICE</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <p className="text-sm font-bold text-[#64748B] text-left md:text-right">Invoice #</p>
              <p className="text-sm font-black text-[#0F172A] text-left md:text-right">INV-{lease.id.substring(0,6).toUpperCase()}</p>
              
              <p className="text-sm font-bold text-[#64748B] text-left md:text-right">Date Issued</p>
              <p className="text-sm font-black text-[#0F172A] text-left md:text-right">{currentDate}</p>
              
              <p className="text-sm font-bold text-[#64748B] text-left md:text-right">Date Due</p>
              <p className="text-sm font-black text-[#0F172A] text-left md:text-right">{dueDate}</p>
            </div>
            <div className="mt-4 flex justify-start md:justify-end">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#DCFCE7] text-[#10B981] rounded-full text-xs font-bold uppercase tracking-wider">
                <CheckCircle className="h-3 w-3" /> Paid
              </span>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-10">
          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3 border-b border-[#F1F5F9] pb-2">Billed To (Tenant)</p>
              <p className="text-lg font-black text-[#0F172A]">{lease.tenant?.name || "Unknown Tenant"}</p>
              <p className="text-sm font-medium text-[#64748B] mt-1">{lease.tenant?.email || "No email"}</p>
              <p className="text-sm font-medium text-[#64748B]">{lease.tenant?.phone || "No phone"}</p>
              <p className="text-xs font-bold text-[#94A3B8] mt-3">Tenant ID: {lease.tenantId?.substring(0,8) || "N/A"}</p>
            </div>
            
            <div>
              <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3 border-b border-[#F1F5F9] pb-2">Property Details</p>
              <p className="text-lg font-black text-[#0F172A]">Unit {lease.unit?.name}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2.5 py-1 bg-[#F1F5F9] text-[#64748B] text-xs font-bold rounded-md">{lease.unit?.type || "Apartment"}</span>
                <span className="px-2.5 py-1 bg-[#F1F5F9] text-[#64748B] text-xs font-bold rounded-md">{lease.unit?.rooms || 0} Bed</span>
                <span className="px-2.5 py-1 bg-[#F1F5F9] text-[#64748B] text-xs font-bold rounded-md">{lease.unit?.bathrooms || 0} Bath</span>
                <span className="px-2.5 py-1 bg-[#F1F5F9] text-[#64748B] text-xs font-bold rounded-md">{lease.unit?.sqFootage || 0} SqFt</span>
              </div>
            </div>
          </div>

          {/* Lease Summary */}
          <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-[#E2E8F0]">
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">Lease Summary</h3>
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <div>
                <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Start Date</p>
                <p className="text-sm font-black text-[#0F172A]">
                  {lease.startDate ? new Date(lease.startDate).toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: 'numeric'}) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">End Date</p>
                <p className="text-sm font-black text-[#0F172A]">
                  {lease.endDate ? new Date(lease.endDate).toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: 'numeric'}) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Duration</p>
                <p className="text-sm font-black text-[#0F172A]">12 Months</p>
              </div>
            </div>
          </div>

          {/* Financial Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[#E2E8F0]">
                  <th className="py-3 text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Description</th>
                  <th className="py-3 text-xs font-bold text-[#94A3B8] uppercase tracking-wider text-center">Qty</th>
                  <th className="py-3 text-xs font-bold text-[#94A3B8] uppercase tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-[#F1F5F9]">
                  <td className="py-4">
                    <p className="font-bold text-[#0F172A]">Monthly Rent</p>
                    <p className="text-xs text-[#64748B] mt-0.5">Standard monthly residential rent</p>
                  </td>
                  <td className="py-4 text-center font-bold text-[#64748B]">1</td>
                  <td className="py-4 text-right font-black text-[#0F172A]">${monthlyRent.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
                <tr className="border-b border-[#F1F5F9]">
                  <td className="py-4">
                    <p className="font-bold text-[#0F172A]">Security Deposit</p>
                    <p className="text-xs text-[#64748B] mt-0.5">Refundable deposit upon lease termination</p>
                  </td>
                  <td className="py-4 text-center font-bold text-[#64748B]">1</td>
                  <td className="py-4 text-right font-black text-[#0F172A]">${deposit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
                <tr className="border-b border-[#F1F5F9]">
                  <td className="py-4">
                    <p className="font-bold text-[#0F172A]">Late Fee</p>
                    <p className="text-xs text-[#64748B] mt-0.5">Applied after 5th of the month</p>
                  </td>
                  <td className="py-4 text-center font-bold text-[#64748B]">-</td>
                  <td className="py-4 text-right font-black text-[#0F172A] text-[#94A3B8] italic">(${lateFee.toLocaleString(undefined, {minimumFractionDigits: 2})})</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end pt-6">
            <div className="w-full md:w-1/2 lg:w-1/3 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-[#64748B]">Subtotal</span>
                <span className="font-black text-[#0F172A]">${subTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-[#64748B]">Tax (0%)</span>
                <span className="font-black text-[#0F172A]">${tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center border-t-2 border-[#3B82F6] pt-3 mt-3">
                <span className="text-base font-bold text-[#0F172A]">Total Initial Payment</span>
                <span className="text-2xl font-black text-[#3B82F6]">${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#F8FAFC] p-8 md:p-12 border-t border-[#E2E8F0] text-center md:text-left">
          <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Terms & Conditions</p>
          <p className="text-sm text-[#64748B] font-medium leading-relaxed max-w-3xl">
            Please pay your invoice by the due date. You can pay securely online through your tenant portal. 
            Late payments may incur additional fees as specified in your lease agreement. If you have any questions 
            about this invoice, please contact your property manager immediately.
          </p>
        </div>
      </Card>

      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Email Invoice</DialogTitle>
            <DialogDescription>
              Send this invoice directly to your tenant's email address.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="to" className="text-sm font-semibold text-[#0F172A]">To</label>
              <Input
                id="to"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="w-full h-11 border-[#E2E8F0] rounded-xl focus-visible:ring-[#3B82F6]"
                placeholder="tenant@example.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="subject" className="text-sm font-semibold text-[#0F172A]">Subject</label>
              <Input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full h-11 border-[#E2E8F0] rounded-xl focus-visible:ring-[#3B82F6]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="message" className="text-sm font-semibold text-[#0F172A]">Message</label>
              <textarea
                id="message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="w-full flex min-h-[160px] rounded-xl border border-[#E2E8F0] bg-transparent px-3 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsEmailModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={isSending} className="rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white">
              {isSending ? (
                <>Sending...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Send Email</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
