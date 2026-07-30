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
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 pb-28">
      {/* ─── BREADCRUMB & HEADER ACTIONS ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
            <Link href="/dashboard/team" className="hover:text-amber-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Inspectors &amp; Vendors
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-800 font-bold">Vendor Profile</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {vendor.name}
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">
            External Trade Specialist &bull; Vendor ID: {vendor.id.substring(0, 8)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/dashboard/vendors/${id}/edit`}>
            <Button
              className="h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-sm gap-2 border-none"
            >
              <Edit className="h-4 w-4" /> Edit Vendor Info
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => window.open(`mailto:${vendor.email}`)}
            className="h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-5 rounded-2xl text-sm gap-2"
          >
            <Mail className="h-4 w-4" /> Contact Vendor
          </Button>
          {vendor.phone && (
            <Button
              variant="outline"
              onClick={() => (window.location.href = `tel:${vendor.phone}`)}
              className="h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-5 rounded-2xl text-sm gap-2"
            >
              <Phone className="h-4 w-4" /> Call Phone
            </Button>
          )}
        </div>
      </div>

      {/* ─── VENDOR HERO PROFILE CARD ─── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
            {vendor.name.charAt(0).toUpperCase()}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/80 text-amber-800 rounded-lg text-xs font-extrabold">
                <Briefcase className="h-3.5 w-3.5 text-amber-600" />
                {vendor.specialty || "Trade Specialist"}
              </span>

              {vendor.w9OnFile ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> W-9 Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold">
                  <AlertTriangle className="h-3.5 w-3.5" /> W-9 Missing
                </span>
              )}

              {vendor.insuranceOnFile ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
                  <ShieldCheck className="h-3.5 w-3.5" /> Insured Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold">
                  <AlertTriangle className="h-3.5 w-3.5" /> Insurance Missing
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900">{vendor.name}</h2>

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 flex-wrap">
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
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 w-full md:w-auto shrink-0 flex items-center gap-6">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Base Call-Out Fee</p>
            <p className="text-2xl font-black text-slate-900">${Number(vendor.baseCallOutFee || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY KPI METRICS GRID ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Work Orders</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{assignedTasks.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Call-Out Fee</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">${Number(vendor.baseCallOutFee || 0).toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">W-9 Tax Form</p>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {vendor.w9OnFile ? <span className="text-emerald-600">On File</span> : <span className="text-rose-600">Missing</span>}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Liability Insurance</p>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {vendor.insuranceOnFile ? <span className="text-emerald-600">Verified Active</span> : <span className="text-rose-600">Missing</span>}
            </h3>
          </div>
        </div>
      </div>

      {/* ─── ASSIGNED MAINTENANCE WORK ORDERS TABLE ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4">
        <div className="p-6 pb-2 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Assigned Contractor Work Orders</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Maintenance repair jobs assigned to {vendor.name}.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80">
                <th className="py-4 px-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Ticket Title &amp; Category</th>
                <th className="py-4 px-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Property &amp; Unit</th>
                <th className="py-4 px-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Priority</th>
                <th className="py-4 px-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Date Created</th>
                <th className="py-4 px-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignedTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Wrench className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No work orders assigned yet</p>
                      <p className="text-xs text-slate-400">Work orders assigned to this trade contractor will appear here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                assignedTasks.map((ticket: any) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <span className="font-bold text-sm text-slate-900 block">{ticket.title}</span>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{ticket.category || "General Repair"}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {ticket.unit?.property?.name || "Property"}
                        </span>
                        {ticket.unit && (
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <Home className="h-3 w-3 text-slate-400" /> Unit {ticket.unit.name}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          ticket.priority === "EMERGENCY"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : ticket.priority === "HIGH"
                            ? "bg-orange-50 text-orange-700 border border-orange-200"
                            : ticket.priority === "MEDIUM"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          ticket.status === "COMPLETED" || ticket.status === "RESOLVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : ticket.status === "IN_PROGRESS"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
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
                        <Button variant="ghost" className="h-8 px-3 text-xs font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg">
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
