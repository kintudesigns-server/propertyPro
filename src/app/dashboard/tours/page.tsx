"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Video,
  Eye,
  Star,
  Users,
  Compass
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Tour {
  id: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tourType: "IN_PERSON" | "VIDEO_CALL" | "SELF_GUIDED";
  scheduledAt: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  feedbackRating: number | null;
  feedbackComments: string | null;
  property: {
    name: string;
    address: string;
  };
  unit?: {
    name: string;
  } | null;
}

export default function ToursDashboard() {
  const { data: session } = useSession();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  async function fetchTours() {
    try {
      const res = await fetch("/api/tours");
      if (!res.ok) throw new Error("Failed to load tours");
      const data = await res.json();
      setTours(data);
    } catch (err: any) {
      toast.error(err.message || "Could not retrieve showing tours");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTours();
  }, []);

  const handleUpdateStatus = async (tourId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tours/${tourId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Tour status successfully updated to ${newStatus}`);
        fetchTours();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update status");
      }
    } catch (err) {
      toast.error("Error updating tour status");
    }
  };

  // Metrics
  const pendingCount = tours.filter((t) => t.status === "PENDING").length;
  const confirmedCount = tours.filter((t) => t.status === "CONFIRMED").length;
  const completedCount = tours.filter((t) => t.status === "COMPLETED").length;
  const cancelledCount = tours.filter((t) => t.status === "CANCELLED").length;

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Showing Tours</h2>
          <p className="text-slate-500 text-sm">
            Manage physical and virtual showing slots requested by prospects.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-xs bg-amber-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              Pending Requests
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-800">{pendingCount}</div>
            <p className="text-[10px] text-amber-600 font-semibold mt-1">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Confirmed Visits
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-800">{confirmedCount}</div>
            <p className="text-[10px] text-blue-600 font-semibold mt-1">Scheduled showings</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-emerald-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Completed Showings
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-800">{completedCount}</div>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">Feedback requested</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xs bg-slate-100/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Cancelled
            </CardTitle>
            <XCircle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-800">{cancelledCount}</div>
            <p className="text-[10px] text-slate-600 font-semibold mt-1">Inactive appointments</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Ledger Table */}
      <Card className="border-0 shadow-xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="px-6 py-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-800">Showings Schedule</CardTitle>
          <Button onClick={fetchTours} variant="outline" size="sm" className="h-8 border-slate-200 text-slate-600 text-xs font-bold rounded-lg">
            Refresh List
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-medium">Loading showings...</div>
          ) : tours.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Calendar className="h-10 w-10 text-slate-300" />
              <p className="font-semibold text-sm">No scheduled showings found.</p>
              <p className="text-xs text-slate-400">Prospect tours requested from the public listing page will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-[10px] font-extrabold tracking-wider uppercase">
                    <th className="py-3.5 px-6">Prospect Name</th>
                    <th className="py-3.5 px-6">Property / Unit</th>
                    <th className="py-3.5 px-6">Scheduled Time</th>
                    <th className="py-3.5 px-6">Type</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Feedback</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {tours.map((tour) => {
                    const formattedDate = new Date(tour.scheduledAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                    const formattedTime = new Date(tour.scheduledAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={tour.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-800">{tour.tenantName}</div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {tour.tenantEmail}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {tour.tenantPhone}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-700">{tour.property.name}</div>
                          <div className="text-xs text-slate-400">Unit: {tour.unit?.name || "Whole Property"}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-700 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formattedDate}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {formattedTime}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant="outline" className="rounded-lg font-bold text-xs py-0.5 px-2 bg-slate-50 border-slate-200 text-slate-600">
                            {tour.tourType === "IN_PERSON" && "In-Person"}
                            {tour.tourType === "VIDEO_CALL" && "Virtual Call"}
                            {tour.tourType === "SELF_GUIDED" && "Self-Guided"}
                          </Badge>
                        </td>
                        <td className="py-4 px-6">
                          <Badge
                            className={`rounded-full font-bold text-[10px] uppercase px-2.5 py-0.5 border-0 ${
                              tour.status === "PENDING"
                                ? "bg-amber-100 text-amber-700"
                                : tour.status === "CONFIRMED"
                                ? "bg-blue-100 text-blue-700"
                                : tour.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {tour.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-6">
                          {tour.feedbackRating ? (
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < (tour.feedbackRating || 0)
                                      ? "text-amber-500 fill-amber-500"
                                      : "text-slate-200"
                                  }`}
                                />
                              ))}
                              <Dialog open={feedbackOpen && selectedTour?.id === tour.id} onOpenChange={(open) => {
                                setFeedbackOpen(open);
                                if (open) setSelectedTour(tour);
                              }}>
                                <DialogTrigger render={<Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-primary rounded-full" />}>
                                  <Eye className="h-3.5 w-3.5" />
                                </DialogTrigger>
                                <DialogContent className="bg-white border-slate-100 text-slate-800 rounded-3xl max-w-sm p-6">
                                  <DialogHeader>
                                    <DialogTitle className="text-base font-extrabold">Prospect Visit Feedback</DialogTitle>
                                    <DialogDescription className="text-slate-400 text-xs">
                                      Comments provided by {tour.tenantName} post-visit.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-3 pt-4">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-slate-600">Rating:</span>
                                      <div className="flex">
                                        {[...Array(5)].map((_, idx) => (
                                          <Star
                                            key={idx}
                                            className={`h-4 w-4 ${
                                              idx < (tour.feedbackRating || 0)
                                                ? "text-amber-500 fill-amber-500"
                                                : "text-slate-200"
                                            }`}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 italic">
                                      "{tour.feedbackComments || "No written comments provided."}"
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">No feedback yet</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {tour.status === "PENDING" && (
                              <>
                                <Button
                                  onClick={() => handleUpdateStatus(tour.id, "CONFIRMED")}
                                  size="sm"
                                  className="h-8 rounded-lg bg-primary text-white font-bold px-3 text-xs"
                                >
                                  Confirm
                                </Button>
                                <Button
                                  onClick={() => handleUpdateStatus(tour.id, "CANCELLED")}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 rounded-lg text-slate-500 hover:bg-slate-100 font-bold px-3 text-xs"
                                >
                                  Decline
                                </Button>
                              </>
                            )}
                            {tour.status === "CONFIRMED" && (
                              <>
                                <Button
                                  onClick={() => handleUpdateStatus(tour.id, "COMPLETED")}
                                  size="sm"
                                  className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 text-xs"
                                >
                                  Complete
                                </Button>
                                <Button
                                  onClick={() => handleUpdateStatus(tour.id, "CANCELLED")}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 rounded-lg text-rose-600 hover:bg-rose-50 font-bold px-3 text-xs"
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
