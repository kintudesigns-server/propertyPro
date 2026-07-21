"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Star,
  Video,
  Info,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Search,
  Building2,
  Home,
  X,
  FileText,
  Copy,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
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
  feedbackRating: number | null;
  feedbackComments: string | null;
  feedbackCategories?: {
    propertyCondition?: number;
    photoAccuracy?: number;
    landlordPunctuality?: number;
    neighborhoodSafety?: number;
  } | null;
  createdAt: string;
  property: {
    id: string;
    name: string;
    address: string;
    city?: string;
    state?: string;
  };
  unit?: {
    id: string;
    name: string;
  } | null;
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

function StarRow({ rating }: { rating: number }) {
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

export default function TenantToursPage() {
  const { data: session } = useSession();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Slide drawer / detail modal
  const [detailTour, setDetailTour] = useState<Tour | null>(null);

  // Cancel Modal State
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionTour, setActionTour] = useState<Tour | null>(null);

  // Reschedule Modal State
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("09:00:00");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Feedback Modal State (Single Overall Rating)
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState("");

  async function fetchTours() {
    try {
      setLoading(true);
      const res = await fetch("/api/tours");
      if (!res.ok) throw new Error("Failed to load your tours");
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
      toast.error(err.message || "Could not retrieve showing tours");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTours();
  }, []);

  // Keyboard shortcut (ESC closes drawer)
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
  const handleCancelTour = async () => {
    const target = actionTour || detailTour;
    if (!target) return;
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancelling.");
      return;
    }

    try {
      const res = await fetch(`/api/tours/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          cancellationReason: cancelReason,
        }),
      });

      if (res.ok) {
        toast.success("Tour has been successfully cancelled.");
        setCancelOpen(false);
        setCancelReason("");
        setActionTour(null);
        setDetailTour(null);
        fetchTours();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to cancel tour");
      }
    } catch (err) {
      toast.error("Error cancelling tour");
    }
  };

  const handleRescheduleTour = async () => {
    const target = actionTour || detailTour;
    if (!target || !rescheduleDate || !rescheduleTime) {
      toast.error("Please select a date and time slot.");
      return;
    }

    setRescheduleLoading(true);
    try {
      const newScheduledAt = `${rescheduleDate}T${rescheduleTime}`;
      const res = await fetch(`/api/tours/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: newScheduledAt,
        }),
      });

      if (res.ok) {
        toast.success("Tour successfully rescheduled!");
        setRescheduleOpen(false);
        setActionTour(null);
        setDetailTour(null);
        fetchTours();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to reschedule tour");
      }
    } catch (err) {
      toast.error("Error rescheduling tour");
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleSendFeedback = async () => {
    const target = actionTour || detailTour;
    if (!target) return;

    try {
      const res = await fetch(`/api/tours/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackRating: userRating,
          feedbackComments,
        }),
      });

      if (res.ok) {
        toast.success(
          "Thank you! Your feedback has been sent to the property manager."
        );
        setFeedbackOpen(false);
        setFeedbackComments("");
        setUserRating(5);
        setActionTour(null);
        setDetailTour(null);
        fetchTours();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit feedback");
      }
    } catch (err) {
      toast.error("Error submitting feedback");
    }
  };

  // Metrics
  const counts = {
    ALL: tours.length,
    CONFIRMED: tours.filter((t) => t.status === "CONFIRMED").length,
    PENDING: tours.filter((t) => t.status === "PENDING").length,
    COMPLETED: tours.filter((t) => t.status === "COMPLETED").length,
    CANCELLED: tours.filter((t) => t.status === "CANCELLED").length,
  };

  const filteredTours = tours.filter((t) => {
    const matchesTab = activeTab === "ALL" || t.status === activeTab;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      t.property.name.toLowerCase().includes(q) ||
      t.property.address.toLowerCase().includes(q);
    return matchesTab && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 relative">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              My Showings & Tours
            </h1>
            <p className="text-[#6E6E73] text-xs md:text-sm mt-0.5">
              Manage your upcoming property viewings, access virtual meeting links, and leave feedback.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/listings">
              <Button className="h-9 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-2xs">
                Browse Properties <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              title: "Confirmed Visits",
              count: counts.CONFIRMED,
              color: "blue",
              sub: "Upcoming showings",
              border: "border-blue-200/60 bg-blue-50/40",
              text: "text-blue-700",
            },
            {
              title: "Pending Review",
              count: counts.PENDING,
              color: "amber",
              sub: "Awaiting owner response",
              border: "border-amber-200/60 bg-amber-50/40",
              text: "text-amber-700",
            },
            {
              title: "Completed Showings",
              count: counts.COMPLETED,
              color: "emerald",
              sub: "Visited properties",
              border: "border-emerald-200/60 bg-emerald-50/40",
              text: "text-emerald-700",
            },
            {
              title: "Cancelled",
              count: counts.CANCELLED,
              color: "slate",
              sub: "Inactive requests",
              border: "border-slate-200/60 bg-slate-100/50",
              text: "text-[#6E6E73]",
            },
          ].map((m) => (
            <Card
              key={m.title}
              className={`rounded-2xl border shadow-xs transition-all ${m.border}`}
            >
              <CardContent className="p-4">
                <p className={`text-[10px] font-extrabold uppercase tracking-wider ${m.text}`}>
                  {m.title}
                </p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {m.count}
                </p>
                <p className="text-[11px] text-[#6E6E73] font-medium mt-0.5">
                  {m.sub}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Search & Filter Navigation ── */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
            {(
              [
                { key: "ALL", label: "All Tours" },
                { key: "CONFIRMED", label: "Confirmed" },
                { key: "PENDING", label: "Pending" },
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

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8E8E93]" />
            <Input
              placeholder="Search property or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        </div>

        {/* ── Main Tour Cards List ── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-[#8E8E93] text-xs font-semibold">
            Loading tour schedules...
          </div>
        ) : filteredTours.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <CalendarIcon className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No showings match your filter</p>
            <p className="text-xs text-[#8E8E93] max-w-sm mx-auto">
              Schedule your next property walkthrough directly from any property listing!
            </p>
            <Link href="/listings" className="inline-block pt-2">
              <Button size="sm" className="bg-blue-600 text-white font-bold text-xs rounded-xl px-4">
                Explore Available Listings
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTours.map((tour) => {
              const tz = getTimezoneForState(tour.property?.state);
              const { dateStr, timeStr, tzAbbrev } = formatDateTimeInTimezone(
                tour.scheduledAt,
                tz
              );

              const dateObj = new Date(tour.scheduledAt);
              const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
              const monthName = dateObj.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
              const dayNum = dateObj.getDate();

              const theme = STATUS_THEMES[tour.status];
              const isSelected = detailTour?.id === tour.id;

              const hoursUntil =
                (new Date(tour.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
              const isWithin24h =
                tour.status === "CONFIRMED" && hoursUntil > 0 && hoursUntil < 24;

              return (
                <Card
                  key={tour.id}
                  onClick={() => setDetailTour(tour)}
                  className={`bg-white rounded-2xl border shadow-2xs hover:shadow-md transition-all cursor-pointer overflow-hidden ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-500/20"
                      : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <CardContent className="p-4 md:p-5 space-y-4">
                    
                    {/* Top Row: Date Box + Property Info + Status */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
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

                        {/* Title & Info */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-base hover:text-blue-600 transition-colors">
                              {tour.property.name}
                            </h3>
                            {tour.unit && (
                              <Badge className="bg-slate-100 text-slate-700 border-slate-200 rounded-md text-[11px] font-bold px-2 py-0">
                                Unit {tour.unit.name}
                              </Badge>
                            )}
                            {tour.rescheduledAt && (
                              <Badge className="bg-purple-50 text-purple-700 border-purple-200 rounded-full text-[10px] font-bold px-2 py-0">
                                <RotateCcw className="h-3 w-3 mr-0.5 text-purple-600" />
                                Rescheduled
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-[#6E6E73] flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-[#8E8E93] shrink-0" />
                            <span>{tour.property.address}</span>
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6E6E73] pt-0.5">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Clock className="h-3.5 w-3.5 text-[#8E8E93]" />
                              {dateStr} at {timeStr} <span className="text-[10px] text-[#8E8E93] font-bold">{tzAbbrev}</span>
                            </span>

                            <span>
                              {tour.tourType === "VIDEO_CALL" ? (
                                <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                                  <Video className="h-3 w-3" /> Virtual Video Tour
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[#6E6E73] bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-semibold">
                                  <MapPin className="h-3 w-3 text-[#8E8E93]" /> In-Person Showing
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Status Badge */}
                      <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                        <Badge className={`rounded-full text-xs font-bold px-3 py-1 border ${theme.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${theme.dot}`} />
                          {theme.label}
                        </Badge>
                        <span className="text-[11px] text-[#8E8E93]">
                          Requested {new Date(tour.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Virtual Call Join Banner */}
                    {tour.tourType === "VIDEO_CALL" && tour.status === "CONFIRMED" && (
                      <div className="bg-purple-50 border border-purple-200/80 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                            <Video className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-purple-950">Virtual Video Call Confirmed</p>
                            <p className="text-[11px] text-purple-700">
                              {tour.meetingLink
                                ? "Your host provided the video call link. Join at the scheduled time."
                                : "Your video link will be activated shortly before tour time."}
                            </p>
                          </div>
                        </div>
                        {tour.meetingLink && (
                          <a
                            href={tour.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="h-8 px-4 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0"
                          >
                            <Video className="h-3.5 w-3.5" /> Join Video Call
                          </a>
                        )}
                      </div>
                    )}

                    {/* Landlord Visit / Virtual Call Instructions */}
                    {tour.status === "CONFIRMED" && tour.ownerNotes && (
                      <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
                        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">
                            {tour.tourType === "VIDEO_CALL" ? "Virtual Call Notes:" : "Entry & Parking Instructions:"}
                          </span>{" "}
                          "{tour.ownerNotes}"
                        </div>
                      </div>
                    )}

                    {/* Cancellation Details */}
                    {tour.status === "CANCELLED" && tour.cancellationReason && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Cancellation Reason:</span> "{tour.cancellationReason}"
                        </div>
                      </div>
                    )}

                    {/* Action Bar Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      
                      {/* Left helper info */}
                      <div>
                        {tour.status === "COMPLETED" && tour.feedbackRating && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">Your Rating:</span>
                            <StarRow rating={tour.feedbackRating} />
                            <span className="text-xs font-bold text-slate-900">({tour.feedbackRating}/5)</span>
                          </div>
                        )}
                        {tour.status === "COMPLETED" && !tour.feedbackRating && (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                            ⭐ Feedback requested for your completed tour
                          </span>
                        )}
                        {tour.status === "CONFIRMED" && (
                          <span className="text-xs text-[#6E6E73]">
                            Need to adjust date? You can reschedule up to 24h prior.
                          </span>
                        )}
                      </div>

                      {/* Right CTAs */}
                      <div className="flex items-center gap-2">
                        
                        {/* Apply Now CTA shortcut if confirmed or completed */}
                        {(tour.status === "CONFIRMED" || tour.status === "COMPLETED") && (
                          <Link
                            href={`/listings?applyUnitId=${tour.unit?.id || ""}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs"
                            >
                              Apply for Unit <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        )}

                        {/* Leave Feedback CTA */}
                        {tour.status === "COMPLETED" && !tour.feedbackRating && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionTour(tour);
                              setFeedbackOpen(true);
                            }}
                            className="h-8 px-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-2xs"
                          >
                            Leave Feedback
                          </Button>
                        )}

                        {/* Reschedule button */}
                        {(tour.status === "PENDING" || tour.status === "CONFIRMED") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionTour(tour);
                              setRescheduleDate(tour.scheduledAt.split("T")[0]);
                              setRescheduleOpen(true);
                            }}
                            className="h-8 px-3 text-xs font-bold border-slate-200 text-slate-700 hover:bg-[#F5F5F7] rounded-xl"
                          >
                            <RotateCcw className="h-3 w-3 mr-1 text-[#6E6E73]" /> Reschedule
                          </Button>
                        )}

                        {/* Cancel button */}
                        {(tour.status === "PENDING" || tour.status === "CONFIRMED") && (
                          isWithin24h ? (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl">
                              Cannot cancel within 24h
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionTour(tour);
                                setCancelOpen(true);
                              }}
                              className="h-8 px-3 text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl"
                            >
                              Cancel
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── TENANT TOUR SLIDE-OVER SIDE DRAWER ── */}
        {detailTour && (() => {
          const tz = getTimezoneForState(detailTour.property?.state);
          const { dateStr, timeStr, tzAbbrev } = formatDateTimeInTimezone(
            detailTour.scheduledAt,
            tz
          );

          const theme = STATUS_THEMES[detailTour.status];

          return (
            <div className="fixed inset-0 z-50 overflow-hidden">
              {/* Backdrop */}
              <div
                onClick={() => setDetailTour(null)}
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              />

              <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
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
                        <Badge className={`rounded-full text-xs font-bold px-3 py-0.5 border ${theme.badge}`}>
                          {theme.label}
                        </Badge>
                      </div>

                      <div>
                        <h2 className="text-xl font-black text-white">{detailTour.property.name}</h2>
                        <p className="text-xs text-[#8E8E93] mt-1 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-[#8E8E93] shrink-0" />
                          {detailTour.property.address}
                          {detailTour.unit && <span className="font-semibold text-white"> · Unit {detailTour.unit.name}</span>}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Drawer Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Date & Format */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
                        <p className="text-[10px] font-black uppercase text-[#8E8E93] tracking-wider">Scheduled Time</p>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pt-0.5">
                          <CalendarIcon className="h-3.5 w-3.5 text-[#6E6E73]" />
                          {dateStr}
                        </p>
                        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#6E6E73]" />
                          {timeStr} <span className="text-[#8E8E93] text-[10px]">{tzAbbrev}</span>
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
                        <p className="text-[10px] font-black uppercase text-[#8E8E93] tracking-wider">Showing Format</p>
                        <p className="text-xs font-bold text-slate-900 pt-0.5">
                          {detailTour.tourType === "VIDEO_CALL" ? "Virtual Video Tour" : "In-Person Property Visit"}
                        </p>
                        <p className="text-[11px] text-[#6E6E73]">
                          {detailTour.tourType === "VIDEO_CALL" ? "Join online via video link" : "Meet landlord on-site"}
                        </p>
                      </div>
                    </div>

                    {/* Virtual Meeting Link */}
                    {detailTour.meetingLink && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">
                          Virtual Video Call Link
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

                    {/* Landlord Visit Instructions */}
                    {detailTour.ownerNotes && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">
                          {detailTour.tourType === "VIDEO_CALL"
                            ? "Virtual Tour Instructions / Agenda"
                            : "Entry & Parking Instructions"}
                        </Label>
                        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 font-medium leading-relaxed">
                          "{detailTour.ownerNotes}"
                        </div>
                      </div>
                    )}

                    {/* Submitted Feedback */}
                    {detailTour.feedbackRating && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#8E8E93]">
                          Your Submitted Feedback
                        </p>
                        <div className="flex items-center gap-2">
                          <StarRow rating={detailTour.feedbackRating} />
                          <span className="text-xs font-bold text-slate-900">({detailTour.feedbackRating}/5 Stars)</span>
                        </div>
                        {detailTour.feedbackComments && (
                          <p className="text-xs text-slate-700 italic bg-white p-3 rounded-xl border border-slate-200">
                            "{detailTour.feedbackComments}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Cancellation Details */}
                    {detailTour.status === "CANCELLED" && detailTour.cancellationReason && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                          Cancellation Reason
                        </Label>
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 font-medium leading-relaxed">
                          "{detailTour.cancellationReason}"
                        </div>
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
                      {(detailTour.status === "CONFIRMED" || detailTour.status === "COMPLETED") && (
                        <Link href={`/listings?applyUnitId=${detailTour.unit?.id || ""}`}>
                          <Button className="h-9 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                            Apply for Unit <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Reschedule Tour Modal ── */}
        <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-3xl max-w-sm p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-blue-600" /> Reschedule Tour
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6E6E73]">
                Select a new date and time slot for your tour of {actionTour?.property.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">New Date</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="bg-slate-50 border-slate-200 rounded-xl h-11 text-xs font-semibold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">New Time Slot</Label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  {[
                    "08:00:00", "09:00:00", "10:00:00", "11:00:00",
                    "12:00:00", "13:00:00", "14:00:00", "15:00:00",
                    "16:00:00", "17:00:00", "18:00:00"
                  ].map((t) => {
                    const display = new Date(`2026-01-01T${t}`).toLocaleTimeString("en-US", {
                      hour: "numeric", minute: "2-digit"
                    });
                    return <option key={t} value={t}>{display}</option>;
                  })}
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
              <Button 
                disabled={rescheduleLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold" 
                onClick={handleRescheduleTour}
              >
                {rescheduleLoading ? "Saving..." : "Confirm Reschedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Cancel Showing Modal ── */}
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-3xl max-w-sm p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-rose-600">Cancel Showing Request</DialogTitle>
              <DialogDescription className="text-xs text-[#8E8E93]">
                Please let the landlord know why you are cancelling this appointment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="cancelReason" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cancellation Reason</Label>
                <textarea
                  id="cancelReason"
                  placeholder="e.g. Schedule conflict / Found another unit..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 text-xs font-semibold min-h-[90px] resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  required
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setCancelOpen(false)}>Back</Button>
              <Button 
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold" 
                onClick={handleCancelTour}
                disabled={!cancelReason.trim()}
              >
                Cancel Showing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Single Overall Tenant Feedback Modal ── */}
        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-3xl max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold">Rate Your Showing Visit</DialogTitle>
              <DialogDescription className="text-xs text-[#8E8E93]">
                How was your overall experience touring {actionTour?.property.name}?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Overall Tour Rating
                </Label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserRating(star)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= userRating ? "text-amber-500 fill-amber-500" : "text-[#EBEBF0]"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-[#6E6E73]">
                  {userRating === 5 && "⭐ Excellent - Loved the property!"}
                  {userRating === 4 && "👍 Good Experience"}
                  {userRating === 3 && "😐 Average Tour"}
                  {userRating === 2 && "👎 Below Expectations"}
                  {userRating === 1 && "⚠️ Poor Experience"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="feedbackComments" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Additional Comments (Optional)
                </Label>
                <textarea
                  id="feedbackComments"
                  placeholder="e.g. Unit was clean and landlord was very helpful!"
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 text-xs font-semibold h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold" onClick={handleSendFeedback}>Submit Feedback</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
