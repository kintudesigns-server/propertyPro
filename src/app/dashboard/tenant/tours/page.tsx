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
  ChevronLeft,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  MoreVertical,
  Eye,
  Check,
  XCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTimezoneForState, formatDateTimeInTimezone } from "@/lib/timezones";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureBlockedOverlay } from "@/components/subscription/FeatureBlockedBanner";

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
    coverPhoto?: string | null;
    images?: string[];
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
          className={`h-3.5 w-3.5 ${
            i <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function TenantToursPage() {
  const router = useRouter();
  const featureAccess = useFeatureAccess("tenant_tours");
  const { data: session } = useSession();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal States
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionTour, setActionTour] = useState<Tour | null>(null);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("09:00:00");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState("");

  async function fetchTours() {
    try {
      setLoading(true);
      const res = await fetch("/api/tours");
      if (!res.ok) throw new Error("Failed to load your tours");
      const data = await res.json();
      
      // Sort Most Recent Requests First by createdAt
      const sorted = (data || []).sort(
        (a: Tour, b: Tour) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTours(sorted);
    } catch (err: any) {
      toast.error(err.message || "Could not retrieve showing tours");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTours();
  }, []);

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Actions
  const handleCancelTour = async () => {
    if (!actionTour) return;
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancelling.");
      return;
    }

    try {
      const res = await fetch(`/api/tours/${actionTour.id}`, {
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
    if (!actionTour) return;
    if (!rescheduleDate) {
      toast.error("Please select a date.");
      return;
    }

    try {
      setRescheduleLoading(true);
      const combinedDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
      
      const res = await fetch(`/api/tours/${actionTour.id}`, {
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
        setActionTour(null);
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
    if (!actionTour) return;

    try {
      const res = await fetch(`/api/tours/${actionTour.id}`, {
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
        setFeedbackComments("");
        setUserRating(5);
        setActionTour(null);
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

  // Pagination Logic
  const totalPages = Math.ceil(filteredTours.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTours = filteredTours.slice(startIndex, startIndex + itemsPerPage);

  const isBlocked = !featureAccess.allowed;

  return (
    <div className="relative">
      {isBlocked && (
        <FeatureBlockedOverlay
          featureLabel="Showing Tours & Visits Schedule"
          reason={featureAccess.reason}
          adminNote={featureAccess.adminNote}
          expiresAt={featureAccess.expiresAt}
        />
      )}
      <div className={isBlocked ? "pointer-events-none select-none blur-[2.5px] opacity-70" : ""}>
      <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 relative font-sans">
        <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
              <CalendarIcon className="h-4 w-4 text-slate-700" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">
                My Showings &amp; Tours
              </h1>
              <p className="text-[#6E6E73] text-xs font-normal mt-0.5">
                Manage your property walkthrough schedules, virtual links, and feedback history.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/listings">
              <Button className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-2">
                Browse Properties <ArrowRight className="h-4 w-4 text-white" />
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Metric Cards — Interactive Filter Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans">
          {[
            {
              tabKey: "CONFIRMED",
              title: "Confirmed Visits",
              count: counts.CONFIRMED,
              sub: "Upcoming showings",
              icon: CheckCircle2,
              iconBg: "bg-blue-50 border border-blue-200/80 text-blue-600",
            },
            {
              tabKey: "PENDING",
              title: "Pending Review",
              count: counts.PENDING,
              sub: "Awaiting owner",
              icon: Clock,
              iconBg: "bg-amber-50 border border-amber-200/80 text-amber-600",
            },
            {
              tabKey: "COMPLETED",
              title: "Completed",
              count: counts.COMPLETED,
              sub: "Visited properties",
              icon: CalendarIcon,
              iconBg: "bg-emerald-50 border border-emerald-200/80 text-emerald-600",
            },
            {
              tabKey: "CANCELLED",
              title: "Cancelled",
              count: counts.CANCELLED,
              sub: "Inactive requests",
              icon: ShieldAlert,
              iconBg: "bg-rose-50 border border-rose-200/80 text-rose-600",
            },
          ].map((m) => {
            const Icon = m.icon;
            const isActive = activeTab === m.tabKey;
            return (
              <div
                key={m.title}
                onClick={() => setActiveTab(m.tabKey as any)}
                className={`bg-white p-6 rounded-3xl border shadow-2xs flex justify-between items-start cursor-pointer transition-all ${
                  isActive ? "border-slate-400 ring-1 ring-slate-400/20" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="space-y-1">
                  <p className="text-xs font-normal text-[#6E6E73] uppercase tracking-wider">{m.title}</p>
                  <h3 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">{m.count}</h3>
                  <p className="text-xs font-normal text-[#6E6E73]">{m.sub}</p>
                </div>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-2xs shrink-0 ${m.iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Search & Filter Control Bar ── */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4 font-sans">
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
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                    active
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-[#6E6E73] hover:text-[#1D1D1F]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#6E6E73]" />
            <input
              type="text"
              placeholder="Search property or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus:outline-none focus:border-slate-400 shadow-2xs transition-all"
            />
          </div>
        </div>

        {/* ── Enterprise SaaS Data Table ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden font-sans">
          {loading ? (
            <div className="p-12 text-center text-[#6E6E73] text-xs font-normal">
              Loading showing schedules...
            </div>
          ) : filteredTours.length === 0 ? (
            <div className="p-12 text-center space-y-3.5">
              <div className="h-12 w-12 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mx-auto border border-slate-200/60 shadow-2xs">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">No showings match your filter</h3>
              <p className="text-xs text-[#6E6E73] font-normal max-w-sm mx-auto">
                Schedule your next property walkthrough directly from any property listing!
              </p>
              <Link href="/listings" className="inline-block pt-1">
                <Button size="sm" className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer">
                  Explore Available Listings
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-normal text-[#1D1D1F]">
                <thead>
                  <tr className="border-b border-slate-100 bg-[#F2F2F7] text-[11px] uppercase font-medium tracking-wider text-[#6E6E73]">
                    <th className="py-3 px-6">Showing Date & Time</th>
                    <th className="py-3 px-6">Property & Unit</th>
                    <th className="py-3 px-6">Tour Format</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTours.map((tour) => {
                    const tz = getTimezoneForState(tour.property?.state);
                    const { dateStr, timeStr, tzAbbrev } = formatDateTimeInTimezone(
                      tour.scheduledAt,
                      tz
                    );
                    const theme = STATUS_THEMES[tour.status];

                    const hoursUntil =
                      (new Date(tour.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
                    const isWithin24h =
                      tour.status === "CONFIRMED" && hoursUntil > 0 && hoursUntil < 24;

                    return (
                      <tr
                        key={tour.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => router.push(`/dashboard/tenant/tours/${tour.id}`)}
                      >
                        {/* Date & Time Column with Property Thumbnail */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {tour.property?.coverPhoto || (tour.property?.images && tour.property.images.length > 0) ? (
                              <img
                                src={tour.property.coverPhoto || tour.property.images?.[0] || ""}
                                alt={tour.property.name}
                                className="h-9 w-9 rounded-xl object-cover border border-slate-200/80 shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs shrink-0 font-medium text-xs">
                                <Building2 className="h-4 w-4 text-slate-700" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-[#1D1D1F] text-xs">{dateStr}</p>
                              <p className="text-xs text-[#6E6E73] font-normal">
                                {timeStr} <span className="text-[10px] font-normal text-[#6E6E73]">{tzAbbrev}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Property & Unit Column */}
                        <td className="py-4 px-6">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-[#1D1D1F] text-xs group-hover:text-slate-900 transition-colors truncate">
                                {tour.property.name}
                              </p>
                              {tour.unit && (
                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                                  Unit {tour.unit.name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#6E6E73] font-normal truncate max-w-xs">
                              {tour.property.address}
                            </p>
                          </div>
                        </td>

                        {/* Tour Format Column */}
                        <td className="py-4 px-6">
                          {tour.tourType === "VIDEO_CALL" ? (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs inline-flex items-center gap-1">
                              <Video className="h-3 w-3 text-purple-600" /> Virtual Video
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-500" /> In-Person
                            </span>
                          )}
                        </td>

                        {/* Status Column */}
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider shadow-2xs inline-flex items-center gap-1.5 ${theme.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                            {theme.label}
                          </span>
                        </td>

                        {/* Three-Dot Actions Column */}
                        <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {tour.tourType === "VIDEO_CALL" && tour.status === "CONFIRMED" && tour.meetingLink && (
                              <a
                                href={tour.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="h-8 px-3 text-[11px] font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              >
                                <Video className="h-3 w-3" /> Join Call
                              </a>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 p-0 rounded-xl hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer transition-colors outline-none">
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5 bg-white border border-slate-200 shadow-xl">
                                <DropdownMenuLabel className="text-[10px] uppercase font-extrabold text-slate-400 px-2.5 py-1">
                                  Showing Actions
                                </DropdownMenuLabel>
                                
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/tenant/tours/${tour.id}`)}
                                  className="text-xs font-bold text-slate-800 rounded-xl px-2.5 py-2 cursor-pointer focus:bg-slate-100 flex items-center gap-2"
                                >
                                  <Eye className="h-3.5 w-3.5 text-[#007AFF]" /> View Details
                                </DropdownMenuItem>

                                {tour.tourType === "VIDEO_CALL" && tour.meetingLink && (
                                  <DropdownMenuItem
                                    onClick={() => window.open(tour.meetingLink || "", "_blank")}
                                    className="text-xs font-bold text-purple-700 rounded-xl px-2.5 py-2 cursor-pointer focus:bg-purple-50 flex items-center gap-2"
                                  >
                                    <Video className="h-3.5 w-3.5 text-purple-600" /> Open Meeting Link
                                  </DropdownMenuItem>
                                )}

                                {(tour.status === "CONFIRMED" || tour.status === "COMPLETED") && (
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/listings?applyUnitId=${tour.unit?.id || ""}`)}
                                    className="text-xs font-bold text-blue-700 rounded-xl px-2.5 py-2 cursor-pointer focus:bg-blue-50 flex items-center gap-2"
                                  >
                                    <ArrowRight className="h-3.5 w-3.5 text-[#007AFF]" /> Apply for Unit
                                  </DropdownMenuItem>
                                )}

                                {tour.status === "COMPLETED" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setActionTour(tour);
                                      setFeedbackOpen(true);
                                    }}
                                    className="text-xs font-bold text-amber-700 rounded-xl px-2.5 py-2 cursor-pointer focus:bg-amber-50 flex items-center gap-2"
                                  >
                                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Leave Feedback
                                  </DropdownMenuItem>
                                )}

                                {(tour.status === "PENDING" || tour.status === "CONFIRMED") && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setActionTour(tour);
                                        setRescheduleDate(tour.scheduledAt.split("T")[0]);
                                        setRescheduleOpen(true);
                                      }}
                                      className="text-xs font-bold text-slate-700 rounded-xl px-2.5 py-2 cursor-pointer focus:bg-slate-100 flex items-center gap-2"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5 text-slate-500" /> Reschedule Tour
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="my-1 bg-slate-100" />

                                    {!isWithin24h && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setActionTour(tour);
                                          setCancelOpen(true);
                                        }}
                                        className="text-xs font-bold text-rose-600 rounded-xl px-2.5 py-2 cursor-pointer focus:bg-rose-50 flex items-center gap-2"
                                      >
                                        <XCircle className="h-3.5 w-3.5 text-rose-600" /> Cancel Showing
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination Footer Bar ── */}
          {filteredTours.length > 0 && (
            <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold text-slate-500">
              <div>
                Showing <span className="font-black text-slate-900">{startIndex + 1}</span> to{" "}
                <span className="font-black text-slate-900">{Math.min(startIndex + itemsPerPage, filteredTours.length)}</span> of{" "}
                <span className="font-black text-slate-900">{filteredTours.length}</span> showings
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="h-8 px-3 text-xs font-bold rounded-xl border-slate-200 text-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Previous
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 w-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      currentPage === page
                        ? "bg-[#007AFF] text-white shadow-2xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="h-8 px-3 text-xs font-bold rounded-xl border-slate-200 text-slate-700 disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Reschedule Tour Modal ── */}
        <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-3xl max-w-sm p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-blue-600" /> Reschedule Tour
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
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
              <Button variant="ghost" className="rounded-xl font-medium text-xs" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
              <Button className="bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl font-medium text-xs" disabled={rescheduleLoading} onClick={handleRescheduleTour}>
                {rescheduleLoading ? "Saving..." : "Confirm New Slot"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Cancel Tour Modal ── */}
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-3xl max-w-sm p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-rose-600" /> Cancel Showing Request
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Are you sure you want to cancel your showing for {actionTour?.property.name}?
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
              <Button variant="ghost" className="rounded-xl font-medium text-xs" onClick={() => setCancelOpen(false)}>Back</Button>
              <Button className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium text-xs" onClick={handleCancelTour}>
                Yes, Cancel Showing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Feedback Modal ── */}
        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-800 rounded-3xl max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Rate Property Walkthrough
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                How was your tour of {actionTour?.property.name}?
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
                <Label htmlFor="feedbackComments" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Additional Comments</Label>
                <textarea
                  id="feedbackComments"
                  placeholder="e.g. The unit was clean and the landlord was very punctual..."
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 text-xs font-semibold h-24 resize-none focus:outline-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" className="rounded-xl font-medium text-xs" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs" onClick={handleSendFeedback}>
                Submit Feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
    </div>
    </div>
  );
}

