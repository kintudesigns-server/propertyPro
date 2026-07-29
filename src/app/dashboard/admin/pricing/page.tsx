import { redirect } from "next/navigation";

export default function AdminPricingRedirectPage() {
  redirect("/dashboard/admin/settings/pricing");
}
