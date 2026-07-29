export const TENANT_FEATURES = [
  { key: "submit_maintenance", label: "Submit Maintenance Requests", welfareExempt: false },
  { key: "view_lease", label: "View Lease Document", welfareExempt: true },
  { key: "view_documents", label: "Document Vault", welfareExempt: false },
  { key: "make_payments", label: "Make Rent Payments", welfareExempt: true },
  { key: "message_owner", label: "Message Owner", welfareExempt: false },
  { key: "request_move_out", label: "Request Move-Out", welfareExempt: true },
] as const;

export const INSPECTOR_FEATURES = [
  { key: "view_assignments", label: "View Assigned Jobs", welfareExempt: true },
  { key: "submit_reports", label: "Submit Inspection Reports", welfareExempt: false },
  { key: "access_vendor_portal", label: "Vendor Portal Access", welfareExempt: false },
  { key: "view_property_details", label: "View Property Details", welfareExempt: true },
] as const;

export type TenantFeatureKey = typeof TENANT_FEATURES[number]["key"];
export type InspectorFeatureKey = typeof INSPECTOR_FEATURES[number]["key"];
export type UserFeatureKey = TenantFeatureKey | InspectorFeatureKey;
