"use client";

import { useEffect, useState } from "react";
import { 
  CreditCard, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Users, 
  Layers, 
  ArrowUpRight, 
  Loader2,
  ShieldCheck,
  Zap,
  HelpCircle,
  Calendar,
  Download,
  FileText,
  Clock,
  RefreshCw
} from "lucide-react";
import CancellationRetentionModal from "@/components/subscription/CancellationRetentionModal";
import DowngradePlanModal from "@/components/subscription/DowngradePlanModal";

interface InvoiceItem {
  id: string;
  number: string | null;
  amountPaid: number;
  currency: string;
  status: string;
  created: number;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

interface HistoryItem {
  id: string;
  fromTierName: string | null;
  toTierName: string | null;
  event: string;
  amountPaid: number | null;
  createdAt: string;
}

interface UsageData {
  tier: {
    id: string;
    name: string;
    price: number;
    maxUnits: number;
    features: string[];
  };
  subscriptionStatus: string;
  gracePeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  cardLast4?: string | null;
  cardBrand?: string | null;
  invoices: InvoiceItem[];
  subscriptionHistory: HistoryItem[];
  usage: {
    units: {
      current: number;
      max: number;
      percent: number;
    };
    inspectors: {
      current: number;
      max: number;
      percent: number;
    };
    properties: number;
    activeLeases: number;
  };
}

interface Tier {
  id: string;
  name: string;
  description: string;
  price: number;
  minUnits: number;
  maxUnits: number;
  isCustom?: boolean;
  features: string[];
}

export default function BillingPage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [targetDowngradeTier, setTargetDowngradeTier] = useState<Tier | null>(null);
  const [subscribingTierId, setSubscribingTierId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);

  const fetchUsageAndTiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usageRes, tiersRes] = await Promise.all([
        fetch("/api/billing/usage"),
        fetch("/api/pricing-tiers")
      ]);

      if (usageRes.ok) {
        const usageJson = await usageRes.json();
        setData(usageJson);
      }
      if (tiersRes.ok) {
        const tiersJson = await tiersRes.json();
        setTiers(tiersJson);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load billing information.");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncStatus = async (demoBypass = false, checkoutSessionId?: string) => {
    setSyncing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/stripe/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoBypass, checkoutSessionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to sync status.");
      
      setSuccessMsg(json.message || "Status synced successfully!");
      fetchUsageAndTiers();
    } catch (err: any) {
      setError(err.message || "Failed to sync subscription status.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchUsageAndTiers();
    if (typeof window !== "undefined") {
      setIsLocalhost(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get("session_id") || undefined;
      if (params.get("checkout") === "success") {
        setSuccessMsg("🎉 Checkout completed! Syncing status with Stripe...");
        handleSyncStatus(false, sessionId);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get("checkout") === "cancelled") {
        setError("Checkout was cancelled. You can try again when you're ready.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not open billing portal.");
      if (json.url) {
        window.location.href = json.url;
      }
    } catch (err: any) {
      setError(err.message || "Failed to launch billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSubscribe = async (tierId: string) => {
    setSubscribingTierId(tierId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || json.message || "Failed to initiate subscription change.");
      }

      if (json.requiresConfirmation) {
        const target = tiers.find((t) => t.id === tierId) || null;
        setTargetDowngradeTier(target);
        setShowDowngradeModal(true);
        return;
      }

      if (json.upgraded) {
        setSuccessMsg("Subscription updated successfully!");
        fetchUsageAndTiers();
      } else if (json.url) {
        window.location.href = json.url;
      } else {
        fetchUsageAndTiers();
      }
    } catch (err: any) {
      setError(err.message || "Subscription update failed.");
    } finally {
      setSubscribingTierId(null);
    }
  };

  const handleConfirmDowngrade = async (tierId: string) => {
    setSubscribingTierId(tierId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId, confirm: true }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || json.message || "Failed to downgrade plan.");
      }

      if (json.scheduledCancel) {
        setSuccessMsg("🎉 Paid subscription will cancel at period end. Access remains until renewal.");
      } else {
        setSuccessMsg("Plan changed successfully!");
      }
      fetchUsageAndTiers();
    } catch (err: any) {
      setError(err.message || "Plan change failed.");
    } finally {
      setSubscribingTierId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 font-sans">
        <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
        <p className="text-slate-500 font-extrabold text-xs">Loading subscription details...</p>
      </div>
    );
  }

  const subStatus = data?.subscriptionStatus || "Active";
  const isPastDue = subStatus === "Past_Due";
  const isPaused = subStatus === "Paused";
  const isInactive = subStatus === "Inactive";
  const unitPercent = data?.usage.units.percent || 0;

  const renewalDate = data?.currentPeriodEnd 
    ? new Date(data.currentPeriodEnd * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    : null;

  return (
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-20 px-2 sm:px-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-slate-900" />
            Billing &amp; Subscription Portal
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Manage your subscription plan, view auto-renewal dates, resource quotas, and access payment receipts.
          </p>
        </div>

        <button
          onClick={handleOpenPortal}
          disabled={portalLoading}
          className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs shadow-xs transition-all disabled:opacity-50 gap-2 shrink-0 cursor-pointer"
        >
          {portalLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-3.5 h-3.5" />
          )}
          Manage Billing on Stripe
        </button>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3 text-xs font-semibold shadow-2xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div>{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start gap-3 text-xs font-semibold shadow-2xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <div>{successMsg}</div>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Current Subscription
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                {subStatus}
              </span>
            </div>

            <h3 className="text-3xl font-black text-slate-900 tracking-tight">
              {data?.tier.name || "Starter Plan"}
            </h3>
            <p className="text-2xl font-black text-slate-900 mt-1">
              ${data?.tier.price || 0}
              <span className="text-xs font-semibold text-slate-500"> / month</span>
            </p>

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5 text-slate-500 font-extrabold">
                    <Calendar className="w-3.5 h-3.5 text-slate-700" />
                    Auto-Renewal Date
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                    {data?.cancelAtPeriodEnd ? "Cancels on End Date" : "Auto-Renew Enabled"}
                  </span>
                </div>
                <p className="text-xs font-black text-slate-900 pt-0.5">
                  {renewalDate ? renewalDate : "Next Billing Cycle (Active)"}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-1">
                <span>Stripe Customer ID</span>
                <span className="font-mono text-slate-900 font-black">
                  {data?.stripeCustomerId ? `${data.stripeCustomerId.slice(0, 10)}...` : "Not Linked"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Active Properties</span>
                <span className="font-black text-slate-900">{data?.usage.properties}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Active Leases</span>
                <span className="font-black text-slate-900">{data?.usage.activeLeases}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={handleOpenPortal}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Manage Subscription &amp; Billing
            </button>
            {subStatus.toLowerCase() !== "inactive" && subStatus.toLowerCase() !== "canceled" && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-extrabold transition-all border border-rose-200/80 cursor-pointer"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Usage Gauges */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-900" />
            Plan Usage &amp; Limits
          </h3>

          {/* Unit Quota Meter */}
          <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-700" />
                Unit Quota
              </span>
              <span className="font-black text-slate-900">
                {data?.usage.units.current} / {data?.usage.units.max} Units
              </span>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-slate-900 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${unitPercent}%` }}
              />
            </div>
            
            <div className="flex justify-between text-[11px] text-slate-500 font-semibold pt-0.5">
              <span>{unitPercent}% utilized</span>
            </div>
          </div>

          {/* Inspector Quota Meter */}
          <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-700" />
                Inspector Accounts
              </span>
              <span className="font-black text-slate-900">
                {data?.usage.inspectors.current} / {data?.usage.inspectors.max} Hired
              </span>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${data?.usage.inspectors.percent || 0}%` }}
              />
            </div>
          </div>

          {/* Features Granted */}
          <div className="pt-2">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
              Included Tier Features
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
              {(data?.tier.features || ["Property Management", "Lease Management", "Financial Reports"]).map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Tiers / Upgrade Grid */}
      <div id="available-plans" className="space-y-6 pt-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Available Plans &amp; Upgrades
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Choose a subscription plan that scales with your portfolio. Upgrades take effect immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t) => {
            const isCurrent = data?.tier.id === t.id;
            const isSubscribing = subscribingTierId === t.id;
            const currentPrice = data?.tier.price || 0;

            const isCustomTier = t.isCustom || (t.price === 0 && t.maxUnits > 9000);
            const isUpgrade = isCustomTier ? !isCurrent : t.price > currentPrice;
            const isDowngrade = !isCustomTier && t.price < currentPrice;
            const hasActiveSubscription = subStatus === "Active" || subStatus === "Active (Canceling)" || subStatus === "Trialing";

            return (
              <div
                key={t.id}
                className={`bg-white p-6 rounded-3xl transition-all flex flex-col justify-between ${
                  isCurrent 
                    ? "border border-slate-200 shadow-[0_12px_30px_-5px_rgba(52,211,153,0.45)] bg-white" 
                    : "border border-slate-200 shadow-xs hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        {t.name}
                      </h3>
                    </div>
                    {isCurrent && (
                      <span className="px-2.5 py-0.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-md shadow-[0_0_12px_rgba(52,211,153,0.6)]">
                        Current Plan
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-semibold min-h-[32px] mb-4">
                    {t.description || `Includes up to ${t.maxUnits} units.`}
                  </p>

                  <div className="text-3xl font-black text-slate-900 mb-6 tracking-tight">
                    {isCustomTier ? (
                      <div>
                        Custom Quote
                        <span className="text-xs font-semibold text-slate-500 block mt-0.5">Tailored enterprise rate</span>
                      </div>
                    ) : (
                      <>
                        ${t.price}
                        <span className="text-xs font-semibold text-slate-500"> / mo</span>
                      </>
                    )}
                  </div>

                  <div className="space-y-2.5 mb-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-2 font-extrabold text-slate-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Up to {t.maxUnits > 9000 ? "Unlimited" : t.maxUnits} Total Units
                    </div>
                    {t.features.map((feat: string, fIdx: number) => (
                      <div key={fIdx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (isCustomTier) {
                      window.open("mailto:sales@propertypro.com?subject=Enterprise%20Plan%20Inquiry", "_blank");
                    } else {
                      handleSubscribe(t.id);
                    }
                  }}
                  disabled={(isCurrent && hasActiveSubscription) || isSubscribing}
                  className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 transition-all ${
                    isCurrent
                      ? hasActiveSubscription
                        ? "bg-slate-900 text-white shadow-xs cursor-default"
                        : "bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-800 border border-emerald-300/80 shadow-[0_4px_20px_rgba(52,211,153,0.35)] backdrop-blur-sm cursor-pointer"
                      : "bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer"
                  }`}
                >
                  {isSubscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    hasActiveSubscription
                      ? "Active Plan"
                      : "Reactivate Plan"
                  ) : isCustomTier ? (
                    <>
                      Contact Sales
                      <ArrowUpRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      {isUpgrade ? `Upgrade to ${t.name}` : `Switch to ${t.name}`}
                      <ArrowUpRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <CancellationRetentionModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        onConfirmCancel={handleOpenPortal}
        activePropertyCount={data?.usage.properties || 0}
        activeLeaseCount={data?.usage.activeLeases || 0}
      />

      <DowngradePlanModal
        open={showDowngradeModal}
        onOpenChange={setShowDowngradeModal}
        currentTier={data ? { id: data.tier.id, name: data.tier.name, price: data.tier.price, maxUnits: data.tier.maxUnits, features: data.tier.features } : null}
        targetTier={targetDowngradeTier}
        currentUnits={data?.usage.units.current || 0}
        onConfirm={handleConfirmDowngrade}
      />
    </div>
  );
}
