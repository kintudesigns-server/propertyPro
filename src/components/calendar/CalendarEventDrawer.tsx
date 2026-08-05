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
  Mail,
  Phone,
  Video,
  MapPin,
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
          pillBg: "bg-emerald-50 text-emerald-800 border-emerald-200/80 font-medium text-[10px] uppercase tracking-wider rounded-md",
          icon: CreditCard,
          primaryActionLabel: userRole === "TENANT" ? "Pay Rent Now" : "View Accounting Ledger",
          primaryActionHref: userRole === "TENANT" ? "/dashboard/payments/pay-rent" : "/dashboard/accounting/invoices",
        };
      case "MAINTENANCE":
        return {
          label: "Repair & Maintenance",
          pillBg: "bg-amber-50 text-amber-800 border-amber-200/80 font-medium text-[10px] uppercase tracking-wider rounded-md",
          icon: Wrench,
          primaryActionLabel: userRole === "INSPECTOR" ? "Start Repair Diagnosis" : "View Maintenance Request",
          primaryActionHref: userRole === "INSPECTOR"
            ? "/dashboard/inspector/active"
            : `/dashboard/maintenance/${event.metadata?.requestId || ""}`,
        };
      case "INSPECTION":
        return {
          label: event.metadata?.walkthroughType === "PRELIMINARY" ? "Move-In Inspection" : "Move-Out Walkthrough",
          pillBg: "bg-purple-50 text-purple-700 border-purple-200/80 font-medium text-[10px] uppercase tracking-wider rounded-md",
          icon: ClipboardCheck,
          primaryActionLabel: userRole === "INSPECTOR" ? "Conduct Walkthrough" : "View Inspection Details",
          primaryActionHref: userRole === "INSPECTOR"
            ? `/dashboard/inspector/inspections/${event.metadata?.leaseId}?type=${event.metadata?.walkthroughType || "FINAL"}`
            : `/dashboard/leases/${event.metadata?.leaseId || ""}`,
        };
      case "LEASE":
        return {
          label: "Lease Expiration",
          pillBg: "bg-rose-50 text-rose-700 border-rose-200/80 font-medium text-[10px] uppercase tracking-wider rounded-md",
          icon: FileText,
          primaryActionLabel: userRole === "OWNER" ? "Offer Lease Renewal" : "View Lease Agreement",
          primaryActionHref: `/dashboard/leases/${event.metadata?.leaseId || ""}`,
        };
      case "TOUR":
        return {
          label: "Prospect Property Tour",
          pillBg: "bg-sky-50 text-sky-700 border-sky-200/80 font-medium text-[10px] uppercase tracking-wider rounded-md",
          icon: Eye,
          primaryActionLabel: "Manage Showing Tours",
          primaryActionHref: "/dashboard/tours",
        };
      default:
        return {
          label: "Scheduled Activity",
          pillBg: "bg-slate-100 text-slate-700 border-slate-200/80 font-medium text-[10px] uppercase tracking-wider rounded-md",
          icon: CalendarIcon,
          primaryActionLabel: "View Details",
          primaryActionHref: "#",
        };
    }
  };

  const theme = getCategoryTheme();
  const CategoryIcon = theme.icon;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-slate-950/40 backdrop-blur-xs flex justify-end transition-all animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-lg sm:max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-300">
        
        {/* ── HEADER ── */}
        <div className="p-6 sm:p-7 bg-white border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border ${theme.pillBg}`}>
              <CategoryIcon className="h-3.5 w-3.5" />
              {theme.label}
            </span>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs flex items-center justify-center transition-all cursor-pointer"
              title="Close Preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight leading-snug">{event.title}</h2>
            <div className="flex items-center gap-2 text-xs font-normal text-[#6E6E73] mt-1.5">
              <Clock className="h-3.5 w-3.5 text-[#6E6E73]" />
              <span>{format(eventDate, "EEEE, MMMM d, yyyy")}</span>
              <span>&bull;</span>
              <span>{format(eventDate, "h:mm a")}</span>
            </div>
          </div>
        </div>

        {/* ── CONTENT BODY ── */}
        <div className="p-6 sm:p-7 space-y-4 flex-1 overflow-y-auto">
          
          {/* Overdue Payment Alert Banner */}
          {event.type === "PAYMENT" && isOverdue && (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-start gap-3 text-rose-900 shadow-2xs">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-rose-800">Payment Overdue</p>
                <p className="text-xs font-normal text-rose-700 mt-0.5">
                  This payment was due on {format(eventDate, "MMM d, yyyy")}. Please settle immediately to avoid late fee penalties.
                </p>
              </div>
            </div>
          )}

          {/* Lease Expiration Countdown Badge */}
          {event.type === "LEASE" && daysUntilLeaseEnd !== null && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-2xs ${
              daysUntilLeaseEnd <= 30
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-slate-50 border-slate-200 text-slate-900"
            }`}>
              <div className="flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-rose-600" />
                <span className="text-xs font-semibold">Expiration Countdown</span>
              </div>
              <span className="px-3 py-1 bg-white rounded-xl border border-rose-200 text-xs font-medium text-rose-700 shadow-2xs">
                {daysUntilLeaseEnd < 0 ? "Expired" : `${daysUntilLeaseEnd} Days Left`}
              </span>
            </div>
          )}

          {/* Property & Unit Card */}
          {event.metadata?.propertyName && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3.5 shadow-2xs">
              <div className="h-11 w-11 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                <Building className="h-5 w-5 text-[#1D1D1F]" />
              </div>
              <div>
                <p className="text-xs font-normal text-[#6E6E73]">Property &amp; Unit</p>
                <p className="text-xs font-semibold text-[#1D1D1F]">
                  {event.metadata.propertyName}
                  {event.metadata.unitNumber ? ` \u2022 Unit ${event.metadata.unitNumber}` : ""}
                </p>
              </div>
            </div>
          )}

          {/* Tenant Name Card */}
          {event.metadata?.tenantName && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3.5 shadow-2xs">
              <div className="h-11 w-11 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                <User className="h-5 w-5 text-[#1D1D1F]" />
              </div>
              <div>
                <p className="text-xs font-normal text-[#6E6E73]">
                  {event.type === "TOUR" ? "Prospect Name" : "Tenant"}
                </p>
                <p className="text-xs font-semibold text-[#1D1D1F]">{event.metadata.tenantName}</p>
              </div>
            </div>
          )}

          {/* Prospect Contact Details (For TOUR Events - Owner & Admin Scope) */}
          {event.type === "TOUR" && (userRole === "OWNER" || userRole === "SUPERADMIN") && (
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3 shadow-2xs">
              <p className="text-xs font-normal text-blue-900 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-blue-700" />
                Prospect Contact Information
              </p>
              <div className="space-y-2 text-xs font-normal text-slate-800">
                {event.metadata?.tenantEmail && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#6E6E73] flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-blue-600" /> Email:
                    </span>
                    <a href={`mailto:${event.metadata.tenantEmail}`} className="font-semibold text-[#1D1D1F] hover:underline">
                      {event.metadata.tenantEmail}
                    </a>
                  </div>
                )}
                {event.metadata?.tenantPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#6E6E73] flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-blue-600" /> Phone:
                    </span>
                    <a href={`tel:${event.metadata.tenantPhone}`} className="font-semibold text-[#1D1D1F] hover:underline">
                      {event.metadata.tenantPhone}
                    </a>
                  </div>
                )}
                {event.metadata?.tourType && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#6E6E73] flex items-center gap-1.5">
                      {event.metadata.tourType === "VIRTUAL" ? <Video className="h-3.5 w-3.5 text-purple-600" /> : <MapPin className="h-3.5 w-3.5 text-emerald-600" />} Tour Format:
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-[10px] font-medium uppercase text-blue-900">
                      {event.metadata.tourType}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amount Card for Payment events */}
          {event.metadata?.amount && (
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-normal text-emerald-800">Total Amount Due</p>
                  <p className="text-2xl font-semibold text-emerald-950">${Number(event.metadata.amount).toLocaleString()}</p>
                </div>
              </div>

              {event.metadata?.status && (
                <span className="px-2.5 py-1 bg-white text-emerald-800 rounded-lg text-xs font-medium uppercase tracking-wider border border-emerald-300 shadow-2xs">
                  {event.metadata.status}
                </span>
              )}
            </div>
          )}

          {/* Priority Chip */}
          {event.priority && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-normal text-[#6E6E73] shadow-2xs">
              <span>Priority Status</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border ${
                event.priority === "EMERGENCY" ? "bg-rose-50 text-rose-700 border-rose-200" :
                event.priority === "HIGH" ? "bg-amber-50 text-amber-800 border-amber-200" :
                "bg-slate-100 text-slate-700 border-slate-200"
              }`}>
                {event.priority}
              </span>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="p-6 sm:p-7 bg-slate-50/80 border-t border-slate-200 space-y-2.5">
          <Link href={theme.primaryActionHref} onClick={onClose} className="block">
            <Button className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer border-none">
              {theme.primaryActionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          {/* Additional Contact Quick Action for Prospect Tours */}
          {event.type === "TOUR" && event.metadata?.tenantPhone && (
            <a href={`tel:${event.metadata.tenantPhone}`} className="block">
              <Button type="button" variant="outline" className="w-full h-9 border border-slate-200 text-[#1D1D1F] hover:bg-slate-100 font-medium text-xs rounded-xl flex items-center justify-center gap-2 shadow-2xs cursor-pointer">
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                Call Prospect ({event.metadata.tenantPhone})
              </Button>
            </a>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full h-9 border border-slate-200 text-[#6E6E73] hover:bg-slate-100 font-medium text-xs rounded-xl shadow-2xs cursor-pointer"
          >
            Close Preview
          </Button>
        </div>

      </div>
    </div>
  );
}

