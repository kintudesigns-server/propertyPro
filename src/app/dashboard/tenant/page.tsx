"use client";

import React, { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Home, Calendar, CreditCard, Wrench, Shield, LogOut, Loader2, Plus, Clock, 
  CheckCircle, Search, Bell, User, ChevronDown, ChevronRight, Settings, 
  AlertTriangle, FileText, Send, Phone, Video, Info, UserCheck, DollarSign
} from "lucide-react";
import { toast } from "sonner";

export default function TenantDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Core Data States
  const [leases, setLeases] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  
  // App UI State
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const activeTab = searchParams ? searchParams.get("tab") || "overview" : "overview";

  const setActiveTab = (tabName: string) => {
    router.push(`/dashboard/tenant?tab=${tabName}`);
  };

  // Sidebar Menu Accordions
  const [leasesOpen, setLeasesOpen] = useState(true);
  const [maintenanceOpen, setMaintenanceOpen] = useState(true);
  const [financialsOpen, setFinancialsOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);

  // Form States
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mCategory, setMCategory] = useState("GENERAL");
  const [mPriority, setMPriority] = useState("MEDIUM");
  const [mPropertyId, setMPropertyId] = useState("");
  const [mUnitId, setMUnitId] = useState("");
  const [mSubmitting, setMSubmitting] = useState(false);

  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState("LEASE");
  const [docUrl, setDocUrl] = useState("");
  const [docSubmitting, setDocSubmitting] = useState(false);

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Messaging state
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Filter States
  const [docSearch, setDocSearch] = useState("");
  const [docFilterCat, setDocFilterCat] = useState("ALL");
  const [maintFilterPriority, setMaintFilterPriority] = useState("ALL");
  const [maintFilterStatus, setMaintFilterStatus] = useState("ALL");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const [leasesRes, invoicesRes, maintRes, docsRes, txsRes, msgsRes, ownersRes, inspectorsRes] = await Promise.all([
        fetch("/api/leases"),
        fetch("/api/invoices"),
        fetch("/api/maintenance"),
        fetch("/api/documents"),
        fetch("/api/transactions"),
        fetch("/api/messages"),
        fetch("/api/users?role=OWNER"),
        fetch("/api/users?role=INSPECTOR"),
      ]);

      const [leasesData, invoicesData, maintData, docsData, txsData, msgsData, ownersData, inspectorsData] = await Promise.all([
        leasesRes.json(),
        invoicesRes.json(),
        maintRes.json(),
        docsRes.json(),
        txsRes.json(),
        msgsRes.json(),
        ownersRes.json(),
        inspectorsRes.json(),
      ]);

      setLeases(leasesData);
      setInvoices(invoicesData);
      setMaintenance(maintData);
      setDocuments(docsData);
      setTransactions(txsData);
      setMessages(msgsData);

      const allContacts = [...ownersData, ...inspectorsData];
      setContacts(allContacts);
      if (allContacts.length > 0 && !selectedContact) {
        setSelectedContact(allContacts[0]);
      }

      if (session?.user) {
        setProfileName(session.user.name || "");
        setProfilePhone((session.user as any).phone || "");
      }
    } catch (error) {
      console.error("Error loading tenant dashboard:", error);
      toast.error("Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  const activeLease = leases.find((l) => l.status === "ACTIVE");
  const activeLeases = leases.filter((l) => l.status === "ACTIVE");
  const pendingLease = leases.find((l) => l.status === "PENDING_SIGNATURE");

  // Auto-select first lease unit when leases load
  React.useEffect(() => {
    if (activeLeases.length > 0 && !mPropertyId) {
      setMPropertyId(activeLeases[0].unit?.propertyId || "");
      setMUnitId(activeLeases[0].unitId || "");
    }
  }, [leases]);

  // Handlers
  const handlePayInvoice = async (invoiceId: string) => {
    toast.info("Preparing Stripe Checkout...");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to initiate payment");
      }
    } catch (err) {
      console.error(err);
      toast.error("Stripe Checkout failed.");
    }
  };

  const handlePayBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const unpaid = invoices.filter(i => i.status === "UNPAID" || i.status === "OVERDUE");
    if (unpaid.length === 0) {
      toast.info("No outstanding rent invoices found.");
      return;
    }
    if (!cardNumber || !cardExpiry || !cardCvv) {
      toast.error("Please fill in card payment credentials.");
      return;
    }

    setPaySubmitting(true);
    try {
      const targetInvoice = unpaid[0];
      const res = await fetch("/api/stripe/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "checkout.session.completed",
          data: {
            object: {
              metadata: { invoiceId: targetInvoice.id },
              id: "cs_test_" + Math.random().toString(36).slice(2, 11),
            }
          }
        }),
      });

      if (res.ok) {
        toast.success(`Success! Paid rent invoice of $${Number(targetInvoice.amount).toLocaleString()}`);
        setCardName("");
        setCardNumber("");
        setCardExpiry("");
        setCardCvv("");
        fetchData();
        setActiveTab("transactions");
      } else {
        toast.error("Mock card processor declined transaction.");
      }
    } catch (err) {
      toast.error("Failed to make payment.");
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeLeases.length === 0) {
      toast.error("You need an active lease to log a maintenance ticket.");
      return;
    }
    if (!mUnitId) {
      toast.error("Please select a property and unit.");
      return;
    }
    if (!mTitle || !mDesc) {
      toast.error("Please fill in title and description.");
      return;
    }

    setMSubmitting(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          unitId: mUnitId,
          title: mTitle, 
          description: mDesc, 
          category: mCategory,
          priority: mPriority 
        }),
      });

      if (res.ok) {
        toast.success("Maintenance ticket logged! Local inspector notified.");
        setMTitle("");
        setMDesc("");
        setMCategory("GENERAL");
        setMPriority("MEDIUM");
        fetchData();
        setActiveTab("my-requests");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to log maintenance request.");
      }
    } catch (err) {
      toast.error("Submission failed.");
    } finally {
      setMSubmitting(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !docUrl) {
      toast.error("Please enter a name and document URL.");
      return;
    }

    setDocSubmitting(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: docName, 
          url: docUrl, 
          category: docCategory,
          fileSize: "1.2 MB" 
        }),
      });

      if (res.ok) {
        toast.success("Document uploaded and registered successfully.");
        setDocName("");
        setDocUrl("");
        setDocCategory("LEASE");
        fetchData();
      } else {
        toast.error("Failed to register document.");
      }
    } catch (err) {
      toast.error("Error uploading document.");
    } finally {
      setDocSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedContact) return;

    setSendingMessage(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedContact.id,
          content: chatInput.trim()
        }),
      });

      if (res.ok) {
        setChatInput("");
        fetchData();
      } else {
        toast.error("Failed to send message.");
      }
    } catch (err) {
      toast.error("Error sending message.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName) {
      toast.error("Name is required.");
      return;
    }

    setProfileSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, phone: profilePhone }),
      });

      if (res.ok) {
        toast.success("Profile updated successfully!");
        fetchData();
      } else {
        toast.error("Failed to update profile.");
      }
    } catch (err) {
      toast.error("Error updating profile.");
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleSignLease = async (leaseId: string) => {
    try {
      const res = await fetch(`/api/leases/${leaseId}/sign`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Lease signed successfully! Welcome to your new home.");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to sign lease.");
      }
    } catch (err) {
      toast.error("Error signing lease.");
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#496E5C]" />
        <p className="text-slate-400 font-extrabold text-sm uppercase tracking-wider">Syncing Secure Database...</p>
      </div>
    );
  }

  // Derived Values
  const unpaidInvoices = invoices.filter((i) => i.status === "UNPAID" || i.status === "OVERDUE");
  const totalUnpaid = unpaidInvoices.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const openRequestsCount = maintenance.filter((m) => m.status !== "RESOLVED" && m.status !== "CLOSED").length;

  return (
    <div className="space-y-8">

        {/* -------------------- OVERVIEW TAB -------------------- */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {pendingLease && (
              <Card className="bg-amber-50 border border-amber-200 rounded-[24px] shadow-sm overflow-hidden p-6">
                <CardHeader className="pb-4 p-0">
                  <CardTitle className="text-lg font-extrabold flex items-center gap-2 text-amber-900">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Action Required: Lease Pending Signature
                  </CardTitle>
                  <CardDescription className="text-amber-700 text-xs font-semibold">
                    You have a pending lease contract for {pendingLease.unit?.name} at {pendingLease.unit?.property?.name}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 p-0 space-y-4 text-sm">
                  <div className="flex justify-between pb-3 border-b border-amber-200/50">
                    <span className="text-amber-700">Monthly Rent</span>
                    <strong className="text-amber-900 font-extrabold">${Number(pendingLease.monthlyRent).toLocaleString()}</strong>
                  </div>
                  <Button 
                    onClick={() => handleSignLease(pendingLease.id)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 rounded-xl shadow-sm transition-colors mt-2"
                  >
                    Accept & Sign Lease Contract
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Active Leases</span>
                    <h3 className="text-2xl font-extrabold text-[#0F172A] mt-1">{leases.filter(l => l.status === "ACTIVE").length}</h3>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Shield className="h-5 w-5" />
                  </div>
                </div>
              </Card>

              <Card className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Outstanding Rent</span>
                    <h3 className="text-2xl font-extrabold text-red-600 mt-1">${totalUnpaid.toLocaleString()}</h3>
                  </div>
                  <div className="p-3 bg-red-50 text-red-500 rounded-xl">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
              </Card>

              <Card className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Open Maintenance</span>
                    <h3 className="text-2xl font-extrabold text-amber-600 mt-1">{openRequestsCount}</h3>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <Wrench className="h-5 w-5" />
                  </div>
                </div>
              </Card>

              <Card className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider">Unread Messages</span>
                    <h3 className="text-2xl font-extrabold text-blue-600 mt-1">
                      {messages.filter(m => m.receiverId === (session?.user as any).id).length}
                    </h3>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Bell className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Lease Snapshot Card */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6">
                  <div className="pb-4 border-b border-[#F1F5F9]">
                    <h2 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                      <Shield className="h-4.5 w-4.5 text-[#496E5C]" />
                      Lease Snapshot
                    </h2>
                    <span className="text-xs text-[#64748B]">Active tenancy credentials</span>
                  </div>
                  <CardContent className="p-0 pt-6 space-y-4 text-xs">
                    {activeLease ? (
                      <>
                        <div className="flex justify-between pb-2.5 border-b border-[#F1F5F9]">
                          <span className="text-[#64748B]">Property</span>
                          <strong className="text-[#0F172A] font-bold">{activeLease.unit.property.name}</strong>
                        </div>
                        <div className="flex justify-between pb-2.5 border-b border-[#F1F5F9]">
                          <span className="text-[#64748B]">Unit</span>
                          <strong className="text-[#0F172A] font-bold">{activeLease.unit.name}</strong>
                        </div>
                        <div className="flex justify-between pb-2.5 border-b border-[#F1F5F9]">
                          <span className="text-[#64748B]">Monthly Rent</span>
                          <strong className="text-[#496E5C] text-sm font-extrabold">${Number(activeLease.monthlyRent).toLocaleString()}</strong>
                        </div>
                        <div className="flex justify-between pb-2.5 border-b border-[#F1F5F9]">
                          <span className="text-[#64748B]">Lease Period</span>
                          <strong className="text-[#0F172A] font-semibold">
                            {new Date(activeLease.startDate).toLocaleDateString()} - {new Date(activeLease.endDate).toLocaleDateString()}
                          </strong>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6 text-[#64748B] italic">No active lease found.</div>
                    )}
                  </CardContent>
                </Card>

                {/* Repair Panel */}
                <Card className="bg-[#496E5C] text-white border-0 rounded-[24px] p-6 relative overflow-hidden shadow-sm">
                  <div className="absolute -right-8 -top-8 h-28 w-28 bg-white/10 rounded-full blur-xl" />
                  <h3 className="text-sm font-extrabold mb-2">Need Help or Repairs?</h3>
                  <p className="text-[11px] text-emerald-100 leading-relaxed mb-4">
                    Submit a ticket with description and pictures, and we will assign a certified technician immediately.
                  </p>
                  <Button 
                    onClick={() => setActiveTab("submit-request")}
                    className="w-full bg-white text-[#496E5C] hover:bg-slate-100 font-extrabold rounded-xl text-xs h-10 transition-colors"
                  >
                    File Maintenance Ticket
                  </Button>
                </Card>
              </div>

              {/* Latest Activity Feed */}
              <div className="lg:col-span-2">
                <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6 h-full">
                  <div className="pb-4 border-b border-[#F1F5F9] mb-6">
                    <h2 className="text-base font-extrabold text-[#0F172A]">Latest Activity Logs</h2>
                    <span className="text-xs text-[#64748B]">Real-time tenant actions and platform updates</span>
                  </div>

                  <div className="space-y-4">
                    {unpaidInvoices.map((inv) => (
                      <div key={inv.id} className="flex gap-4 items-start p-3 bg-red-50/50 border border-red-100 rounded-xl">
                        <div className="p-2 bg-red-100 text-red-500 rounded-lg">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#0F172A]">Rent Invoice Pending Payment</h4>
                          <p className="text-[11px] text-[#64748B] mt-0.5">Rent of ${Number(inv.amount).toLocaleString()} is outstanding. Due date: {new Date(inv.dueDate).toLocaleDateString()}.</p>
                        </div>
                      </div>
                    ))}

                    {maintenance.slice(0, 3).map((m) => (
                      <div key={m.id} className="flex gap-4 items-start p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                          <Wrench className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#0F172A]">Maintenance Status: {m.status}</h4>
                          <p className="text-[11px] text-[#64748B] mt-0.5">{m.title} - Priority: {m.priority}.</p>
                        </div>
                      </div>
                    ))}

                    {documents.slice(0, 2).map((d) => (
                      <div key={d.id} className="flex gap-4 items-start p-3 bg-slate-50 border border-[#E2E8F0] rounded-xl">
                        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#0F172A]">Document Uploaded</h4>
                          <p className="text-[11px] text-[#64748B] mt-0.5">{d.name} ({d.category}) was added on {new Date(d.uploadedAt).toLocaleDateString()}.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

            </div>
          </div>
        )}

        {/* -------------------- MY LEASES TAB -------------------- */}
        {activeTab === "my-leases" && (
          <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6">
            <div className="pb-4 border-b border-[#F1F5F9] mb-6">
              <h2 className="text-lg font-extrabold text-[#0F172A]">Leases Registry</h2>
              <span className="text-xs text-[#64748B]">All active and historical contracts</span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Property & Unit</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Monthly Rent</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Deposit Amount</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Start Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">End Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leases.map((l) => (
                    <TableRow key={l.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-slate-800">
                        {l.unit.property.name}
                        <p className="text-[10px] text-[#64748B] font-normal">{l.unit.name}</p>
                      </TableCell>
                      <TableCell className="font-bold text-[#496E5C]">${Number(l.monthlyRent).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-slate-700">${Number(l.securityDeposit || l.monthlyRent).toLocaleString()}</TableCell>
                      <TableCell className="text-slate-600">{new Date(l.startDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-slate-600">{new Date(l.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={
                          l.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          l.status === "PENDING_SIGNATURE" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-slate-100 text-slate-700 border border-slate-200"
                        }>
                          {l.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* -------------------- DOCUMENTS TAB -------------------- */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Document List */}
              <div className="lg:col-span-2">
                <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6">
                  
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pb-4 border-b border-[#F1F5F9] mb-6">
                    <div>
                      <h2 className="text-base font-extrabold text-[#0F172A]">Tenant Documents</h2>
                      <span className="text-xs text-[#64748B]">Legal papers, policy documents, and receipts</span>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <Input 
                        placeholder="Search document name..."
                        value={docSearch}
                        onChange={(e) => setDocSearch(e.target.value)}
                        className="h-9 text-xs rounded-xl bg-slate-50 border-[#E2E8F0]"
                      />
                      <Select value={docFilterCat} onValueChange={(val) => setDocFilterCat(val || "ALL")}>
                        <SelectTrigger className="h-9 text-xs w-32 bg-slate-50 border-[#E2E8F0] rounded-xl">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="ALL">All Categories</SelectItem>
                          <SelectItem value="LEASE">Leases</SelectItem>
                          <SelectItem value="INSURANCE">Insurance</SelectItem>
                          <SelectItem value="UTILITY">Utilities</SelectItem>
                          <SelectItem value="OTHER">Others</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold text-xs uppercase text-[#64748B]">Document Name</TableHead>
                          <TableHead className="font-bold text-xs uppercase text-[#64748B]">Category</TableHead>
                          <TableHead className="font-bold text-xs uppercase text-[#64748B]">Size</TableHead>
                          <TableHead className="font-bold text-xs uppercase text-[#64748B]">Date Uploaded</TableHead>
                          <TableHead className="font-bold text-xs uppercase text-[#64748B] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents
                          .filter(d => docFilterCat === "ALL" || d.category === docFilterCat)
                          .filter(d => d.name.toLowerCase().includes(docSearch.toLowerCase()))
                          .map((d) => (
                            <TableRow key={d.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-bold text-[#0F172A] flex items-center gap-2">
                                <FileText className="h-4 w-4 text-[#496E5C]" />
                                {d.name}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="rounded-full text-[10px] font-bold tracking-wider px-2">
                                  {d.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-[#64748B] text-xs">{d.fileSize || "1.0 MB"}</TableCell>
                              <TableCell className="text-[#64748B] text-xs">{new Date(d.uploadedAt).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => window.open(d.url, "_blank")}
                                  className="text-[#496E5C] font-bold text-xs hover:bg-[#496E5C]/5 rounded-xl"
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>

              {/* Upload Document Form */}
              <div className="lg:col-span-1">
                <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6">
                  <div className="pb-4 border-b border-[#F1F5F9] mb-4">
                    <h2 className="text-base font-extrabold text-[#0F172A]">Upload New Document</h2>
                    <span className="text-xs text-[#64748B]">Add a contract, proof of utility, or insurance copy</span>
                  </div>

                  <form onSubmit={handleUploadDocument} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="docName" className="text-xs font-bold">Document Title</Label>
                      <Input 
                        id="docName"
                        placeholder="e.g. Renters Insurance May 2026"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="docCategory" className="text-xs font-bold">Category</Label>
                      <Select value={docCategory} onValueChange={(val) => setDocCategory(val || "LEASE")}>
                        <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs h-10">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="LEASE">Lease Contract</SelectItem>
                          <SelectItem value="INSURANCE">Insurance Policy</SelectItem>
                          <SelectItem value="UTILITY">Utility Bill</SelectItem>
                          <SelectItem value="IDENTIFICATION">Identification</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="docUrl" className="text-xs font-bold">Document Link / URL</Label>
                      <Input 
                        id="docUrl"
                        placeholder="https://cloudinary.com/..."
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                        className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={docSubmitting}
                      className="w-full bg-[#496E5C] hover:bg-[#3d5a4b] text-white font-bold h-11 rounded-xl shadow-sm transition-colors mt-2"
                    >
                      {docSubmitting ? "Uploading Entry..." : "Register Document"}
                    </Button>
                  </form>
                </Card>
              </div>

            </div>
          </div>
        )}

        {/* -------------------- SUBMIT REQUEST TAB -------------------- */}
        {activeTab === "submit-request" && (
          <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6 max-w-2xl mx-auto">
            <div className="pb-4 border-b border-[#F1F5F9] mb-6">
              <h2 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
                <Wrench className="h-5 w-5 text-[#496E5C]" />
                Log a Maintenance Request
              </h2>
              <span className="text-xs text-[#64748B]">Describe the issue in detail, and certified inspectors will check the problem.</span>
            </div>

            <form onSubmit={handleCreateMaintenance} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="maintCategory" className="text-xs font-bold">Issue Category</Label>
                  <Select value={mCategory} onValueChange={(val) => setMCategory(val || "GENERAL")}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs h-11">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="PLUMBING">Plumbing</SelectItem>
                      <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                      <SelectItem value="HVAC">HVAC</SelectItem>
                      <SelectItem value="APPLIANCES">Appliances</SelectItem>
                      <SelectItem value="FLOORING">Flooring</SelectItem>
                      <SelectItem value="PAINTING">Painting</SelectItem>
                      <SelectItem value="ROOFING">Roofing</SelectItem>
                      <SelectItem value="LANDSCAPING">Landscaping</SelectItem>
                      <SelectItem value="CLEANING">Cleaning</SelectItem>
                      <SelectItem value="PEST_CONTROL">Pest Control</SelectItem>
                      <SelectItem value="SECURITY">Security</SelectItem>
                      <SelectItem value="GENERAL_REPAIR">General Repair</SelectItem>
                      <SelectItem value="EMERGENCY">Emergency</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maintPriority" className="text-xs font-bold">Priority Level</Label>
                  <Select value={mPriority} onValueChange={(val) => setMPriority(val || "MEDIUM")}>
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs h-11">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="EMERGENCY">Emergency (Immediate)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Property & Unit selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Property <span className="text-red-500">*</span></Label>
                  <Select
                    value={mPropertyId}
                    onValueChange={(val) => {
                      const safeVal = val || "";
                      setMPropertyId(safeVal);
                      const firstMatch = activeLeases.find(l => l.unit?.propertyId === safeVal);
                      setMUnitId(firstMatch?.unitId || "");
                    }}
                  >
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs h-11">
                      <SelectValue placeholder="Select property">
                        {mPropertyId
                          ? (activeLeases.find(l => l.unit?.propertyId === mPropertyId)?.unit?.property?.name || "Select property")
                          : ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {Array.from(new Map(activeLeases.map(l => [l.unit?.propertyId, l.unit?.property])).values())
                        .filter(Boolean)
                        .map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Unit <span className="text-red-500">*</span></Label>
                  <Select
                    value={mUnitId}
                    onValueChange={(val) => setMUnitId(val || "")}
                    disabled={!mPropertyId}
                  >
                    <SelectTrigger className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs h-11 disabled:opacity-70">
                      <SelectValue placeholder="Select unit">
                        {mUnitId
                          ? (activeLeases.find(l => l.unitId === mUnitId)?.unit?.name || "Select unit")
                          : ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {activeLeases
                        .filter(l => l.unit?.propertyId === mPropertyId)
                        .map((l: any) => (
                          <SelectItem key={l.unitId} value={l.unitId}>{l.unit?.name}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mTitle" className="text-xs font-bold">Brief Title</Label>
                <Input 
                  id="mTitle"
                  placeholder="e.g. Toilet leaking at base"
                  value={mTitle}
                  onChange={(e) => setMTitle(e.target.value)}
                  className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mDesc" className="text-xs font-bold">Detailed Description</Label>
                <textarea 
                  id="mDesc"
                  rows={4}
                  placeholder="Describe when the issue started, and exactly where it is located..."
                  value={mDesc}
                  onChange={(e) => setMDesc(e.target.value)}
                  className="w-full p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:ring-[#496E5C] outline-none"
                />
              </div>

              <div className="p-6 border-2 border-dashed border-[#E2E8F0] rounded-xl text-center hover:bg-slate-50/50 transition-colors cursor-pointer">
                <span className="text-xs font-semibold text-[#64748B] block">Drag & Drop Photos Here</span>
                <span className="text-[10px] text-slate-400 mt-1 block">PNG, JPG formats accepted (Max 5MB)</span>
              </div>

              <Button 
                type="submit" 
                disabled={mSubmitting}
                className="w-full bg-[#496E5C] hover:bg-[#3d5a4b] text-white font-bold h-11 rounded-xl shadow-sm transition-colors mt-2"
              >
                {mSubmitting ? "Logging Ticket..." : "Submit Maintenance Ticket"}
              </Button>
            </form>
          </Card>
        )}

        {/* -------------------- MY REQUESTS TAB -------------------- */}
        {activeTab === "my-requests" && (
          <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-[#F1F5F9] mb-6">
              <div>
                <h2 className="text-lg font-extrabold text-[#0F172A]">Maintenance Log</h2>
                <span className="text-xs text-[#64748B]">All logged repairs and their current statuses</span>
              </div>

              <div className="flex gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
                <Select value={maintFilterPriority} onValueChange={(val) => setMaintFilterPriority(val || "ALL")}>
                  <SelectTrigger className="h-9 text-xs w-32 bg-slate-50 border-[#E2E8F0] rounded-xl">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="ALL">All Priorities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={maintFilterStatus} onValueChange={(val) => setMaintFilterStatus(val || "ALL")}>
                  <SelectTrigger className="h-9 text-xs w-32 bg-slate-50 border-[#E2E8F0] rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Ticket Title</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Category</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Priority</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Assigned Inspector</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Date Filed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenance
                    .filter(m => maintFilterPriority === "ALL" || m.priority === maintFilterPriority)
                    .filter(m => maintFilterStatus === "ALL" || m.status === maintFilterStatus)
                    .map((m) => (
                      <TableRow key={m.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-bold text-slate-800 py-4">
                          {m.title}
                          <p className="text-[10px] text-[#64748B] font-normal mt-0.5">{m.description}</p>
                        </TableCell>
                        <TableCell className="text-slate-600 text-xs font-semibold">{m.category}</TableCell>
                        <TableCell>
                          <Badge className={
                            m.priority === "EMERGENCY" ? "bg-red-50 text-red-700 border border-red-200" :
                            m.priority === "HIGH" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                            m.priority === "MEDIUM" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            "bg-slate-100 text-slate-700 border border-slate-200"
                          }>
                            {m.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full font-bold px-2.5 py-0.5 capitalize text-[10px]">
                            {m.status.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-700">
                          {m.inspector ? m.inspector.name : <span className="text-[#64748B] italic">Awaiting assignment</span>}
                        </TableCell>
                        <TableCell className="text-[#64748B] text-xs">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* -------------------- PAY RENT TAB -------------------- */}
        {activeTab === "pay-rent" && (
          <div className="space-y-6 max-w-xl mx-auto">
            <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6">
              <div className="pb-4 border-b border-[#F1F5F9] mb-6 text-center">
                <h2 className="text-lg font-extrabold text-[#0F172A]">Outstanding Balance</h2>
                <h3 className={`text-3xl font-extrabold mt-2 ${totalUnpaid > 0 ? "text-red-600" : "text-[#496E5C]"}`}>
                  ${totalUnpaid.toLocaleString()}
                </h3>
                <span className="text-xs text-[#64748B] mt-1 block">Secure transaction portal powered by Stripe</span>
              </div>

              <form onSubmit={handlePayBalance} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cardName" className="text-xs font-bold">Cardholder Name</Label>
                  <Input 
                    id="cardName"
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cardNumber" className="text-xs font-bold">Credit Card Number</Label>
                  <Input 
                    id="cardNumber"
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs h-11"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cardExpiry" className="text-xs font-bold">Expiration Date</Label>
                    <Input 
                      id="cardExpiry"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cardCvv" className="text-xs font-bold">CVV</Label>
                    <Input 
                      id="cardCvv"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs h-11"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={paySubmitting || totalUnpaid === 0}
                  className="w-full bg-[#496E5C] hover:bg-[#3d5a4b] text-white font-bold h-11 rounded-xl shadow-sm transition-colors mt-4"
                >
                  {paySubmitting ? "Processing Payment..." : `Pay Outstanding $${totalUnpaid.toLocaleString()}`}
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* -------------------- TRANSACTIONS TAB -------------------- */}
        {activeTab === "transactions" && (
          <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6">
            <div className="pb-4 border-b border-[#F1F5F9] mb-6">
              <h2 className="text-lg font-extrabold text-[#0F172A]">Transactions Ledger</h2>
              <span className="text-xs text-[#64748B]">All rent receipts and financial records registered in database</span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Transaction Reference</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Category</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Payment Type</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Amount</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Date Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-[#0F172A]">{tx.reference || "Direct Transfer"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full font-bold px-2 py-0.5 text-[10px]">
                          {tx.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#64748B]">
                        {tx.type === "INCOME" ? (
                          <span className="text-emerald-600 font-bold">Credit</span>
                        ) : (
                          <span className="text-red-500 font-bold">Debit</span>
                        )}
                      </TableCell>
                      <TableCell className="font-extrabold text-[#496E5C]">${Number(tx.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold px-2.5 py-0.5">
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#64748B] text-xs">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* -------------------- INVOICES TAB -------------------- */}
        {activeTab === "invoices" && (
          <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6">
            <div className="pb-4 border-b border-[#F1F5F9] mb-6">
              <h2 className="text-lg font-extrabold text-[#0F172A]">Rent Invoices</h2>
              <span className="text-xs text-[#64748B]">Pay rent directly online using Stripe checkout flow</span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Due Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Rent Amount</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B]">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#64748B] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-semibold text-slate-800">{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-extrabold text-[#0F172A]">${Number(inv.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={
                          inv.status === "PAID" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          inv.status === "OVERDUE" ? "bg-red-50 text-red-700 border border-red-200" :
                          "bg-slate-100 text-slate-700 border border-slate-200"
                        }>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {inv.status !== "PAID" ? (
                          <Button
                            size="sm"
                            onClick={() => handlePayInvoice(inv.id)}
                            className="bg-[#496E5C] hover:bg-[#3d5a4b] text-white font-bold rounded-full px-4 text-xs h-8 shadow-sm transition-colors"
                          >
                            Pay with Stripe
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold flex items-center justify-end gap-1.5">
                            <CheckCircle className="h-4 w-4" /> Paid
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* -------------------- MESSAGES TAB -------------------- */}
        {activeTab === "messages" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px] items-stretch">
            
            {/* Contacts list */}
            <Card className="lg:col-span-1 bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-4 flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-[#F1F5F9] mb-4">
                  <h2 className="text-sm font-extrabold text-[#0F172A]">Inbox Messages</h2>
                  <span className="text-[10px] text-[#64748B]">Choose a landlord or inspector to chat</span>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[480px]">
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContact(c)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 border ${
                        selectedContact?.id === c.id 
                          ? "bg-[#496E5C]/10 border-[#496E5C] text-[#496E5C]" 
                          : "border-transparent hover:bg-slate-50 text-[#0F172A]"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-[#496E5C]/10 text-[#496E5C] flex items-center justify-center font-bold text-xs uppercase">
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold block truncate">{c.name}</span>
                        <span className="text-[9px] text-[#64748B] font-extrabold uppercase">{c.role}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Conversation view */}
            <Card className="lg:col-span-3 bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6 flex flex-col justify-between h-full">
              {selectedContact ? (
                <>
                  {/* Active Header */}
                  <div className="pb-4 border-b border-[#F1F5F9] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#496E5C]/10 text-[#496E5C] flex items-center justify-center font-bold text-sm uppercase">
                        {selectedContact.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#0F172A]">{selectedContact.name}</h3>
                        <span className="text-[9px] text-[#64748B] font-extrabold uppercase tracking-wide">
                          {selectedContact.role} &bull; {selectedContact.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-full hover:bg-slate-50 text-[#64748B] hover:text-[#0F172A] transition-colors">
                        <Phone className="h-4 w-4" />
                      </button>
                      <button className="p-2 rounded-full hover:bg-slate-50 text-[#64748B] hover:text-[#0F172A] transition-colors">
                        <Video className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Message logs */}
                  <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-2">
                    {messages
                      .filter(m => 
                        (m.senderId === selectedContact.id && m.receiverId === (session?.user as any).id) ||
                        (m.senderId === (session?.user as any).id && m.receiverId === selectedContact.id)
                      )
                      .map((m) => {
                        const isSelf = m.senderId === (session?.user as any).id;
                        return (
                          <div key={m.id} className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[70%] p-3.5 rounded-2xl text-xs shadow-sm leading-relaxed ${
                              isSelf 
                                ? "bg-[#496E5C] text-white rounded-br-none" 
                                : "bg-[#F1F5F9] text-[#0F172A] rounded-bl-none"
                            }`}>
                              <p>{m.content}</p>
                              <span className={`text-[8px] mt-1 block text-right ${isSelf ? "text-emerald-100" : "text-[#64748B]"}`}>
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Input Composer */}
                  <form onSubmit={handleSendMessage} className="pt-4 border-t border-[#F1F5F9] flex gap-3">
                    <Input
                      placeholder={`Type a message to ${selectedContact.name}...`}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs h-11"
                    />
                    <Button 
                      type="submit" 
                      disabled={sendingMessage || !chatInput.trim()}
                      className="bg-[#496E5C] hover:bg-[#3d5a4b] text-white p-3 rounded-xl flex items-center justify-center h-11 w-11 shadow-sm transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[#64748B]">
                  <Bell className="h-10 w-10 text-slate-300 mb-2 animate-bounce" />
                  <p className="font-semibold text-xs">No conversation selected</p>
                </div>
              )}
            </Card>

          </div>
        )}

        {/* -------------------- CALENDAR TAB -------------------- */}
        {activeTab === "calendar" && (
          <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6">
            <div className="pb-4 border-b border-[#F1F5F9] mb-6">
              <h2 className="text-lg font-extrabold text-[#0F172A]">Calendar Schedule</h2>
              <span className="text-xs text-[#64748B]">Scheduled inspect visits, lease deadlines, and rent payments</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Event List */}
              <div className="md:col-span-1 space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block mb-1">Upcoming Payment</span>
                  <h4 className="text-xs font-bold text-[#0F172A]">Monthly Rent Payment Due</h4>
                  <p className="text-[11px] text-[#64748B] mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Due date: 5th of every month
                  </p>
                </div>

                {maintenance.filter(m => m.scheduledDate).map((m) => (
                  <div key={m.id} className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block mb-1">Technician Appointment</span>
                    <h4 className="text-xs font-bold text-[#0F172A]">{m.title}</h4>
                    <p className="text-[11px] text-[#64748B] mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Date: {new Date(m.scheduledDate).toLocaleString()}
                    </p>
                  </div>
                ))}

                {activeLease && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-700 block mb-1">Contract End Date</span>
                    <h4 className="text-xs font-bold text-[#0F172A]">Lease Agreement Concludes</h4>
                    <p className="text-[11px] text-[#64748B] mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Expiration: {new Date(activeLease.endDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Grid Calendar Mockup */}
              <div className="md:col-span-2 p-6 bg-slate-50 border border-[#E2E8F0] rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#64748B] mb-4">Monthly Calendar Grid</h3>
                  <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider mb-2">
                    <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 31 }, (_, i) => {
                      const day = i + 1;
                      const isRentDay = day === 5;
                      return (
                        <div 
                          key={day} 
                          className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                            isRentDay 
                              ? "bg-red-500 text-white border-red-600 shadow-md shadow-red-500/10" 
                              : "bg-white border-[#E2E8F0] text-slate-700 hover:border-slate-400"
                          }`}
                        >
                          {day}
                          {isRentDay && <span className="text-[8px] font-semibold mt-0.5">Rent</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </Card>
        )}

        {/* -------------------- SETTINGS TAB -------------------- */}
        {activeTab === "settings" && (
          <Card className="bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm p-6 max-w-xl mx-auto">
            <div className="pb-4 border-b border-[#F1F5F9] mb-6">
              <h2 className="text-lg font-extrabold text-[#0F172A]">Profile Credentials</h2>
              <span className="text-xs text-[#64748B]">Modify your personal information registered in the workspace database</span>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="profName" className="text-xs font-bold">Full Name</Label>
                <Input 
                  id="profName"
                  placeholder="Your Name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profPhone" className="text-xs font-bold">Contact Phone Number</Label>
                <Input 
                  id="profPhone"
                  placeholder="+44 7911 123456"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Email Address (Locked)</Label>
                <Input 
                  disabled
                  value={session?.user?.email || ""}
                  className="bg-slate-100 border-[#E2E8F0] rounded-xl text-xs h-11 text-slate-500 cursor-not-allowed"
                />
              </div>

              <Button 
                type="submit" 
                disabled={profileSubmitting}
                className="w-full bg-[#496E5C] hover:bg-[#3d5a4b] text-white font-bold h-11 rounded-xl shadow-sm transition-colors mt-2"
              >
                {profileSubmitting ? "Saving changes..." : "Save Profile Details"}
              </Button>
            </form>
          </Card>
        )}

    </div>
  );
}
