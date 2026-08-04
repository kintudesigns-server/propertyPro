"use client";

import React, { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Star,
  Video,
  Info,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Building2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
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
  feedbackRating: number | null;
  feedbackComments: string | null;
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
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function TenantTourDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Cancel Modal State
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Reschedule Modal State
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("09:00:00");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Feedback Modal State
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  async function fetchTourDetails() {
    try {
      setLoading(true);
      const res = await fetch(`/api/tours/${resolvedParams.id}`);
      if (!res.ok) throw new Error("Failed to fetch tour details");
      const data = await res.json();
      setTour(data);
    } catch (err: any) {
      toast.error(err.message || "Error loading tour details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTourDetails();
  }, [resolvedParams.id]);

  const handleCancelTour = async () => {
    if (!tour) return;
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancelling.");
      return;
    }

    try {
      setCancelLoading(true);
      const res = await fetch(`/api/tours/${tour.id}`, {
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
        fetchTourDetails();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to cancel tour");
      }
    } catch (err) {
      toast.error("Error cancelling tour");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRescheduleTour = async () => {
    if (!tour) return;
    if (!rescheduleDate) {
      toast.error("Please select a date.");
      return;
    }

    try {
      setRescheduleLoading(true);
      const combinedDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
      
      const res = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: combinedDateTime.toISOString(),
          rescheduledAt: new Date().toISOString(),
          status: "PENDING",
        }),
      });

      if (res.ok) {
        toast.success("Reschedule request submitted to property manager.");
        setRescheduleOpen(false);
        fetchTourDetails();
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
    if (!tour) return;

    try {
      setFeedbackLoading(true);
      const res = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackRating: userRating,
          feedbackComments,
        }),
      });

      if (res.ok) {
        toast.success("Thank you! Your feedback has been sent.");
        setFeedbackOpen(false);
        fetchTourDetails();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit feedback");
      }
    } catch (err) {
      toast.error("Error submitting feedback");
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 flex items-center justify-center font-sans">
        <div className="bg-white rounded-[24px] border border-slate-200/80 p-12 text-center text-slate-400 font-bold text-xs shadow-xs">
          Loading tour request details...
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 flex items-center justify-center font-sans">
        <div className="bg-white rounded-[24px] border border-slate-200/80 p-12 text-center space-y-4 shadow-xs max-w-md">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-black text-slate-900">Tour Request Not Found</h2>
          <p className="text-xs text-slate-500 font-medium">The requested showing tour could not be located or may have been deleted.</p>
          <Button onClick={() => router.push("/dashboard/tenant/tours")} className="bg-[#007AFF] text-white font-bold rounded-xl h-10 px-6 text-xs">
            Return to Tours List
          </Button>
        </div>
      </div>
    );
  }

  const tz = getTimezoneForState(tour.property?.state);
  const { dateStr, timeStr, tzAbbrev } = formatDateTimeInTimezone(tour.scheduledAt, tz);
  const theme = STATUS_THEMES[tour.status];

  const hoursUntil = (new Date(tour.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
  const isWithin24h = tour.status === "CONFIRMED" && hoursUntil > 0 && hoursUntil < 24;

  // Step calculation for neon progress bar
  const statusMap = { PENDING: 1, CONFIRMED: 2, COMPLETED: 3, CANCELLED: -1 };
  const currentStep = statusMap[tour.status] ?? 0;
  const progressPercent = tour.status === "CANCELLED" ? 100 : (currentStep / 3) * 100;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/tenant/tours")}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs group"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Showings & Tours</span>
          </button>

          <span className="text-[11px] font-mono text-slate-400 font-bold bg-white px-3 py-1.5 rounded-xl border border-slate-200/80">
            REF #{tour.id.slice(-8).toUpperCase()}
          </span>
        </div>

        {/* Hero Card — Pure White Light Mode */}
        <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-xs p-6 md:p-8 space-y-8">
          
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {tour.property.name}
                </h1>
                {tour.unit && (
                  <span className="bg-slate-100 text-slate-800 border border-slate-200/80 rounded-xl text-xs font-black px-3 py-1 shadow-2xs">
                    Unit {tour.unit.name}
                  </span>
                )}
                {tour.rescheduledAt && (
                  <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[10px] font-extrabold px-3 py-1 flex items-center">
                    <RotateCcw className="h-3 w-3 mr-1 text-purple-600" /> Rescheduled
                  </span>
                )}
              </div>

              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#007AFF] shrink-0" />
                <span>{tour.property.address}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`rounded-full text-xs font-extrabold px-4 py-1.5 border flex items-center gap-2 shadow-2xs ${theme.badge}`}>
                <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
                {theme.label}
              </span>
            </div>
          </div>

          {/* ── CLEAN LIGHT NEON STEPPER (WHITE / LIGHT SLATE THEME) ── */}
          <div className="space-y-4 bg-slate-50/80 p-6 md:p-7 rounded-[24px] border border-slate-200/80 shadow-2xs relative overflow-hidden font-sans">
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-slate-900" />
                Showing Request Timeline
              </span>
              <span className="text-xs font-mono font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full shadow-2xs">
                {tour.status === "CANCELLED" ? "Request Terminated" : `${Math.round(progressPercent)}% Completed`}
              </span>
            </div>

            {/* Light Track Bar with Vibrant Gradient Progress */}
            <div className="h-3 rounded-full bg-slate-200/70 overflow-hidden relative border border-slate-200 p-0.5">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className={`h-full rounded-full relative ${
                  tour.status === "CANCELLED"
                    ? "bg-gradient-to-r from-rose-500 to-rose-600 shadow-xs"
                    : "bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                }`}
              >
                {/* Glowing Lead Pulse Dot */}
                {tour.status !== "CANCELLED" && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 bg-emerald-200 rounded-full shadow-[0_0_8px_#34d399] animate-ping opacity-90" />
                )}
              </motion.div>
            </div>

            {/* Step Nodes Grid — Light Theme */}
            <div className="grid grid-cols-4 gap-2 pt-2 font-sans">
              {[
                { title: "Requested", sub: "Request Sent" },
                { title: "Owner Review", sub: "Manager Verifying" },
                { title: "Confirmed", sub: "Ready for Tour" },
                { title: "Completed", sub: "Walkthrough Done" },
              ].map((step, idx) => {
                const isPast = tour.status !== "CANCELLED" && currentStep >= idx;
                const isCurrent = tour.status !== "CANCELLED" && currentStep === idx;

                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.12 }}
                    className="flex flex-col items-center text-center space-y-1.5"
                  >
                    {/* Node Dot / Badge */}
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                        tour.status === "CANCELLED"
                          ? "bg-rose-100 text-rose-600 border border-rose-200"
                          : isCurrent
                          ? "bg-slate-900 text-white ring-4 ring-slate-200 shadow-md scale-110"
                          : isPast
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "bg-white text-slate-400 border border-slate-200 shadow-2xs"
                      }`}
                    >
                      {isPast ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : idx + 1}
                    </div>

                    <div>
                      <p className={`text-xs font-black tracking-tight ${isCurrent ? "text-slate-900" : isPast ? "text-slate-900" : "text-slate-400"}`}>
                        {step.title}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 hidden sm:block">
                        {step.sub}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Details Grid — Light Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Schedule Info Box — Crisp Light Card */}
            <div className="bg-white border border-slate-200/80 rounded-[24px] p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-400 font-black uppercase tracking-wider">
                <span>Showing Schedule</span>
                <Clock className="h-4 w-4 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{dateStr}</p>
                <p className="text-sm font-bold text-slate-600 mt-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  {timeStr} <span className="text-xs text-slate-400 font-black">{tzAbbrev}</span>
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Walkthrough Format</span>
                {tour.tourType === "VIDEO_CALL" ? (
                  <span className="text-teal-700 font-extrabold flex items-center gap-1.5 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/80">
                    <Video className="h-3.5 w-3.5 text-teal-600" /> Virtual Video Call
                  </span>
                ) : (
                  <span className="text-slate-800 font-extrabold flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" /> In-Person Showing
                  </span>
                )}
              </div>
            </div>

            {/* Virtual Video Call Join Card — Emerald / Cyan Live Signal Theme */}
            {tour.tourType === "VIDEO_CALL" && tour.status === "CONFIRMED" ? (
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-[24px] p-6 flex flex-col justify-between space-y-4 shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                    <Video className="h-4 w-4 text-emerald-600" /> Virtual Meeting Room Active
                  </div>
                  <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                    {tour.meetingLink
                      ? "Your host provided the official video call link below. Click to join."
                      : "Meeting link will be activated shortly before tour time."}
                  </p>
                </div>

                {tour.meetingLink && (
                  <div className="space-y-2">
                    <a
                      href={tour.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full h-11 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      <Video className="h-4 w-4" /> Join Virtual Video Call
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tour.meetingLink || "");
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                        toast.success("Meeting link copied!");
                      }}
                      className="w-full text-[11px] font-bold text-emerald-800 hover:text-emerald-900 hover:underline flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5 text-emerald-700" />}
                      {copiedLink ? "Copied Link to Clipboard!" : "Copy Meeting Link"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-[24px] p-6 flex flex-col justify-between space-y-2">
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Walkthrough Format</p>
                  <p className="text-base font-black text-slate-900">
                    {tour.tourType === "VIDEO_CALL" ? "Virtual Video Tour" : "In-Person Property Walkthrough"}
                  </p>
                </div>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  {tour.tourType === "VIDEO_CALL"
                    ? "Conducted via online video call link provided by the property manager."
                    : "Meet the property manager directly at the property address listed above."}
                </p>
              </div>
            )}
          </div>

          {/* Landlord Entry & Parking Notes — Soft Blue Light Theme */}
          {tour.ownerNotes && (
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-5 space-y-1.5 text-xs font-medium shadow-2xs">
              <p className="font-black text-blue-950 flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-[#007AFF]" />
                {tour.tourType === "VIDEO_CALL" ? "Host Instructions:" : "Entry & Parking Notes:"}
              </p>
              <p className="text-slate-700 font-medium leading-relaxed pl-6">"{tour.ownerNotes}"</p>
            </div>
          )}

          {/* Cancellation Notice */}
          {tour.status === "CANCELLED" && tour.cancellationReason && (
            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-5 space-y-1.5 text-xs text-rose-950 font-medium">
              <p className="font-black text-rose-900 flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-rose-600" /> Cancellation Reason:
              </p>
              <p className="text-rose-800 font-medium leading-relaxed pl-6">"{tour.cancellationReason}"</p>
            </div>
          )}

          {/* Tenant Rating & Feedback */}
          {tour.status === "COMPLETED" && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Tour Rating & Feedback
                </h3>
                {tour.feedbackRating && (
                  <span className="text-xs font-black text-slate-900">({tour.feedbackRating}/5 Stars)</span>
                )}
              </div>

              {tour.feedbackRating ? (
                <div className="space-y-2">
                  <StarRow rating={tour.feedbackRating} />
                  {tour.feedbackComments && (
                    <p className="text-xs text-slate-700 font-medium italic bg-white p-3.5 rounded-xl border border-amber-200">
                      "{tour.feedbackComments}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-slate-600 font-semibold">Please share your walkthrough feedback to help property managers improve!</p>
                  <Button
                    onClick={() => setFeedbackOpen(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl h-9 px-4 shrink-0 shadow-2xs"
                  >
                    Rate Experience
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Footer CTAs Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
            <div className="text-xs text-slate-400 font-semibold">
              Requested on {new Date(tour.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>

            <div className="flex items-center gap-2.5">
              {(tour.status === "CONFIRMED" || tour.status === "COMPLETED") && (
                <Link href={`/listings?applyUnitId=${tour.unit?.id || ""}`}>
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl h-11 px-6 shadow-xs border-none cursor-pointer flex items-center gap-2">
                    Apply for Unit <ArrowRight className="h-4 w-4 text-white" />
                  </Button>
                </Link>
              )}

              {(tour.status === "PENDING" || tour.status === "CONFIRMED") && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRescheduleDate(tour.scheduledAt.split("T")[0]);
                      setRescheduleOpen(true);
                    }}
                    className="h-11 px-5 text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 rounded-xl shadow-2xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Reschedule
                  </Button>

                  {isWithin24h ? (
                    <span className="text-[11px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl">
                      Cannot cancel within 24h
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setCancelOpen(true)}
                      className="h-11 px-5 text-xs font-extrabold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl shadow-2xs"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" /> Cancel Request
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reschedule Modal */}
        <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-3xl max-w-sm p-6 font-sans">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-[#007AFF]" /> Reschedule Tour
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Select a new date and time slot for your tour of {tour.property.name}.
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
              <Button variant="ghost" className="rounded-xl font-bold text-xs" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
              <Button className="bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl font-bold text-xs" disabled={rescheduleLoading} onClick={handleRescheduleTour}>
                {rescheduleLoading ? "Saving..." : "Confirm New Slot"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Modal */}
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-3xl max-w-sm p-6 font-sans">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600" /> Cancel Showing Request
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Are you sure you want to cancel your showing for {tour.property.name}?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <Label htmlFor="cancelReason" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Reason for cancellation <span className="text-rose-500">*</span>
              </Label>
              <textarea
                id="cancelReason"
                placeholder="e.g. Plans changed, found another apartment..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 text-xs font-semibold h-24 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                required
              />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" className="rounded-xl font-bold text-xs" onClick={() => setCancelOpen(false)}>Back</Button>
              <Button className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs" disabled={cancelLoading} onClick={handleCancelTour}>
                {cancelLoading ? "Cancelling..." : "Yes, Cancel Showing"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Feedback Modal */}
        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-3xl max-w-md p-6 font-sans">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Rate Property Walkthrough
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                How was your tour of {tour.property.name}?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserRating(star)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Star className={`h-8 w-8 ${star <= userRating ? "text-amber-500 fill-amber-500" : "text-slate-200"}`} />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-slate-700">
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
              <Button variant="ghost" className="rounded-xl font-bold text-xs" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs" disabled={feedbackLoading} onClick={handleSendFeedback}>
                {feedbackLoading ? "Submitting..." : "Submit Feedback"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
