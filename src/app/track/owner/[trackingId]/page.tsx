"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, CheckCircle2, Clock, XCircle, Loader2, ArrowRight, ArrowLeft, FileText, Phone, Mail, Globe, Users, Shield, Sparkles } from "lucide-react";
import Link from "next/link";

const steps = [
  { key: "PENDING", label: "Application Submitted", description: "Your application has been received and is in our review queue.", icon: FileText },
  { key: "UNDER_REVIEW", label: "Under Review", description: "Our compliance team is actively verifying your business details.", icon: Clock },
  { key: "APPROVED", label: "Account Approved", description: "Your owner account is ready! Check your inbox for setup instructions.", icon: CheckCircle2 },
];

export default function OwnerTrackerPage() {
  const params = useParams();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.trackingId) return;
    fetch(`/api/owner-applications/${params.trackingId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setApplication(data);
      })
      .catch(() => setError("Failed to load application status."))
      .finally(() => setLoading(false));
  }, [params.trackingId]);

  const currentStepIdx = steps.findIndex(s => s.key === application?.status);
  const isRejected = application?.status === "REJECTED";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 md:p-8 font-sans text-[#1D1D1F]">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Sleek SaaS Brand Header */}
        <div className="flex items-center justify-between relative px-2">
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-2xs">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-[#1D1D1F]">PropertyPro</span>
          </div>

          <div className="w-20 sm:w-24 flex justify-end">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
              Owner Portal
            </span>
          </div>
        </div>

        {/* Main Card Container */}
        <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-2xl">
          
          {/* Header Panel */}
          <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">Application Status</h1>
              </div>
              <p className="text-[#6E6E73] text-xs font-normal mt-1 flex items-center gap-1.5 flex-wrap">
                <span>Tracking Reference:</span>
                <code className="text-[#1D1D1F] font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                  {params.trackingId}
                </code>
              </p>
            </div>
            
            <Link 
              href="/" 
              className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-2xs transition-all flex items-center justify-center shrink-0"
            >
              Go to Home
            </Link>
          </div>

          <div className="p-6 md:p-8">
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
                <p className="text-[#6E6E73] text-xs font-normal">Loading your application status...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12 space-y-4">
                <div className="h-12 w-12 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-600 shadow-2xs">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[#1D1D1F] font-semibold text-lg">Application Not Found</p>
                  <p className="text-[#6E6E73] text-xs font-normal mt-1 max-w-sm mx-auto">{error}</p>
                </div>
                <Link 
                  href="/" 
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-900 hover:underline pt-2"
                >
                  ← Return to Homepage
                </Link>
              </div>
            )}

            {application && (
              <>
                {isRejected ? (
                  <div className="text-center py-8 space-y-5">
                    <div className="h-14 w-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-600 shadow-2xs">
                      <XCircle className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-[#1D1D1F] tracking-tight">Application Not Approved</h2>
                      <p className="text-[#6E6E73] text-xs font-normal mt-1.5 max-w-md mx-auto leading-relaxed">
                        We were unable to approve your application at this time. An email notification has been dispatched with further information.
                      </p>
                    </div>

                    {application.rejectionReason && (
                      <div className="mt-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 text-left max-w-md mx-auto space-y-1">
                        <p className="text-rose-900 text-xs font-semibold">Review Notes:</p>
                        <p className="text-rose-800 text-xs font-normal">{application.rejectionReason}</p>
                      </div>
                    )}

                    <div className="pt-2">
                      <Link 
                        href="/" 
                        className="inline-flex items-center justify-center h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-2xs transition-all"
                      >
                        ← Return to Homepage
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Progress Steps */}
                    <div className="space-y-3.5 mb-8">
                      {steps.map((step, idx) => {
                        const isComplete = idx < currentStepIdx || application.status === step.key;
                        const isCurrent = application.status === step.key;
                        const isUpcoming = idx > currentStepIdx;
                        const Icon = step.icon;

                        return (
                          <div 
                            key={step.key} 
                            className={`p-4.5 rounded-2xl border transition-all flex items-start gap-4 ${
                              isCurrent 
                                ? 'bg-slate-50 border-slate-300 shadow-2xs' 
                                : isComplete && idx < currentStepIdx 
                                ? 'bg-emerald-50/50 border-emerald-200/80' 
                                : 'bg-slate-50/40 border-slate-200/60 opacity-60'
                            }`}
                          >
                            <div 
                              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${
                                isCurrent 
                                  ? 'bg-slate-900 text-white' 
                                  : idx < currentStepIdx 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-slate-100 text-slate-400 border border-slate-200/60'
                              }`}
                            >
                              {idx < currentStepIdx ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Icon className="h-4.5 w-4.5" />}
                            </div>

                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm font-semibold tracking-tight ${
                                  isCurrent ? 'text-[#1D1D1F]' : idx < currentStepIdx ? 'text-emerald-950' : 'text-slate-500'
                                }`}>
                                  {step.label}
                                </p>

                                {isCurrent && application.status !== "APPROVED" && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-900 text-white shadow-2xs">
                                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                    In Progress
                                  </span>
                                )}

                                {idx < currentStepIdx && (
                                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Completed
                                  </span>
                                )}
                              </div>

                              <p className="text-[#6E6E73] text-xs font-normal leading-relaxed">
                                {step.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Account Approved Banner */}
                    {application.status === "APPROVED" && (
                      <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-6 text-center space-y-3 shadow-2xs">
                        <div className="h-11 w-11 bg-emerald-100 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-700 shadow-2xs">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-[#1D1D1F] font-semibold text-lg tracking-tight">Account Approved! Check Your Email</h3>
                          <p className="text-[#6E6E73] text-xs font-normal mt-1">
                            Your temporary credentials have been sent to <strong className="text-emerald-800 font-semibold">{application.email}</strong>.
                          </p>
                        </div>
                        <div className="pt-1">
                          <Link 
                            href="/auth/login" 
                            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-9 px-6 rounded-xl transition-all shadow-2xs"
                          >
                            Sign In to Portal <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Application Details Grid */}
                    <div className="mt-6 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs font-sans">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                        <h3 className="text-[#6E6E73] font-medium text-[10px] uppercase tracking-wider">Submitted Details</h3>
                        <span className="text-[#6E6E73] text-[11px] font-normal">
                          {new Date(application.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { icon: Users, label: "Applicant Name", value: application.name },
                          { icon: Mail, label: "Email Address", value: application.email },
                          { icon: Phone, label: "Phone Number", value: application.phone },
                          { icon: FileText, label: "Entity Type", value: application.entityType },
                          { icon: Building2, label: "Portfolio Size", value: application.portfolioSize },
                          ...(application.website ? [{ icon: Globe, label: "Website", value: application.website }] : []),
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="flex items-start gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 shrink-0 mt-0.5 shadow-2xs">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[#6E6E73] text-[11px] font-normal">{label}</p>
                              <p className="text-[#1D1D1F] text-xs font-semibold truncate mt-0.5">{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer Trust Info */}
        <p className="text-center text-xs text-[#6E6E73] font-normal flex items-center justify-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-slate-400" /> PropertyPro Owner Verification System
        </p>
      </div>
    </div>
  );
}
