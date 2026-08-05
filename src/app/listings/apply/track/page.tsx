"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Sparkles,
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

  // Fetch application status
  const fetchStatus = async () => {
    if (!appId) return;
    try {
      const res = await fetch(`/api/applications/${appId}`);
      if (!res.ok) throw new Error("Application not found");
      const data = await res.json();
      setApp(data);
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
      const newUrl = window.location.pathname + `?id=${appId}`;
      window.history.replaceState({}, "", newUrl);
    } else if (stripeStatus === "cancelled") {
      toast.error("Deposit payment cancelled.");
      const newUrl = window.location.pathname + `?id=${appId}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [stripeStatus, appId]);

  if (!appId) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <Card className="max-w-md w-full rounded-3xl border-slate-200 p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Missing Tracking ID</h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Please use the secure link sent to your email or copied at the time of your application submission.
          </p>
          <Link href="/listings">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium h-11 rounded-xl px-6 mt-2 shadow-xs">
              Browse Listings
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="h-10 w-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-500">Loading your application details...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <Card className="max-w-md w-full rounded-3xl border-slate-200 p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Application Not Found</h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            We couldn't locate any application with the ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-rose-600 text-[11px] font-bold">{appId}</code>
          </p>
          <Link href="/listings">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium h-11 rounded-xl px-6 mt-2 shadow-xs">
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
    <div className="min-h-screen bg-[#F8FAFC] pb-16 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 py-4 px-6 md:px-12">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/listings" className="flex items-center gap-2">
            <div className="bg-slate-900 text-white p-2 rounded-xl">
              <Building className="h-5 w-5" />
            </div>
            <span className="text-md font-black tracking-tight text-slate-900">
              PropertyPro
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Application Tracker</span>
            <Badge className="bg-slate-100 text-slate-800 border border-slate-200 font-bold text-[10px] px-2 py-0.5">
              Guest Mode
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-12 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Main Tracking Progress */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] text-slate-900 font-black uppercase tracking-widest">Live Status Dashboard</span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Track Your Application</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Ref: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700 text-[10px]">{app.id}</code> • Submitted on {new Date(app.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Visual Stepper */}
            <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {/* Step 1: Submission */}
              <div className="relative">
                <div className="absolute -left-[29px] top-0.5 h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center border-4 border-white shadow-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Application Submitted</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Your form details and supporting verification files were uploaded successfully.
                  </p>
                </div>
              </div>

              {/* Step 2: Landlord Review */}
              <div className="relative">
                <div className={`absolute -left-[29px] top-0.5 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white shadow-xs ${
                  isDeclined
                    ? "bg-rose-600 text-white"
                    : isApproved
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900 text-white animate-pulse"
                }`}>
                  {isDeclined ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                  ) : isApproved ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900">Landlord Review</h3>
                    {isDeclined ? (
                      <Badge className="bg-rose-50 text-rose-600 border border-rose-200 text-[9px] font-bold">Declined</Badge>
                    ) : isApproved ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">Approved</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-900 border border-slate-200 text-[9px] font-bold animate-pulse">Under Review</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
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
                <div className={`absolute -left-[29px] top-0.5 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white shadow-xs ${
                  isLeaseActive
                    ? "bg-emerald-600 text-white"
                    : isApproved
                    ? "bg-slate-900 text-white"
                    : "bg-slate-200 text-slate-400"
                }`}>
                  {isLeaseActive ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                </div>
                <div>
                  <h3 className={`text-sm font-extrabold ${isApproved ? "text-slate-900" : "text-slate-400"}`}>
                    Sign Lease Agreement
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
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
                <div className={`absolute -left-[29px] top-0.5 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white shadow-xs ${
                  isLeaseActive
                    ? "bg-emerald-600 text-white"
                    : isApproved
                    ? "bg-slate-900 text-white animate-pulse"
                    : "bg-slate-200 text-slate-400"
                }`}>
                  {isLeaseActive ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <CreditCard className="h-3.5 w-3.5" />
                  )}
                </div>
                <div>
                  <h3 className={`text-sm font-extrabold ${isApproved ? "text-slate-900" : "text-slate-400"}`}>
                    Secure Security Deposit (Bond)
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
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
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-2">
                <div className="bg-slate-100 text-slate-900 p-2 rounded-xl border border-slate-200">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Lease Setup Required</h2>
                  <p className="text-xs text-slate-500 font-semibold">Your lease is ready for review.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold text-slate-500">Monthly Rent</p>
                  <p className="text-lg font-black text-slate-900">${Number(app.lease.monthlyRent).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-500">Security Deposit</p>
                  <p className="text-lg font-black text-slate-900">${Number(app.lease.securityDeposit).toLocaleString()}</p>
                </div>
                <div className="col-span-2 border-t border-slate-200 pt-3 flex justify-between">
                  <div>
                    <p className="font-semibold text-slate-500">Start Date</p>
                    <p className="font-bold text-slate-800">{new Date(app.lease.startDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-500">End Date</p>
                    <p className="font-bold text-slate-800">{new Date(app.lease.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-5 text-xs text-slate-700 font-medium space-y-4">
                <p className="font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-900" /> Next Steps:
                </p>
                An account has been created for you. Please check your email inbox for your login credentials. You must log in to your Tenant Portal to securely sign your lease agreement and pay the security deposit.
                
                <div>
                  <Link href="/auth/login">
                    <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium h-11 rounded-xl shadow-xs">
                      Go to Login Portal <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Active Lease Welcome Card */}
          {isLeaseActive && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-6 sm:p-8 text-center space-y-4">
              <div className="mx-auto h-14 w-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center border border-emerald-200 shadow-xs">
                <ShieldCheck className="h-8 w-8 text-emerald-700" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-900">Welcome to your new home!</h2>
                <p className="text-xs text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
                  Your lease for <span className="font-extrabold text-slate-900">{app.unit.property.name} ({app.unit.name})</span> is officially active. The landlord has been notified and will reach out with keys and move-in details.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Summary & Listing Card Info */}
        <div className="space-y-6">
          {/* Property Card */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
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
                <Badge className="bg-slate-100 text-slate-800 border border-slate-200 text-[9px] font-bold uppercase tracking-wider mb-2">
                  Unit {app.unit.name}
                </Badge>
                <h3 className="font-black text-slate-900 text-base leading-tight">
                  {app.unit.property.name}
                </h3>
                <p className="text-slate-500 text-[11px] font-semibold flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {app.unit.property.address}, {app.unit.property.city}
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                <div>
                  <p className="text-slate-500 font-semibold">Rent</p>
                  <p className="font-black text-slate-900">${Number(app.unit.rentAmount).toLocaleString()}/mo</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 font-semibold">Deposit</p>
                  <p className="font-black text-slate-900">${Number(app.unit.depositAmt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Details summary */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
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
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="h-10 w-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-500">Initializing status screen...</p>
      </div>
    }>
      <TrackerContent />
    </Suspense>
  );
}
