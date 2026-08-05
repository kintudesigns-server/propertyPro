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
    <div className="w-full max-w-7xl mx-auto pt-4 space-y-6 pb-28 px-2 sm:px-6 font-sans">
      {/* ─── BREADCRUMB & HEADER ACTIONS ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-normal text-[#6E6E73] mb-1">
            <Link href="/dashboard/team" className="hover:text-slate-900 transition-colors flex items-center gap-1 font-normal">
              <ArrowLeft className="h-3.5 w-3.5" /> Team &amp; Staff
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="text-[#1D1D1F] font-medium">Inspector Profile</span>
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            {inspector.name}
          </h1>
          <p className="text-[#6E6E73] text-xs font-normal mt-0.5">
            Internal Staff &bull; Field Inspector ID: <span className="font-mono text-[#6E6E73]">{inspector.id}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href={`/dashboard/team/${id}/edit`}>
            <Button
              className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-2xs font-medium rounded-xl text-xs h-9 px-4 cursor-pointer gap-2"
            >
              <Edit className="h-3.5 w-3.5 text-slate-600" /> Edit Profile
            </Button>
          </Link>
          <Button
            onClick={() => setDispatchOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-9 px-4 rounded-xl shadow-xs transition-all cursor-pointer gap-2 border-none"
          >
            <Wrench className="h-3.5 w-3.5" /> Assign Work Order
          </Button>
          <Button
            onClick={() => window.open(`mailto:${inspector.email}`)}
            className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-2xs font-medium rounded-xl text-xs h-9 px-4 cursor-pointer gap-2"
          >
            <Mail className="h-3.5 w-3.5 text-slate-600" /> Direct Email
          </Button>
          {inspector.phone && (
            <Button
              onClick={() => (window.location.href = `tel:${inspector.phone}`)}
              className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-2xs font-medium rounded-xl text-xs h-9 px-4 cursor-pointer gap-2"
            >
              <Phone className="h-3.5 w-3.5 text-slate-600" /> Call Staff
            </Button>
          )}
        </div>
      </div>

      {/* ─── INSPECTOR HERO PROFILE CARD ─── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 font-sans">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <img
              src={
                inspector.avatar ||
                inspector.image ||
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80"
              }
              alt={inspector.name}
              className="h-20 w-20 rounded-2xl object-cover border-2 border-white shadow-2xs"
            />
            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" title="Available for Dispatch" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200/80 text-amber-800 rounded-md text-[10px] font-medium uppercase tracking-wider">
                <ShieldCheck className="h-3 w-3 text-amber-600" />
                Certified Inspector
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-md text-[10px] font-medium uppercase tracking-wider">
                <CheckCircle2 className="h-3 w-3" /> Active &amp; Ready
              </span>
            </div>

            <h2 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">{inspector.name}</h2>

            <div className="flex items-center gap-4 text-xs font-normal text-[#6E6E73] flex-wrap">
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
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 w-full md:w-auto shrink-0 flex items-center gap-6 shadow-2xs font-sans">
          <div>
            <p className="text-xs font-normal text-[#6E6E73]">Approval Cap</p>
            <p className="text-2xl font-semibold text-[#1D1D1F] tracking-tight mt-0.5">${inspector.approvalThreshold || "200.00"}</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <p className="text-xs font-normal text-[#6E6E73]">Emergency Limit</p>
            <p className="text-2xl font-semibold text-[#1D1D1F] tracking-tight mt-0.5">${inspector.emergencyOverrideLimit || "1,500.00"}</p>
          </div>
        </div>
      </div>

      {/* ─── SUMMARY KPI METRICS GRID ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0 border border-slate-200/60 shadow-2xs">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-normal text-[#6E6E73]">Total Work Orders</p>
            <h3 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight mt-0.5">{assignedTasks.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 border border-amber-200/60 shadow-2xs">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-normal text-[#6E6E73]">Open / Pending</p>
            <h3 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight mt-0.5">{openTasks.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-200/60 shadow-2xs">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-normal text-[#6E6E73]">Resolved Repairs</p>
            <h3 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight mt-0.5">{completedTasks.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-2xs">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-normal text-[#6E6E73]">SLA Completion</p>
            <h3 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight mt-0.5">100% <span className="text-xs font-normal text-emerald-600">On Time</span></h3>
          </div>
        </div>
      </div>

      {/* ─── ASSIGNED MAINTENANCE WORK ORDERS TABLE ─── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4 font-sans">
        <div className="p-6 pb-2 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#1D1D1F] tracking-tight">Assigned Maintenance &amp; Repair Work Orders</h3>
            <p className="text-xs font-normal text-[#6E6E73] mt-0.5">Tickets assigned to {inspector.name} for field inspection and resolution.</p>
          </div>

          <Button
            onClick={() => setDispatchOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-9 px-4 rounded-xl shadow-xs transition-all cursor-pointer border-none gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Dispatch Work Order
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="py-3.5 px-6 font-normal text-xs text-[#6E6E73]">Ticket Title &amp; Category</th>
                <th className="py-3.5 px-6 font-normal text-xs text-[#6E6E73]">Property &amp; Unit</th>
                <th className="py-3.5 px-6 font-normal text-xs text-[#6E6E73]">Priority</th>
                <th className="py-3.5 px-6 font-normal text-xs text-[#6E6E73]">Status</th>
                <th className="py-3.5 px-6 font-normal text-xs text-[#6E6E73]">Date Assigned</th>
                <th className="py-3.5 px-6 font-normal text-xs text-[#6E6E73] text-right">Action</th>
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
                      <p className="text-sm font-semibold text-[#1D1D1F]">No work orders assigned yet</p>
                      <p className="text-xs font-normal text-[#6E6E73]">Click "Dispatch Work Order" to assign an open maintenance ticket to this inspector.</p>
                      <Button
                        onClick={() => setDispatchOpen(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-medium h-9 px-4 rounded-xl text-xs shadow-xs cursor-pointer border-none"
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
                        <span className="font-semibold text-xs text-[#1D1D1F] block">{ticket.title}</span>
                        <span className="text-[10px] font-medium text-[#6E6E73] uppercase tracking-wider">{ticket.category || "General Repair"}</span>
                      </div>
                    </td>

                    {/* Property & Unit */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {ticket.property?.name || "Property"}
                        </span>
                        {ticket.unit && (
                          <span className="text-xs font-normal text-[#6E6E73] flex items-center gap-1">
                            <Home className="h-3 w-3 text-slate-400" /> Unit {ticket.unit.name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${
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

                    {/* Status */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${
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

                    {/* Date Assigned */}
                    <td className="py-4 px-6 text-xs font-normal text-[#6E6E73]">
                      {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                    </td>

                    {/* Action */}
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

      {/* ─── DISPATCH WORK ORDER MODAL ─── */}
      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent className="bg-white max-w-md rounded-3xl p-6 shadow-2xl font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900 tracking-tight">
              Dispatch Work Order to {inspector.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleDispatchTicket} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-[#6E6E73]">Select Maintenance Ticket</Label>
              {unassignedTickets.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                  <p className="text-xs font-semibold text-[#1D1D1F]">No open unassigned tickets available.</p>
                  <Link href="/dashboard/maintenance/new">
                    <Button type="button" variant="outline" className="h-8 text-xs font-medium rounded-xl mt-1">
                      Create New Maintenance Request
                    </Button>
                  </Link>
                </div>
              ) : (
                <Select value={selectedTicketId} onValueChange={(v) => setSelectedTicketId(v || "")}>
                  <SelectTrigger className="rounded-xl h-9 text-xs font-normal text-[#1D1D1F]">
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
              <Button type="button" variant="outline" onClick={() => setDispatchOpen(false)} className="rounded-xl h-9 text-xs font-medium">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={dispatching || !selectedTicketId}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-9 text-xs font-medium cursor-pointer border-none"
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
