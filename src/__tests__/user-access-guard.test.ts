import test from "node:test";
import assert from "node:assert";
import { TENANT_FEATURES, INSPECTOR_FEATURES } from "../lib/UserFeatureRegistry";

test("Tenant Feature Registry contains expected default features and welfare exemptions", () => {
  assert.ok(Array.isArray(TENANT_FEATURES), "TENANT_FEATURES should be an array");
  assert.ok(TENANT_FEATURES.length >= 3, "Should have at least 3 tenant features");

  const leaseView = TENANT_FEATURES.find((f) => f.key === "view_lease");
  assert.ok(leaseView, "Should include view_lease feature");
  assert.strictEqual(leaseView?.welfareExempt, true, "view_lease must be welfare exempt");

  const makePayments = TENANT_FEATURES.find((f) => f.key === "make_payments");
  assert.ok(makePayments, "Should include make_payments feature");
  assert.strictEqual(makePayments?.welfareExempt, true, "make_payments must be welfare exempt");
});

test("Inspector Feature Registry contains expected features", () => {
  assert.ok(Array.isArray(INSPECTOR_FEATURES), "INSPECTOR_FEATURES should be an array");
  assert.ok(INSPECTOR_FEATURES.length >= 2, "Should have at least 2 inspector features");

  const submitReports = INSPECTOR_FEATURES.find((f) => f.key === "submit_reports");
  assert.ok(submitReports, "Should include submit_reports feature");
});
