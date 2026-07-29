export interface UserFeatureDefinition {
  key: string;
  label: string;
  module: string;
  description: string;
  route: string;
  welfareExempt: boolean;
  iconName?: string;
}

export const TENANT_FEATURES: UserFeatureDefinition[] = [
  // 📄 Lease & Tenancy Module
  {
    key: "view_lease",
    label: "View Active Lease Terms",
    module: "Lease Details",
    description: "Access active lease contracts, monthly terms, and tenancy agreements.",
    route: "/dashboard/leases/my-leases",
    welfareExempt: true,
    iconName: "ShieldCheck",
  },
  {
    key: "request_move_out",
    label: "Request Move-Out / Departure",
    module: "Lease Details",
    description: "Submit formal notice of departure, move-out date, or lease non-renewal.",
    route: "/dashboard/leases/[id]/move-out",
    welfareExempt: true,
    iconName: "LogOut",
  },
  {
    key: "view_documents",
    label: "Document Vault & Disclosures",
    module: "Lease Details",
    description: "Store and view property disclosures, legal addendums, and tenancy files.",
    route: "/dashboard/leases/documents",
    welfareExempt: false,
    iconName: "FolderOpen",
  },

  // 🔧 Maintenance & Repairs Module
  {
    key: "submit_maintenance",
    label: "Submit New Maintenance Ticket",
    module: "Maintenance",
    description: "Log emergency or routine repair requests with photos and unit access notes.",
    route: "/dashboard/maintenance/new",
    welfareExempt: false,
    iconName: "Wrench",
  },
  {
    key: "view_maintenance",
    label: "My Maintenance Requests",
    module: "Maintenance",
    description: "Track active repair progress, scheduled vendor appointments, and updates.",
    route: "/dashboard/maintenance/my-requests",
    welfareExempt: false,
    iconName: "ClipboardList",
  },
  {
    key: "maintenance_detail",
    label: "Maintenance Ticket Details",
    module: "Maintenance",
    description: "View technician diagnostic notes and confirm tenant repair completion.",
    route: "/dashboard/maintenance/[id]",
    welfareExempt: false,
    iconName: "FileText",
  },

  // 💳 Financials & Payments Module
  {
    key: "make_payments",
    label: "Pay Rent & Instant ACH/Card",
    module: "Financials & Payments",
    description: "Submit monthly rent payments, security deposit balances, and utilities.",
    route: "/dashboard/payments/pay-rent",
    welfareExempt: true,
    iconName: "Wallet",
  },
  {
    key: "add_card",
    label: "Payment Method Storage & Cards",
    module: "Financials & Payments",
    description: "Manage saved credit cards, debit cards, and bank ACH payment accounts.",
    route: "/dashboard/payments/add-card",
    welfareExempt: false,
    iconName: "CreditCard",
  },
  {
    key: "view_invoices",
    label: "Rent Invoices & Receipts",
    module: "Financials & Payments",
    description: "View and download monthly rental billing statements and PDF payment receipts.",
    route: "/dashboard/accounting/invoices",
    welfareExempt: false,
    iconName: "FileCheck",
  },
  {
    key: "view_transactions",
    label: "Payment Transactions & Ledger",
    module: "Financials & Payments",
    description: "Inspect historical payment ledger receipts and cleared transaction logs.",
    route: "/dashboard/accounting/transactions",
    welfareExempt: false,
    iconName: "Receipt",
  },

  // 📝 Applications & Tours Module
  {
    key: "tenant_applications",
    label: "My Rental Applications",
    module: "Applications & Tours",
    description: "Track submitted rental applications, screening reports, and approval status.",
    route: "/dashboard/tenant/applications",
    welfareExempt: false,
    iconName: "FilePlus",
  },
  {
    key: "tenant_tours",
    label: "Showing Tours & Visits Schedule",
    module: "Applications & Tours",
    description: "Book and view scheduled property walkthrough tours and unit open houses.",
    route: "/dashboard/tenant/tours",
    welfareExempt: false,
    iconName: "Calendar",
  },

  // 💬 Communication & Messaging Module
  {
    key: "message_owner",
    label: "Direct Owner & Manager Messaging",
    module: "Communication & Messages",
    description: "Real-time direct chat and messaging channel with property owners and managers.",
    route: "/dashboard/messages",
    welfareExempt: false,
    iconName: "MessageSquare",
  },
];

export const INSPECTOR_FEATURES: UserFeatureDefinition[] = [
  {
    key: "view_assignments",
    label: "View Assigned Jobs",
    module: "Diagnostics & Repairs",
    description: "Access assigned inspection tickets and repair work orders.",
    route: "/dashboard/inspector/active",
    welfareExempt: true,
    iconName: "ClipboardList",
  },
  {
    key: "view_property_details",
    label: "View Property Details",
    module: "Diagnostics & Repairs",
    description: "Inspect unit specs, utility locations, and layout details.",
    route: "/dashboard/inspector/active",
    welfareExempt: true,
    iconName: "Building2",
  },
  {
    key: "submit_reports",
    label: "Submit Inspection Reports",
    module: "Move-Out Walkthroughs",
    description: "File move-out walkthrough inspection forms and photos.",
    route: "/dashboard/inspector/inspections",
    welfareExempt: false,
    iconName: "FileCheck",
  },
  {
    key: "access_vendor_portal",
    label: "Vendor Portal Access",
    module: "Vendor Network",
    description: "Collaborate with external contractors and material vendors.",
    route: "/dashboard/inspector/vendors",
    welfareExempt: false,
    iconName: "Truck",
  },
];

export type TenantFeatureKey = (typeof TENANT_FEATURES)[number]["key"];
export type InspectorFeatureKey = (typeof INSPECTOR_FEATURES)[number]["key"];
export type UserFeatureKey = TenantFeatureKey | InspectorFeatureKey;
