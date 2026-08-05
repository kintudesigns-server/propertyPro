"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  Building,
  Home,
  ArrowRight,
  ChevronRight,
  Loader2,
  Edit,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

export default function VendorDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendorDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/external-vendors/${id}`);
        if (res.ok) {
          const data = await res.json();
          setVendor(data);
        } else {
          toast.error("Vendor profile not found");
          router.push("/dashboard/team");
        }
      } catch (err) {
        toast.error("Failed to load vendor details");
      } finally {
        setLoading(false);
      }
    };
    fetchVendorDetails();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
        <p className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">
          Loading Contractor Profile...
        </p>
      </div>
    );
  }

  if (!vendor) return null;

  const assignedTasks = vendor.maintenanceRequests || [];
  const openTasks = assignedTasks.filter((t: any) => t.status !== "COMPLETED" && t.status !== "RESOLVED");
  const completedTasks = assignedTasks.filter((t: any) => t.status === "COMPLETED" || t.status === "RESOLVED");

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 pb-28 font-sans">
      {/* ─── BREADCRUMB & HEADER ACTIONS ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
            <Link href="/dashboard/team" className="hover:text-slate-900 transition-colors flex items-center gap-1 font-medium">
              <ArrowLeft className="h-3.5 w-3.5" /> Inspectors &amp; Vendors
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="text-slate-900 font-bold">Vendor Profile</span>
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            {vendor.name}
          </h1>
          <p className="text-[#6E6E73] text-xs font-normal mt-0.5">
            External Trade Specialist &bull; Vendor ID: <span className="font-mono text-slate-700 font-bold">{vendor.id.substring(0, 8)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href={`/dashboard/vendors/${id}/edit`}>
            <Button
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-9 px-4 rounded-xl shadow-xs transition-all cursor-pointer gap-2 border-none"
            >
              <Edit className="h-3.5 w-3.5" /> Edit Vendor Info
            </Button>
          </Link>
          <Button
            onClick={() => window.open(`mailto:${vendor.email}`)}
            className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-2xs font-black rounded-xl text-xs h-9 px-4 cursor-pointer gap-2"
          >
            <Mail className="h-3.5 w-3.5 text-slate-600" /> Contact Vendor
          </Button>
          {vendor.phone && (
            <Button
              onClick={() => (window.location.href = `tel:${vendor.phone}`)}
              className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-2xs font-black rounded-xl text-xs h-9 px-4 cursor-pointer gap-2"
            >
              <Phone className="h-3.5 w-3.5 text-slate-600" /> Call Phone
            </Button>
          )}
        </div>
      </div>

      {/* ─── VENDOR HERO PROFILE CARD ─── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 font-sans">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <img
              src={
                vendor.avatar ||
                vendor.image ||
                "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80"
              }
              alt={vendor.name}
              className="h-20 w-20 rounded-2xl object-cover border-2 border-white shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" title="Vendor Active" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 border border-amber-200/80 text-amber-800 rounded-md text-[10px] font-semibold uppercase tracking-wider shadow-2xs">
                <Briefcase className="h-3 w-3 text-amber-600" />
                {vendor.specialty || "Trade Specialist"}
              </span>

              {vendor.w9OnFile ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-md text-[10px] font-semibold uppercase tracking-wider shadow-2xs">
                  <CheckCircle2 className="h-3 w-3" /> W-9 Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/80 rounded-md text-[10px] font-semibold uppercase tracking-wider shadow-2xs">
                  <AlertTriangle className="h-3 w-3" /> W-9 Missing
                </span>
              )}

              {vendor.insuranceOnFile ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-md text-[10px] font-semibold uppercase tracking-wider shadow-2xs">
                  <ShieldCheck className="h-3 w-3" /> Insured Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/80 rounded-md text-[10px] font-semibold uppercase tracking-wider shadow-2xs">
                  <AlertTriangle className="h-3 w-3" /> Insurance Missing
                </span>
              )}
            </div>

            <h2 className="text-3xl font-semibold text-slate-900 tracking-tight">{vendor.name}</h2>

            <div className="flex items-center gap-4 text-xs font-normal text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> {vendor.email}
              </span>
              {vendor.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {vendor.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Call-Out Fee Pill */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 w-full md:w-auto shrink-0 flex items-center gap-6 shadow-2xs font-sans">
          <div>
            <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Base Call-Out Fee</p>
            <p className="text-2xl font-semibold text-slate-900 mt-0.5">${Number(vendor.baseCallOutFee || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY KPI METRICS GRID ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0 border border-slate-200/60 shadow-2xs">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Total Work Orders</p>
            <h3 className="text-3xl font-semibold text-slate-900 tracking-tight mt-0.5">{assignedTasks.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-200/60 shadow-2xs">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Call-Out Fee</p>
            <h3 className="text-3xl font-semibold text-slate-900 tracking-tight mt-0.5">${Number(vendor.baseCallOutFee || 0).toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 shrink-0 border border-slate-200/60 shadow-2xs">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">W-9 Tax Form</p>
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
              {vendor.w9OnFile ? <span className="text-emerald-600">On File</span> : <span className="text-rose-600">Missing</span>}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-2xs">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Liability Insurance</p>
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
              {vendor.insuranceOnFile ? <span className="text-emerald-600">Verified Active</span> : <span className="text-rose-600">Missing</span>}
            </h3>
          </div>
        </div>
      </div>

      {/* ─── ASSIGNED MAINTENANCE WORK ORDERS TABLE ─── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4 font-sans">
        <div className="p-6 pb-2 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Assigned Contractor Work Orders</h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Maintenance repair jobs assigned to {vendor.name}.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="py-3.5 px-6 text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Ticket Title &amp; Category</th>
                <th className="py-3.5 px-6 text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Property &amp; Unit</th>
                <th className="py-3.5 px-6 text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Priority</th>
                <th className="py-3.5 px-6 text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Status</th>
                <th className="py-3.5 px-6 text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">Date Created</th>
                <th className="py-3.5 px-6 text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignedTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 border border-slate-200/60 shadow-2xs">
                        <Wrench className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-black text-slate-900">No work orders assigned yet</p>
                      <p className="text-xs font-semibold text-slate-500">Work orders assigned to this trade contractor will appear here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                assignedTasks.map((ticket: any) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <span className="font-semibold text-sm text-slate-900 block">{ticket.title}</span>
                        <span className="text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wider">{ticket.category || "General Repair"}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {ticket.unit?.property?.name || "Property"}
                        </span>
                        {ticket.unit && (
                          <span className="text-[11px] font-normal text-slate-500 flex items-center gap-1">
                            <Home className="h-3 w-3 text-slate-400" /> Unit {ticket.unit.name}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider shadow-2xs ${
                          ticket.priority === "EMERGENCY"
                            ? "bg-rose-50 text-rose-700 border border-rose-200/80"
                            : ticket.priority === "HIGH"
                            ? "bg-orange-50 text-orange-700 border border-orange-200/80"
                            : ticket.priority === "MEDIUM"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider shadow-2xs ${
                          ticket.status === "COMPLETED" || ticket.status === "RESOLVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                            : ticket.status === "IN_PROGRESS"
                            ? "bg-blue-50 text-blue-700 border border-blue-200/80"
                            : "bg-amber-50 text-amber-700 border border-amber-200/80"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-xs font-semibold text-slate-500">
                      {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <Link href={`/dashboard/maintenance/${ticket.id}`}>
                        <Button className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-2xs rounded-xl font-medium text-xs h-8 px-3 transition-all cursor-pointer">
                          View Ticket <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
