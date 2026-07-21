"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Building2,
  ArrowRight,
  CheckCircle2,
  Home,
  Users,
  Wrench,
  CreditCard,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Shield,
  BarChart3,
  Loader2,
  ShieldCheck,

  Zap,
  MapPin,
  TrendingUp,
  DollarSign,
  FileText,
  Bell,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

/* ─────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────── */
type TurnstileStatus = 0 | 1 | 2;

/* ─────────────────────────────────────────────────────
   Hero background image set – curated Unsplash
───────────────────────────────────────────────────── */
const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=90",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=2400&q=90",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=2400&q=90",
];

/* ─────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroImg, setHeroImg] = useState(0);

  // Owner registration
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [pricingTiers, setPricingTiers] = useState<any[]>([]);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [turnstileStatus, setTurnstileStatus] = useState<TurnstileStatus>(0);

  // Portal tab (kept for potential future use)
  const [activePortalTab, setActivePortalTab] = useState<"owner" | "tenant">("owner");

  // Listings
  const [listings, setListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  // FAQ accordion
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Hero ref
  const heroRef = useRef<HTMLDivElement>(null);

  /* ── Owner apply handler ───────────────────────── */
  const handleOwnerApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (turnstileStatus !== 2) {
      toast.error("Please complete the security check.");
      return;
    }
    setIsSubmitting(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/owner-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        setTrackingId(json.trackingId);
        setSubmitSuccess(true);
      } else {
        toast.error(json.error || "Something went wrong.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Bootstrap ─────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);

    fetch("/api/pricing-tiers")
      .then((r) => r.json())
      .then(setPricingTiers)
      .catch(console.error);

    fetch("/api/listings")
      .then((r) => r.json())
      .then((d) => { setListings(d.slice(0, 3)); setListingsLoading(false); })
      .catch(() => setListingsLoading(false));

    // Cycle hero background every 7 s
    const bgTimer = setInterval(() => {
      setHeroImg((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 7000);

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearInterval(bgTimer);
    };
  }, []);

  /* ── Feature cards ─────────────────────────────── */
  const features = [
    { icon: <Home className="h-5 w-5" />, color: "#007AFF", title: "Portfolio Dashboard", desc: "Manage unlimited properties and units from one intelligent hub — from studio apartments to office complexes." },
    { icon: <Users className="h-5 w-5" />, color: "#34C759", title: "Tenant Onboarding", desc: "Invite tenants, sign leases digitally, and automate the entire onboarding workflow in minutes." },
    { icon: <Wrench className="h-5 w-5" />, color: "#FF9500", title: "Maintenance Tickets", desc: "Tenants submit photo-backed tickets, you dispatch vendors, track status — fully automated triage." },
    { icon: <CreditCard className="h-5 w-5" />, color: "#34C759", title: "Stripe Rent Collection", desc: "Auto-invoicing, ACH & card payments, and direct bank payouts. Zero manual follow-up." },
    { icon: <BarChart3 className="h-5 w-5" />, color: "#007AFF", title: "Financial Reporting", desc: "Generate professional P&L PDFs, occupancy heat-maps, and ledger exports in one tap." },
    { icon: <Shield className="h-5 w-5" />, color: "#6E6E73", title: "256-bit Encryption", desc: "Lease documents, bank details, and identity records secured with bank-grade AES-256 encryption." },
  ];

  /* ─────────────────────────────────────────────────
     JSX
  ───────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans overflow-x-hidden selection:bg-[#007AFF]/20">

      {/* ── NAV ─────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
        <div
          className={`w-full max-w-6xl transition-all duration-400 rounded-2xl ${
            scrolled
              ? "bg-white/80 backdrop-blur-2xl border border-white/60 shadow-xl shadow-black/5 py-2.5 px-5"
              : "bg-white/10 backdrop-blur-md border border-white/20 py-3 px-5"
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-[#007AFF] flex items-center justify-center shadow-lg shadow-[#007AFF]/30 group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className={`text-xl font-semibold tracking-tight transition-colors ${scrolled ? "text-[#1D1D1F]" : "text-white"}`}>
                Property<span className={scrolled ? "text-[#007AFF]" : "text-white/80"}>Pro</span>
              </span>
            </Link>

            {/* Desktop nav pill */}
            <nav className={`hidden md:flex items-center gap-0.5 p-1 rounded-full border transition-all ${scrolled ? "bg-[#F5F5F7] border-[#E5E5EA]" : "bg-white/10 border-white/20"}`}>
              {["Features|#features", "Workspaces|#portals", "Rentals|#listings", "Pricing|#pricing"].map((item) => {
                const [label, href] = item.split("|");
                return (
                  <a
                    key={label}
                    href={href}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                      scrolled
                        ? "text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-white"
                        : "text-white/70 hover:text-white hover:bg-white/15"
                    }`}
                  >
                    {label}
                  </a>
                );
              })}
            </nav>

            {/* CTAs */}
            <div className="hidden md:flex items-center gap-2.5">
              <Link href="/auth/login">
                <Button
                  variant="ghost"
                  className={`h-9 px-4 text-xs font-medium rounded-xl transition-all ${scrolled ? "text-[#1D1D1F] hover:bg-black/5" : "text-white hover:bg-white/15"}`}
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button className="h-9 px-4 text-xs font-semibold rounded-xl bg-[#007AFF] hover:bg-[#0066CC] text-white shadow-lg shadow-[#007AFF]/25 transition-all hover:scale-[1.02]">
                  Dashboard
                </Button>
              </Link>
            </div>

            {/* Mobile toggle */}
            <button
              className={`md:hidden p-2 rounded-xl transition-all ${scrolled ? "text-[#1D1D1F] hover:bg-black/5" : "text-white hover:bg-white/15"}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-lg pt-24 px-5 md:hidden flex flex-col pb-10 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-1">
            {["Features|#features", "Workspaces|#portals", "Rentals|#listings", "Pricing|#pricing"].map((item) => {
              const [label, href] = item.split("|");
              return (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between text-sm font-semibold text-[#1D1D1F] py-3 px-3 rounded-xl hover:bg-[#F5F5F7]"
                >
                  {label} <ChevronRight className="h-4 w-4 text-slate-400" />
                </a>
              );
            })}
            <div className="pt-3 space-y-2 border-t border-slate-100">
              <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full h-11 rounded-xl font-semibold">Sign In</Button>
              </Link>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full h-11 rounded-xl font-semibold bg-[#007AFF] hover:bg-[#0066CC] text-white shadow-lg shadow-[#007AFF]/20">Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background image with crossfade */}
        <div className="absolute inset-0 overflow-hidden">
          {HERO_IMAGES.map((src, idx) => (
            <div
              key={idx}
              className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
              style={{ opacity: idx === heroImg ? 1 : 0 }}
            >
              <img
                src={src}
                alt="Property"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Deep cinematic overlay – two layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent z-10" />

        {/* Subtle animated blue tint vignette */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,122,255,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Hero content - Centered & Clean Apple Style */}
        <div className="relative z-20 max-w-4xl mx-auto px-5 sm:px-8 w-full pt-32 pb-24 text-center flex flex-col items-center justify-center space-y-8">
          
          {/* Live badge */}
          <div className="animate-slide-up-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-medium text-white/90">
            <span className="flex h-2 w-2 rounded-full bg-[#34C759] animate-pulse" />
            <span>PropertyPro v2.0 — Premium Real Estate OS</span>
          </div>

          {/* Main headline */}
          <div className="animate-slide-up-2 space-y-3 max-w-3xl">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08]">
              The Smarter Way to Manage Real Estate.
            </h1>
            <p className="text-xl sm:text-2xl font-light text-white/75 tracking-normal">
              Automate rent collection, digital leases, and maintenance.
            </p>
          </div>

          {/* Subtext */}
          <p className="animate-slide-up-3 text-base sm:text-lg text-white/65 font-normal max-w-2xl leading-relaxed">
            Replace fragmented property tools with one cohesive operating system built for modern landlords, property managers, and tenants.
          </p>

          {/* CTA row */}
          <div className="animate-slide-up-4 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto pt-2">
            <Button
              onClick={() => setOwnerModalOpen(true)}
              className="h-13 px-8 w-full sm:w-auto bg-[#007AFF] hover:bg-[#0066CC] text-white text-base font-semibold rounded-2xl shadow-2xl shadow-[#007AFF]/40 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Request Owner Access
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Link href="/listings" className="w-full sm:w-auto">
              <Button
                variant="ghost"
                className="h-13 px-8 w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white text-base font-semibold rounded-2xl border border-white/25 backdrop-blur-md transition-all flex items-center justify-center"
              >
                Explore Rentals
              </Button>
            </Link>
          </div>

          {/* Trust badges row */}
          <div className="animate-slide-up-5 flex flex-wrap items-center justify-center gap-6 text-xs text-white/60 font-medium pt-4 border-t border-white/10 w-full max-w-2xl">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#34C759]" />Stripe Rent Collection</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#34C759]" />Digital Lease Signing</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#34C759]" />Automated Maintenance</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#34C759]" />256-bit AES Encryption</span>
          </div>

        </div>

        {/* Bottom scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 animate-bounce">
          <span className="text-white/40 text-[10px] font-medium uppercase tracking-widest">Scroll</span>
          <ChevronDown className="h-4 w-4 text-white/40" />
        </div>
      </section>

      {/* ── MARQUEE ─────────────────────────────────── */}
      <section className="py-10 bg-white border-b border-[#E5E5EA] overflow-hidden">
        <ScrollReveal>
          <p className="text-center text-[10px] font-semibold text-[#6E6E73] uppercase tracking-widest mb-5">
            Trusted by property groups worldwide
          </p>
          <div className="flex overflow-hidden">
            <div className="animate-marquee flex items-center gap-14 text-[#1D1D1F]/25 font-bold text-sm uppercase tracking-widest select-none whitespace-nowrap">
              {["Apex Realty", "Horizon Capital", "Oakwood Group", "Metro Housing", "Vertex Management", "Pacific Estates", "Skyline Props", "Apex Realty", "Horizon Capital", "Oakwood Group", "Metro Housing", "Vertex Management", "Pacific Estates", "Skyline Props"].map((name, i) => (
                <span key={i} className="shrink-0">• {name}</span>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── FEATURES ────────────────────────────────── */}
      <section id="features" className="py-28 max-w-7xl mx-auto px-5 sm:px-8">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#007AFF]">Platform Capabilities</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-[#1D1D1F] tracking-tight">Everything your portfolio needs.</h2>
            <p className="text-base text-[#6E6E73] font-normal">Replace fragmented tools with one cohesive, beautifully designed operating system.</p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <ScrollReveal key={i} delay={i * 80} distance={30} className="h-full">
              <div
                className="group bg-white rounded-3xl border border-[#E5E5EA] p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col gap-5 h-full"
              >
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center"
                  style={{ background: `${f.color}12`, color: f.color }}
                >
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1D1D1F] mb-1.5">{f.title}</h3>
                  <p className="text-sm text-[#6E6E73] font-normal leading-relaxed">{f.desc}</p>
                </div>
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-1 text-xs font-medium text-[#007AFF] opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── ALL PORTALS SHOWCASE ─────────────────────── */}
      <section id="portals" className="py-32 bg-[#F5F5F7] border-y border-[#E5E5EA] relative overflow-hidden">
        {/* Background Mesh Overlay */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-full -z-10 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#007AFF]/5 rounded-full blur-[140px] animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#34C759]/5 rounded-full blur-[140px] animate-float-reverse"></div>
        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {/* Header */}
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
              <span className="px-3.5 py-1.5 rounded-full bg-[#007AFF]/10 text-[#007AFF] text-xs font-bold uppercase tracking-wider animate-glow-pulse">
                Integrated Ecosystem
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1D1D1F] tracking-tight leading-tight">
                One platform. Four tailored workspaces.
              </h2>
              <p className="text-base sm:text-lg text-[#6E6E73] font-medium max-w-2xl mx-auto">
                PropertyPro delivers highly optimized, native-feeling workspaces designed specifically for every stakeholder in the property cycle.
              </p>
            </div>
          </ScrollReveal>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* ── CARD 1: Admin Portal ── */}
            <div className="group relative rounded-3xl border border-[#E5E5EA] bg-white overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 min-h-[520px] flex flex-col justify-between perspective-1000 preserve-3d">
              {/* Full-bleed Background Image with Ken Burns */}
              <div className="absolute inset-0 z-0">
                <img
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
                  alt="Admin Control"
                  className="w-full h-full object-cover animate-ken-burns opacity-40 group-hover:scale-105 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white/20" />
              </div>

              {/* Top info and status */}
              <div className="relative z-10 p-8 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-black text-white flex items-center justify-center">
                      <Shield className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Admin Control</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#1D1D1F] pt-2">System Administrator</h3>
                  <p className="text-xs text-[#6E6E73] font-medium">Platform orchestration & operations</p>
                </div>
                <div className="bg-[#34C759]/10 border border-[#34C759]/30 rounded-full px-3 py-1 flex items-center gap-1.5 animate-glow-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34C759] animate-pulse" />
                  <span className="text-[10px] font-bold text-[#34C759] uppercase tracking-wider">Operational</span>
                </div>
              </div>

              {/* Center Floating UI - Simulated Live Log Console */}
              <div className="relative z-10 px-8 flex justify-center py-4 preserve-3d">
                <div className="w-full max-w-sm bg-[#1C1C1E] rounded-2xl border border-slate-800 shadow-2xl p-4 transform group-hover:translate-z-10 group-hover:rotate-x-2 transition-transform duration-500 text-left font-mono text-[10px] text-slate-400 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[9px] uppercase font-sans font-bold text-slate-500">
                    <span>Active Services Monitor</span>
                    <span className="text-[#34C759]">System Live</span>
                  </div>
                  <div className="space-y-1.5 h-20 overflow-hidden relative">
                    <p className="text-[#34C759]">✔ [auth] connection established (JWT v2.0)</p>
                    <p className="text-[#007AFF]">ℹ [cron] active subscriptions audit completed</p>
                    <p className="text-[#FF9500]">⚠ [database] query optimization triggered</p>
                    <p className="text-white animate-pulse">● [stripe] webhook listening on port 3000...</p>
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#1C1C1E] to-transparent pointer-events-none" />
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[9px]">
                    <span>CPU: 4.8% · RAM: 240MB</span>
                    <span className="text-[#007AFF]">v2.0.4 stable</span>
                  </div>
                </div>
              </div>

              {/* Bottom Glass Tray */}
              <div className="relative z-10 p-6 bg-white/60 border-t border-[#E5E5EA] backdrop-blur-md flex items-center justify-between">
                <div className="flex gap-2">
                  {["System Config", "Cron Manager", "Access Audits"].map((ft) => (
                    <span key={ft} className="text-[9px] font-bold text-slate-700 bg-white border border-[#E5E5EA] px-2 py-0.5 rounded-md">{ft}</span>
                  ))}
                </div>
                <Link href="/dashboard">
                  <Button className="h-9 px-4 bg-black text-white hover:bg-black/90 font-semibold rounded-xl text-xs flex items-center gap-1">
                    Enter Workspace <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* ── CARD 2: Owner Workspace (Stripe Blue) ── */}
            <div className="group relative rounded-3xl border border-[#E5E5EA] bg-white overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 min-h-[520px] flex flex-col justify-between perspective-1000 preserve-3d">
              {/* Full-bleed Background Image with Ken Burns */}
              <div className="absolute inset-0 z-0">
                <img
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
                  alt="Landlord Workspace"
                  className="w-full h-full object-cover animate-ken-burns opacity-40 group-hover:scale-105 transition-transform duration-1000"
                  style={{ animationDelay: "-4s" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white/20" />
              </div>

              {/* Top info and status */}
              <div className="relative z-10 p-8 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-[#007AFF] text-white flex items-center justify-center">
                      <Home className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-[#007AFF] uppercase tracking-widest">Landlord Hub</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#1D1D1F] pt-2">Owner Workspace</h3>
                  <p className="text-xs text-[#6E6E73] font-medium">Asset orchestration & yield tracking</p>
                </div>
                <div className="bg-[#007AFF]/10 border border-[#007AFF]/30 rounded-full px-3 py-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF] animate-pulse" />
                  <span className="text-[10px] font-bold text-[#007AFF] uppercase tracking-wider">Stripe Ready</span>
                </div>
              </div>

              {/* Center Floating UI - Dynamic Animated SVG Chart */}
              <div className="relative z-10 px-8 flex justify-center py-4 preserve-3d">
                <div className="w-full max-w-sm bg-white rounded-2xl border border-[#E5E5EA] shadow-2xl p-4 transform group-hover:translate-z-10 group-hover:-rotate-x-2 transition-transform duration-500 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Stripe Payouts (MTD)</p>
                      <p className="text-lg font-extrabold text-[#1D1D1F]">$32,450.00</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#34C759] bg-[#34C759]/10 px-2.5 py-0.5 rounded-md">▲ +14.2%</span>
                  </div>
                  {/* SVG Chart with Line Animation */}
                  <div className="h-16 w-full overflow-hidden">
                    <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#007AFF" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#007AFF" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,25 Q15,10 30,18 T60,5 T90,12 T100,8 L100,30 L0,30 Z"
                        fill="url(#chartGlow)"
                      />
                      <path
                        d="M0,25 Q15,10 30,18 T60,5 T90,12 T100,8"
                        fill="none"
                        stroke="#007AFF"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeDasharray="200"
                        strokeDashoffset="200"
                        className="animate-shimmer"
                        style={{
                          animation: "shimmer 4s ease-in-out infinite",
                          strokeDashoffset: 0,
                        }}
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Bottom Glass Tray */}
              <div className="relative z-10 p-6 bg-white/60 border-t border-[#E5E5EA] backdrop-blur-md flex items-center justify-between">
                <div className="flex gap-2">
                  {["Lease Builder", "PDF Ledger", "Stripe Connect"].map((ft) => (
                    <span key={ft} className="text-[9px] font-bold text-slate-700 bg-white border border-[#E5E5EA] px-2 py-0.5 rounded-md">{ft}</span>
                  ))}
                </div>
                <Button onClick={() => setOwnerModalOpen(true)} className="h-9 px-4 bg-[#007AFF] hover:bg-[#0066CC] text-white font-semibold rounded-xl text-xs flex items-center gap-1 shadow-md shadow-[#007AFF]/20">
                  Request Access <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* ── CARD 3: Tenant Workspace (Green) ── */}
            <div className="group relative rounded-3xl border border-[#E5E5EA] bg-white overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 min-h-[520px] flex flex-col justify-between perspective-1000 preserve-3d">
              {/* Full-bleed Background Image with Ken Burns */}
              <div className="absolute inset-0 z-0">
                <img
                  src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80"
                  alt="Tenant Portal"
                  className="w-full h-full object-cover animate-ken-burns opacity-40 group-hover:scale-105 transition-transform duration-1000"
                  style={{ animationDelay: "-8s" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white/20" />
              </div>

              {/* Top info and status */}
              <div className="relative z-10 p-8 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-[#34C759] text-white flex items-center justify-center">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-[#34C759] uppercase tracking-widest">Tenant Portal</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#1D1D1F] pt-2">Renter Portal</h3>
                  <p className="text-xs text-[#6E6E73] font-medium">One-tap payments & active tickets</p>
                </div>
                <div className="bg-[#34C759]/10 border border-[#34C759]/30 rounded-full px-3 py-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34C759] animate-pulse" />
                  <span className="text-[10px] font-bold text-[#34C759] uppercase tracking-wider">Mobile Hub</span>
                </div>
              </div>

              {/* Center Floating UI - Interactive Mobile Card */}
              <div className="relative z-10 px-8 flex justify-center py-4 preserve-3d">
                <div className="w-full max-w-sm bg-white rounded-2xl border border-[#E5E5EA] shadow-2xl p-4 transform group-hover:translate-z-10 group-hover:rotate-y-2 transition-transform duration-500 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Bill</span>
                    <span className="text-[9px] text-[#FF9500] font-bold bg-[#FF9500]/10 px-2 py-0.5 rounded-full">Rent Due</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-extrabold text-[#1D1D1F]">$1,850.00</p>
                      <p className="text-[9px] text-slate-400">Due Date: July 25, 2026</p>
                    </div>
                    {/* Simulated Apple Pay button */}
                    <button className="h-9 px-4 bg-black text-white font-semibold rounded-xl text-[10px] flex items-center gap-1 hover:scale-105 active:scale-95 transition-transform shadow-md">
                      <span>Pay with</span>
                      <span className="font-bold text-xs"> Pay</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Glass Tray */}
              <div className="relative z-10 p-6 bg-white/60 border-t border-[#E5E5EA] backdrop-blur-md flex items-center justify-between">
                <div className="flex gap-2">
                  {["Autopay Setup", "Ticket Triage", "Document Hub"].map((ft) => (
                    <span key={ft} className="text-[9px] font-bold text-slate-700 bg-white border border-[#E5E5EA] px-2 py-0.5 rounded-md">{ft}</span>
                  ))}
                </div>
                <Link href="/auth/login">
                  <Button className="h-9 px-4 bg-[#34C759] hover:bg-[#2FB34F] text-white font-semibold rounded-xl text-xs flex items-center gap-1 shadow-md shadow-[#34C759]/20">
                    Tenant Login <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* ── PORTAL 4: Inspector Portal (Orange) ── */}
            <div className="group relative rounded-3xl border border-[#E5E5EA] bg-white overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 min-h-[520px] flex flex-col justify-between perspective-1000 preserve-3d">
              {/* Full-bleed Background Image with Ken Burns */}
              <div className="absolute inset-0 z-0">
                <img
                  src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80"
                  alt="Inspector Workspace"
                  className="w-full h-full object-cover animate-ken-burns opacity-40 group-hover:scale-105 transition-transform duration-1000"
                  style={{ animationDelay: "-12s" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white/20" />
              </div>

              {/* Top info and status */}
              <div className="relative z-10 p-8 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-[#FF9500] text-white flex items-center justify-center">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-[#FF9500] uppercase tracking-widest">Inspections</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#1D1D1F] pt-2">Inspector Portal</h3>
                  <p className="text-xs text-[#6E6E73] font-medium">Job dispatch & condition checklists</p>
                </div>
                <div className="bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-full px-3 py-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF9500] animate-pulse" />
                  <span className="text-[10px] font-bold text-[#FF9500] uppercase tracking-wider">Jobs Active</span>
                </div>
              </div>

              {/* Center Floating UI - Condition Checklist and Live Progress */}
              <div className="relative z-10 px-8 flex justify-center py-4 preserve-3d">
                <div className="w-full max-w-sm bg-white rounded-2xl border border-[#E5E5EA] shadow-2xl p-4 transform group-hover:translate-z-10 group-hover:-rotate-y-2 transition-transform duration-500 space-y-3 text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <span>Inspection Progress</span>
                    <span className="text-[#FF9500]">In Progress</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-4 w-4 rounded-full bg-[#34C759]/10 text-[#34C759] flex items-center justify-center font-bold text-[9px]">✔</div>
                      <span className="text-slate-600 font-medium">HVAC Condition Checked</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-4 w-4 rounded-full bg-[#34C759]/10 text-[#34C759] flex items-center justify-center font-bold text-[9px]">✔</div>
                      <span className="text-slate-600 font-medium">Smoke Detectors Audited</span>
                    </div>
                    {/* Live animated progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                        <span>Overall Checklist</span>
                        <span>75%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#FF9500] rounded-full w-3/4 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Glass Tray */}
              <div className="relative z-10 p-6 bg-white/60 border-t border-[#E5E5EA] backdrop-blur-md flex items-center justify-between">
                <div className="flex gap-2">
                  {["Condition Logs", "Triage Calendar", "Vendor Portal"].map((ft) => (
                    <span key={ft} className="text-[9px] font-bold text-slate-700 bg-white border border-[#E5E5EA] px-2 py-0.5 rounded-md">{ft}</span>
                  ))}
                </div>
                <Link href="/auth/login">
                  <Button className="h-9 px-4 bg-[#FF9500] hover:bg-[#E08800] text-white font-semibold rounded-xl text-xs flex items-center gap-1 shadow-md shadow-[#FF9500]/20">
                    Inspector Login <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

          </div>{/* end grid */}
        </div>
      </section>

      {/* ── LISTINGS ────────────────────────────────── */}
      <section id="listings" className="py-28 max-w-7xl mx-auto px-5 sm:px-8">
        <ScrollReveal>
          <div className="flex flex-col items-center text-center mb-14 gap-4">
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-[#34C759] uppercase tracking-widest">Live Vacancies</span>
              <h2 className="text-4xl font-bold text-[#1D1D1F]">Available Properties</h2>
              <p className="text-sm text-[#6E6E73]">Real-time vacancies listed on our platform.</p>
            </div>
            <Link href="/listings">
              <Button variant="outline" className="h-10 px-5 rounded-xl border-[#E5E5EA] text-xs font-medium flex items-center gap-2 shrink-0 mt-2">
                Browse All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </ScrollReveal>

        {listingsLoading ? (
          <div className="flex gap-6 overflow-hidden py-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-[320px] sm:w-[360px] flex-shrink-0 bg-white rounded-3xl border border-[#E5E5EA] overflow-hidden animate-pulse">
                <div className="aspect-[16/10] bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length > 0 ? (
          <ScrollReveal delay={100}>
            <div className="relative w-full overflow-hidden py-6">
              {/* Apple style frosted fade overlays */}
              <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#F5F5F7] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#F5F5F7] to-transparent z-10 pointer-events-none" />
              
              <div className="animate-marquee-slow flex gap-6">
                {/* Duplicate array to ensure endless smooth loop */}
                {[...listings, ...listings, ...listings, ...listings].map((unit, index) => {
                  const img = unit.images?.[0] || unit.property?.coverPhoto ||
                    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80";
                  return (
                    <div key={`${unit.id}-${index}`} className="w-[320px] sm:w-[360px] flex-shrink-0 bg-white rounded-3xl border border-[#E5E5EA] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative">
                      {/* Image section with premium badges */}
                      <div className="aspect-[16/10] relative overflow-hidden bg-slate-100">
                        <img
                          src={img}
                          alt={unit.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80"; }}
                        />
                        {/* Frosted role badge */}
                        <div className="absolute top-3.5 left-3.5 bg-black/45 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/10">
                          {unit.type || "Apartment"}
                        </div>
                        {/* Floating Apple-style price bubble */}
                        <div className="absolute bottom-3.5 right-3.5 bg-white/90 backdrop-blur-lg border border-white/60 text-[#1D1D1F] text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                          ${Number(unit.rentAmount).toLocaleString()}/mo
                        </div>
                      </div>

                      {/* Content details section */}
                      <div className="p-6 flex flex-col gap-4 flex-1 justify-between">
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-[#007AFF] uppercase tracking-widest">
                            Unit {unit.name} · {unit.property?.city || "Los Angeles"}
                          </p>
                          <h4 className="text-base font-bold text-[#1D1D1F] tracking-tight line-clamp-1">
                            {unit.property?.name || "Premium Residence"}
                          </h4>
                          <p className="text-[11px] text-[#6E6E73] font-normal flex items-center gap-1 leading-none pt-0.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{unit.property?.address || "Address unavailable"}</span>
                          </p>
                        </div>

                        {/* Specs badges in place of vertical grid lines */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-[#6E6E73] bg-[#F5F5F7] border border-[#E5E5EA] px-2.5 py-1 rounded-lg">
                            🛏️ {unit.rooms} Beds
                          </span>
                          <span className="text-[10px] font-semibold text-[#6E6E73] bg-[#F5F5F7] border border-[#E5E5EA] px-2.5 py-1 rounded-lg">
                            🛁 {unit.bathrooms || 1} Baths
                          </span>
                          <span className="text-[10px] font-semibold text-[#6E6E73] bg-[#F5F5F7] border border-[#E5E5EA] px-2.5 py-1 rounded-lg">
                            📐 {unit.sqFootage} Sq Ft
                          </span>
                        </div>

                        <Link href={`/listings?id=${unit.id}`} className="mt-2">
                          <Button className="w-full h-10 bg-[#007AFF] hover:bg-[#0066CC] text-white font-semibold rounded-2xl text-xs shadow-sm shadow-[#007AFF]/15 transition-all active:scale-[0.98]">
                            Apply / Schedule Tour
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollReveal>
        ) : (
          <ScrollReveal>
            <div className="bg-white border border-[#E5E5EA] rounded-3xl p-14 text-center max-w-sm mx-auto shadow-sm space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mx-auto">
                <Home className="h-6 w-6" />
              </div>
              <h4 className="text-base font-semibold text-[#1D1D1F]">No Active Vacancies</h4>
              <p className="text-xs text-[#6E6E73] leading-relaxed">All properties are currently occupied. Request owner access to list yours.</p>
            </div>
          </ScrollReveal>
        )}
      </section>

      {/* ── HOW IT WORKS ────────────────────────────── */}
      <section className="py-28 bg-white border-t border-[#E5E5EA]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-[10px] font-semibold text-[#007AFF] uppercase tracking-widest">Getting Started</span>
              <h2 className="text-4xl font-bold text-[#1D1D1F]">Up and running in three steps.</h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-[#E5E5EA]" />
            {[
              { n: "01", icon: <Key className="h-5 w-5" />, title: "Get Owner Access", desc: "Apply in under 2 minutes. Our team verifies your identity and activates your account with white-glove onboarding." },
              { n: "02", icon: <FileText className="h-5 w-5" />, title: "Add Properties & Leases", desc: "Create your property portfolio, define units, invite tenants, and generate digital leases with one click." },
              { n: "03", icon: <DollarSign className="h-5 w-5" />, title: "Automate Everything", desc: "Connect Stripe for automatic rent collection, instant payouts, and maintenance ticket dispatching." },
            ].map((step, i) => (
              <ScrollReveal key={i} delay={i * 120} distance={30}>
                <div className="relative flex flex-col items-center text-center gap-4">
                  <div className="relative z-10 h-16 w-16 rounded-2xl bg-[#007AFF] flex items-center justify-center text-white shadow-lg shadow-[#007AFF]/25">
                    {step.icon}
                    <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#1D1D1F] text-white text-[9px] font-bold flex items-center justify-center">{step.n}</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#1D1D1F]">{step.title}</h3>
                  <p className="text-sm text-[#6E6E73] leading-relaxed">{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────── */}
      <section id="pricing" className="py-28 bg-[#F5F5F7] border-t border-[#E5E5EA]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-[10px] font-semibold text-[#007AFF] uppercase tracking-widest">Pricing</span>
              <h2 className="text-4xl font-bold text-[#1D1D1F]">Simple, transparent pricing.</h2>
              <p className="text-sm text-[#6E6E73]">Scale your plan as your portfolio grows — no platform take-rate on rent.</p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingTiers.length > 0 ? pricingTiers.map((tier, idx) => {
              const isPop = tier.name.toLowerCase() === "professional";
              return (
                <ScrollReveal key={tier.id} delay={idx * 100} distance={30} className="h-full">
                  <div
                    className={`rounded-3xl p-7 flex flex-col justify-between border transition-all duration-300 h-full ${
                      isPop
                        ? "bg-[#1D1D1F] text-white border-slate-700 shadow-2xl shadow-black/15 md:-translate-y-3"
                        : "bg-white text-[#1D1D1F] border-[#E5E5EA] shadow-sm"
                    }`}
                  >
                    {isPop && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="bg-[#007AFF] text-white text-[10px] font-semibold uppercase px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                          <Zap className="h-3 w-3 fill-white" /> Most Popular
                        </span>
                      </div>
                    )}
                    <div className="relative">
                      <h3 className="text-lg font-semibold mb-0.5">{tier.name}</h3>
                      <p className={`text-xs mb-5 ${isPop ? "text-slate-400" : "text-[#6E6E73]"}`}>{tier.description}</p>
                      <div className="mb-6">
                        {tier.isCustom ? (
                          <span className="text-3xl font-bold">Custom</span>
                        ) : (
                          <>
                            <span className="text-3xl font-bold">${tier.price}</span>
                            <span className={`text-xs ${isPop ? "text-slate-400" : "text-[#6E6E73]"}`}>/mo</span>
                          </>
                        )}
                      </div>
                      <div className="space-y-2.5 border-t border-slate-200/20 pt-5 mb-7">
                        {tier.features.map((ft: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs font-medium">
                            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${isPop ? "text-[#007AFF]" : "text-[#34C759]"}`} /> {ft}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={() => setOwnerModalOpen(true)}
                      className={`w-full h-10 rounded-xl font-semibold text-xs transition-all ${
                        isPop
                          ? "bg-[#007AFF] hover:bg-[#0066CC] text-white shadow-lg shadow-[#007AFF]/25"
                          : "bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border border-[#E5E5EA]"
                      }`}
                    >
                      {tier.isCustom ? "Contact Sales" : "Apply for Access"}
                    </Button>
                  </div>
                </ScrollReveal>
              );
            }) : (
              <div className="col-span-3 text-center text-[#6E6E73] py-14 text-sm animate-pulse">Loading pricing…</div>
            )}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────── */}
      <section className="py-28 max-w-3xl mx-auto px-5 sm:px-8">
        <ScrollReveal>
          <div className="text-center mb-14 space-y-3">
            <span className="text-[10px] font-semibold text-[#007AFF] uppercase tracking-widest">FAQ</span>
            <h2 className="text-4xl font-bold text-[#1D1D1F]">Common questions.</h2>
          </div>
        </ScrollReveal>
        <div className="space-y-3">
          {[
            { q: "How are rent payments processed?", a: "Rent is processed through Stripe. Tenant cards are charged automatically on the due date and funds arrive in your connected bank account within 2–3 business days." },
            { q: "Can I manage multiple properties?", a: "Yes. The Owner dashboard supports unlimited properties and units, each with independent occupancy tracking, lease management, and financial reporting." },
            { q: "How do tenants submit maintenance requests?", a: "Tenants log into their portal, tap 'New Ticket', describe the issue, and attach photos from their phone. You see the ticket instantly and can assign a vendor." },
            { q: "Is tenant screening included?", a: "Yes. Applicants fill out a detailed profile including employment details, previous landlord references, and consent to background checks before you approve their lease." },
          ].map((faq, i) => (
            <ScrollReveal key={i} delay={i * 60} distance={20}>
              <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-5 text-left flex justify-between items-center hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-[#1D1D1F]">{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-xs text-[#6E6E73] leading-relaxed border-t border-slate-100 pt-3">{faq.a}</div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────── */}
      <section className="relative overflow-hidden py-28 bg-[#1D1D1F]">
        {/* Cinematic property backdrop */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=2400&q=80"
            alt="Property"
            className="w-full h-full object-cover opacity-20 animate-ken-burns"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#1D1D1F]/80 via-[#1D1D1F]/60 to-[#1D1D1F]/90" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] bg-[#007AFF]/15 rounded-full blur-[120px] pointer-events-none" />

        <ScrollReveal>
          <div className="relative z-10 max-w-3xl mx-auto px-5 text-center space-y-6">
            <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              Ready to modernise your property business?
            </h2>
            <p className="text-base text-white/60 font-normal max-w-xl mx-auto">
              Join landlords and tenants already saving hours of admin with PropertyPro's fully automated platform.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
              <Button
                onClick={() => setOwnerModalOpen(true)}
                className="h-12 px-8 bg-[#007AFF] hover:bg-[#0066CC] text-white font-semibold rounded-2xl shadow-2xl shadow-[#007AFF]/30 text-sm transition-all hover:scale-[1.02]"
              >
                Apply for Owner Access
              </Button>
              <Link href="/auth/login">
                <Button className="h-12 px-8 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-2xl text-sm backdrop-blur-md">
                  Sign In to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── FOOTER ──────────────────────────────────── */}
      <footer className="bg-[#1D1D1F] py-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-[#007AFF] rounded-xl flex items-center justify-center text-white">
                  <Building2 className="h-4 w-4" />
                </div>
                <span className="font-semibold text-white">PropertyPro</span>
              </div>
              <p className="text-xs text-[#8E8E93] leading-relaxed max-w-xs">
                The premium property management operating system for modern landlords and renters.
              </p>
            </div>

            {[
              { title: "Product", links: ["Features|#features", "Workspaces|#portals", "Rentals|#listings", "Pricing|#pricing"] },
              { title: "Portals", links: ["Sign In|/auth/login", "Owner Dashboard|/dashboard", "Tenant Portal|/dashboard"] },
              { title: "Trust", links: ["Stripe Certified|#", "256-bit Encryption|#", "Cloudflare Protected|#", "SOC2 Ready|#"] },
            ].map((col) => (
              <div key={col.title} className="space-y-2">
                <p className="text-[10px] font-semibold text-white uppercase tracking-widest">{col.title}</p>
                {col.links.map((l) => {
                  const [text, href] = l.split("|");
                  return (
                    <a key={text} href={href} className="block text-xs text-[#8E8E93] hover:text-white transition-colors">{text}</a>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#8E8E93]">
            <p>© {new Date().getFullYear()} PropertyPro Inc. All rights reserved.</p>
            <div className="flex gap-5">
              <a href="#" className="hover:text-white">Privacy</a>
              <a href="#" className="hover:text-white">Terms</a>
              <a href="#" className="hover:text-white">Support</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── OWNER MODAL ─────────────────────────────── */}
      {ownerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E5E5EA] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-7">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-[#1D1D1F]">Owner Access Application</h2>
                <button onClick={() => setOwnerModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-[#1D1D1F] transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {submitSuccess ? (
                <div className="text-center py-10 space-y-4">
                  <div className="h-14 w-14 bg-[#34C759]/10 rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-7 w-7 text-[#34C759]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#1D1D1F]">Application Submitted!</h3>
                  <p className="text-xs text-[#6E6E73] leading-relaxed max-w-xs mx-auto">Check your email for a confirmation. Our team will verify and activate your account in 1–2 business days.</p>
                  {trackingId && (
                    <div className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-2xl p-4 text-left">
                      <p className="text-[#007AFF] text-xs font-semibold mb-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Track your application</p>
                      <Link href={`/track/owner/${trackingId}`} className="text-[#007AFF] text-xs underline break-all">
                        {typeof window !== "undefined" ? window.location.origin : ""}/track/owner/{trackingId}
                      </Link>
                    </div>
                  )}
                  <Button onClick={() => { setOwnerModalOpen(false); setSubmitSuccess(false); setTrackingId(null); }} className="w-full h-11 bg-[#1D1D1F] text-white rounded-xl font-semibold">
                    Done
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleOwnerApply} className="space-y-4">
                  <p className="text-[11px] text-[#6E6E73] mb-4">Owner accounts are manually verified to maintain platform security and quality.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#1D1D1F] uppercase tracking-wide">Company / Name</label>
                      <input required name="name" type="text" placeholder="Acme Estates" className="w-full h-11 px-4 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] text-xs focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:bg-white transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#1D1D1F] uppercase tracking-wide">Website / LinkedIn</label>
                      <input name="website" type="url" placeholder="https://..." className="w-full h-11 px-4 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] text-xs focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:bg-white transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#1D1D1F] uppercase tracking-wide">Email Address</label>
                      <input required name="email" type="email" placeholder="you@company.com" className="w-full h-11 px-4 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] text-xs focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:bg-white transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#1D1D1F] uppercase tracking-wide">Phone Number</label>
                      <input required name="phone" type="tel" placeholder="(555) 012-3456" className="w-full h-11 px-4 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] text-xs focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:bg-white transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[#1D1D1F] uppercase tracking-wide">Entity Type</label>
                    <select required name="entityType" className="w-full h-11 px-4 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] text-xs focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:bg-white transition-all">
                      <option value="">Select category</option>
                      <option value="Independent Landlord">Independent Landlord</option>
                      <option value="Property Management">Property Management Agency</option>
                      <option value="Real Estate Investor">Real Estate Investor / Portfolio</option>
                    </select>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#007AFF] focus:ring-[#007AFF]" />
                    <span className="text-[11px] text-[#6E6E73] leading-normal">I confirm all details are accurate and I agree to the Terms of Service and Privacy Policy.</span>
                  </label>

                  {/* Turnstile mock */}
                  <div className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => { if (turnstileStatus === 0) { setTurnstileStatus(1); setTimeout(() => setTurnstileStatus(2), 1200); } }}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${turnstileStatus === 2 ? "bg-[#34C759] border-[#34C759]" : "bg-white border-slate-300 hover:border-slate-400"}`}
                      >
                        {turnstileStatus === 1 && <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />}
                        {turnstileStatus === 2 && <CheckCircle2 className="h-5 w-5 text-white" />}
                      </div>
                      <span className="text-xs font-medium text-[#1D1D1F]">Verify you are human</span>
                    </div>
                    <div className="text-right">
                      <ShieldCheck className="h-4 w-4 text-slate-400 ml-auto" />
                      <span className="text-[8px] text-slate-400 font-semibold uppercase tracking-wide">Cloudflare</span>
                    </div>
                  </div>

                  <Button
                    disabled={isSubmitting || turnstileStatus !== 2}
                    type="submit"
                    className="w-full h-11 bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-xl font-semibold shadow-md shadow-[#007AFF]/20 disabled:opacity-60 text-sm"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
                    ) : "Submit Application"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
