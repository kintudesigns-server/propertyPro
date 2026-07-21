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
  AlertTriangle, FileText, Send, Phone, Video, Info, UserCheck, DollarSign, ShieldAlert, Mail
} from "lucide-react";
import { toast } from "sonner";
import SecuritySettings from "@/components/settings/SecuritySettings";

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
  const [tours, setTours] = useState<any[]>([]);
  
  // App UI State
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const activeTab = searchParams ? searchParams.get("tab") || "overview" : "overview";
  const [activeSettingsTab, setActiveSettingsTab] = useState("profile");

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
  const [profileDob, setProfileDob] = useState("");
  const [profileEmploymentStatus, setProfileEmploymentStatus] = useState("EMPLOYED");
  const [profileEmployer, setProfileEmployer] = useState("");
  const [profilePosition, setProfilePosition] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max 5MB.");
      return;
    }
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setProfileAvatar(data.url);
        toast.success("Photo uploaded successfully.");
      } else {
        toast.error(data.error || "Failed to upload photo");
      }
    } catch {
      toast.error("An error occurred during upload.");
    } finally {
      setAvatarUploading(false);
    }
  };

  // Messaging state
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Filter States
  const [docSearch, setDocSearch] = useState("");
  const [docFilterCat, setDocFilterCat] = useState("ALL");
  const [maintFilterPriority, setMaintFilterPriority] = useState("ALL");
  const [maintFilterStatus, setMaintFilterStatus] = useState("ALL");

  // Move-Out State is handled by the dedicated My Leases tab and Final Statement page.

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const [leasesRes, invoicesRes, maintRes, docsRes, txsRes, msgsRes, ownersRes, inspectorsRes, toursRes] = await Promise.all([
        fetch("/api/leases"),
        fetch("/api/invoices"),
        fetch("/api/maintenance"),
        fetch("/api/documents"),
        fetch("/api/transactions"),
        fetch("/api/messages"),
        fetch("/api/users?role=OWNER"),
        fetch("/api/users?role=INSPECTOR"),
        fetch("/api/tours"),
      ]);

      const [leasesData, invoicesData, maintData, docsData, txsData, msgsData, ownersData, inspectorsData, toursData] = await Promise.all([
        leasesRes.json(),
        invoicesRes.json(),
        maintRes.json(),
        docsRes.json(),
        txsRes.json(),
        msgsRes.json(),
        ownersRes.json(),
        inspectorsRes.json(),
        toursRes.json(),
      ]);

      setLeases(leasesData);
      setInvoices(invoicesData);
      setMaintenance(maintData);
      setDocuments(docsData);
      setTransactions(txsData);
      setMessages(msgsData);
      setTours(toursData);

      const allContacts = [...ownersData, ...inspectorsData];
      setContacts(allContacts);
      if (allContacts.length > 0 && !selectedContact) {
        setSelectedContact(allContacts[0]);
      }

      const profileRes = await fetch("/api/users");
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfileName(profileData.name || "");
        setProfilePhone(profileData.phone || "");
        setProfileDob(profileData.dob || "");
        setProfileEmploymentStatus(profileData.employmentStatus || "EMPLOYED");
        setProfileEmployer(profileData.employer || "");
        setProfilePosition(profileData.position || "");
        setEmergencyName(profileData.emergencyName || "");
        setEmergencyPhone(profileData.emergencyPhone || "");
        setEmergencyRelationship(profileData.emergencyRelationship || "");
        setBankName(profileData.bankName || "");
        setAccountNumber(profileData.accountNumber || "");
        setAccountName(profileData.accountName || "");
      } else if (session?.user) {
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
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          dob: profileDob,
          employmentStatus: profileEmploymentStatus,
          employer: profileEmployer,
          position: profilePosition,
          emergencyName,
          emergencyPhone,
          emergencyRelationship,
          bankName,
          accountNumber,
          accountName,
        }),
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
        <p className="text-[#8E8E93] font-extrabold text-sm uppercase tracking-wider">Syncing Secure Database...</p>
      </div>
    );
  }

  // Derived Values
  const getLeaseProgress = (lease: any) => {
    if (!lease?.startDate || !lease?.endDate) return 0;
    const start = new Date(lease.startDate).getTime();
    const end = new Date(lease.endDate).getTime();
    const now = Date.now();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const unpaidInvoices = invoices.filter((i) => i.status === "UNPAID" || i.status === "OVERDUE");
  const totalUnpaid = unpaidInvoices.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const openRequestsCount = maintenance.filter((m) => m.status !== "RESOLVED" && m.status !== "CLOSED").length;
  
  const pendingLeaseUnpaidDepositInvoice = pendingLease && invoices.find(
    (inv: any) =>
      inv.leaseId === pendingLease.id &&
      pendingLease.securityDeposit &&
      Number(inv.amount) === Number(pendingLease.securityDeposit) &&
      inv.status === "UNPAID"
  );

  return (
    <>
    <div className="space-y-8">

        {/* -------------------- OVERVIEW TAB -------------------- */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {pendingLease && (
              <Card className={`rounded-[24px] shadow-sm overflow-hidden p-6 border ${
                pendingLeaseUnpaidDepositInvoice 
                  ? "bg-red-50 border-red-200 text-red-950" 
                  : "bg-amber-50 border-amber-200 text-amber-950"
              }`}>
                <CardHeader className="pb-4 p-0">
                  <CardTitle className={`text-lg font-extrabold flex items-center gap-2 ${
                    pendingLeaseUnpaidDepositInvoice ? "text-red-900" : "text-amber-900"
                  }`}>
                    <AlertTriangle className={`h-5 w-5 ${
                      pendingLeaseUnpaidDepositInvoice ? "text-red-600" : "text-amber-600"
                    }`} />
                    {pendingLeaseUnpaidDepositInvoice 
                      ? "Action Required: Pay Security Deposit First" 
                      : "Action Required: Lease Pending Signature"
                    }
                  </CardTitle>
                  <CardDescription className={`text-xs font-semibold ${
                    pendingLeaseUnpaidDepositInvoice ? "text-red-700" : "text-amber-700"
                  }`}>
                    {pendingLeaseUnpaidDepositInvoice 
                      ? `You must pay the security deposit of $${Number(pendingLease.securityDeposit).toFixed(2)} to unlock signing for unit ${pendingLease.unit?.name || "N/A"}.`
                      : `You have a pending lease contract for unit ${pendingLease.unit?.name || "N/A"} at ${pendingLease.unit?.property?.name || "N/A"}.`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 p-0 space-y-4 text-sm">
                  <div className={`flex justify-between pb-3 border-b ${
                    pendingLeaseUnpaidDepositInvoice ? "border-red-200/50" : "border-amber-200/50"
                  }`}>
                    <span>Monthly Rent</span>
                    <strong className="font-extrabold">${Number(pendingLease.monthlyRent).toLocaleString()}</strong>
                  </div>
                  {pendingLeaseUnpaidDepositInvoice ? (
                    <div className="flex flex-col sm:flex-row gap-3 mt-2">
                      <Button 
                        onClick={() => handlePayInvoice(pendingLeaseUnpaidDepositInvoice.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold h-11 rounded-xl shadow-sm transition-colors"
                      >
                        <CreditCard className="mr-2 h-4 w-4" /> Pay Security Deposit (${Number(pendingLease.securityDeposit).toFixed(2)})
                      </Button>
                      <Button 
                        onClick={() => router.push(`/dashboard/leases/${pendingLease.id}`)}
                        variant="outline"
                        className="bg-white hover:bg-red-100/50 border-red-200 text-red-900 font-bold h-11 rounded-xl shadow-sm"
                      >
                        View Lease Details
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 mt-2">
                      <Button 
                        onClick={() => handleSignLease(pendingLease.id)}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 rounded-xl shadow-sm transition-colors"
                      >
                        Accept & Sign Lease Contract
                      </Button>
                      <Button 
                        onClick={() => router.push(`/dashboard/leases/${pendingLease.id}`)}
                        variant="outline"
                        className="bg-white hover:bg-amber-100/50 border-amber-200 text-amber-900 font-bold h-11 rounded-xl shadow-sm"
                      >
                        View Lease Details
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Refund Estimate Review Banner */}
            {activeLease?.moveOutStatus === "INSPECTION_COMPLETED" && (
              <Card className="rounded-[24px] shadow-sm overflow-hidden p-6 border bg-blue-50 border-blue-200 text-blue-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-extrabold flex items-center gap-2 text-blue-900">
                    <ShieldAlert className="h-5 w-5 text-blue-600" />
                    Move-Out Inspection Complete - Action Required
                  </h3>
                  <p className="text-xs font-semibold text-blue-700 mt-1">
                    Please review the inspection deductions, verify bank details, and submit your acceptance or dispute on the final statement page.
                  </p>
                </div>
                <Button 
                  onClick={() => router.push(`/dashboard/tenant/leases/${activeLease.id}/move-out`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl shadow-sm transition-colors w-full md:w-auto shrink-0"
                >
                  Review Final Statement
                </Button>
              </Card>
            )}

            {/* Hero Residence Card */}
            {activeLease ? (
              <Card className="bg-gradient-to-br from-[#1E293B] to-[#1D1D1F] text-white border-none shadow-lg rounded-3xl overflow-hidden p-6 sm:p-8 relative">
                <div className="absolute right-0 top-0 h-full w-1/3 bg-radial-gradient from-white/5 to-transparent pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#496E5C] text-emerald-100 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full">
                        Your Residence
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{activeLease.unit.name}</h2>
                    <p className="text-slate-300 text-sm font-semibold flex items-center gap-1.5">
                      <Home className="h-4 w-4 text-[#496E5C]" />
                      {activeLease.unit.property.name} &bull; {activeLease.unit.property.address || "Verified Location"}
                    </p>
                  </div>
                  <div className="flex flex-row md:flex-col items-baseline md:items-end gap-3 shrink-0">
                    <div>
                      <p className="text-[#8E8E93] text-[10px] font-bold uppercase tracking-wider text-left md:text-right">Monthly Rent</p>
                      <p className="text-2xl sm:text-3xl font-black text-emerald-400">${Number(activeLease.monthlyRent).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Lease Period progress line */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="flex justify-between items-center text-xs text-[#8E8E93] mb-2">
                    <span>Lease Term: {new Date(activeLease.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} &mdash; {new Date(activeLease.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    <span className="font-extrabold text-emerald-400">{getLeaseProgress(activeLease)}% Complete</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${getLeaseProgress(activeLease)}%` }} 
                    />
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="bg-white border border-[#E5E5EA] shadow-sm rounded-3xl p-8 text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
                <div className="h-16 w-16 bg-slate-50 text-[#8E8E93] rounded-full flex items-center justify-center">
                  <Home className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black text-slate-950">No Active Lease Agreement</h3>
                <p className="text-sm text-[#6E6E73]">
                  You are not currently registered to any active property leases. If you have recently applied, check your application status.
                </p>
                <Button 
                  onClick={() => router.push("/dashboard/tenant/applications")}
                  className="bg-[#496E5C] hover:bg-[#3D5C4D] text-white font-bold h-11 px-6 rounded-xl shadow-xs transition-colors"
                >
                  Check Application Status
                </Button>
              </Card>
            )}

            {/* Action Status Cards */}
            {activeLease && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 🔴 Rent Status Card */}
                <Card className={`border rounded-2xl p-5 shadow-xs bg-white ${
                  totalUnpaid > 0 ? "border-red-200" : "border-emerald-100"
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Rent Balance</span>
                      <h3 className={`text-2xl font-black ${totalUnpaid > 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {totalUnpaid > 0 ? `$${totalUnpaid.toLocaleString()}` : "Fully Paid"}
                      </h3>
                      <p className="text-xs text-[#6E6E73]">
                        {totalUnpaid > 0 ? "Outstanding balance due" : "No outstanding invoices"}
                      </p>
                    </div>
                    <div className={`p-2.5 rounded-xl shrink-0 ${totalUnpaid > 0 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}>
                      <DollarSign className="h-5 w-5" />
                    </div>
                  </div>
                  {totalUnpaid > 0 ? (
                    <div className="mt-4">
                      <Button 
                        onClick={() => handlePayInvoice(unpaidInvoices[0]?.id)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-10 rounded-xl text-xs transition-colors"
                      >
                        Pay Rent Now
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <div className="w-full bg-emerald-50 text-emerald-700 text-center py-2 font-bold rounded-xl text-xs border border-emerald-100">
                        ✓ Account Up-to-Date
                      </div>
                    </div>
                  )}
                </Card>

                {/* 🟡 Maintenance Tickets Card */}
                <Card className="border border-[#E5E5EA] rounded-2xl p-5 shadow-xs bg-white">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Maintenance</span>
                      <h3 className="text-2xl font-black text-slate-800">
                        {openRequestsCount} Open
                      </h3>
                      <p className="text-xs text-[#6E6E73]">
                        {openRequestsCount > 0 ? "Active repair requests" : "No pending repairs"}
                      </p>
                    </div>
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                      <Wrench className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button 
                      onClick={() => setActiveTab("submit-request")}
                      variant="outline"
                      className="flex-1 border-[#E5E5EA] text-slate-700 font-bold h-10 rounded-xl text-xs"
                    >
                      New Request
                    </Button>
                    <Button 
                      onClick={() => setActiveTab("my-requests")}
                      className="flex-1 bg-slate-800 hover:bg-[#007AFF] text-white font-bold h-10 rounded-xl text-xs"
                    >
                      View All
                    </Button>
                  </div>
                </Card>

                {/* 🔵 Lease Expiry Card */}
                <Card className="border border-[#E5E5EA] rounded-2xl p-5 shadow-xs bg-white">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#6E6E73] uppercase tracking-wider">Contract Window</span>
                      {(() => {
                        const expiry = new Date(activeLease.endDate).getTime();
                        const diff = expiry - Date.now();
                        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                        return (
                          <>
                            <h3 className={`text-2xl font-black ${days < 30 ? "text-amber-600" : "text-[#1D1D1F]"}`}>
                              {days > 0 ? `${days} Days` : "Expired"}
                            </h3>
                            <p className="text-xs text-[#6E6E73]">
                              Remaining in term
                            </p>
                          </>
                        );
                      })()}
                    </div>
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                      <Calendar className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button 
                      onClick={() => router.push(`/dashboard/leases/${activeLease.id}`)}
                      variant="outline"
                      className="w-full border-[#E5E5EA] text-slate-700 font-bold h-10 rounded-xl text-xs hover:bg-[#F5F5F7]"
                    >
                      View Agreement Detail
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Activity Feed Column */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-white border border-[#E5E5EA] rounded-[24px] shadow-xs p-6">
                  <div className="pb-4 border-b border-[#F1F5F9] mb-6">
                    <h2 className="text-base font-extrabold text-[#1D1D1F]">Recent Activity & Updates</h2>
                    <span className="text-xs text-[#6E6E73]">Real-time tenant actions and platform updates</span>
                  </div>

                  <div className="space-y-6">
                    {/* Action Required Sub-Section */}
                    {unpaidInvoices.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                          Action Required
                        </h3>
                        <div className="space-y-3">
                          {unpaidInvoices.map((inv) => (
                            <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-red-50/40 border border-red-100 rounded-2xl">
                              <div className="flex gap-3 items-start">
                                <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0 mt-0.5">
                                  <DollarSign className="h-4.5 w-4.5" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-xs font-extrabold text-red-950">Pending Rent Invoice</h4>
                                  <p className="text-xs text-red-700">Rent of <strong className="font-extrabold">${Number(inv.amount).toLocaleString()}</strong> is outstanding.</p>
                                  <p className="text-[10px] text-red-500 font-semibold">Due Date: {new Date(inv.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                                </div>
                              </div>
                              <Button
                                onClick={() => handlePayInvoice(inv.id)}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold h-9 px-4 rounded-xl text-xs shrink-0"
                              >
                                Pay Now
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Updates Sub-Section */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-[#6E6E73] uppercase tracking-wider">
                        Recent Updates
                      </h3>
                      
                      {maintenance.length === 0 && documents.length === 0 && unpaidInvoices.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-[#E5E5EA] rounded-2xl">
                          <p className="text-xs text-[#6E6E73] italic">No recent updates found.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {maintenance.slice(0, 3).map((m) => (
                            <div key={m.id} className="flex items-start justify-between gap-4 p-3.5 bg-slate-50/50 border border-[#E5E5EA] rounded-2xl hover:border-slate-300 transition-colors">
                              <div className="flex gap-3 items-start">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0 mt-0.5">
                                  <Wrench className="h-4.5 w-4.5" />
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="text-xs font-extrabold text-slate-900">{m.title}</h4>
                                  <p className="text-[11px] text-[#6E6E73]">Category: {m.category} &bull; Priority: {m.priority}</p>
                                  <p className="text-[10px] text-[#8E8E93]">Created: {new Date(m.createdAt || Date.now()).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <Badge className={
                                m.status === "OPEN" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                                m.status === "ASSIGNED" ? "bg-purple-50 text-purple-700 border border-purple-100" :
                                m.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              }>
                                {m.status.replace(/_/g, " ")}
                              </Badge>
                            </div>
                          ))}

                          {documents.slice(0, 2).map((d) => (
                            <div key={d.id} className="flex items-start justify-between gap-4 p-3.5 bg-slate-50/50 border border-[#E5E5EA] rounded-2xl hover:border-slate-300 transition-colors">
                              <div className="flex gap-3 items-start">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0 mt-0.5">
                                  <FileText className="h-4.5 w-4.5" />
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="text-xs font-extrabold text-slate-900">{d.name}</h4>
                                  <p className="text-[11px] text-[#6E6E73]">Legal Vault &bull; Category: {d.category}</p>
                                  <p className="text-[10px] text-[#8E8E93]">Uploaded: {new Date(d.uploadedAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(d.url, "_blank")}
                                className="h-8 text-xs font-bold text-[#496E5C] hover:bg-[#496E5C]/5 rounded-lg"
                              >
                                View
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Support & Contacts Column */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="bg-white border border-[#E5E5EA] rounded-[24px] shadow-xs p-6">
                  <div className="pb-4 border-b border-[#F1F5F9] mb-4">
                    <h2 className="text-base font-extrabold text-[#1D1D1F] flex items-center gap-2">
                      <UserCheck className="h-4.5 w-4.5 text-[#496E5C]" />
                      Support Contacts
                    </h2>
                    <span className="text-xs text-[#6E6E73]">Reach out directly via secure chat</span>
                  </div>

                  <div className="space-y-4">
                    {contacts.length === 0 ? (
                      <p className="text-xs text-[#6E6E73] italic text-center py-4">No support contacts loaded.</p>
                    ) : (
                      contacts.map((c) => (
                        <div key={c.id} className="p-3.5 bg-slate-50 border border-[#E5E5EA] rounded-2xl space-y-3 hover:border-slate-300 transition-colors">
                          <div className="flex gap-3 items-center">
                            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-extrabold shrink-0">
                              {c.name ? c.name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-extrabold text-[#1D1D1F] truncate">{c.name}</h4>
                              <p className="text-[10px] text-[#6E6E73] font-bold uppercase tracking-wider">{c.role}</p>
                            </div>
                          </div>
                          <div className="text-[11px] text-[#6E6E73] space-y-1">
                            <p className="truncate flex items-center gap-1"><Mail className="h-3 w-3 text-[#8E8E93]" /> {c.email}</p>
                            {c.phone && <p className="truncate flex items-center gap-1"><Phone className="h-3 w-3 text-[#8E8E93]" /> {c.phone}</p>}
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedContact(c);
                              setActiveTab("messages");
                            }}
                            className="w-full bg-[#496E5C] hover:bg-[#3D5C4D] text-white font-bold h-9 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Send className="h-3.5 w-3.5" /> Message {c.role === "OWNER" ? "Owner" : "Inspector"}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* Showing Tours Widget */}
                {tours.length > 0 && (
                  <Card className="bg-white border border-[#E5E5EA] rounded-[24px] p-6 shadow-xs space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-[#F1F5F9]">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-[#496E5C]" />
                        Showing Visits ({tours.filter(t => t.status === "PENDING" || t.status === "CONFIRMED").length})
                      </h3>
                      <button 
                        onClick={() => router.push("/dashboard/tenant/tours")}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline"
                      >
                        Manage
                      </button>
                    </div>

                    <div className="space-y-3">
                      {tours.slice(0, 2).map((tour) => (
                        <div key={tour.id} className="text-xs space-y-1 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-slate-700 truncate max-w-[120px]">
                              {tour.property?.name}
                            </span>
                            <Badge className={`text-[9px] px-1.5 py-0.2 border-0 font-bold ${
                              tour.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-700" :
                              tour.status === "PENDING" ? "bg-amber-50 text-amber-700" :
                              "bg-slate-100 text-[#6E6E73]"
                            }`}>
                              {tour.status}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-[#8E8E93] font-semibold">
                            {new Date(tour.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {new Date(tour.scheduledAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Quick Repair Panel */}
                <Card className="bg-[#496E5C] text-white border-0 rounded-[24px] p-6 relative overflow-hidden shadow-xs">
                  <div className="absolute -right-8 -top-8 h-28 w-28 bg-white/10 rounded-full blur-xl" />
                  <h3 className="text-sm font-extrabold mb-2">Need Help or Repairs?</h3>
                  <p className="text-[11px] text-emerald-100 leading-relaxed mb-4">
                    Submit a ticket with descriptions and pictures, and we will assign a certified inspector immediately.
                  </p>
                  <Button 
                    onClick={() => setActiveTab("submit-request")}
                    className="w-full bg-white text-[#496E5C] hover:bg-[#F2F2F7] font-extrabold rounded-xl text-xs h-10 transition-colors"
                  >
                    File Maintenance Ticket
                  </Button>
                </Card>
              </div>

            </div>
          </div>
        )}

        {activeTab === "my-leases" && (
          <div className="space-y-6">
            <div className="pb-2 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-[#1D1D1F] tracking-tight">Leases Registry</h2>
                <p className="text-xs text-[#6E6E73] font-semibold mt-0.5">All active and historical tenancy agreements</p>
              </div>
            </div>

            {leases.length === 0 ? (
              <Card className="bg-white border border-[#E5E5EA] shadow-sm rounded-3xl p-8 text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
                <div className="h-16 w-16 bg-slate-50 text-[#8E8E93] rounded-full flex items-center justify-center">
                  <FileText className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black text-slate-950">No Leases Found</h3>
                <p className="text-sm text-[#6E6E73]">
                  There are no current or historical lease contracts linked to your tenant profile.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {leases.map((l) => {
                  const progressVal = getLeaseProgress(l);
                  return (
                    <Card key={l.id} className="bg-white border border-[#E5E5EA] hover:border-slate-300 shadow-xs hover:shadow-sm rounded-[24px] overflow-hidden transition-all duration-300 flex flex-col justify-between">
                      <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <h3 className="font-extrabold text-slate-900 text-base">{l.unit.property.name}</h3>
                            <p className="text-xs text-[#6E6E73] font-semibold flex items-center gap-1">
                              <Home className="h-3.5 w-3.5 text-[#496E5C]" />
                              Unit: {l.unit.name}
                            </p>
                          </div>
                          <Badge className={
                            l.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                            l.status === "PENDING_SIGNATURE" ? "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse" :
                            "bg-slate-100 text-slate-700 border border-slate-200"
                          }>
                            {l.status === "ACTIVE" ? "Active Tenancy" :
                             l.status === "PENDING_SIGNATURE" ? "Awaiting Signature" :
                             "Expired / Inactive"}
                          </Badge>
                        </div>

                        {/* Lease Dates */}
                        <div className="grid grid-cols-2 gap-4 py-2 border-y border-[#F1F5F9] text-xs">
                          <div>
                            <span className="text-[#6E6E73] block mb-0.5">Start Date</span>
                            <span className="font-bold text-slate-800">{new Date(l.startDate).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-[#6E6E73] block mb-0.5">End Date</span>
                            <span className="font-bold text-slate-800">{new Date(l.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Rent and Deposit */}
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-[#6E6E73] block mb-0.5">Monthly Rent</span>
                            <span className="font-extrabold text-[#496E5C] text-sm">${Number(l.monthlyRent).toLocaleString()}/mo</span>
                          </div>
                          <div>
                            <span className="text-[#6E6E73] block mb-0.5">Security Deposit</span>
                            <span className="font-bold text-slate-800">${Number(l.securityDeposit || l.monthlyRent).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Progress Bar for active tenancy */}
                        {l.status === "ACTIVE" && (
                          <div className="space-y-1.5 pt-2">
                            <div className="flex justify-between text-[10px] text-[#8E8E93]">
                              <span>Term Progress</span>
                              <span>{progressVal}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full" 
                                style={{ width: `${progressVal}%` }} 
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-[#F1F5F9] flex gap-2">
                        <Button 
                          onClick={() => router.push(`/dashboard/leases/${l.id}`)}
                          className="w-full bg-slate-800 hover:bg-[#007AFF] text-white font-bold h-10 rounded-xl text-xs transition-colors"
                        >
                          View Agreement Contract
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* -------------------- DOCUMENTS TAB -------------------- */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Document List */}
              <div className="lg:col-span-2">
                <Card className="bg-white border border-[#E5E5EA] rounded-[24px] shadow-sm p-6">
                  
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pb-4 border-b border-[#F1F5F9] mb-6">
                    <div>
                      <h2 className="text-base font-extrabold text-[#1D1D1F]">Tenant Documents</h2>
                      <span className="text-xs text-[#6E6E73]">Legal papers, policy documents, and receipts</span>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <Input 
                        placeholder="Search document name..."
                        value={docSearch}
                        onChange={(e) => setDocSearch(e.target.value)}
                        className="h-9 text-xs rounded-xl bg-slate-50 border-[#E5E5EA]"
                      />
                      <Select value={docFilterCat} onValueChange={(val) => setDocFilterCat(val || "ALL")}>
                        <SelectTrigger className="h-9 text-xs w-32 bg-slate-50 border-[#E5E5EA] rounded-xl">
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
                          <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Document Name</TableHead>
                          <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Category</TableHead>
                          <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Size</TableHead>
                          <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Date Uploaded</TableHead>
                          <TableHead className="font-bold text-xs uppercase text-[#6E6E73] text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents
                          .filter(d => docFilterCat === "ALL" || d.category === docFilterCat)
                          .filter(d => d.name.toLowerCase().includes(docSearch.toLowerCase()))
                          .map((d) => (
                            <TableRow key={d.id} className="hover:bg-[#F5F5F7]/50">
                              <TableCell className="font-bold text-[#1D1D1F] flex items-center gap-2">
                                <FileText className="h-4 w-4 text-[#496E5C]" />
                                {d.name}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="rounded-full text-[10px] font-bold tracking-wider px-2">
                                  {d.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-[#6E6E73] text-xs">{d.fileSize || "1.0 MB"}</TableCell>
                              <TableCell className="text-[#6E6E73] text-xs">{new Date(d.uploadedAt).toLocaleDateString()}</TableCell>
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
                <Card className="bg-white border border-[#E5E5EA] rounded-[24px] shadow-sm p-6">
                  <div className="pb-4 border-b border-[#F1F5F9] mb-4">
                    <h2 className="text-base font-extrabold text-[#1D1D1F]">Upload New Document</h2>
                    <span className="text-xs text-[#6E6E73]">Add a contract, proof of utility, or insurance copy</span>
                  </div>

                  <form onSubmit={handleUploadDocument} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="docName" className="text-xs font-bold">Document Title</Label>
                      <Input 
                        id="docName"
                        placeholder="e.g. Renters Insurance May 2026"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        className="bg-[#F2F2F7] border-[#E5E5EA] rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="docCategory" className="text-xs font-bold">Category</Label>
                      <Select value={docCategory} onValueChange={(val) => setDocCategory(val || "LEASE")}>
                        <SelectTrigger className="bg-[#F2F2F7] border-[#E5E5EA] rounded-xl text-xs h-10">
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
                        className="bg-[#F2F2F7] border-[#E5E5EA] rounded-xl text-xs"
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
          <Card className="bg-white border border-[#E5E5EA] rounded-[24px] shadow-sm p-6 max-w-2xl mx-auto">
            <div className="pb-4 border-b border-[#F1F5F9] mb-6">
              <h2 className="text-lg font-extrabold text-[#1D1D1F] flex items-center gap-2">
                <Wrench className="h-5 w-5 text-[#496E5C]" />
                Log a Maintenance Request
              </h2>
              <span className="text-xs text-[#6E6E73]">Describe the issue in detail, and certified inspectors or vendors will check the problem.</span>
            </div>

            <form onSubmit={handleCreateMaintenance} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="maintCategory" className="text-xs font-bold">Issue Category</Label>
                  <Select value={mCategory} onValueChange={(val) => setMCategory(val || "GENERAL")}>
                    <SelectTrigger className="bg-[#F2F2F7] border-[#E5E5EA] rounded-xl text-xs h-11">
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
                    <SelectTrigger className="bg-[#F2F2F7] border-[#E5E5EA] rounded-xl text-xs h-11">
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
                    <SelectTrigger className="bg-[#F2F2F7] border-[#E5E5EA] rounded-xl text-xs h-11">
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
                    <SelectTrigger className="bg-[#F2F2F7] border-[#E5E5EA] rounded-xl text-xs h-11 disabled:opacity-70">
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
                  className="bg-[#F2F2F7] border-[#E5E5EA] rounded-xl text-xs h-11"
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
                  className="w-full p-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs focus:ring-[#496E5C] outline-none"
                />
              </div>

              <div className="p-6 border-2 border-dashed border-[#E5E5EA] rounded-xl text-center hover:bg-[#F5F5F7]/50 transition-colors cursor-pointer">
                <span className="text-xs font-semibold text-[#6E6E73] block">Drag & Drop Photos Here</span>
                <span className="text-[10px] text-[#8E8E93] mt-1 block">PNG, JPG formats accepted (Max 5MB)</span>
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
          <Card className="bg-white border border-[#E5E5EA] rounded-[24px] shadow-sm p-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-[#F1F5F9] mb-6">
              <div>
                <h2 className="text-lg font-extrabold text-[#1D1D1F]">Maintenance Log</h2>
                <span className="text-xs text-[#6E6E73]">All logged repairs and their current statuses</span>
              </div>

              <div className="flex gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
                <Select value={maintFilterPriority} onValueChange={(val) => setMaintFilterPriority(val || "ALL")}>
                  <SelectTrigger className="h-9 text-xs w-32 bg-slate-50 border-[#E5E5EA] rounded-xl">
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
                  <SelectTrigger className="h-9 text-xs w-32 bg-slate-50 border-[#E5E5EA] rounded-xl">
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
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Ticket Title</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Category</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Priority</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Assigned Inspector</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Date Filed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenance
                    .filter(m => maintFilterPriority === "ALL" || m.priority === maintFilterPriority)
                    .filter(m => maintFilterStatus === "ALL" || m.status === maintFilterStatus)
                    .map((m) => (
                      <TableRow key={m.id} className="hover:bg-[#F5F5F7]/50">
                        <TableCell className="font-bold text-slate-800 py-4">
                          {m.title}
                          <p className="text-[10px] text-[#6E6E73] font-normal mt-0.5">{m.description}</p>
                        </TableCell>
                        <TableCell className="text-[#6E6E73] text-xs font-semibold">{m.category}</TableCell>
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
                          {m.inspector ? m.inspector.name : <span className="text-[#6E6E73] italic">Awaiting assignment</span>}
                        </TableCell>
                        <TableCell className="text-[#6E6E73] text-xs">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
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
            <Card className="bg-white border border-[#E5E5EA] rounded-[24px] shadow-sm p-6">
              <div className="pb-4 border-b border-[#F1F5F9] mb-6 text-center">
                <h2 className="text-lg font-extrabold text-[#1D1D1F]">Outstanding Balance</h2>
                <h3 className={`text-3xl font-extrabold mt-2 ${totalUnpaid > 0 ? "text-red-600" : "text-[#496E5C]"}`}>
                  ${totalUnpaid.toLocaleString()}
                </h3>
                <span className="text-xs text-[#6E6E73] mt-1 block">Secure transaction portal powered by Stripe</span>
              </div>

              <form onSubmit={handlePayBalance} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cardName" className="text-xs font-bold">Cardholder Name</Label>
                  <Input 
                    id="cardName"
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="bg-[#F2F2F7] border-[#E5E5EA] rounded-xl text-xs h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cardNumber" className="text-xs font-bold">Credit Card Number</Label>
                  <Input 
                    id="cardNumber"
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="bg-[#F2F2F7] border-[#E5E5EA] rounded-xl text-xs h-11"
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
                      className="bg-[#F2F2F7] border-[#E5E5EA] rounded-xl text-xs h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cardCvv" className="text-xs font-bold">CVV</Label>
                    <Input 
                      id="cardCvv"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="bg-[#F2F2F7] border-[#E5E5EA] rounded-xl text-xs h-11"
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
          <Card className="bg-white border border-[#E5E5EA] rounded-[24px] shadow-sm p-6">
            <div className="pb-4 border-b border-[#F1F5F9] mb-6">
              <h2 className="text-lg font-extrabold text-[#1D1D1F]">Transactions Ledger</h2>
              <span className="text-xs text-[#6E6E73]">All rent receipts and financial records registered in database</span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Transaction Reference</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Category</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Payment Type</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Amount</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Date Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-[#F5F5F7]/50">
                      <TableCell className="font-bold text-[#1D1D1F]">{tx.reference || "Direct Transfer"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full font-bold px-2 py-0.5 text-[10px]">
                          {tx.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#6E6E73]">
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
                      <TableCell className="text-[#6E6E73] text-xs">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* -------------------- INVOICES TAB -------------------- */}
        {activeTab === "invoices" && (
          <Card className="bg-white border border-[#E5E5EA] rounded-[24px] shadow-sm p-6">
            <div className="pb-4 border-b border-[#F1F5F9] mb-6">
              <h2 className="text-lg font-extrabold text-[#1D1D1F]">Rent Invoices</h2>
              <span className="text-xs text-[#6E6E73]">Pay rent directly online using Stripe checkout flow</span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Due Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Rent Amount</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73]">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-[#6E6E73] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-[#F5F5F7]/50">
                      <TableCell className="font-semibold text-slate-800">{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-extrabold text-[#1D1D1F]">${Number(inv.amount).toLocaleString()}</TableCell>
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
            <Card className="lg:col-span-1 bg-white border border-[#E5E5EA] rounded-[24px] shadow-sm p-4 flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-[#F1F5F9] mb-4">
                  <h2 className="text-sm font-extrabold text-[#1D1D1F]">Inbox Messages</h2>
                  <span className="text-[10px] text-[#6E6E73]">Choose a landlord or inspector to chat</span>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[480px]">
                  {contacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContact(c)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 border ${
                        selectedContact?.id === c.id 
                          ? "bg-[#496E5C]/10 border-[#496E5C] text-[#496E5C]" 
                          : "border-transparent hover:bg-[#F5F5F7] text-[#1D1D1F]"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-[#496E5C]/10 text-[#496E5C] flex items-center justify-center font-bold text-xs uppercase">
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold block truncate">{c.name}</span>
                        <span className="text-[9px] text-[#6E6E73] font-extrabold uppercase">{c.role}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Conversation view */}
            <Card className="lg:col-span-3 bg-white border border-[#E5E5EA] rounded-[24px] shadow-sm p-6 flex flex-col justify-between h-full">
              {selectedContact ? (
                <>
                  {/* Active Header */}
                  <div className="pb-4 border-b border-[#F1F5F9] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#496E5C]/10 text-[#496E5C] flex items-center justify-center font-bold text-sm uppercase">
                        {selectedContact.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#1D1D1F]">{selectedContact.name}</h3>
                        <span className="text-[9px] text-[#6E6E73] font-extrabold uppercase tracking-wide">
                          {selectedContact.role} &bull; {selectedContact.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-full hover:bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">
                        <Phone className="h-4 w-4" />
                      </button>
                      <button className="p-2 rounded-full hover:bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">
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
                                : "bg-[#F1F5F9] text-[#1D1D1F] rounded-bl-none"
                            }`}>
                              <p>{m.content}</p>
                              <span className={`text-[8px] mt-1 block text-right ${isSelf ? "text-emerald-100" : "text-[#6E6E73]"}`}>
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
                      className="flex-1 bg-[#F2F2F7] border-[#E5E5EA] rounded-xl text-xs h-11"
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
                <div className="flex flex-col items-center justify-center h-full text-[#6E6E73]">
                  <Bell className="h-10 w-10 text-slate-300 mb-2 animate-bounce" />
                  <p className="font-semibold text-xs">No conversation selected</p>
                </div>
              )}
            </Card>

          </div>
        )}

        {/* -------------------- CALENDAR TAB -------------------- */}
        {activeTab === "calendar" && (
          <Card className="bg-white border border-[#E5E5EA] rounded-[24px] shadow-sm p-6">
            <div className="pb-4 border-b border-[#F1F5F9] mb-6">
              <h2 className="text-lg font-extrabold text-[#1D1D1F]">Calendar Schedule</h2>
              <span className="text-xs text-[#6E6E73]">Scheduled inspect visits, lease deadlines, and rent payments</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Event List */}
              <div className="md:col-span-1 space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block mb-1">Upcoming Payment</span>
                  <h4 className="text-xs font-bold text-[#1D1D1F]">Monthly Rent Payment Due</h4>
                  <p className="text-[11px] text-[#6E6E73] mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Due date: 5th of every month
                  </p>
                </div>

                {maintenance.filter(m => m.scheduledDate).map((m) => (
                  <div key={m.id} className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block mb-1">Inspector/Vendor Appointment</span>
                    <h4 className="text-xs font-bold text-[#1D1D1F]">{m.title}</h4>
                    <p className="text-[11px] text-[#6E6E73] mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Date: {new Date(m.scheduledDate).toLocaleString()}
                    </p>
                  </div>
                ))}

                {activeLease && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-700 block mb-1">Contract End Date</span>
                    <h4 className="text-xs font-bold text-[#1D1D1F]">Lease Agreement Concludes</h4>
                    <p className="text-[11px] text-[#6E6E73] mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Expiration: {new Date(activeLease.endDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Grid Calendar Mockup */}
              <div className="md:col-span-2 p-6 bg-slate-50 border border-[#E5E5EA] rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6E6E73] mb-4">Monthly Calendar Grid</h3>
                  <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-extrabold text-[#6E6E73] uppercase tracking-wider mb-2">
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
                              : "bg-white border-[#E5E5EA] text-slate-700 hover:border-slate-400"
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
          <div className="space-y-6 outline-none pt-4 pb-12">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-2xl font-black text-[#111111]">Account Settings</h2>
                <p className="text-sm text-[#7F817F] mt-0.5">Manage your preferences and profile</p>
              </div>
            </div>

            <div className="flex items-center space-x-6 border-b border-[#E5E5EA] mb-6">
              <button
                type="button"
                onClick={() => setActiveSettingsTab("profile")}
                className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
                  activeSettingsTab === "profile" 
                    ? "border-slate-900 text-slate-900" 
                    : "border-transparent text-[#6E6E73] hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Profile Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab("security")}
                className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
                  activeSettingsTab === "security" 
                    ? "border-slate-900 text-slate-900" 
                    : "border-transparent text-[#6E6E73] hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Security & Password
              </button>
            </div>

            {activeSettingsTab === "profile" && (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                
                <Card className="bg-white border-0 rounded-3xl shadow-sm p-8 max-w-3xl">
                  <h3 className="text-lg font-bold text-[#111111] border-b border-slate-100 pb-2 mb-6">Personal Information</h3>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 mb-6 border-b border-slate-100">
                    <div className="h-24 w-24 shrink-0 rounded-full bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center relative">
                      {profileAvatar ? (
                        <img src={profileAvatar} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-10 w-10 text-[#8E8E93]" />
                      )}
                      {avatarUploading && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="relative inline-block">
                          <Button type="button" variant="outline" className="h-9 px-4 text-xs font-bold rounded-lg border-slate-300">
                            Change Photo
                          </Button>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleAvatarUpload} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                        <Button type="button" variant="ghost" className="h-9 px-4 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setProfileAvatar("")}>
                          Remove
                        </Button>
                      </div>
                      <p className="text-xs text-[#6E6E73]">JPG, PNG or GIF. Max size 5MB.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="profName" className="text-sm font-bold text-slate-700">Full Name</Label>
                      <Input 
                        id="profName"
                        placeholder="Your Name"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="profPhone" className="text-sm font-bold text-slate-700">Phone Number</Label>
                      <Input 
                        id="profPhone"
                        type="tel"
                        placeholder="+1 555-0000"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold text-slate-700">Email Address</Label>
                      <div className="relative">
                        <Input 
                          disabled
                          value={session?.user?.email || ""}
                          className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11 text-[#6E6E73] pl-10 cursor-not-allowed"
                        />
                        <Shield className="h-4 w-4 text-[#8E8E93] absolute left-3.5 top-3.5" />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="bg-white border-0 rounded-3xl shadow-sm p-8 max-w-3xl">
                  <h3 className="text-lg font-bold text-[#111111] border-b border-slate-100 pb-2 mb-6">Employment Status</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold text-slate-700">Current Status</Label>
                      <Select value={profileEmploymentStatus} onValueChange={(val) => setProfileEmploymentStatus(val || "EMPLOYED")}>
                        <SelectTrigger className="w-full bg-slate-50 border-slate-200 rounded-xl h-11">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-xl">
                          <SelectItem value="EMPLOYED">Employed</SelectItem>
                          <SelectItem value="SELF_EMPLOYED">Self-Employed</SelectItem>
                          <SelectItem value="STUDENT">Student</SelectItem>
                          <SelectItem value="UNEMPLOYED">Unemployed</SelectItem>
                          <SelectItem value="RETIRED">Retired</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold text-slate-700">Employer / School / Income Source</Label>
                        <Input 
                          placeholder="e.g. Company Name, University, Savings"
                          value={profileEmployer}
                          onChange={(e) => setProfileEmployer(e.target.value)}
                          className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold text-slate-700">Job Title / Support Type</Label>
                        <Input 
                          placeholder="e.g. Software Engineer, Scholarship"
                          value={profilePosition}
                          onChange={(e) => setProfilePosition(e.target.value)}
                          className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="bg-white border-0 rounded-3xl shadow-sm p-8 max-w-3xl">
                  <h3 className="text-lg font-bold text-[#111111] border-b border-slate-100 pb-2 mb-6">Emergency Contact</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold text-slate-700">Contact Name</Label>
                      <Input 
                        placeholder="Jane Doe"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold text-slate-700">Relationship</Label>
                      <Input 
                        placeholder="e.g. Parent, Sibling"
                        value={emergencyRelationship}
                        onChange={(e) => setEmergencyRelationship(e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-sm font-bold text-slate-700">Phone Number</Label>
                      <Input 
                        type="tel"
                        placeholder="Emergency Phone"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                      />
                    </div>
                  </div>
                </Card>

                <Card className="bg-white border-0 rounded-3xl shadow-sm p-8 max-w-3xl">
                  <h3 className="text-lg font-bold text-[#111111] border-b border-slate-100 pb-2 mb-6">Bank Payout Details</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold text-slate-700">Bank Name</Label>
                      <Input 
                        placeholder="e.g. Chase Bank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold text-slate-700">Account Name</Label>
                        <Input 
                          placeholder="John Doe"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-bold text-slate-700">Account / IBAN Number</Label>
                        <Input 
                          placeholder="**** **** **** 1234"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="pt-2 max-w-3xl flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={profileSubmitting}
                    className="bg-slate-900 hover:bg-[#007AFF] text-white font-bold h-11 px-10 rounded-xl shadow-sm transition-colors"
                  >
                    {profileSubmitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
                    ) : (
                      "Save Profile Settings"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {activeSettingsTab === "security" && (
              <div className="mt-2">
                <SecuritySettings />
              </div>
            )}
          </div>
        )}

    </div>


    </>
  );
}
