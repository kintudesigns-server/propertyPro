"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Clock,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Video,
  Star,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  RotateCcw,
  ExternalLink,
  Search,
  Building2,
  Home,
  AlertTriangle,
  ChevronRight,
  Settings,
  Copy,
  X,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getTimezoneForState, formatDateTimeInTimezone } from "@/lib/timezones";

interface Tour {
  id: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantMessage?: string | null;
  tourType: "IN_PERSON" | "VIDEO_CALL";
  scheduledAt: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  rescheduledAt?: string | null;
  meetingLink?: string | null;
  ownerNotes?: string | null;
  ownerProspectRating?: number | null;
  ownerProspectNotes?: string | null;
  feedbackRating: number | null;
  feedbackComments: string | null;
  feedbackCategories?: {
    propertyCondition?: number;
    photoAccuracy?: number;
    landlordPunctuality?: number;
    neighborhoodSafety?: number;
  } | null;
  verifiedEmail?: boolean;
  createdAt: string;
  property: { name: string; address: string; city?: string; state?: string };
  unit?: { name: string } | null;
}

const STATUS_THEMES = {
  PENDING: {
    label: "Pending Review",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-slate-100 text-[#6E6E73] border-slate-200",
    dot: "bg-slate-400",
  },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= rating ? "text-amber-400 fill-amber-400" : "text-[#EBEBF0]"
          }`}
        />
      ))}
    </div>
  );
}

export default function ToursDashboard() {
  const { data: session } = useSession();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected tour for Side Drawer
  const [detailTour, setDetailTour] = useState<Tour | null>(null);

  // Form inputs for detail drawer
  const [meetingLinkInput, setMeetingLinkInput] = useState("");
  const [ownerNotesInput, setOwnerNotesInput] = useState("");
  const [cancelReasonInput, setCancelReasonInput] = useState("");
  const [sendApplicationInvite, setSendApplicationInvite] = useState(true);
  const [prospectNotesInput, setProspectNotesInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Availability Settings Modal
  const [availabilityOpen, setAvailabilityOpen] = useState(false);

  async function fetchTours() {
    try {
      setLoading(true);
      const res = await fetch("/api/tours");
      if (!res.ok) throw new Error("Failed to load tour requests");
      const data = await res.json();
      const sorted = (data || []).sort(
        (a: Tour, b: Tour) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTours(sorted);
      if (detailTour) {
        const updated = sorted.find((t: Tour) => t.id === detailTour.id);
        if (updated) setDetailTour(updated);
      }
    } catch (err: any) {
      toast.error(err.message || "Could not load tour schedules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTours();
  }, []);

  // Sync inputs when detailTour changes
  useEffect(() => {
    if (detailTour) {
      setOwnerNotesInput(detailTour.ownerNotes || "");
      setMeetingLinkInput(detailTour.meetingLink || "");
      setCancelReasonInput(detailTour.cancellationReason || "");
      setSendApplicationInvite(true);
      setProspectNotesInput(detailTour.ownerProspectNotes || "");
    }
  }, [detailTour]);

  // Handle ESC key to close side drawer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && detailTour) {
        setDetailTour(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailTour]);

  // Actions
  async function handleConfirm(tour: Tour) {
    if (tour.tourType === "VIDEO_CALL" && !meetingLinkInput.trim()) {
      toast.error("Please enter a meeting link (Zoom, Google Meet, etc.)");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CONFIRMED",
          ownerNotes: ownerNotesInput,
          meetingLink: meetingLinkInput || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Tour confirmed! Email & calendar invite sent to prospect.");
        setDetailTour(null);
        fetchTours();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to confirm tour");
      }
    } catch (err) {
      toast.error("Error confirming tour");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel(tour: Tour) {
    if (!cancelReasonInput.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          cancellationReason: cancelReasonInput,
        }),
      });
      if (res.ok) {
        toast.success("Tour request cancelled. Prospect has been notified.");
        setDetailTour(null);
        fetchTours();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to cancel tour");
      }
    } catch (err) {
      toast.error("Error cancelling tour");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete(tour: Tour) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          sendApplicationInvite,
          ownerProspectNotes: prospectNotesInput,
        }),
      });
      if (res.ok) {
        if (sendApplicationInvite) {
          toast.success("Tour completed & application invite sent to prospect!");
        } else {
          toast.success("Tour marked as completed.");
        }
        setDetailTour(null);
        fetchTours();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to complete tour");
      }
    } catch (err) {
      toast.error("Error updating tour status");
    } finally {
      setActionLoading(false);
    }
  }

  // Statistics
  const counts = {
    ALL: tours.length,
    PENDING: tours.filter((t) => t.status === "PENDING").length,
    CONFIRMED: tours.filter((t) => t.status === "CONFIRMED").length,
    COMPLETED: tours.filter((t) => t.status === "COMPLETED").length,
    CANCELLED: tours.filter((t) => t.status === "CANCELLED").length,
  };

  // Filtered tours
  const filteredTours = tours.filter((t) => {
    const matchesTab = activeTab === "ALL" || t.status === activeTab;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      t.tenantName.toLowerCase().includes(q) ||
      t.tenantEmail.toLowerCase().includes(q) ||
      t.property.name.toLowerCase().includes(q);
    return matchesTab && matchesQuery;
  });

  const emailCounts: Record<string, number> = {};
  tours.forEach((t) => {
    emailCounts[t.tenantEmail] = (emailCounts[t.tenantEmail] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 relative">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Showings & Tours
            </h1>
            <p className="text-[#6E6E73] text-xs md:text-sm mt-0.5">
              Review prospect tour requests, send meeting details, and manage your property showing schedule.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setAvailabilityOpen(true)}
              className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-[#F5F5F7]"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5 text-[#6E6E73]" />
              Availability Hours
            </Button>
            <Button
              onClick={fetchTours}
              variant="outline"
              className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-[#F5F5F7]"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              title: "Pending Approval",
              count: counts.PENDING,
              color: "amber",
              text: "Action required",
              border: "border-amber-200/60 bg-amber-50/40",
              badgeColor: "text-amber-700",
            },
            {
              title: "Confirmed Visits",
              count: counts.CONFIRMED,
              color: "blue",
              text: "Upcoming tours",
              border: "border-blue-200/60 bg-blue-50/40",
              badgeColor: "text-blue-700",
            },
            {
              title: "Completed",
              count: counts.COMPLETED,
              color: "emerald",
              text: "Past showings",
              border: "border-emerald-200/60 bg-emerald-50/40",
              badgeColor: "text-emerald-700",
            },
            {
              title: "Cancelled",
              count: counts.CANCELLED,
              color: "slate",
              text: "Inactive requests",
              border: "border-slate-200/60 bg-slate-100/50",
              badgeColor: "text-[#6E6E73]",
            },
          ].map((m) => (
            <Card
              key={m.title}
              className={`rounded-2xl border shadow-xs transition-all ${m.border}`}
            >
              <CardContent className="p-4">
                <p
                  className={`text-[10px] font-extrabold uppercase tracking-wider ${m.badgeColor}`}
                >
                  {m.title}
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {m.count}
                </p>
                <p className="text-[11px] text-[#6E6E73] font-medium mt-0.5">
                  {m.text}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Search & Tab Navigation ── */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
            {(
              [
                { key: "ALL", label: "All Showings" },
                { key: "PENDING", label: "Pending" },
                { key: "CONFIRMED", label: "Confirmed" },
                { key: "COMPLETED", label: "Completed" },
                { key: "CANCELLED", label: "Cancelled" },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.key;
              const count = counts[tab.key];
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-[#6E6E73] hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        active
                          ? "bg-slate-100 text-slate-700"
                          : "bg-slate-200/70 text-[#6E6E73]"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8E8E93]" />
            <Input
              placeholder="Search prospect or property..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        </div>

        {/* ── Main Tour Cards List ── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-[#8E8E93] text-xs font-semibold">
            Loading tour requests...
          </div>
        ) : filteredTours.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <CalendarIcon className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No tours match your current filter</p>
            <p className="text-xs text-[#8E8E93] max-w-sm mx-auto">
              When prospective renters request to view your properties, their booking slots will appear right here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTours.map((tour) => {
              const tz = getTimezoneForState(tour.property?.state);
              const { dateStr, timeStr, tzAbbrev } = formatDateTimeInTimezone(
                tour.scheduledAt,
                tz
              );

              // Parse date parts for the left date badge
              const dateObj = new Date(tour.scheduledAt);
              const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
              const monthName = dateObj.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
              const dayNum = dateObj.getDate();

              const theme = STATUS_THEMES[tour.status];
              const isMultiBooker = (emailCounts[tour.tenantEmail] || 0) > 1;
              const isSelected = detailTour?.id === tour.id;

              return (
                <div
                  key={tour.id}
                  onClick={() => setDetailTour(tour)}
                  className={`bg-white rounded-2xl border shadow-2xs hover:shadow-md transition-all p-4 md:p-5 cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20"
                      : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  {/* Left & Middle Block */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    
                    {/* Date Badge Box */}
                    <div className="w-16 shrink-0 bg-slate-50 border border-slate-200/80 rounded-xl p-2 text-center flex flex-col items-center justify-center">
                      <span className="text-[9px] font-black tracking-wider text-[#8E8E93] uppercase">
                        {dayName}
                      </span>
                      <span className="text-lg font-black text-slate-900 leading-tight">
                        {dayNum}
                      </span>
                      <span className="text-[9px] font-bold text-[#6E6E73] uppercase">
                        {monthName}
                      </span>
                    </div>

                    {/* Content Section */}
                    <div className="min-w-0 flex-1 space-y-1">
                      
                      {/* Name & Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm md:text-base group-hover:text-blue-600 transition-colors">
                          {tour.tenantName}
                        </h3>

                        {tour.verifiedEmail && (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 rounded-full text-[10px] font-bold px-2 py-0">
                            <ShieldCheck className="h-3 w-3 mr-0.5 text-blue-600" />
                            Verified
                          </Badge>
                        )}

                        {isMultiBooker && (
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200 rounded-full text-[10px] font-bold px-2 py-0">
                            <ShieldAlert className="h-3 w-3 mr-0.5 text-amber-600" />
                            Multi-Request
                          </Badge>
                        )}

                        {tour.rescheduledAt && (
                          <Badge className="bg-purple-50 text-purple-700 border-purple-200 rounded-full text-[10px] font-bold px-2 py-0">
                            <RotateCcw className="h-3 w-3 mr-0.5 text-purple-600" />
                            Rescheduled
                          </Badge>
                        )}
                      </div>

                      {/* Property & Time Details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6E6E73]">
                        <span className="flex items-center gap-1 font-semibold text-slate-800">
                          <Building2 className="h-3.5 w-3.5 text-[#8E8E93]" />
                          {tour.property.name}
                          {tour.unit && (
                            <span className="text-[#6E6E73] font-normal">
                              · Unit {tour.unit.name}
                            </span>
                          )}
                        </span>

                        <span className="flex items-center gap-1 text-[#6E6E73]">
                          <Clock className="h-3.5 w-3.5 text-[#8E8E93]" />
                          {timeStr} <span className="text-[10px] font-bold text-[#8E8E93]">{tzAbbrev}</span>
                        </span>

                        <span className="flex items-center gap-1 font-semibold text-[#6E6E73]">
                          {tour.tourType === "VIDEO_CALL" ? (
                            <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md text-[11px]">
                              <Video className="h-3 w-3" /> Virtual Video Call
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[#6E6E73] bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              <MapPin className="h-3 w-3 text-[#8E8E93]" /> In-Person Visit
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Tenant Message */}
                      {tour.tenantMessage && (
                        <p className="text-xs text-[#6E6E73] italic truncate max-w-xl bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 mt-1">
                          "{tour.tenantMessage}"
                        </p>
                      )}

                      {/* Cancellation Reason Preview */}
                      {tour.status === "CANCELLED" && tour.cancellationReason && (
                        <p className="text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{tour.cancellationReason}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions & Status Block */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    
                    {/* Status Badge */}
                    <Badge className={`rounded-full text-xs font-bold px-3 py-1 border ${theme.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${theme.dot}`} />
                      {theme.label}
                    </Badge>

                    {/* Contextual Action Button */}
                    <div>
                      {tour.status === "PENDING" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailTour(tour);
                          }}
                          className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs"
                        >
                          Review Request
                        </Button>
                      )}

                      {tour.status === "CONFIRMED" && (
                        <div className="flex items-center gap-1.5">
                          {tour.meetingLink && tour.tourType === "VIDEO_CALL" && (
                            <a
                              href={tour.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="h-8 px-2.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl flex items-center gap-1 transition-colors"
                            >
                              <Video className="h-3.5 w-3.5" /> Join
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailTour(tour);
                            }}
                            className="h-8 px-3 text-xs font-bold border-slate-200 text-slate-700 hover:bg-[#F5F5F7] rounded-xl"
                          >
                            Manage
                          </Button>
                        </div>
                      )}

                      {tour.status === "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailTour(tour);
                          }}
                          className="h-8 px-3 text-xs font-semibold text-[#6E6E73] hover:text-[#1D1D1F] rounded-xl"
                        >
                          Details & Rating
                        </Button>
                      )}

                      {tour.status === "CANCELLED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailTour(tour);
                          }}
                          className="h-8 px-2 text-xs font-semibold text-[#8E8E93] hover:text-[#6E6E73] rounded-xl"
                        >
                          View Details
                        </Button>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#6E6E73] transition-colors hidden md:block" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SLIDE-OVER SIDE DRAWER FOR TOUR DETAILS ── */}
        {detailTour && (() => {
          const tz = getTimezoneForState(detailTour.property?.state);
          const { dateStr, timeStr, tzAbbrev } = formatDateTimeInTimezone(
            detailTour.scheduledAt,
            tz
          );

          return (
            <div className="fixed inset-0 z-50 overflow-hidden">
              {/* Backdrop */}
              <div
                onClick={() => setDetailTour(null)}
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              />

              <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                {/* Slide Drawer Content */}
                <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
                  
                  {/* Drawer Header */}
                  <div className="bg-slate-950 text-white p-6 shrink-0 relative">
                    <button
                      onClick={() => setDetailTour(null)}
                      className="absolute top-5 right-5 text-[#8E8E93] hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] font-mono uppercase px-2 py-0.5">
                          Ref #{detailTour.id.slice(-6).toUpperCase()}
                        </Badge>
                        <Badge className={`rounded-full text-xs font-bold px-3 py-0.5 border ${STATUS_THEMES[detailTour.status].badge}`}>
                          {STATUS_THEMES[detailTour.status].label}
                        </Badge>
                      </div>

                      <div>
                        <h2 className="text-xl font-black text-white">{detailTour.tenantName}</h2>
                        <div className="flex items-center gap-3 text-xs text-[#8E8E93] mt-1">
                          <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{detailTour.tenantEmail}</span>
                          <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{detailTour.tenantPhone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Drawer Body (Scrollable) */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Schedule & Property */}
                    <div className="grid grid-cols-2 gap-3">
                      
                      {/* Schedule Box */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
                        <p className="text-[10px] font-black uppercase text-[#8E8E93] tracking-wider">Schedule</p>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pt-0.5">
                          <CalendarIcon className="h-3.5 w-3.5 text-[#6E6E73]" />
                          {dateStr}
                        </p>
                        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#6E6E73]" />
                          {timeStr} <span className="text-[#8E8E93] text-[10px]">{tzAbbrev}</span>
                        </p>
                      </div>

                      {/* Property Box */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
                        <p className="text-[10px] font-black uppercase text-[#8E8E93] tracking-wider">Property</p>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pt-0.5 truncate">
                          <Building2 className="h-3.5 w-3.5 text-[#6E6E73] shrink-0" />
                          <span className="truncate">{detailTour.property.name}</span>
                        </p>
                        <p className="text-xs text-[#6E6E73] truncate pl-5">
                          {detailTour.unit ? `Unit ${detailTour.unit.name}` : detailTour.property.address}
                        </p>
                      </div>
                    </div>

                    {/* Format Type */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase text-[#8E8E93] tracking-wider">Showing Format</p>
                        <p className="text-xs font-bold text-slate-900">
                          {detailTour.tourType === "VIDEO_CALL" ? "Virtual Video Walkthrough" : "In-Person Property Visit"}
                        </p>
                      </div>
                      <Badge className="bg-white border-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1">
                        {detailTour.tourType === "VIDEO_CALL" ? <Video className="h-3.5 w-3.5 mr-1 text-purple-600" /> : <MapPin className="h-3.5 w-3.5 mr-1 text-[#6E6E73]" />}
                        {detailTour.tourType === "VIDEO_CALL" ? "Video Call" : "In-Person"}
                      </Badge>
                    </div>

                    {/* Tenant Request Message */}
                    {detailTour.tenantMessage && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">
                          Prospect Request Note
                        </Label>
                        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 text-xs text-slate-800 italic leading-relaxed">
                          "{detailTour.tenantMessage}"
                        </div>
                      </div>
                    )}

                    {/* Virtual Meeting Link */}
                    {detailTour.meetingLink && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">
                          Virtual Tour Meeting Link
                        </Label>
                        <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-2xl p-3">
                          <a
                            href={detailTour.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1.5 truncate"
                          >
                            <Video className="h-4 w-4 shrink-0" />
                            <span className="truncate">{detailTour.meetingLink}</span>
                          </a>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(detailTour.meetingLink || "");
                              toast.success("Meeting link copied!");
                            }}
                            className="h-7 px-2 text-purple-700 hover:bg-purple-100 rounded-lg text-xs"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Completed Tour Ratings & Feedback */}
                    {detailTour.status === "COMPLETED" && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">
                          Prospect Tour Feedback
                        </p>
                        
                        {detailTour.feedbackRating ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">Prospect Tour Rating:</span>
                            <StarRating rating={detailTour.feedbackRating} />
                            <span className="text-xs font-bold text-slate-900">({detailTour.feedbackRating}/5)</span>
                          </div>
                        ) : (
                          <p className="text-xs text-[#6E6E73] font-medium italic">
                            ⏳ Awaiting prospect feedback rating...
                          </p>
                        )}

                        {detailTour.feedbackComments && (
                          <p className="text-xs text-slate-700 bg-amber-50/80 p-3 rounded-xl border border-amber-200">
                            <span className="font-bold text-amber-900">Prospect Comments:</span> "{detailTour.feedbackComments}"
                          </p>
                        )}

                        {detailTour.ownerProspectNotes && (
                          <p className="text-xs text-[#6E6E73] bg-white p-3 rounded-xl border border-slate-200">
                            <span className="font-bold text-slate-800">Private Owner Notes:</span> {detailTour.ownerProspectNotes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Decline / Cancel Reason preview */}
                    {detailTour.status === "CANCELLED" && detailTour.cancellationReason && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                          Cancellation Reason
                        </Label>
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 font-medium">
                          {detailTour.cancellationReason}
                        </div>
                      </div>
                    )}

                    {/* ── Interactive Setup Forms (Inside Drawer Body) ── */}
                    {detailTour.status === "PENDING" && (
                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          Confirm Tour Details
                        </h4>

                        {detailTour.tourType === "VIDEO_CALL" && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">
                              Video Call Meeting Link <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                              placeholder="https://meet.google.com/xyz-abc or Zoom link"
                              value={meetingLinkInput}
                              onChange={(e) => setMeetingLinkInput(e.target.value)}
                              className="bg-slate-50 border-slate-200 rounded-xl h-10 text-xs"
                            />
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">
                            {detailTour.tourType === "VIDEO_CALL"
                              ? "Virtual Tour Instructions / Agenda (Emailed to Prospect)"
                              : "Entry & Parking Instructions (Emailed to Prospect)"}
                          </Label>
                          <textarea
                            placeholder={
                              detailTour.tourType === "VIDEO_CALL"
                                ? "e.g. Please join the link 5 mins early. Prepare any questions about floor plans or lease terms."
                                : "e.g. Dial #402 at front gate. Park in guest bay B."
                            }
                            value={ownerNotesInput}
                            onChange={(e) => setOwnerNotesInput(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>
                    )}

                    {detailTour.status === "CONFIRMED" && (
                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          Complete Showing & Next Steps
                        </h4>

                        <label className="flex items-start gap-3 bg-blue-50/80 border border-blue-200/80 p-3.5 rounded-2xl cursor-pointer hover:bg-blue-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={sendApplicationInvite}
                            onChange={(e) => setSendApplicationInvite(e.target.checked)}
                            className="mt-0.5 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                          />
                          <div>
                            <span className="text-xs font-bold text-blue-950 block">
                              Invite Prospect to Submit Rental Application
                            </span>
                            <span className="text-[11px] text-blue-700/90 font-medium leading-normal block mt-0.5">
                              Automatically notifies {detailTour.tenantName} to submit a rental application for {detailTour.property.name}.
                            </span>
                          </div>
                        </label>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700">
                            Private Owner Notes (Optional)
                          </Label>
                          <textarea
                            placeholder="e.g. Prospect interested in Aug 1st move-in date."
                            value={prospectNotesInput}
                            onChange={(e) => setProspectNotesInput(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>
                    )}

                    {/* Cancellation Reason input field */}
                    {(detailTour.status === "PENDING" || detailTour.status === "CONFIRMED") && (
                      <div className="space-y-1.5 pt-4 border-t border-slate-200">
                        <Label className="text-xs font-bold text-slate-700">
                          Decline / Cancellation Reason (If declining)
                        </Label>
                        <Input
                          placeholder="e.g. Unit has been leased / Owner unavailable"
                          value={cancelReasonInput}
                          onChange={(e) => setCancelReasonInput(e.target.value)}
                          className="bg-slate-50 border-slate-200 rounded-xl h-9 text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Drawer Footer Actions */}
                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setDetailTour(null)}
                      className="h-9 text-xs font-bold rounded-xl text-[#6E6E73]"
                    >
                      Close
                    </Button>

                    <div className="flex items-center gap-2">
                      {detailTour.status === "PENDING" && (
                        <>
                          <Button
                            variant="outline"
                            disabled={actionLoading || !cancelReasonInput.trim()}
                            onClick={() => handleCancel(detailTour)}
                            className="h-9 text-xs font-bold rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                          >
                            Decline Request
                          </Button>
                          <Button
                            disabled={actionLoading}
                            onClick={() => handleConfirm(detailTour)}
                            className="h-9 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Confirm & Send Email
                          </Button>
                        </>
                      )}

                      {detailTour.status === "CONFIRMED" && (
                        <>
                          <Button
                            variant="outline"
                            disabled={actionLoading || !cancelReasonInput.trim()}
                            onClick={() => handleCancel(detailTour)}
                            className="h-9 text-xs font-bold rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                          >
                            Cancel Tour
                          </Button>
                          <Button
                            disabled={actionLoading}
                            onClick={() => handleComplete(detailTour)}
                            className="h-9 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Mark as Completed
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Availability Hours Info Modal ── */}
        <Dialog open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
          <DialogContent className="bg-white rounded-3xl max-w-md p-6 border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-slate-900">
                Owner Showing Availability
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6E6E73]">
                Your available tour slots are automatically enforced when prospective tenants request showings on your property listings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700 font-bold border-b border-slate-200/60 pb-2">
                  <span>Standard Hours</span>
                  <span className="text-blue-600">Mon - Fri: 9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 font-bold border-b border-slate-200/60 pb-2">
                  <span>Weekend Hours</span>
                  <span className="text-blue-600">Saturday: 10:00 AM - 2:00 PM</span>
                </div>
                <div className="flex items-center justify-between text-[#6E6E73] font-semibold">
                  <span>Timezone</span>
                  <span className="font-mono text-[11px]">America/Los_Angeles (PDT)</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setAvailabilityOpen(false)}
                className="w-full h-9 rounded-xl font-bold bg-[#007AFF] text-white text-xs"
              >
                Got It
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
