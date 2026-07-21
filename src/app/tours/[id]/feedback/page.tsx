"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Building2, CheckCircle2, Calendar, MapPin, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getTimezoneForState, formatDateTimeInTimezone } from "@/lib/timezones";

export default function GuestTourFeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const tourId = params?.id as string;

  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userRating, setUserRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!tourId) return;

    async function loadTour() {
      try {
        setLoading(true);
        const res = await fetch(`/api/tours/${tourId}/public-feedback`);
        if (!res.ok) {
          throw new Error("Tour session not found or link has expired.");
        }
        const data = await res.json();
        setTour(data);

        if (data.feedbackRating) {
          setUserRating(data.feedbackRating);
          setSubmitted(true);
        }
        if (data.feedbackComments) {
          setFeedbackComments(data.feedbackComments);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load tour details");
      } finally {
        setLoading(false);
      }
    }

    loadTour();
  }, [tourId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tours/${tourId}/public-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackRating: userRating,
          feedbackComments,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit feedback");
      }

      toast.success("Thank you! Your feedback has been saved.");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Error submitting feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-slate-400 font-semibold">Loading tour verification...</p>
        </div>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800 text-white rounded-3xl p-6 text-center space-y-4">
          <Building2 className="h-10 w-10 text-slate-600 mx-auto" />
          <h2 className="text-lg font-bold">Showing Link Expired</h2>
          <p className="text-xs text-slate-400">{error || "Could not find details for this showing visit."}</p>
          <Link href="/listings">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold mt-2">
              Browse Available Listings
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const tz = getTimezoneForState(tour.property?.state);
  const { dateStr, timeStr, tzAbbrev } = formatDateTimeInTimezone(tour.scheduledAt, tz);
  const applyUrl = `/listings?applyUnitId=${tour.unitId || ""}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8">
      {/* ── Top Header ── */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white h-8 w-8 rounded-xl flex items-center justify-center font-black text-sm shadow-md">
            P
          </div>
          <span className="text-lg font-black tracking-tight text-white">
            Property<span className="text-blue-500">Pro</span>
          </span>
        </div>
        <Badge className="bg-slate-900 text-slate-400 border-slate-800 text-[10px] font-mono uppercase">
          Verified Guest Showing
        </Badge>
      </div>

      {/* ── Main Content Card ── */}
      <div className="max-w-xl mx-auto w-full my-auto py-6">
        <Card className="bg-slate-900 border-slate-800 text-slate-100 rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-900/60 to-purple-900/60 border-b border-slate-800 p-6">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-extrabold uppercase tracking-wider mb-2">
              <Sparkles className="h-4 w-4" /> Guest Showing Review
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {tour.property.name}
            </h1>
            <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1 font-medium">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {tour.property.address}, {tour.property.city} {tour.unit?.name ? `• Unit ${tour.unit.name}` : ""}
            </p>
          </div>

          <CardContent className="p-6 space-y-6">

            {/* Visit Details Box */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tour Date & Time</p>
                  <p className="font-bold text-white text-sm mt-0.5">{dateStr} at {timeStr} {tzAbbrev}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Renter</p>
                <p className="font-bold text-slate-200">{tour.tenantName}</p>
              </div>
            </div>

            {/* ── SUCCESS STATE ── */}
            {submitted ? (
              <div className="space-y-6 text-center py-4">
                <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-in zoom-in-75 duration-300">
                  <CheckCircle2 className="h-9 w-9" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-black text-white">Thank You for Your Feedback!</h2>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Your rating has been shared with the property manager.
                  </p>
                </div>

                {/* Display submitted rating summary */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 max-w-sm mx-auto space-y-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Your Rating</p>
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-6 w-6 ${
                          s <= userRating ? "text-amber-400 fill-amber-400" : "text-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                  {feedbackComments && (
                    <p className="text-xs text-slate-300 italic bg-slate-900 p-3 rounded-xl border border-slate-800 mt-2">
                      "{feedbackComments}"
                    </p>
                  )}
                </div>

                {/* Apply Call to Action */}
                <div className="bg-gradient-to-r from-blue-950 to-indigo-950 border border-blue-800/60 rounded-2xl p-5 text-center space-y-3">
                  <div className="flex items-center justify-center gap-1.5 text-blue-400 text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck className="h-4 w-4" /> Ready to Secure This Unit?
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    Submit your formal rental application online to reserve your spot!
                  </p>
                  <Link href={applyUrl} className="block">
                    <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-11 text-xs font-bold shadow-lg flex items-center justify-center gap-2">
                      Submit Rental Application <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* ── FORM RATING STATE ── */
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3 bg-slate-950/80 border border-slate-800 p-5 rounded-2xl text-center">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300 block">
                    How was your overall tour experience?
                  </label>
                  
                  <div className="flex justify-center gap-2 py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setUserRating(star)}
                        className="p-1 focus:outline-none transition-transform hover:scale-125"
                      >
                        <Star
                          className={`h-9 w-9 ${
                            star <= userRating
                              ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                              : "text-slate-800"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-bold text-slate-400">
                    {userRating === 5 && "⭐ Excellent - Loved the property!"}
                    {userRating === 4 && "👍 Good Experience"}
                    {userRating === 3 && "😐 Average Tour"}
                    {userRating === 2 && "👎 Below Expectations"}
                    {userRating === 1 && "⚠️ Poor Experience"}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300 block">
                    Additional Comments (Optional)
                  </label>
                  <textarea
                    placeholder="e.g. The unit was very clean and bright. Landlord answered all my questions."
                    value={feedbackComments}
                    onChange={(e) => setFeedbackComments(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-2xl p-4 text-xs font-medium h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl h-12 text-sm shadow-xl transition-all"
                >
                  {submitting ? "Submitting..." : "Submit Feedback & Rating"}
                </Button>
              </form>
            )}

          </CardContent>
        </Card>
      </div>

      {/* ── Footer ── */}
      <div className="max-w-xl mx-auto w-full text-center text-[11px] text-slate-600 py-4 font-mono">
        PropertyPro showing management • {new Date().getFullYear()}
      </div>
    </div>
  );
}
