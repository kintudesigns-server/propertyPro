"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ClipboardList, Clock, CheckCircle2, XCircle, ArrowRight, Home } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function TenantApplicationsPage() {
  const { data: session } = useSession();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/tenant/applications")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setApplications(data);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch applications", err);
          setLoading(false);
        });
    }
  }, [session]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full min-h-screen">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <ClipboardList className="h-7 w-7 text-indigo-600" />
          </div>
          My Applications
        </h1>
        <p className="text-[#6E6E73] mt-2 text-sm font-medium">Track the status of your rental applications in real-time.</p>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 mb-6 border border-slate-100">
            <ClipboardList className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">No Applications Found</h3>
          <p className="text-[#6E6E73] max-w-md mx-auto text-sm leading-relaxed mb-8">
            You haven't submitted any rental applications yet. When you find a property you like, apply to see its status here!
          </p>
          <Link href="/listings" className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-sm gap-2">
            <Search className="h-4 w-4" />
            Browse Listings
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {applications.map((app) => (
            <ApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}
    </div>
  );
}

function Search({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ApplicationCard({ application }: { application: any }) {
  const { status, createdAt, unit } = application;
  const property = unit?.property;
  
  // Determine tracker state
  let currentStep = 1; // Submitted
  if (status === "PENDING") {
    currentStep = 2; // Under Review
  } else if (status === "APPROVED" || status === "LEASE_CREATED" || status === "REJECTED") {
    currentStep = 3; // Decision
  }

  const isApproved = status === "APPROVED" || status === "LEASE_CREATED";
  const isRejected = status === "REJECTED";

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
      {/* Property Details Side */}
      <div className="md:w-1/3 bg-slate-50 p-6 border-b md:border-b-0 md:border-r border-slate-200">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200 shadow-sm">
            {property?.images?.[0] ? (
              <img src={property.images[0]} alt={property.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                <Home className="h-6 w-6 text-indigo-300" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg truncate max-w-[200px]">{property?.name || "Property Name"}</h3>
            <p className="text-[#6E6E73] font-medium text-xs mt-1">Unit {unit?.name || "N/A"}</p>
            <p className="text-[#8E8E93] text-xs mt-3 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Applied {format(new Date(createdAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Action Button if Approved */}
        {isApproved && application.lease && (
          <div className="mt-8">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-800 font-black text-sm mb-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Application Approved!
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                {application.lease.status === "PENDING_SIGNATURE" 
                  ? "Congratulations! The owner has generated a lease for you. Please review and sign."
                  : "Your lease is fully signed and secured!"}
              </p>
            </div>
            <Link 
              href={`/dashboard/leases/${application.lease.id}`}
              className={`w-full inline-flex items-center justify-center px-4 py-3.5 text-white font-bold text-sm rounded-xl shadow-md transition-all hover:scale-[1.02] gap-2 ${
                application.lease.status === "PENDING_SIGNATURE" 
                  ? "bg-indigo-600 hover:bg-indigo-700" 
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {application.lease.status === "PENDING_SIGNATURE" ? "Review & Sign Lease" : "View Lease Details"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
        {isApproved && !application.lease && (
          <div className="mt-8">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 shadow-sm">
              <div className="flex items-center gap-2 text-amber-800 font-black text-sm mb-1">
                <Clock className="h-5 w-5 text-amber-600" />
                Approved & Awaiting Lease
              </div>
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                You're approved! The property manager is currently drafting your lease agreement. Check back soon.
              </p>
            </div>
          </div>
        )}

        {/* Rejection Alert */}
        {isRejected && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-1">
              <XCircle className="h-4 w-4" />
              Not Approved
            </div>
            <p className="text-xs text-red-600 leading-relaxed mb-3">
              Unfortunately, the owner has chosen to proceed with another applicant at this time.
            </p>
            {application.rejectionReason && (
              <div className="bg-white border-l-2 border-red-400 p-3 rounded-r-lg shadow-sm">
                <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Reason provided:</p>
                <p className="text-xs text-slate-700 leading-relaxed">{application.rejectionReason}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tracker Side */}
      <div className="md:w-2/3 p-8 md:p-10 flex flex-col justify-center bg-white">
        <div className="flex items-center justify-between mb-10">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            Application Status Tracker
          </h4>
        </div>
        
        <div className="relative px-4">
          {/* Progress Line Background */}
          <div className="absolute top-6 left-12 right-12 h-1.5 bg-slate-100 rounded-full z-0"></div>
          
          {/* Active Progress Line */}
          <div 
            className={`absolute top-6 left-12 h-1.5 rounded-full z-0 transition-all duration-1000 ease-out shadow-sm ${
              isRejected ? 'bg-red-500 shadow-red-200' : 'bg-indigo-500 shadow-indigo-200'
            }`}
            style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
          ></div>

          {/* Steps */}
          <div className="relative z-10 flex justify-between">
            {/* Step 1: Submitted */}
            <div className="flex flex-col items-center gap-3 w-24">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-base outline outline-4 outline-white shadow-md transition-all duration-500 ${
                currentStep >= 1 ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-50 text-[#8E8E93] border-2 border-slate-200'
              }`}>
                {currentStep > 1 ? <CheckCircle2 className="h-6 w-6" /> : 1}
              </div>
              <div className="text-center">
                <p className={`font-black text-sm ${currentStep >= 1 ? 'text-slate-900' : 'text-[#8E8E93]'}`}>Submitted</p>
                {currentStep === 1 && <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">Current</p>}
              </div>
            </div>

            {/* Step 2: Under Review */}
            <div className="flex flex-col items-center gap-3 w-24">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-base outline outline-4 outline-white shadow-md transition-all duration-500 ${
                currentStep >= 2 ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-50 text-[#8E8E93] border-2 border-slate-200'
              }`}>
                {currentStep > 2 ? <CheckCircle2 className="h-6 w-6" /> : 2}
              </div>
              <div className="text-center">
                <p className={`font-black text-sm ${currentStep >= 2 ? 'text-slate-900' : 'text-[#8E8E93]'}`}>Under Review</p>
                {currentStep === 2 && <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">In Progress</p>}
              </div>
            </div>

            {/* Step 3: Decision */}
            <div className="flex flex-col items-center gap-3 w-24">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-base outline outline-4 outline-white shadow-md transition-all duration-500 ${
                currentStep >= 3 
                  ? (isRejected ? 'bg-red-500 text-white shadow-red-200' : 'bg-emerald-500 text-white shadow-emerald-200')
                  : 'bg-slate-50 text-[#8E8E93] border-2 border-slate-200'
              }`}>
                {currentStep >= 3 ? (
                  isRejected ? <XCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />
                ) : 3}
              </div>
              <div className="text-center">
                <p className={`font-black text-sm ${currentStep >= 3 ? 'text-slate-900' : 'text-[#8E8E93]'}`}>Decision</p>
                {currentStep === 3 && (
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full inline-block ${isRejected ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50'}`}>
                    {isRejected ? 'Declined' : 'Approved'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
