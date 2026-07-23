"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, ArrowRight, User, Home, FileText, ChevronRight, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function OwnerOnboardingChecklist({ onComplete, properties, leases, isProfileComplete }: { onComplete: () => void, properties: any[], leases: any[], isProfileComplete: boolean }) {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // Calculate completion
  const hasProperty = properties && properties.length > 0;
  const hasLease = leases && leases.length > 0;
  
  const stepsCompleted = [true, isProfileComplete, hasProperty, hasLease].filter(Boolean).length;
  const totalSteps = 4;
  const percentage = Math.round((stepsCompleted / totalSteps) * 100);

  const handleDismiss = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasCompletedOnboarding: true })
      });
      if (res.ok) {
        await update({ hasCompletedOnboarding: true }); // Update next-auth session
        toast.success("Onboarding completed!");
        onComplete();
      }
    } catch (e) {
      toast.error("Failed to dismiss");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 bg-white border border-blue-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4">
         <button onClick={handleDismiss} className="text-[#8E8E93] hover:text-[#6E6E73] transition-colors">
            <X className="h-5 w-5" />
         </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3 flex flex-col justify-center">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome to PropertyPro! 🎉</h2>
            <p className="text-[#6E6E73] text-sm">Let's get your account set up so you can start managing your portfolio.</p>
          </div>
          
          <div className="mb-2 flex justify-between items-center text-sm font-semibold text-blue-700">
            <span>{stepsCompleted} of {totalSteps} completed</span>
            <span>{percentage}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${percentage}%` }}></div>
          </div>
          
          {percentage === 100 && (
             <button onClick={handleDismiss} className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors">
               Go to Dashboard
             </button>
          )}
        </div>

        <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`p-4 rounded-xl border flex gap-3 transition-colors ${true ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
             <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
             <div>
                <p className={`font-bold text-sm ${true ? 'text-emerald-900' : 'text-slate-700'}`}>Account Created</p>
                <p className={`text-xs mt-1 ${true ? 'text-emerald-700' : 'text-[#6E6E73]'}`}>You're in! Access granted.</p>
             </div>
          </div>

          <div className={`p-4 rounded-xl border flex gap-3 transition-colors ${isProfileComplete ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-blue-300 cursor-pointer'}`} onClick={() => !isProfileComplete && router.push('#settings')}>
             {isProfileComplete ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="h-5 w-5 text-slate-300 shrink-0 mt-0.5" />}
             <div>
                <p className={`font-bold text-sm ${isProfileComplete ? 'text-emerald-900' : 'text-slate-700'}`}>Complete Profile</p>
                <p className={`text-xs mt-1 ${isProfileComplete ? 'text-emerald-700' : 'text-[#6E6E73]'}`}>Add contact details.</p>
             </div>
             {!isProfileComplete && <ChevronRight className="h-4 w-4 text-[#8E8E93] ml-auto mt-0.5" />}
          </div>

          <div className={`p-4 rounded-xl border flex gap-3 transition-colors ${hasProperty ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-blue-300 cursor-pointer'}`} onClick={() => !hasProperty && router.push('#properties')}>
             {hasProperty ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="h-5 w-5 text-slate-300 shrink-0 mt-0.5" />}
             <div>
                <p className={`font-bold text-sm ${hasProperty ? 'text-emerald-900' : 'text-slate-700'}`}>Add Property</p>
                <p className={`text-xs mt-1 ${hasProperty ? 'text-emerald-700' : 'text-[#6E6E73]'}`}>Create your first building.</p>
             </div>
             {!hasProperty && <ChevronRight className="h-4 w-4 text-[#8E8E93] ml-auto mt-0.5" />}
          </div>

          <div className={`p-4 rounded-xl border flex gap-3 transition-colors ${hasLease ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-blue-300 cursor-pointer'}`} onClick={() => !hasLease && router.push('#leases')}>
             {hasLease ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="h-5 w-5 text-slate-300 shrink-0 mt-0.5" />}
             <div>
                <p className={`font-bold text-sm ${hasLease ? 'text-emerald-900' : 'text-slate-700'}`}>Invite Tenant</p>
                <p className={`text-xs mt-1 ${hasLease ? 'text-emerald-700' : 'text-[#6E6E73]'}`}>Add leases and start collecting.</p>
             </div>
             {!hasLease && <ChevronRight className="h-4 w-4 text-[#8E8E93] ml-auto mt-0.5" />}
          </div>
        </div>
      </div>
    </div>
  );
}
