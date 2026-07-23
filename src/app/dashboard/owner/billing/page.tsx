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
        // Clear query parameters
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-gray-500 text-sm font-medium">Loading subscription details...</p>
      </div>
    );
  }

  const subStatus = data?.subscriptionStatus || "Active";
  const isPastDue = subStatus === "Past_Due";
  const isPaused = subStatus === "Paused";
  const isInactive = subStatus === "Inactive";
  const unitPercent = data?.usage.units.percent || 0;

  // Format Auto-Renewal Date
  const renewalDate = data?.currentPeriodEnd 
    ? new Date(data.currentPeriodEnd * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-blue-600" />
            Billing & Subscription Portal
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your subscription plan, view auto-renewal dates, resource quotas, and access payment receipts.
          </p>
        </div>

        <button
          onClick={handleOpenPortal}
          disabled={portalLoading}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition shadow-sm disabled:opacity-50 gap-2"
        >
          {portalLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          Manage Billing on Stripe
        </button>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-start gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg flex items-start gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{successMsg}</div>
        </div>
      )}

      {isPastDue && (
        <div className="p-5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 text-sm shadow-xs">
          <div className="flex items-start gap-3.5">
            <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-base">Subscription Payment Failed (Past Due)</p>
              <p className="text-orange-850 dark:text-orange-350 text-xs">
                Your last payment failed. Your access continues until{" "}
                <strong>{data?.gracePeriodEnd ? new Date(data.gracePeriodEnd).toLocaleDateString() : "soon"}</strong>. Update your billing card to keep access active.
              </p>
              <div className="mt-3 pt-3 border-t border-orange-200/50 space-y-1.5 text-xs text-orange-800 dark:text-orange-300">
                <p className="font-bold">How to keep your account active:</p>
                <p>1. Click <strong className="text-orange-900">Update Payment Method</strong> to manage your subscription card on Stripe.</p>
                <p>2. Once card is added, Stripe will automatically retry the pending invoice charge.</p>
                <p>3. After payment clears, click <strong className="text-orange-900">Verify & Sync Status</strong> to restore full access instantly.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-row md:flex-col gap-2.5 shrink-0 self-start md:self-center w-full md:w-auto">
            <button
              onClick={handleOpenPortal}
              className="flex-1 md:flex-initial px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Update Payment Method
            </button>
            <button
              onClick={() => handleSyncStatus(false)}
              disabled={syncing}
              className="flex-1 md:flex-initial px-4 py-2.5 bg-white hover:bg-orange-100 text-orange-900 border border-orange-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-55"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              Verify & Sync Status
            </button>
            {isLocalhost && (
              <button
                onClick={() => handleSyncStatus(true)}
                disabled={syncing}
                className="flex-1 md:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-55"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Simulate Payment (Demo Bypass)
              </button>
            )}
          </div>
        </div>
      )}

      {isPaused && (
        <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 text-sm shadow-xs">
          <div className="flex items-start gap-3.5">
            <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-base">Subscription Paused (Soft-Lock)</p>
              <p className="text-amber-850 dark:text-amber-300 text-xs">
                Your subscription has lapsed. All of your properties and tenant data are completely preserved, but unit creation and payout requests are restricted. Resubscribe to restore access.
              </p>
              <div className="mt-3 pt-3 border-t border-amber-200/50 space-y-1.5 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-bold">How to restore full access:</p>
                <p>1. Click <strong className="text-amber-900">Reactivate Plan via Stripe Checkout</strong> to securely subscribe and add your billing credentials on Stripe.</p>
                <p>2. Stripe will process your payment and redirect you back to PropertyPro.</p>
                <p>3. If your account does not restore immediately, click <strong className="text-amber-900">Verify & Sync Status</strong> below.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-row md:flex-col gap-2.5 shrink-0 self-start md:self-center w-full md:w-auto">
            <button
              onClick={() => handleSubscribe(data?.tier.id || "")}
              disabled={subscribingTierId === data?.tier.id}
              className="flex-1 md:flex-initial px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-55"
            >
              {subscribingTierId === data?.tier.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowUpRight className="w-3.5 h-3.5" />
              )}
              Reactivate via Secure Checkout →
            </button>
            <button
              onClick={() => handleSyncStatus(false)}
              disabled={syncing}
              className="flex-1 md:flex-initial px-4 py-2.5 bg-white hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-55"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              Verify & Sync Status
            </button>
            {isLocalhost && (
              <button
                onClick={() => handleSyncStatus(true)}
                disabled={syncing}
                className="flex-1 md:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-55"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Simulate Payment (Demo Bypass)
              </button>
            )}
          </div>
        </div>
      )}

      {isInactive && (
        <div className="p-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-base">No Active Subscription Plan</p>
              <p className="text-red-805 dark:text-red-305 text-xs mt-0.5">
                You do not have an active subscription. Choose one of the available plans below to get started and unlock property management.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById("available-plans");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shrink-0"
          >
            Choose a Plan Below ↓
          </button>
        </div>
      )}

      {subStatus.toLowerCase() === "trialing" && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 rounded-lg flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-blue-600 shrink-0" />
            <div>
              <p className="font-semibold">Free Trial Active 🎁</p>
              <p className="text-blue-800 dark:text-blue-300 text-xs mt-0.5">
                {renewalDate ? `Your trial period ends on ${renewalDate}. Add a payment method to continue after your trial.` : "Add a payment method to ensure uninterrupted service when your trial ends."}
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenPortal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shrink-0 animate-pulse"
          >
            Add Payment Method
          </button>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Current Subscription
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                subStatus === "Active" || subStatus.includes("Canceling")
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : subStatus === "Trialing"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  : subStatus === "Past_Due"
                  ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                  : subStatus === "Paused"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
              }`}>
                {subStatus}
              </span>
            </div>

            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {data?.tier.name || "Starter Plan"}
            </h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              ${data?.tier.price || 0}
              <span className="text-sm font-normal text-gray-500"> / month</span>
            </p>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-3">
              {/* Next Auto-Renewal Date Box */}
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-200">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Auto-Renewal Date
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    data?.cancelAtPeriodEnd 
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" 
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  }`}>
                    {data?.cancelAtPeriodEnd ? "Cancels on End Date" : "Auto-Renew Enabled"}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white pt-0.5">
                  {renewalDate ? renewalDate : "Next Billing Cycle (Active)"}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pt-1">
                <span>Stripe Customer ID</span>
                <span className="font-mono text-gray-900 dark:text-white font-medium">
                  {data?.stripeCustomerId ? `${data.stripeCustomerId.slice(0, 10)}...` : "Not Linked"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Active Properties</span>
                <span className="font-semibold text-gray-900 dark:text-white">{data?.usage.properties}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Active Leases</span>
                <span className="font-semibold text-gray-900 dark:text-white">{data?.usage.activeLeases}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button
              onClick={handleOpenPortal}
              className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Manage Subscription & Billing
            </button>
            {subStatus.toLowerCase() !== "inactive" && subStatus.toLowerCase() !== "canceled" && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full py-2 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/10 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 rounded-lg text-xs font-semibold transition"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Usage Gauges */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Plan Usage & Limits
          </h3>

          {/* Unit Quota Meter */}
          <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-850/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Unit Quota
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {data?.usage.units.current} / {data?.usage.units.max} Units
              </span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  unitPercent > 90 
                    ? "bg-red-500" 
                    : unitPercent > 75 
                    ? "bg-amber-500" 
                    : "bg-blue-600"
                }`}
                style={{ width: `${unitPercent}%` }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 pt-1">
              <span>{unitPercent}% utilized</span>
              {unitPercent >= 80 && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Approaching plan capacity
                </span>
              )}
            </div>
          </div>

          {/* Inspector Quota Meter */}
          <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-850/50 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Inspector Accounts
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {data?.usage.inspectors.current} / {data?.usage.inspectors.max} Hired
              </span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${data?.usage.inspectors.percent || 0}%` }}
              />
            </div>
          </div>

          {/* Features Granted */}
          <div className="pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Included Tier Features
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(data?.tier.features || ["Property Management", "Lease Management", "Financial Reports"]).map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Billing Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Invoice History Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col justify-between h-[360px]">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-4 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Subscription Payment History
                </h3>
                <p className="text-xs text-gray-500">
                  Previous subscription payments, invoices, and PDF receipts.
                </p>
              </div>

              <button
                onClick={handleOpenPortal}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 self-start sm:self-auto"
              >
                Full History
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {data?.invoices && data.invoices.length > 0 ? (
              <div className="overflow-y-auto max-h-[220px] pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300 relative">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase text-[10px] tracking-wider font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-md">Date</th>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right rounded-r-md">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                    {data.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition">
                        <td className="py-3 px-3 font-semibold text-gray-900 dark:text-white">
                          {new Date(inv.created * 1000).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-400">
                          {inv.number ? inv.number.split("-").pop() : inv.id.slice(0, 8)}
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">
                          ${inv.amountPaid.toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize ${
                            inv.status === "paid"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {inv.pdfUrl ? (
                            <a
                              href={inv.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 hover:bg-gray-150 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-250/20 rounded-md font-semibold text-[10px] transition"
                            >
                              <Download className="w-3 h-3 text-blue-600" />
                              PDF
                            </a>
                          ) : inv.hostedUrl ? (
                            <a
                              href={inv.hostedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 hover:bg-gray-150 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-250/20 rounded-md font-semibold text-[10px] transition"
                            >
                              <ExternalLink className="w-3 h-3 text-blue-600" />
                              Link
                            </a>
                          ) : (
                            <span className="text-gray-400 text-[10px]">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center bg-gray-50/50 dark:bg-gray-850/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 space-y-2">
                <Clock className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Payment History Yet</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Your billing invoice history will automatically appear here once payments are processed.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Plan History Timeline Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col justify-between h-[360px]">
          <div className="space-y-4">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-4 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Plan Lifecycle History
              </h3>
              <p className="text-xs text-gray-500">
                Audit trail of subscription status changes and upgrades.
              </p>
            </div>

            {data?.subscriptionHistory && data.subscriptionHistory.length > 0 ? (
              <div className="overflow-y-auto max-h-[220px] pr-2 ml-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                <div className="relative border-l border-gray-200 dark:border-gray-800 ml-3 pl-6 space-y-4 py-2">
                  {data.subscriptionHistory.map((item) => {
                    const eventColors: Record<string, string> = {
                      SUBSCRIBED: "bg-emerald-100 text-emerald-800 border-emerald-200",
                      UPGRADED: "bg-blue-100 text-blue-800 border-blue-200",
                      DOWNGRADED: "bg-amber-100 text-amber-800 border-amber-200",
                      REACTIVATED: "bg-teal-100 text-teal-800 border-teal-200",
                      CANCELED: "bg-red-100 text-red-800 border-red-200",
                      PAST_DUE: "bg-rose-100 text-rose-800 border-rose-200",
                    };
                    const colorClass = eventColors[item.event] || "bg-gray-100 text-gray-800 border-gray-200";

                    return (
                      <div key={item.id} className="relative">
                        {/* Timeline Node Dot */}
                        <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-gray-900 ring-2 ring-blue-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        </span>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>
                                {item.event}
                              </span>
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                                {item.fromTierName ? `${item.fromTierName} Plan` : ""} 
                                {item.fromTierName && item.toTierName ? " → " : ""}
                                {item.toTierName ? `${item.toTierName} Plan` : ""}
                              </h4>
                            </div>
                            {item.amountPaid !== null && (
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                Amount Paid: <span className="font-semibold text-gray-900 dark:text-white">${item.amountPaid.toFixed(2)}</span>
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0 sm:text-right font-medium">
                            {new Date(item.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center bg-gray-50/50 dark:bg-gray-850/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 space-y-2">
                <Clock className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Plan Changes Recorded</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Your plan lifecycle history (upgrades, status updates) will be automatically tracked here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Tiers / Upgrade Grid */}
      <div id="available-plans" className="space-y-6 pt-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Available Plans & Upgrades
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Choose a subscription plan that scales with your portfolio. Upgrades take effect immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t) => {
            const isCurrent = data?.tier.id === t.id;
            const isSubscribing = subscribingTierId === t.id;
            const currentPrice = data?.tier.price || 0;
            const isUpgrade = t.price > currentPrice;
            const isDowngrade = t.price < currentPrice;
            const isFreeSwitch = t.price === 0 && isDowngrade;
            const hasActiveSubscription = subStatus === "Active" || subStatus === "Active (Canceling)" || subStatus === "Trialing";

            return (
              <div
                key={t.id}
                className={`bg-white dark:bg-gray-900 p-6 rounded-xl border transition-all flex flex-col justify-between ${
                  isCurrent 
                    ? "border-blue-600 ring-2 ring-blue-600/20 shadow-md" 
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {t.name}
                      </h3>
                      {hasActiveSubscription && !isCurrent && isUpgrade && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                          ▲ Higher Tier
                        </span>
                      )}
                      {hasActiveSubscription && !isCurrent && isDowngrade && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                          ▼ Lower Tier
                        </span>
                      )}
                    </div>
                    {isCurrent && (
                      <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold rounded-full">
                        Current Plan
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 min-h-[32px] mb-4">
                    {t.description || `Includes up to ${t.maxUnits} units.`}
                  </p>

                  <div className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6">
                    ${t.price}
                    <span className="text-sm font-normal text-gray-500"> / mo</span>
                  </div>

                  <div className="space-y-3 mb-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
                    <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      Up to {t.maxUnits} Total Units
                    </div>
                    {t.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleSubscribe(t.id)}
                  disabled={(isCurrent && hasActiveSubscription) || isSubscribing}
                  className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 ${
                    isCurrent && hasActiveSubscription
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-default"
                      : isCurrent && !hasActiveSubscription
                      ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                      : hasActiveSubscription && isUpgrade
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      : hasActiveSubscription && isFreeSwitch
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 shadow-sm"
                      : hasActiveSubscription && isDowngrade
                      ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-sm"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  }`}
                >
                  {isSubscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    hasActiveSubscription
                      ? "Active Plan"
                      : "Reactivate This Plan"
                  ) : (
                    hasActiveSubscription ? (
                      isFreeSwitch ? (
                        <>
                          Switch to Free
                          <ArrowUpRight className="w-4 h-4" />
                        </>
                      ) : isDowngrade ? (
                        <>
                          Downgrade to {t.name}
                          <ArrowUpRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Upgrade to {t.name}
                          <ArrowUpRight className="w-4 h-4" />
                        </>
                      )
                    ) : (
                      <>
                        Subscribe to {t.name}
                        <ArrowUpRight className="w-4 h-4" />
                      </>
                    )
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
