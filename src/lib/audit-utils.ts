export type AuditCategory = "ACCESS" | "BILLING" | "SECURITY" | "SYSTEM";

interface AuditMeta {
  label: string;
  category: AuditCategory;
  color: string;
  dot: string;
}

const AUDIT_MAP: Record<string, AuditMeta> = {
  SUBSCRIPTION_OVERRIDE_APPLIED: { label: "Policy Override Applied",  category: "BILLING",   color: "bg-purple-50 text-purple-700", dot: "bg-purple-500" },
  SUBSCRIPTION_OVERRIDE_CLEARED: { label: "Policy Override Removed",  category: "BILLING",   color: "bg-slate-50 text-slate-600",   dot: "bg-slate-400"  },
  MODULE_GRANT_APPLIED:          { label: "Module Access Granted",    category: "ACCESS",    color: "bg-emerald-50 text-emerald-700",dot: "bg-emerald-500"},
  MODULE_BLOCK_APPLIED:          { label: "Module Access Blocked",    category: "SECURITY",  color: "bg-red-50 text-red-700",       dot: "bg-red-500"    },
  MODULE_GRANT_REVOKED:          { label: "Module Grant Revoked",     category: "ACCESS",    color: "bg-amber-50 text-amber-700",   dot: "bg-amber-500"  },
  COMP_ACCESS_GRANTED:           { label: "Complimentary Access Set", category: "BILLING",   color: "bg-blue-50 text-blue-700",     dot: "bg-blue-500"   },
  GRACE_PERIOD_EXTENDED:         { label: "Grace Period Extended",    category: "BILLING",   color: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  MANUAL_SUSPEND:                { label: "Account Suspended",        category: "SECURITY",  color: "bg-red-50 text-red-700",       dot: "bg-red-500"    },
  MANUAL_RESUME:                 { label: "Account Resumed",          category: "ACCESS",    color: "bg-emerald-50 text-emerald-700",dot: "bg-emerald-500"},
  USER_ACCESS_OVERRIDE_SET:      { label: "User Feature Override Set",category: "ACCESS",    color: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  STRIPE_SYNC:                   { label: "Stripe Status Synced",     category: "SYSTEM",    color: "bg-slate-50 text-slate-600",   dot: "bg-slate-400"  },
};

export function getAuditMeta(action: string): AuditMeta {
  return AUDIT_MAP[action] ?? {
    label: action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    category: "SYSTEM",
    color: "bg-slate-50 text-slate-600",
    dot: "bg-slate-400",
  };
}

export function getRelativeTime(dateStr: string | Date): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
