"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, CheckCircle2, Clock, XCircle, Loader2, ArrowRight, ArrowLeft, FileText, Phone, Mail, Globe, Users } from "lucide-react";
import Link from "next/link";

const steps = [
  { key: "PENDING", label: "Application Submitted", description: "Your application has been received and is in our queue.", icon: FileText },
  { key: "UNDER_REVIEW", label: "Under Review", description: "Our team is actively reviewing your business information.", icon: Clock },
  { key: "APPROVED", label: "Account Approved", description: "Your owner account has been created. Check your email for login details.", icon: CheckCircle2 },
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
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center relative">
          <Link href="/" className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5 font-semibold text-sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#0F172A]">PropertyPro</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-[#0F172A]">Application Status</h1>
              <p className="text-slate-500 mt-1 text-sm">Tracking ID: <code className="text-blue-600 font-mono text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{params.trackingId}</code></p>
            </div>
            <Link href="/" className="hidden sm:flex items-center justify-center h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
              Go to Home
            </Link>
          </div>

          <div className="p-8">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
                <p className="text-slate-400">Loading your application status...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-[#0F172A] font-bold text-lg">Application Not Found</p>
                <p className="text-slate-500 mt-2">{error}</p>
                <Link href="/" className="mt-6 inline-block text-blue-600 hover:text-blue-700 font-semibold">← Back to Home</Link>
              </div>
            )}

            {application && (
              <>
                {isRejected ? (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                      <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-[#0F172A] mb-2">Application Not Approved</h2>
                    <p className="text-slate-500 leading-relaxed max-w-md mx-auto">
                      Unfortunately, we were unable to approve your application at this time. Please check your email for more details.
                    </p>
                    {application.rejectionReason && (
                      <div className="mt-6 bg-red-50 border border-red-100 rounded-xl p-4 text-left max-w-md mx-auto">
                        <p className="text-red-700 text-sm font-bold mb-1">Reason provided:</p>
                        <p className="text-slate-700 text-sm">{application.rejectionReason}</p>
                      </div>
                    )}
                    <Link href="/" className="mt-6 inline-block text-blue-600 hover:text-blue-700 font-semibold">← Back to Home</Link>
                  </div>
                ) : (
                  <>
                    {/* Progress Steps */}
                    <div className="space-y-4 mb-8">
                      {steps.map((step, idx) => {
                        const isComplete = idx < currentStepIdx || application.status === step.key;
                        const isCurrent = application.status === step.key;
                        const isUpcoming = idx > currentStepIdx;
                        const Icon = step.icon;
                        return (
                          <div key={step.key} className={`flex gap-4 p-4 rounded-2xl border transition-all ${isCurrent ? 'bg-blue-50 border-blue-200 shadow-sm' : isComplete && idx < currentStepIdx ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isCurrent ? 'bg-blue-600 text-white' : idx < currentStepIdx ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              {idx < currentStepIdx ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                            </div>
                            <div className="flex-1">
                              <p className={`font-bold ${isCurrent ? 'text-blue-900' : idx < currentStepIdx ? 'text-emerald-900' : 'text-slate-600'}`}>{step.label}</p>
                              <p className="text-slate-500 text-sm mt-0.5">{step.description}</p>
                              {isCurrent && application.status !== "APPROVED" && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-pulse" />
                                  <span className="text-blue-600 text-xs font-bold uppercase tracking-wider">In Progress</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {application.status === "APPROVED" && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                        <h3 className="text-[#0F172A] font-black text-lg mb-2">You're in! Check Your Email</h3>
                        <p className="text-slate-600 text-sm mb-4">Your login credentials have been sent to <strong className="text-emerald-700">{application.email}</strong></p>
                        <Link href="/auth/login" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-md shadow-emerald-600/20">
                          Go to Login <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )}

                    {/* Application Summary */}
                    <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                      <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-4">Your Application Details</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { icon: Users, label: "Name", value: application.name },
                          { icon: Mail, label: "Email", value: application.email },
                          { icon: Phone, label: "Phone", value: application.phone },
                          { icon: FileText, label: "Entity Type", value: application.entityType },
                          { icon: Building2, label: "Portfolio", value: application.portfolioSize },
                          ...(application.website ? [{ icon: Globe, label: "Website", value: application.website }] : []),
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="flex items-start gap-2">
                            <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-slate-500 text-xs font-medium">{label}</p>
                              <p className="text-slate-900 text-sm font-bold truncate max-w-[140px]">{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-slate-400 font-medium text-xs mt-4">Applied on {new Date(application.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
