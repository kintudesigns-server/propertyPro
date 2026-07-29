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
              await update(); // force next-auth session cookie refresh
              toast.success("Subscription activated successfully!");
              router.push("/dashboard");
            } else {
              toast.error("Failed to sync your subscription status. Please contact support.");
            }
          } catch (e) {
            toast.error("An error occurred during synchronization.");
          } finally {
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
        // If it succeeded directly (e.g. free tier or trialed), reload session and redirect
        await update();
        toast.success(`Welcome to the ${tier.name} plan!`);
        router.push("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setSubscribingTierId(null);
    }
  };

  if (status === "loading" || loading || syncing) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-indigo-500" />
        <p className="text-slate-400 font-medium tracking-wide">
          {syncing ? "Activating your account..." : "Loading subscription details..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D1A] text-white flex flex-col relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[150px] rounded-full" />

      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            PropertyPro
          </span>
          <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 font-bold px-2.5 py-0.5">
            Owner Portal
          </Badge>
        </div>
        <Button
          variant="ghost"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="text-slate-400 hover:text-white hover:bg-white/5 gap-2 font-semibold"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-16 z-10 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-indigo-300 text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" /> Set Up Your PropertyPro Account
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
            Select Your Subscription Plan
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto">
            Choose the best plan for your properties. To prevent spam and secure your database limits, a valid card is required to activate trials. 
            <span className="text-indigo-400 font-semibold block mt-2">No charges will be made during your 14-day free trial.</span>
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          {tiers.map((tier) => {
            const isEnterprise = tier.isCustom;
            const isPro = tier.name === "Professional";

            return (
              <Card
                key={tier.id}
                className={`relative flex flex-col justify-between overflow-hidden bg-slate-900/40 backdrop-blur-xl border-white/10 text-white transition-all duration-300 hover:translate-y-[-4px] hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/5 ${
                  isPro ? "ring-2 ring-indigo-500/50 bg-slate-900/60" : ""
                }`}
              >
                {isPro && (
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-extrabold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <CardHeader className="p-8">
                  <div className="text-xs text-indigo-400 font-extrabold tracking-widest uppercase mb-2">
                    {tier.name}
                  </div>
                  <CardTitle className="text-2xl font-bold mb-4">{tier.name}</CardTitle>
                  <CardDescription className="text-slate-400 text-sm leading-relaxed min-h-[48px]">
                    {tier.description}
                  </CardDescription>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-black tracking-tight">
                      {isEnterprise ? "Custom" : `$${tier.price}`}
                    </span>
                    {!isEnterprise && (
                      <span className="text-slate-400 text-sm font-semibold">/month</span>
                    )}
                  </div>
                  {tier.trialDays > 0 && (
                    <div className="mt-2 text-indigo-300 text-xs font-semibold flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-indigo-400" />
                      Includes {tier.trialDays}-Day Free Trial
                    </div>
                  )}
                </CardHeader>

                <CardContent className="px-8 pb-8 pt-0 flex-1">
                  <div className="border-t border-white/5 my-6" />
                  <div className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-4">
                    What's Included:
                  </div>
                  <ul className="space-y-3.5">
                    {tier.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                        <Check className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="p-8 bg-white/[0.02] border-t border-white/5">
                  <Button
                    onClick={() => handleSelectPlan(tier)}
                    disabled={subscribingTierId !== null}
                    className={`w-full py-6 rounded-xl font-bold tracking-wide transition-all ${
                      isPro
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    {subscribingTierId === tier.id ? (
                      <Loader2 className="animate-spin h-5 w-5" />
                    ) : isEnterprise ? (
                      "Contact Sales"
                    ) : (
                      `Start Free Trial`
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-slate-500 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Secure checkout with Stripe
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Cancel or modify subscription anytime
          </div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Automated limits enforcement
          </div>
        </div>
      </main>
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
