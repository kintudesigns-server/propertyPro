// NOTE: minUnits on PricingTier is a DISPLAY hint only (shown on pricing card as "For X+ unit portfolios").
// It is NOT enforced as a hard gate in code.

export const GATABLE_MODULES = [
  // ── Core Property Management ──────────────────────────────
  { key: "properties",   label: "Properties & Units",    icon: "Building2",     category: "Core",          alwaysIncluded: true  },
  { key: "leases",       label: "Lease Management",      icon: "FileText",      category: "Core",          alwaysIncluded: true  },
  { key: "tenants",      label: "Tenant Portal",         icon: "Users",         category: "Core",          alwaysIncluded: true  },
  { key: "applications", label: "Tenant Applications",   icon: "ClipboardList", category: "Core",          alwaysIncluded: true  },
  // ── Operations ───────────────────────────────────────────
  { key: "maintenance",  label: "Maintenance Tickets",   icon: "Wrench",        category: "Operations",    alwaysIncluded: true  },
  { key: "inspections",  label: "Inspections",           icon: "ShieldCheck",   category: "Operations",    alwaysIncluded: false },
  { key: "vendors",      label: "External Vendors",      icon: "Truck",         category: "Operations",    alwaysIncluded: false },
  // ── Finance ──────────────────────────────────────────────
  { key: "payments",     label: "Rent Payments",         icon: "CreditCard",    category: "Finance",       alwaysIncluded: true  },
  { key: "invoices",     label: "Invoice Management",    icon: "Receipt",       category: "Finance",       alwaysIncluded: false },
  { key: "payouts",      label: "Owner Payouts",         icon: "DollarSign",    category: "Finance",       alwaysIncluded: true  },
  { key: "accounting",   label: "Accounting & Reports",  icon: "BarChart2",     category: "Finance",       alwaysIncluded: false },
  // ── Communication & Growth ────────────────────────────────
  { key: "messages",     label: "Chat / Messaging",      icon: "MessageSquare", category: "Communication", alwaysIncluded: false },
  { key: "tours",        label: "Property Tours",        icon: "CalendarCheck", category: "Marketing",     alwaysIncluded: true  },
  // ── Storage & Scheduling ──────────────────────────────────
  { key: "documents",    label: "Document Storage",      icon: "FolderOpen",    category: "Storage",       alwaysIncluded: true  },
  { key: "calendar",     label: "Availability Calendar", icon: "Calendar",      category: "Scheduling",    alwaysIncluded: false },
  // ── Analytics & Automation ────────────────────────────────
  { key: "analytics",    label: "Portfolio Analytics",  icon: "BarChart2",    category: "Analytics",     alwaysIncluded: false },
] as const;

export type ModuleKey = typeof GATABLE_MODULES[number]["key"];

// Modules that are ALWAYS available regardless of tier (never blocked)
export const ALWAYS_AVAILABLE: ModuleKey[] = 
  GATABLE_MODULES.filter(m => m.alwaysIncluded).map(m => m.key);

// Grouped by category — used by both pricing UI and admin grant panel
export const MODULES_BY_CATEGORY = GATABLE_MODULES.reduce(
  (acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  },
  {} as Record<string, typeof GATABLE_MODULES[number][]>
);

// All modules can be blocked by admin, even core ones
export const BLOCKABLE_MODULES = GATABLE_MODULES.map(m => m.key);

