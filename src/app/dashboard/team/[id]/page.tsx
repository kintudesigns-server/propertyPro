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
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  User,
  Building,
  Home,
  Plus,
  ArrowRight,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Loader2,
  Lock,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function InspectorDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [inspector, setInspector] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dispatch Modal State
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [unassignedTickets, setUnassignedTickets] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [dispatching, setDispatching] = useState(false);

  // Edit Limits State
  const [editLimitsOpen, setEditLimitsOpen] = useState(false);
  const [approvalThreshold, setApprovalThreshold] = useState("200");
  const [emergencyLimit, setEmergencyLimit] = useState("1500");
  const [savingLimits, setSavingLimits] = useState(false);

  const fetchInspectorDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setInspector(data);
        setApprovalThreshold(data.approvalThreshold || "200");
        setEmergencyLimit(data.emergencyOverrideLimit || "1500");
      } else {
        toast.error("Inspector profile not found");
        router.push("/dashboard/team");
      }
    } catch (err) {
      toast.error("Failed to load inspector details");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedTickets = async () => {
    try {
      const res = await fetch("/api/maintenance");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Filter tickets that have no assigned inspector or any ticket that needs dispatching
          setUnassignedTickets(data.filter((t: any) => !t.inspectorId || t.status === "PENDING" || t.status === "SUBMITTED"));
        }
      }
    } catch (err) {
      console.error("Failed to load maintenance requests:", err);
    }
  };

  useEffect(() => {
    fetchInspectorDetails();
    fetchUnassignedTickets();
  }, [id]);

  const handleDispatchTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId) return toast.error("Please select a maintenance request to dispatch");
    setDispatching(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTicketId,
          inspectorId: id,
          status: "ASSIGNED",
        }),
      });

      if (res.ok) {
        toast.success(`Work order dispatched to ${inspector.name}!`);
        setDispatchOpen(false);
        setSelectedTicketId("");
        fetchInspectorDetails();
        fetchUnassignedTickets();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to dispatch work order");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">
          Loading Inspector Profile...
        </p>
      </div>
    );
  }

  if (!inspector) return null;

  const assignedTasks = inspector.assignedInspections || [];
  const openTasks = assignedTasks.filter((t: any) => t.status !== "COMPLETED" && t.status !== "RESOLVED");
  const completedTasks = assignedTasks.filter((t: any) => t.status === "COMPLETED" || t.status === "RESOLVED");

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 pb-28">
      {/* ─── BREADCRUMB & HEADER ACTIONS ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
            <Link href="/dashboard/team" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Team &amp; Staff
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-800 font-bold">Inspector Profile</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {inspector.name}
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">
            Internal Staff &bull; Field Inspector ID: {inspector.id}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/dashboard/team/${id}/edit`}>
            <Button
              variant="outline"
              className="h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-5 rounded-2xl text-sm gap-2"
            >
              <Edit className="h-4 w-4 text-blue-600" /> Edit Profile
            </Button>
          </Link>
          <Button
            onClick={() => setDispatchOpen(true)}
            className="h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-sm gap-2 border-none"
          >
            <Wrench className="h-4 w-4" /> Assign Work Order
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`mailto:${inspector.email}`)}
            className="h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-5 rounded-2xl text-sm gap-2"
          >
            <Mail className="h-4 w-4" /> Direct Email
          </Button>
          {inspector.phone && (
            <Button
              variant="outline"
              onClick={() => (window.location.href = `tel:${inspector.phone}`)}
              className="h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-5 rounded-2xl text-sm gap-2"
            >
              <Phone className="h-4 w-4" /> Call Staff
            </Button>
          )}
        </div>
      </div>

      {/* ─── INSPECTOR HERO PROFILE CARD ─── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
              {inspector.name.charAt(0).toUpperCase()}
            </div>
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-white" title="Available for Dispatch" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/80 text-amber-800 rounded-lg text-xs font-extrabold">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                Certified Inspector
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Active &amp; Ready
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900">{inspector.name}</h2>

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> {inspector.email}
              </span>
              {inspector.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {inspector.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock className="h-3.5 w-3.5" /> Joined {format(new Date(inspector.createdAt || Date.now()), "MMM yyyy")}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Cap Info */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 w-full md:w-auto shrink-0 flex items-center gap-6">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Approval Cap</p>
            <p className="text-lg font-black text-slate-900">${inspector.approvalThreshold || "200.00"}</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Emergency Limit</p>
            <p className="text-lg font-black text-slate-900">${inspector.emergencyOverrideLimit || "1,500.00"}</p>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY KPI METRICS GRID ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Work Orders</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{assignedTasks.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Open / Pending</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{openTasks.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Resolved Repairs</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{completedTasks.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">SLA Completion</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">100% <span className="text-xs font-bold text-emerald-600">On Time</span></h3>
          </div>
        </div>
      </div>

      {/* ─── ASSIGNED MAINTENANCE WORK ORDERS TABLE ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4">
        <div className="p-6 pb-2 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Assigned Maintenance &amp; Repair Work Orders</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Tickets assigned to {inspector.name} for field inspection and resolution.</p>
          </div>

          <Button
            onClick={() => setDispatchOpen(true)}
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold h-9 px-4 rounded-xl text-xs border-none gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Dispatch Work Order
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80">
                <th className="py-4 px-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Ticket Title &amp; Category</th>
                <th className="py-4 px-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Property &amp; Unit</th>
                <th className="py-4 px-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Priority</th>
                <th className="py-4 px-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Date Assigned</th>
                <th className="py-4 px-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignedTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Wrench className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No work orders assigned yet</p>
                      <p className="text-xs text-slate-400">Click "Dispatch Work Order" to assign an open maintenance ticket to this inspector.</p>
                      <Button
                        onClick={() => setDispatchOpen(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-9 px-4 rounded-xl text-xs"
                      >
                        Dispatch Ticket Now
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                assignedTasks.map((ticket: any) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Ticket Title & Category */}
                    <td className="py-4 px-6">
                      <div>
                        <span className="font-bold text-sm text-slate-900 block">{ticket.title}</span>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{ticket.category || "General Repair"}</span>
                      </div>
                    </td>

                    {/* Property & Unit */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {ticket.property?.name || "Property"}
                        </span>
                        {ticket.unit && (
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <Home className="h-3 w-3 text-slate-400" /> Unit {ticket.unit.name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Priority */}
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

                    {/* Status */}
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

                    {/* Date Assigned */}
                    <td className="py-4 px-6 text-xs font-semibold text-slate-500">
                      {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-right">
                      <Link href={`/dashboard/maintenance/${ticket.id}`}>
                        <Button variant="ghost" className="h-8 px-3 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg">
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

      {/* ─── DISPATCH WORK ORDER MODAL ─── */}
      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent className="bg-white max-w-md rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">
              Dispatch Work Order to {inspector.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleDispatchTicket} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Select Maintenance Ticket</Label>
              {unassignedTickets.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                  <p className="text-xs font-bold text-slate-600">No open unassigned tickets available.</p>
                  <Link href="/dashboard/maintenance/new">
                    <Button type="button" variant="outline" className="h-8 text-xs font-bold rounded-xl mt-1">
                      Create New Maintenance Request
                    </Button>
                  </Link>
                </div>
              ) : (
                <Select value={selectedTicketId} onValueChange={(v) => setSelectedTicketId(v || "")}>
                  <SelectTrigger className="rounded-xl h-11 text-xs">
                    <SelectValue placeholder="Choose a ticket to dispatch..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {unassignedTickets.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        [{t.priority}] {t.title} &bull; {t.unit?.property?.name || t.property?.name || "Property"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDispatchOpen(false)} className="rounded-xl h-10 text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={dispatching || !selectedTicketId}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 text-xs font-bold"
              >
                {dispatching ? "Dispatching..." : "Confirm Dispatch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
