// NOTE: minUnits on PricingTier is a DISPLAY hint only (shown on pricing card as "For X+ unit portfolios").
// It is NOT enforced as a hard gate in code.

export const GATABLE_MODULES = [
  // ── Core Property Management ──────────────────────────────
  { key: "properties",       label: "Properties & Units",          icon: "Building2",     category: "Core",          alwaysIncluded: true,  description: "Manage real estate assets, buildings, and rental units." },
  { key: "leases",           label: "Lease Management",            icon: "FileText",      category: "Core",          alwaysIncluded: true,  description: "Draft, track, and manage active and historical tenant lease contracts." },
  { key: "tenants",          label: "Tenant Portal",               icon: "Users",         category: "Core",          alwaysIncluded: true,  description: "Self-service portal for tenants to pay rent and view lease details." },
  { key: "applications",     label: "Tenant Applications",         icon: "ClipboardList", category: "Core",          alwaysIncluded: true,  description: "Review and process incoming rental applicant forms." },
  // ── Operations ───────────────────────────────────────────
  { key: "maintenance",      label: "Maintenance Tickets",         icon: "Wrench",        category: "Operations",    alwaysIncluded: true,  description: "Receive, track, and assign property repair and maintenance requests." },
  { key: "inspections",      label: "Inspections",                 icon: "ShieldCheck",   category: "Operations",    alwaysIncluded: false, description: "Conduct move-in, move-out, and routine physical property condition checks." },
  { key: "team_management",  label: "Inspector & Team Management", icon: "Briefcase",     category: "Operations",    alwaysIncluded: false, description: "Add inspector accounts and assign them to properties for scheduled inspections." },
  { key: "vendors",          label: "External Vendors",            icon: "Truck",         category: "Operations",    alwaysIncluded: false, description: "Invite third-party contractors and assign them to maintenance jobs." },
  // ── Finance ──────────────────────────────────────────────
  { key: "payments",         label: "Rent Payments",               icon: "CreditCard",    category: "Finance",       alwaysIncluded: true,  description: "Collect online rent payments via Stripe credit card and ACH transfer." },
  { key: "invoices",         label: "Invoice Management",          icon: "Receipt",       category: "Finance",       alwaysIncluded: false, description: "Generate itemized invoices for rent, fees, and maintenance charges." },
  { key: "payouts",          label: "Owner Payouts",               icon: "DollarSign",    category: "Finance",       alwaysIncluded: true,  description: "Transfer collected rental earnings directly into owner bank accounts." },
  { key: "transactions",     label: "Transaction History",         icon: "Receipt",       category: "Finance",       alwaysIncluded: true,  description: "Complete ledger audit trail of all financial inflows and outflows." },
  { key: "wallet",           label: "Wallet & Bank Management",    icon: "Wallet",        category: "Finance",       alwaysIncluded: false, description: "Connect bank accounts and manage wallet balances and payouts." },
  { key: "accounting",       label: "Accounting & Reports",        icon: "BarChart2",     category: "Finance",       alwaysIncluded: false, description: "Comprehensive financial accounting, profit & loss, and tax reporting." },
  // ── Communication & Growth ────────────────────────────────
  { key: "messages",         label: "Chat / Messaging",            icon: "MessageSquare", category: "Communication", alwaysIncluded: false, description: "Real-time direct messaging between landlords, tenants, and staff." },
  { key: "tours",            label: "Property Tours",              icon: "CalendarCheck", category: "Marketing",     alwaysIncluded: true,  description: "Schedule and manage prospective tenant property walkthrough tours." },
  // ── Storage & Scheduling ──────────────────────────────────
  { key: "documents",        label: "Document Storage",            icon: "FolderOpen",    category: "Storage",       alwaysIncluded: true,  description: "Secure cloud repository for leases, IDs, inspection photos, and files." },
  { key: "calendar",         label: "Availability Calendar",       icon: "Calendar",      category: "Scheduling",    alwaysIncluded: false, description: "Global calendar for tour slots, inspection dates, and lease expirations." },
  // ── Analytics & Automation ────────────────────────────────
  { key: "analytics",        label: "Portfolio Analytics",         icon: "BarChart2",     category: "Analytics",     alwaysIncluded: false, description: "Deep visual analytics for occupancy, revenue trends, and ROI metrics." },
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

