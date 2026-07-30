"use client";

import React from "react";
import Link from "next/link";
import { format, differenceInDays, isPast } from "date-fns";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Building,
  User,
  Wrench,
  CreditCard,
  ClipboardCheck,
  FileText,
  Eye,
  ArrowRight,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Phone,
  Video,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/app/api/calendar/events/route";

interface CalendarEventDrawerProps {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  userRole?: string;
}

export function CalendarEventDrawer({
  event,
  open,
  onClose,
  userRole = "TENANT",
}: CalendarEventDrawerProps) {
  if (!open || !event) return null;

  const eventDate = new Date(event.date);
  const isOverdue = isPast(eventDate) && event.metadata?.status !== "PAID";
  const daysUntilLeaseEnd = event.type === "LEASE" ? differenceInDays(eventDate, new Date()) : null;

  const getCategoryTheme = () => {
    switch (event.type) {
      case "PAYMENT":
        return {
          label: "Rent & Payment",
          headerBg: "bg-emerald-500/10 text-emerald-900 border-emerald-200/80",
          pillBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
          icon: CreditCard,
          primaryActionLabel: userRole === "TENANT" ? "Pay Rent Now" : "View Accounting Ledger",
          primaryActionHref: userRole === "TENANT" ? "/dashboard/payments/pay-rent" : "/dashboard/accounting/invoices",
        };
      case "MAINTENANCE":
        return {
          label: "Repair & Maintenance",
          headerBg: "bg-amber-500/10 text-amber-900 border-amber-200/80",
          pillBg: "bg-amber-100 text-amber-900 border-amber-300",
          icon: Wrench,
          primaryActionLabel: userRole === "INSPECTOR" ? "Start Repair Diagnosis" : "View Maintenance Request",
          primaryActionHref: userRole === "INSPECTOR"
            ? "/dashboard/inspector/active"
            : `/dashboard/maintenance/${event.metadata?.requestId || ""}`,
        };
      case "INSPECTION":
        return {
          label: event.metadata?.walkthroughType === "PRELIMINARY" ? "Move-In Inspection" : "Move-Out Walkthrough",
          headerBg: "bg-purple-500/10 text-purple-900 border-purple-200/80",
          pillBg: "bg-purple-100 text-purple-900 border-purple-300",
          icon: ClipboardCheck,
          primaryActionLabel: userRole === "INSPECTOR" ? "Conduct Walkthrough" : "View Inspection Details",
          primaryActionHref: userRole === "INSPECTOR"
            ? `/dashboard/inspector/inspections/${event.metadata?.leaseId}?type=${event.metadata?.walkthroughType || "FINAL"}`
            : `/dashboard/leases/${event.metadata?.leaseId || ""}`,
        };
      case "LEASE":
        return {
          label: "Lease Expiration",
          headerBg: "bg-rose-500/10 text-rose-900 border-rose-200/80",
          pillBg: "bg-rose-100 text-rose-900 border-rose-300",
          icon: FileText,
          primaryActionLabel: userRole === "OWNER" ? "Offer Lease Renewal" : "View Lease Agreement",
          primaryActionHref: `/dashboard/leases/${event.metadata?.leaseId || ""}`,
        };
      case "TOUR":
        return {
          label: "Prospect Property Tour",
          headerBg: "bg-sky-500/10 text-sky-900 border-sky-200/80",
          pillBg: "bg-sky-100 text-sky-900 border-sky-300",
          icon: Eye,
          primaryActionLabel: "Manage Showing Tours",
          primaryActionHref: "/dashboard/tours",
        };
      default:
        return {
          label: "Scheduled Activity",
          headerBg: "bg-slate-100 text-slate-900 border-slate-200",
          pillBg: "bg-slate-200 text-slate-800 border-slate-300",
          icon: CalendarIcon,
          primaryActionLabel: "View Details",
          primaryActionHref: "#",
        };
    }
  };

  const theme = getCategoryTheme();
  const CategoryIcon = theme.icon;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-slate-950/50 backdrop-blur-sm flex justify-end transition-all animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-300 font-sans">
        
        {/* ── HEADER ── */}
        <div className={`p-6 border-b ${theme.headerBg} space-y-4`}>
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border ${theme.pillBg}`}>
              <CategoryIcon className="h-3.5 w-3.5" />
              {theme.label}
            </span>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-xs flex items-center justify-center transition-all cursor-pointer"
              title="Close Preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">{event.title}</h2>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mt-2">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{format(eventDate, "EEEE, MMMM d, yyyy")}</span>
              <span>&bull;</span>
              <span>{format(eventDate, "h:mm a")}</span>
            </div>
          </div>
        </div>

        {/* ── CONTENT BODY ── */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          
          {/* Overdue Payment Alert Banner */}
          {event.type === "PAYMENT" && isOverdue && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-200 flex items-start gap-3 text-red-900">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-red-800">Payment Overdue</p>
                <p className="text-xs font-medium text-red-700 mt-0.5">
                  This payment was due on {format(eventDate, "MMM d, yyyy")}. Please settle immediately to avoid late fee penalties.
                </p>
              </div>
            </div>
          )}

          {/* Lease Expiration Countdown Badge */}
          {event.type === "LEASE" && daysUntilLeaseEnd !== null && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              daysUntilLeaseEnd <= 30
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-slate-50 border-slate-200 text-slate-900"
            }`}>
              <div className="flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-rose-600" />
                <span className="text-xs font-bold">Expiration Countdown</span>
              </div>
              <span className="px-3 py-1 bg-white rounded-xl border border-rose-200 text-xs font-black text-rose-700 shadow-2xs">
                {daysUntilLeaseEnd < 0 ? "Expired" : `${daysUntilLeaseEnd} Days Left`}
              </span>
            </div>
          )}

          {/* Property & Unit Card */}
          {event.metadata?.propertyName && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3.5">
              <div className="h-11 w-11 bg-white rounded-xl border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0 shadow-xs">
                <Building className="h-5 w-5 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Property &amp; Unit</p>
                <p className="text-sm font-bold text-slate-900">
                  {event.metadata.propertyName}
                  {event.metadata.unitNumber ? ` \u2022 Unit ${event.metadata.unitNumber}` : ""}
                </p>
              </div>
            </div>
          )}

          {/* Tenant Name Card */}
          {event.metadata?.tenantName && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3.5">
              <div className="h-11 w-11 bg-white rounded-xl border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0 shadow-xs">
                <User className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  {event.type === "TOUR" ? "Prospect Name" : "Tenant"}
                </p>
                <p className="text-sm font-bold text-slate-900">{event.metadata.tenantName}</p>
              </div>
            </div>
          )}

          {/* Prospect Contact Details (For TOUR Events - Owner & Admin Scope) */}
          {event.type === "TOUR" && (userRole === "OWNER" || userRole === "SUPERADMIN") && (
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-3">
              <p className="text-[10px] font-extrabold text-blue-900 uppercase tracking-widest flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-[#007AFF]" />
                Prospect Contact Information
              </p>
              <div className="space-y-2 text-xs font-semibold text-slate-800">
                {event.metadata?.tenantEmail && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-blue-600" /> Email:
                    </span>
                    <a href={`mailto:${event.metadata.tenantEmail}`} className="font-bold text-[#007AFF] hover:underline">
                      {event.metadata.tenantEmail}
                    </a>
                  </div>
                )}
                {event.metadata?.tenantPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-blue-600" /> Phone:
                    </span>
                    <a href={`tel:${event.metadata.tenantPhone}`} className="font-bold text-[#007AFF] hover:underline">
                      {event.metadata.tenantPhone}
                    </a>
                  </div>
                )}
                {event.metadata?.tourType && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      {event.metadata.tourType === "VIRTUAL" ? <Video className="h-3.5 w-3.5 text-purple-600" /> : <MapPin className="h-3.5 w-3.5 text-emerald-600" />} Tour Format:
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-[10px] font-black uppercase text-blue-900">
                      {event.metadata.tourType}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amount Card for Payment events */}
          {event.metadata?.amount && (
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest">Total Amount Due</p>
                  <p className="text-2xl font-black text-emerald-950">${Number(event.metadata.amount).toLocaleString()}</p>
                </div>
              </div>

              {event.metadata?.status && (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-black uppercase tracking-wider border border-emerald-300">
                  {event.metadata.status}
                </span>
              )}
            </div>
          )}

          {/* Priority Chip */}
          {event.priority && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Priority Status</span>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                event.priority === "EMERGENCY" ? "bg-red-50 text-red-700 border-red-200" :
                event.priority === "HIGH" ? "bg-orange-50 text-orange-700 border-orange-200" :
                "bg-slate-100 text-slate-700 border-slate-200"
              }`}>
                {event.priority}
              </span>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="p-6 bg-slate-50/80 border-t border-slate-200/80 space-y-2.5">
          <Link href={theme.primaryActionHref} onClick={onClose} className="block">
            <Button className="w-full h-12 bg-[#1D1D1F] hover:bg-[#007AFF] text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
              {theme.primaryActionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          {/* Additional Contact Quick Action for Prospect Tours */}
          {event.type === "TOUR" && event.metadata?.tenantPhone && (
            <a href={`tel:${event.metadata.tenantPhone}`} className="block">
              <Button type="button" variant="outline" className="w-full h-10 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                Call Prospect ({event.metadata.tenantPhone})
              </Button>
            </a>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full h-10 border border-slate-200/80 text-slate-600 hover:bg-slate-200/70 font-bold text-xs rounded-xl"
          >
            Close Preview
          </Button>
        </div>

      </div>
    </div>
  );
}
