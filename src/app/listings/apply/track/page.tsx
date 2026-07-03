"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Clock,
  FileText,
  CreditCard,
  ArrowRight,
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Building,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SafeApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string; // PENDING, APPROVED, REJECTED
  createdAt: string;
  unit: {
    id: string;
    name: string;
    rentAmount: string;
    depositAmt: string;
    property: {
      name: string;
      address: string;
      city: string;
      country: string;
      coverPhoto: string | null;
    };
  };
  lease: {
    id: string;
    status: string; // DRAFT, ACTIVE, etc.
    startDate: string;
    endDate: string;
    monthlyRent: string;
    securityDeposit: string;
  } | null;
}

function TrackerContent() {
  const searchParams = useSearchParams();
  const appId = searchParams.get("id");
  const stripeStatus = searchParams.get("status");

  const [app, setApp] = useState<SafeApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingName, setSigningName] = useState("");
  const [signed, setSigned] = useState(false);
  const [paying, setPaying] = useState(false);

  // Fetch application status
  const fetchStatus = async () => {
    if (!appId) return;
    try {
      const res = await fetch(`/api/applications/${appId}`);
      if (!res.ok) throw new Error("Application not found");
      const data = await res.json();
      setApp(data);

      // If the lease status is ACTIVE, mark signed as true
      if (data.lease?.status === "ACTIVE") {
        setSigned(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load application status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll status every 15 seconds to catch landlord updates
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [appId]);

  // Show Stripe feedback toast
  useEffect(() => {
    if (stripeStatus === "success") {
      toast.success("Security deposit payment processed successfully! Your lease is active.");
      // Clear status from URL query to avoid repeating toasts
      const newUrl = window.location.pathname + `?id=${appId}`;
      window.history.replaceState({}, "", newUrl);
    } else if (stripeStatus === "cancelled") {
      toast.error("Deposit payment cancelled.");
      const newUrl = window.location.pathname + `?id=${appId}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [stripeStatus, appId]);

  const handleSignLease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!app) return;
    if (signingName.trim().toLowerCase() !== app.name.trim().toLowerCase()) {
      toast.error(`Signature must match your full name: "${app.name}"`);
      return;
    }
    setSigned(true);
    toast.success("Lease agreement digitally signed!");
  };

  const handlePayDeposit = async () => {
    if (!app?.lease) return;
    setPaying(true);
    try {
      // Direct Stripe Checkout session creation
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaseId: app.lease.id,
          successUrl: `${window.location.origin}/listings/apply/track?id=${app.id}&status=success`,
          cancelUrl: `${window.location.origin}/listings/apply/track?id=${app.id}&status=cancelled`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate checkout session");
      }

      const { url } = await res.json();
      window.location.href = url; // Redirect to Stripe
    } catch (err: any) {
      toast.error(err.message || "Error initiating payment.");
      setPaying(false);
    }
  };

  if (!appId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full rounded-[2rem] border-slate-200/60 p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Missing Tracking ID</h2>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            Please use the secure link sent to your email or copied at the time of your application submission.
          </p>
          <Link href="/listings">
            <Button className="bg-blue-600 hover:bg-blue-600/90 text-white font-bold h-11 rounded-xl px-6 mt-2">
              Browse Listings
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-500">Loading your application details...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full rounded-[2rem] border-slate-200/60 p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Application Not Found</h2>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            We couldn't locate any application with the ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 text-[11px] font-bold">{appId}</code>
          </p>
          <Link href="/listings">
            <Button className="bg-blue-600 hover:bg-blue-600/90 text-white font-bold h-11 rounded-xl px-6 mt-2">
              Browse Listings
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Stepper logic
  const isDeclined = app.status === "REJECTED";
  const isApproved = app.status === "APPROVED" || app.lease !== null;
  const isLeaseActive = app.lease?.status === "ACTIVE";

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-10 py-4 px-6 md:px-12">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/listings" className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-xl">
              <Building className="h-5 w-5" />
            </div>
            <span className="text-md font-black tracking-tight text-slate-800">
              Property<span className="text-blue-600">Pro</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Application Tracker</span>
            <Badge className="bg-blue-50 text-blue-600 border border-blue-100 font-bold text-[10px] px-2 py-0.5">
              Guest Mode
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-12 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Main Tracking Progress */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-[2rem] p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Live Status Dashboard</span>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1">Track Your Application</h1>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Ref: <code className="bg-slate-50 px-1.5 py-0.5 rounded font-bold text-slate-600 text-[10px]">{app.id}</code> • Submitted on {new Date(app.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Visual Stepper */}
            <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {/* Step 1: Submission */}
              <div className="relative">
                <div className="absolute -left-[29px] top-0.5 h-6 w-6 rounded-full bg-green-500 text-white flex items-center justify-center border-4 border-white shadow-sm">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Application Submitted</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    Your form details and supporting verification files were uploaded successfully.
                  </p>
                </div>
              </div>

              {/* Step 2: Landlord Review */}
              <div className="relative">
                <div className={`absolute -left-[29px] top-0.5 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${
                  isDeclined
                    ? "bg-red-500 text-white"
                    : isApproved
                    ? "bg-green-500 text-white"
                    : "bg-blue-600 text-white animate-pulse"
                }`}>
                  {isDeclined ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : isApproved ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">Landlord Review</h3>
                    {isDeclined ? (
                      <Badge className="bg-red-50 text-red-500 border border-red-100 text-[9px] font-bold">Declined</Badge>
                    ) : isApproved ? (
                      <Badge className="bg-green-50 text-green-500 border border-green-100 text-[9px] font-bold">Approved</Badge>
                    ) : (
                      <Badge className="bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-bold animate-pulse">Under Review</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {isDeclined
                      ? "The landlord has declined the current application. Please contact them for specific feedback."
                      : isApproved
                      ? "Congratulations! The landlord approved your application. Please review the lease agreement below."
                      : "We are reviewing your credit references and documents. Typically takes 24–48 hours."}
                  </p>
                </div>
              </div>

              {/* Step 3: Sign Lease */}
              <div className="relative">
                <div className={`absolute -left-[29px] top-0.5 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${
                  isLeaseActive
                    ? "bg-green-500 text-white"
                    : isApproved
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}>
                  {isLeaseActive ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <FileText className="h-3 w-3" />
                  )}
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isApproved ? "text-slate-800" : "text-slate-400"}`}>
                    Sign Lease Agreement
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {isLeaseActive
                      ? "Lease agreement has been signed digitally."
                      : isApproved
                      ? "Log in to your Tenant Portal to sign the lease."
                      : "Locked until application approval."}
                  </p>
                </div>
              </div>

              {/* Step 4: Security Deposit */}
              <div className="relative">
                <div className={`absolute -left-[29px] top-0.5 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${
                  isLeaseActive
                    ? "bg-green-500 text-white"
                    : isApproved
                    ? "bg-blue-600 text-white animate-pulse"
                    : "bg-slate-100 text-slate-400"
                }`}>
                  {isLeaseActive ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <CreditCard className="h-3 w-3" />
                  )}
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isApproved ? "text-slate-800" : "text-slate-400"}`}>
                    Secure Security Deposit (Bond)
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {isLeaseActive
                      ? "Security deposit completed. Bond is active!"
                      : isApproved
                      ? "Log in to your Tenant Portal to pay the deposit."
                      : "Locked until lease signature."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Lease Signing Notice */}
          {isApproved && app.lease && !isLeaseActive && (
            <div className="bg-white border border-[#E2E8F0] rounded-[2rem] p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">Lease Setup Required</h2>
                  <p className="text-xs text-slate-400 font-semibold">Your lease is ready for review.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold text-slate-400">Monthly Rent</p>
                  <p className="text-lg font-black text-slate-800">${Number(app.lease.monthlyRent).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-400">Security Deposit</p>
                  <p className="text-lg font-black text-slate-800">${Number(app.lease.securityDeposit).toLocaleString()}</p>
                </div>
                <div className="col-span-2 border-t border-slate-200/60 pt-3 flex justify-between">
                  <div>
                    <p className="font-semibold text-slate-400">Start Date</p>
                    <p className="font-bold text-slate-700">{new Date(app.lease.startDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-400">End Date</p>
                    <p className="font-bold text-slate-700">{new Date(app.lease.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-800 font-medium">
                <p className="font-bold mb-1 flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Next Steps:
                </p>
                An account has been created for you. Please check your email inbox for your login credentials. You must log in to your Tenant Portal to securely sign your lease agreement and pay the security deposit.
                
                <div className="mt-4">
                  <Link href="/auth/login">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl">
                      Go to Login Portal <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Active Lease Welcome Card */}
          {isLeaseActive && (
            <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-[2rem] p-6 text-center space-y-4">
              <div className="mx-auto h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner">
                <ShieldCheck className="h-9 w-9 text-green-600" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-800">Welcome to your new home!</h2>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                  Your lease for unit <span className="font-bold text-slate-700">{app.unit.name}</span> is officially active. The landlord has been notified and will reach out with keys and move-in details.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Summary & Listing Card Info */}
        <div className="space-y-6">
          {/* Property Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-[2rem] overflow-hidden shadow-sm">
            {app.unit.property.coverPhoto ? (
              <img
                src={app.unit.property.coverPhoto}
                alt={app.unit.property.name}
                className="w-full h-44 object-cover"
              />
            ) : (
              <div className="w-full h-44 bg-slate-100 flex items-center justify-center text-slate-400">
                <Building className="h-10 w-10" />
              </div>
            )}
            <div className="p-5 space-y-4">
              <div>
                <Badge className="bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-bold uppercase tracking-wider mb-2">
                  Unit {app.unit.name}
                </Badge>
                <h3 className="font-black text-slate-800 text-base leading-tight">
                  {app.unit.property.name}
                </h3>
                <p className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {app.unit.property.address}, {app.unit.property.city}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                <div>
                  <p className="text-slate-400 font-semibold">Rent</p>
                  <p className="font-black text-slate-800">${Number(app.unit.rentAmount).toLocaleString()}/mo</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-semibold">Deposit</p>
                  <p className="font-black text-slate-800">${Number(app.unit.depositAmt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Details summary */}
          <div className="bg-white border border-[#E2E8F0] rounded-[2rem] p-5 shadow-sm space-y-3">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              Applicant Details
            </h3>
            <div className="space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>{app.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{app.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{app.phone}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TrackApplicationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-500">Initializing status screen...</p>
      </div>
    }>
      <TrackerContent />
    </Suspense>
  );
}
