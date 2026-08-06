"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Check, CreditCard, Shield, Sparkles, Building2, Layers } from "lucide-react";
import { toast } from "sonner";

function SubscribeContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkout = searchParams?.get("checkout");
  const sessionId = searchParams?.get("session_id");

  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribingTierId, setSubscribingTierId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      const subStatus = (session?.user as any)?.subscriptionStatus;

      // If they are not an OWNER, redirect them
      if (role !== "OWNER") {
        router.push("/dashboard");
        return;
      }

      // Handle successful checkout callback
      if (checkout === "success" && sessionId) {
        const syncSubscription = async () => {
          try {
            setSyncing(true);
            const res = await fetch("/api/stripe/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ checkoutSessionId: sessionId }),
            });
            if (res.ok) {
              await update(); // refresh next-auth session token
              
              // Poll session endpoint to verify NextAuth cookie is updated on client
              let attempts = 0;
              while (attempts < 6) {
                try {
                  const freshRes = await fetch("/api/auth/session");
                  const freshData = await freshRes.json();
                  if (freshData?.user?.subscriptionStatus && freshData.user.subscriptionStatus !== "PendingPlanSelection") {
                    break;
                  }
                } catch (err) {}
                await new Promise((r) => setTimeout(r, 500));
                attempts++;
              }

              toast.success("Subscription activated successfully!");
              // Hard navigation forces full re-render with fresh session cookie
              window.location.href = "/dashboard";
            } else {
              toast.error("Failed to sync your subscription status. Please contact support.");
              setSyncing(false);
            }
          } catch (e) {
            toast.error("An error occurred during synchronization.");
            setSyncing(false);
          }
        };
        syncSubscription();
        return;
      }

      // Handle cancelled checkout
      if (checkout === "cancelled") {
        toast.error("Subscription checkout cancelled. Please select a plan to continue.");
        // Clear search params
        router.replace("/dashboard/subscribe");
        return;
      }

      // If they have already completed plan selection, let them go to the dashboard
      if (subStatus && subStatus !== "PendingPlanSelection") {
        router.push("/dashboard");
        return;
      }

      // Fetch active tiers
      const fetchTiers = async () => {
        try {
          const res = await fetch("/api/pricing-tiers");
          if (res.ok) {
            const data = await res.json();
            // Filter to show only active tiers
            setTiers(data.filter((t: any) => t.isActive));
          } else {
            toast.error("Failed to load subscription plans.");
          }
        } catch (err) {
          toast.error("Error fetching subscription plans.");
        } finally {
          setLoading(false);
        }
      };

      fetchTiers();
    }
  }, [status, session, router, checkout, sessionId]);

  const handleSelectPlan = async (tier: any) => {
    if (tier.isCustom) {
      window.location.href = "mailto:sales@propertypro.com?subject=PropertyPro%20Enterprise%20Plan%20Inquiry";
      return;
    }

    try {
      setSubscribingTierId(tier.id);
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tier.id }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to initiate subscription process.");
      }

      if (result.url) {
        // Redirect to Stripe Checkout Session
        window.location.href = result.url;
      } else {
        // Free / trial tier activated directly — hard navigate so fresh session is picked up.
        await update();
        toast.success(`Welcome to the ${tier.name} plan!`);
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setSubscribingTierId(null);
    }
  };

  if (status === "loading" || loading || syncing) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 font-sans">
        <Loader2 className="animate-spin h-10 w-10 text-slate-700" />
        <p className="text-[#6E6E73] text-xs font-normal">
          {syncing ? "Activating your account..." : "Loading subscription details..."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pt-6 space-y-8 pb-20 px-4 md:px-0 font-sans">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
            <Building2 className="h-4 w-4 text-slate-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">
                Select Your Subscription Plan
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                Owner Portal
              </span>
            </div>
            <p className="text-[#6E6E73] text-xs font-normal mt-0.5">
              Choose the best plan for your properties. A valid card is required to activate trials. No charges made during 14-day free trial.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {tiers.map((tier) => {
          const isEnterprise = tier.isCustom;
          const isPro = tier.name === "Professional";

          return (
            <div
              key={tier.id}
              className={`bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 md:p-8 flex flex-col justify-between font-sans relative ${
                isPro ? "ring-2 ring-slate-900/10 border-slate-400" : ""
              }`}
            >
              {isPro && (
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-900 text-white shadow-2xs">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-[#1D1D1F] tracking-tight">{tier.name}</h2>
                  <p className="text-xs font-normal text-[#6E6E73] mt-1 min-h-[36px]">
                    {tier.description}
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">
                    {isEnterprise ? "Custom" : `$${tier.price}`}
                  </span>
                  {!isEnterprise && (
                    <span className="text-xs font-normal text-[#6E6E73]">/month</span>
                  )}
                </div>

                {tier.trialDays > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <Shield className="h-3 w-3 text-emerald-600" />
                    Includes {tier.trialDays}-Day Free Trial
                  </div>
                )}

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-[#1D1D1F]">What's Included:</p>
                  <ul className="space-y-2.5">
                    {tier.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-xs font-normal text-[#6E6E73]">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6">
                <Button
                  onClick={() => handleSelectPlan(tier)}
                  disabled={subscribingTierId !== null}
                  className={`w-full h-9 rounded-xl font-medium text-xs shadow-xs transition-all border-none cursor-pointer flex items-center justify-center gap-2 ${
                    isPro
                      ? "bg-slate-900 hover:bg-slate-800 text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {subscribingTierId === tier.id ? (
                    <Loader2 className="animate-spin h-4 w-4 text-white" />
                  ) : isEnterprise ? (
                    "Contact Sales"
                  ) : (
                    "Start Free Trial"
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap justify-center items-center gap-6 text-[#6E6E73] text-xs font-normal pt-4">
        <div className="flex items-center gap-1.5">
          <CreditCard className="h-4 w-4 text-slate-500" />
          <span>Secure checkout with Stripe</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-slate-500" />
          <span>Cancel or modify subscription anytime</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-slate-500" />
          <span>Automated limits enforcement</span>
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-indigo-500" />
        <p className="text-slate-400 font-medium tracking-wide">Loading subscription details...</p>
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  );
}
