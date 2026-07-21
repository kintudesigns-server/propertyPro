"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  Settings,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

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
  ownerNotes?: string | null;
  ownerProspectRating?: number | null;
  ownerProspectNotes?: string | null;
  feedbackRating: number | null;
  feedbackComments: string | null;
  verifiedEmail?: boolean;
  createdAt: string;
  property: {
    name: string;
    address: string;
    ownerId: string;
  };
  unit?: {
    name: string;
  } | null;
}

export default function TourDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ownerNotesText, setOwnerNotesText] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancellationReasonText, setCancellationReasonText] = useState("");

  const [rateProspectOpen, setRateProspectOpen] = useState(false);
  const [prospectRating, setProspectRating] = useState(5);
  const [prospectNotes, setProspectNotes] = useState("");

  async function fetchTourDetails() {
    try {
      const res = await fetch(`/api/tours/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Tour request not found");
        } else if (res.status === 403) {
          toast.error("You are not authorized to view this tour request");
        } else {
          toast.error("Failed to load tour details");
        }
        router.push("/dashboard/tours");
        return;
      }
      const data = await res.json();
      setTour(data);
      if (data.ownerNotes) setOwnerNotesText(data.ownerNotes);
    } catch (err: any) {
      toast.error("Error retrieving tour request details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      fetchTourDetails();
    }
  }, [id]);

  const handleConfirmTour = async () => {
    if (!tour) return;
    try {
      const res = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "CONFIRMED",
          ownerNotes: ownerNotesText 
        }),
      });

      if (res.ok) {
        toast.success("Tour request confirmed. Visit instructions sent to prospect.");
        setConfirmOpen(false);
        fetchTourDetails();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to confirm tour");
      }
    } catch (err) {
      toast.error("Error confirming tour status");
    }
  };

  const handleCancelTour = async () => {
    if (!tour) return;
    if (!cancellationReasonText.trim()) {
      toast.error("Please provide a cancellation reason.");
      return;
    }

    try {
      const res = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "CANCELLED",
          cancellationReason: cancellationReasonText 
        }),
      });

      if (res.ok) {
        toast.success("Tour request cancelled.");
        setCancelOpen(false);
        setCancellationReasonText("");
        fetchTourDetails();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to cancel tour");
      }
    } catch (err) {
      toast.error("Error cancelling tour");
    }
  };

  const handleRateProspect = async () => {
    if (!tour) return;
    try {
      const res = await fetch(`/api/tours/${tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "COMPLETED",
          ownerProspectRating: prospectRating,
          ownerProspectNotes: prospectNotes
        }),
      });

      if (res.ok) {
        toast.success("Tour marked completed and prospect rated!");
        setRateProspectOpen(false);
        setProspectNotes("");
        setProspectRating(5);
        fetchTourDetails();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to complete rating");
      }
    } catch (err) {
      toast.error("Error completing tour");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-100 rounded-lg" />
        <div className="h-10 w-96 bg-slate-100 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-slate-100 rounded-3xl" />
            <div className="h-64 bg-slate-100 rounded-3xl" />
          </div>
          <div className="space-y-6">
            <div className="h-40 bg-slate-100 rounded-3xl" />
            <div className="h-64 bg-slate-100 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="flex-1 p-8 text-center max-w-lg mx-auto py-24 space-y-4">
        <AlertCircle className="h-12 w-12 text-slate-300 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">Tour Request Not Found</h3>
        <p className="text-sm text-slate-500">The showing request could not be loaded or has been deleted.</p>
        <Link href="/dashboard/tours">
          <Button className="bg-slate-900 text-white rounded-xl">Go Back</Button>
        </Link>
      </div>
    );
  }

  // Format Appointment Details
  const formattedDate = new Date(tour.scheduledAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = new Date(tour.scheduledAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex-1 p-8 pt-6 max-w-7xl mx-auto space-y-8">
      {/* Top Navigation / Breadcrumb */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
          <Link href="/dashboard/tours" className="hover:text-slate-600 transition-colors">Showings Schedule</Link>
          <span>/</span>
          <span className="text-slate-600">Request #{tour.id.slice(-6).toUpperCase()}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/tours">
              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-all">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Visit details: {tour.tenantName}</h2>
              <p className="text-sm text-slate-500 mt-0.5">Manage showing outcomes and review prospect details.</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Badge
              className={`rounded-full font-bold text-[10px] uppercase px-3 py-1 border-0 ${
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
            <Badge variant="outline" className="rounded-xl font-bold text-xs py-1 px-3 bg-white border-slate-200 text-slate-600">
              {tour.tourType === "IN_PERSON" ? "In-Person Showing" : "Virtual Video Call"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (Details Content) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Prospect Profile */}
          <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <User className="h-4 w-4" />
              Prospect Profile Details
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-800">{tour.tenantName}</span>
                  {tour.verifiedEmail && (
                    <Badge className="bg-blue-50 text-blue-600 border border-blue-200 rounded-full py-0 px-2.5 text-[9px] font-black uppercase flex items-center gap-0.5">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-700">{tour.tenantEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-700">{tour.tenantPhone}</span>
                  </div>
                </div>
              </div>
            </div>

            {tour.tenantMessage && (
              <div className="pt-6">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Message to Owner</Label>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm text-slate-600 italic font-semibold flex gap-2.5">
                  <MessageSquare className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                  <span>"{tour.tenantMessage}"</span>
                </div>
              </div>
            )}
          </Card>

          {/* Card 2: Visit Appointment */}
          <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Visit Appointment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Property & Unit</span>
                <span className="text-base font-extrabold text-slate-800">{tour.property.name}</span>
                {tour.unit && (
                  <span className="text-xs font-bold text-slate-500 block">Unit: {tour.unit.name}</span>
                )}
                <span className="text-xs text-slate-400 block mt-1">{tour.property.address}</span>
              </div>
              <div className="space-y-2 text-sm font-semibold text-slate-700">
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4.5 w-4.5 text-slate-400" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4.5 w-4.5 text-slate-400" />
                  <span>{formattedTime}</span>
                </div>
              </div>
            </div>
            
            <div className="pt-6 flex flex-wrap gap-6 text-xs text-slate-600 font-bold">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">Showing Method</span>
                <Badge variant="outline" className="rounded-lg bg-slate-50 border-slate-200 text-slate-600 font-bold py-1 px-2.5">
                  {tour.tourType === "IN_PERSON" ? "In-Person Visit" : "Virtual Video Call"}
                </Badge>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">Request Verified</span>
                <Badge className="bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg font-bold py-1 px-2.5 uppercase">
                  SMS Verified
                </Badge>
              </div>
            </div>
          </Card>

          {/* Card 3: Outcomes (Instructions, Reasons, Reviews) */}
          {(tour.status !== "PENDING") && (
            <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Settings className="h-4 w-4" />
                Visit Outcomes
              </h3>

              {tour.status === "CONFIRMED" && tour.ownerNotes && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sent Visit Instructions</Label>
                  <div className="bg-blue-50/50 border border-blue-100 text-blue-900 p-4 rounded-2xl text-sm font-medium">
                    <p className="margin-0 leading-relaxed">"{tour.ownerNotes}"</p>
                  </div>
                </div>
              )}

              {tour.status === "CANCELLED" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cancellation Information</Label>
                  <div className="bg-rose-50 border border-rose-100 text-rose-900 p-4 rounded-2xl text-sm">
                    <span className="font-extrabold block text-rose-950 mb-1">Reason for cancellation:</span>
                    <p className="margin-0 font-medium italic leading-relaxed">"{tour.cancellationReason || "No specific reason was provided."}"</p>
                  </div>
                </div>
              )}

              {tour.status === "COMPLETED" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Feedback rating from prospect */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prospect Visit Feedback</Label>
                    {tour.feedbackRating ? (
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600">Rating:</span>
                          <div className="flex">
                            {[...Array(5)].map((_, idx) => (
                              <Star
                                key={idx}
                                className={`h-4.5 w-4.5 ${
                                  idx < (tour.feedbackRating || 0)
                                    ? "text-amber-500 fill-amber-500"
                                    : "text-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 font-medium italic leading-relaxed">
                          "{tour.feedbackComments || "No written comments provided."}"
                        </p>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs text-slate-400 font-semibold">
                        No feedback rating or comments submitted by the prospect.
                      </div>
                    )}
                  </div>

                  {/* Private landlord evaluation */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Private Notes & Rating</Label>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">Prospect Quality:</span>
                        <div className="flex">
                          {[...Array(5)].map((_, idx) => (
                            <Star
                              key={idx}
                              className={`h-4.5 w-4.5 ${
                                idx < (tour.ownerProspectRating || 0)
                                  ? "text-blue-500 fill-blue-500"
                                  : "text-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {tour.ownerProspectNotes ? (
                        <p className="text-xs text-slate-600 font-medium italic leading-relaxed">
                          "{tour.ownerProspectNotes}"
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 font-semibold">
                          No private landlord notes provided.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          
          {/* Card 1: Sidebar Actions */}
          <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Showing Actions
            </h3>
            
            {tour.status === "PENDING" && (
              <div className="space-y-2.5">
                <Button 
                  onClick={() => setConfirmOpen(true)} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl transition-colors"
                >
                  Confirm Showing Tour
                </Button>
                <Button 
                  onClick={() => setCancelOpen(true)} 
                  variant="outline" 
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold h-11 rounded-xl transition-colors"
                >
                  Decline showing request
                </Button>
              </div>
            )}

            {tour.status === "CONFIRMED" && (
              <div className="space-y-2.5">
                <Button 
                  onClick={() => setRateProspectOpen(true)} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl transition-colors"
                >
                  Complete & Rate Visit
                </Button>
                <Button 
                  onClick={() => setCancelOpen(true)} 
                  variant="outline" 
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold h-11 rounded-xl transition-colors"
                >
                  Cancel Scheduled showing
                </Button>
              </div>
            )}

            {(tour.status === "COMPLETED" || tour.status === "CANCELLED") && (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center text-xs text-slate-400 font-semibold">
                No active actions available. This showing tour has already been {tour.status.toLowerCase()}.
              </div>
            )}
          </Card>

          {/* Card 2: Timeline Info */}
          <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Request Timeline
            </h3>
            
            <div className="space-y-6 relative pl-5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {/* Step 1: Requested */}
              <div className="relative">
                <span className="absolute -left-5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                </span>
                <span className="text-xs font-bold text-slate-800 block">Request Submitted</span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {new Date(tour.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                  {new Date(tour.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>

              {/* Step 2: Verification */}
              <div className="relative">
                <span className="absolute -left-5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-blue-400 bg-white flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                </span>
                <span className="text-xs font-bold text-slate-800 block">Email Verified via OTP</span>
                <span className="text-[10px] text-slate-400 font-bold">Automatic validation complete</span>
              </div>

              {/* Step 3: Current Status */}
              <div className="relative">
                <span className={`absolute -left-5 top-0.5 h-3.5 w-3.5 rounded-full border-2 bg-white flex items-center justify-center ${
                  tour.status === "PENDING"
                    ? "border-amber-400"
                    : tour.status === "CONFIRMED"
                    ? "border-blue-400"
                    : tour.status === "COMPLETED"
                    ? "border-emerald-400"
                    : "border-slate-300"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    tour.status === "PENDING"
                      ? "bg-amber-500"
                      : tour.status === "CONFIRMED"
                      ? "bg-blue-500"
                      : tour.status === "COMPLETED"
                      ? "bg-emerald-500"
                      : "bg-slate-400"
                  }`} />
                </span>
                <span className="text-xs font-bold text-slate-800 block">Status: {tour.status}</span>
                <span className="text-[10px] text-slate-400 font-bold">Updated in showing log</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-4 mt-6 flex flex-col gap-1 font-bold">
              <span>SYSTEM ID: {tour.id}</span>
            </div>
          </Card>

        </div>

      </div>

      {/* ── MODALS FOR ACTIONS ── */}

      {/* Confirm Tour Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-white border-[#E2E8F0] text-slate-800 rounded-3xl max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">Confirm Showing Tour</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Provide visit instructions (parking, door codes, contact person) that will be emailed to {tour.tenantName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="ownerNotes" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Instructions for Prospect</Label>
              <textarea
                id="ownerNotes"
                placeholder="e.g. Please dial #123 at the gate. Park in guest slot 15. Ask for landlord at reception."
                value={ownerNotesText}
                onChange={(e) => setOwnerNotesText(e.target.value)}
                className="w-full bg-slate-50 border-0 text-slate-800 rounded-xl p-3 text-sm focus:ring-blue-500 focus:border-blue-500 font-semibold min-h-[100px] resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex sm:justify-end gap-2">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-white rounded-xl font-bold" onClick={handleConfirmTour}>Confirm & Send Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Tour Modal */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="bg-white border-[#E2E8F0] text-slate-800 rounded-3xl max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-rose-600">Decline / Cancel Showing</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              You must provide a cancellation reason. This explanation will be automatically emailed to the prospect.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="cancelReason" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reason for Cancellation</Label>
              <textarea
                id="cancelReason"
                placeholder="e.g. Sorry, the property has just been rented. / I am unavailable at this slot. Please select another slot on our website."
                value={cancellationReasonText}
                onChange={(e) => setCancellationReasonText(e.target.value)}
                className="w-full bg-slate-50 border-0 text-slate-800 rounded-xl p-3 text-sm focus:ring-blue-500 focus:border-blue-500 font-semibold min-h-[100px] resize-none"
                required
              />
            </div>
          </div>
          <DialogFooter className="flex sm:justify-end gap-2">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setCancelOpen(false)}>Back</Button>
            <Button 
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold" 
              onClick={handleCancelTour}
              disabled={!cancellationReasonText.trim()}
            >
              Cancel Showing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Showing & Rate Guest Modal */}
      <Dialog open={rateProspectOpen} onOpenChange={setRateProspectOpen}>
        <DialogContent className="bg-white border-[#E2E8F0] text-slate-800 rounded-3xl max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">Complete Showing Visit</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Rate this prospective tenant to help track applicant quality in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block text-center">Prospect Quality Rating</Label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star} 
                    type="button"
                    onClick={() => setProspectRating(star)}
                    className="focus:outline-none p-1"
                  >
                    <Star 
                      className={`h-7 w-7 transition-all ${
                        star <= prospectRating 
                          ? "text-blue-500 fill-blue-500 scale-110" 
                          : "text-slate-200 hover:text-blue-200"
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prospectNotes" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Private Landlord Notes</Label>
              <textarea
                id="prospectNotes"
                placeholder="e.g. Arrived on time, very polite. Looks highly qualified and interested."
                value={prospectNotes}
                onChange={(e) => setProspectNotes(e.target.value)}
                className="w-full bg-slate-50 border-0 text-slate-800 rounded-xl p-3 text-sm focus:ring-blue-500 focus:border-blue-500 font-semibold min-h-[100px] resize-none"
              />
              <p className="text-[10px] text-slate-400">These notes are completely private and are never visible to the prospect.</p>
            </div>
          </div>
          <DialogFooter className="flex sm:justify-end gap-2">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setRateProspectOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold" onClick={handleRateProspect}>Complete showing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
