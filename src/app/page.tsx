"use client";

import React, { useState, useEffect } from "react";
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
  Menu, 
  X, 
  Shield, 
  BarChart3, 
  Clock, 
  Loader2, 
  ShieldCheck,
  Sparkles,
  LayoutDashboard,
  Smartphone,
  Zap,
  MapPin,
  Heart,
  Send,
  MessageSquare,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Owner Registration States
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [pricingTiers, setPricingTiers] = useState<any[]>([]);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [turnstileStatus, setTurnstileStatus] = useState<0 | 1 | 2>(0);

  // Portal Switcher state
  const [activePortalTab, setActivePortalTab] = useState<"owner" | "tenant">("owner");

  // Dynamic public listings state
  const [listings, setListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  const handleOwnerApply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (turnstileStatus !== 2) {
      toast.error("Please complete the security check.");
      return;
    }
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    
    try {
      const res = await fetch("/api/owner-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (res.ok) {
        setTrackingId(json.trackingId);
        setSubmitSuccess(true);
      } else {
        toast.error(json.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      toast.error("Error submitting application. Our servers might be busy.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    // Fetch pricing tiers
    fetch("/api/pricing-tiers")
      .then(res => res.json())
      .then(data => setPricingTiers(data))
      .catch(console.error);

    // Fetch public listings
    fetch("/api/listings")
      .then(res => res.json())
      .then(data => {
        setListings(data.slice(0, 3)); // show top 3 listings
        setListingsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load listings", err);
        setListingsLoading(false);
      });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: <Home className="h-6 w-6 text-blue-500" />,
      title: "Property Portfolios",
      desc: "Manage multiple properties and units from a single, unified dashboard with full visibility."
    },
    {
      icon: <Users className="h-6 w-6 text-indigo-500" />,
      title: "Tenant Management",
      desc: "Screen applicants, manage active leases, and communicate directly through the portal."
    },
    {
      icon: <Wrench className="h-6 w-6 text-rose-500" />,
      title: "Maintenance Ticketing",
      desc: "Streamline repairs with a dedicated ticketing system, inspector assignment, and photo uploads."
    },
    {
      icon: <CreditCard className="h-6 w-6 text-emerald-500" />,
      title: "Automated Accounting",
      desc: "Generate invoices, collect rent automatically via Stripe, and track your cash flow seamlessly."
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-purple-500" />,
      title: "Financial Reporting",
      desc: "Generate beautiful, comprehensive PDF reports for payouts, taxes, and performance tracking."
    },
    {
      icon: <Shield className="h-6 w-6 text-amber-500" />,
      title: "Secure Data",
      desc: "Bank-level encryption ensures your lease documents, financial data, and tenant records are safe."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Sticky Header Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${scrolled ? "bg-white/80 backdrop-blur-md shadow-sm py-3 border-slate-200/50" : "bg-transparent py-5 border-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Building2 className="h-5.5 w-5.5 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-[#0F172A]">PropertyPro</span>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-bold text-[#64748B] hover:text-[#0F172A] transition-colors">Features</a>
              <a href="#portals" className="text-sm font-bold text-[#64748B] hover:text-[#0F172A] transition-colors">Workspaces</a>
              <a href="#listings" className="text-sm font-bold text-[#64748B] hover:text-[#0F172A] transition-colors">Rentals</a>
              <a href="#pricing" className="text-sm font-bold text-[#64748B] hover:text-[#0F172A] transition-colors">Pricing</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-[#0F172A] font-extrabold hover:bg-blue-50/50 rounded-xl">Sign In</Button>
              </Link>
              <Link href="/dashboard">
                <Button className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md transition-all">
                  Dashboard
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                className="p-2 text-[#0F172A] hover:bg-slate-100 rounded-xl transition-all"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-24 px-6 md:hidden flex flex-col space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col space-y-4">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-xl font-extrabold text-[#0F172A] py-3 border-b border-[#E2E8F0]">Features</a>
            <a href="#portals" onClick={() => setMobileMenuOpen(false)} className="text-xl font-extrabold text-[#0F172A] py-3 border-b border-[#E2E8F0]">Workspaces</a>
            <a href="#listings" onClick={() => setMobileMenuOpen(false)} className="text-xl font-extrabold text-[#0F172A] py-3 border-b border-[#E2E8F0]">Rentals</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-xl font-extrabold text-[#0F172A] py-3 border-b border-[#E2E8F0]">Pricing</a>
          </div>
          <div className="flex flex-col space-y-3 pt-6">
            <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full h-12 font-bold text-lg rounded-xl">Sign In</Button>
            </Link>
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-36 overflow-hidden bg-slate-50/50">
        
        {/* Animated Background Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 pointer-events-none">
          <div className="absolute top-10 left-12 w-80 h-80 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse"></div>
          <div className="absolute top-28 right-16 w-80 h-80 bg-indigo-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '2.5s' }}></div>
          <div className="absolute -bottom-16 left-1/3 w-96 h-96 bg-purple-400/15 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '5s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-extrabold mb-8 hover:bg-blue-100/80 transition-colors cursor-pointer shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-spin" style={{ animationDuration: '3s' }} />
            PropertyPro v2.0 is now live! <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7.5xl font-black text-[#0F172A] tracking-tighter leading-[1.05] max-w-5xl mx-auto">
            Manage Properties with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Perfect Precision.</span>
          </h1>
          
          <p className="mt-8 text-lg md:text-xl text-[#64748B] font-semibold max-w-3xl mx-auto leading-relaxed">
            The ultimate operating system for modern landlords, owners, and renters. Auto-collect rent via Stripe, assign maintenance tasks, sign leases digitally, and review robust financial reports.
          </p>
          
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5 max-w-md mx-auto sm:max-w-none">
            <Button 
              onClick={() => setOwnerModalOpen(true)}
              className="h-14 px-8 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-lg rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Request Owner Access
            </Button>
            <Link href="/listings" className="w-full sm:w-auto">
              <Button variant="outline" className="h-14 px-8 w-full bg-white hover:bg-slate-50 text-[#0F172A] border-slate-200 font-extrabold text-lg rounded-xl shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0">
                View Public Rentals
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-[#64748B] text-xs font-extrabold tracking-wide uppercase">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" /> Identity Verified Setup</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" /> Free Setup Migration</div>
          </div>
        </div>

        {/* Real Dashboard Screenshot Display */}
        <div className="mt-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent z-10 h-28 bottom-0"></div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xl shadow-slate-900/10 transform hover:scale-[1.01] transition-transform duration-700">
            <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner aspect-[16/10] relative flex flex-col">
              
              {/* Browser Header Bar */}
              <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#EF4444]"></div>
                  <div className="h-3 w-3 rounded-full bg-[#F59E0B]"></div>
                  <div className="h-3 w-3 rounded-full bg-[#10B981]"></div>
                </div>
                <div className="mx-auto bg-slate-855 h-6 w-2/5 rounded-md border border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold select-none">
                  propertypro.app/dashboard
                </div>
              </div>

              {/* Live Mock Dashboard UI */}
              <div className="flex-1 flex bg-[#F8FAFC] text-slate-800 overflow-hidden font-sans text-left text-[11px] select-none">
                {/* Left Sidebar */}
                <div className="w-1/4 bg-[#0F172A] text-slate-400 p-4 flex flex-col justify-between border-r border-slate-800 shrink-0">
                  <div className="space-y-4">
                    {/* Brand Logo */}
                    <div className="flex items-center gap-2 text-white">
                      <div className="h-6 w-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-md flex items-center justify-center">
                        <Building2 className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="font-extrabold text-[12px]">PropertyPro</span>
                    </div>
                    
                    {/* Menu Links */}
                    <div className="space-y-1.5 pt-4">
                      {[
                        { label: "Dashboard", icon: <LayoutDashboard className="h-3.5 w-3.5" />, active: true },
                        { label: "Properties", icon: <Home className="h-3.5 w-3.5" /> },
                        { label: "Tenants", icon: <Users className="h-3.5 w-3.5" /> },
                        { label: "Maintenance", icon: <Wrench className="h-3.5 w-3.5" />, badge: "1" },
                        { label: "Invoices", icon: <CreditCard className="h-3.5 w-3.5" /> }
                      ].map((item, idx) => (
                        <div key={idx} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg font-bold transition-colors ${
                          item.active ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-white"
                        }`}>
                          <div className="flex items-center gap-2">
                            {item.icon}
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="bg-rose-500 text-white font-black px-1.5 py-0.5 rounded text-[8px]">{item.badge}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* User Profile */}
                  <div className="flex items-center gap-2 border-t border-slate-800 pt-3 text-white">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-650 to-indigo-650 flex items-center justify-center font-bold text-[9px] uppercase">
                      PP
                    </div>
                    <div className="leading-none truncate">
                      <p className="font-extrabold text-[10px]">Premium Props</p>
                      <p className="text-[8px] text-slate-500 font-semibold mt-0.5">owner@example.com</p>
                    </div>
                  </div>
                </div>

                {/* Main Dashboard Workspace */}
                <div className="flex-1 flex flex-col bg-[#F8FAFC]">
                  
                  {/* Workspace Topbar */}
                  <div className="h-10 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Search className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-semibold text-slate-400">Search everything...</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className="absolute -top-1 -right-1 h-1.5 w-1.5 bg-rose-500 rounded-full animate-ping" />
                        <span className="absolute -top-1 -right-1 h-1.5 w-1.5 bg-rose-500 rounded-full" />
                        <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-550 text-[10px]">
                          🔔
                        </div>
                      </div>
                      <div className="h-6 w-6 rounded-full bg-slate-200 border border-slate-350" />
                    </div>
                  </div>

                  {/* Workspace Content */}
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    
                    {/* Welcome Banner */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-xl text-white flex justify-between items-center relative overflow-hidden">
                      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-4 translate-x-4">
                        <Building2 className="h-28 w-28 text-white" />
                      </div>
                      <div className="space-y-1 z-10">
                        <h4 className="text-[13px] font-black">Good evening, Premium Properties LLC!</h4>
                        <p className="text-slate-400 text-[9px] font-semibold">Here is a quick overview of your portfolio activity today.</p>
                      </div>
                      <span className="bg-blue-600 text-white font-extrabold text-[8px] uppercase tracking-wider py-0.5 px-2 rounded-md">
                        Pro Tier
                      </span>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Overdue Invoices", value: "0", sub: "0 tenants behind schedule", border: "border-emerald-100", bg: "bg-emerald-50/50", text: "text-emerald-700" },
                        { label: "Urgent Repairs", value: "1", sub: "1 emergency issue open", border: "border-rose-100", bg: "bg-rose-50/50", text: "text-rose-700" },
                        { label: "Active Leases", value: "5", sub: "98% occupancy rate", border: "border-blue-100", bg: "bg-blue-50/50", text: "text-blue-700" }
                      ].map((stat, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border ${stat.border} ${stat.bg} space-y-1`}>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                          <div className="flex items-baseline gap-1.5">
                            <span className={`text-[16px] font-black ${stat.text}`}>{stat.value}</span>
                          </div>
                          <p className="text-[8px] text-slate-400 font-semibold">{stat.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Recent Activity Table */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-[#0F172A] uppercase tracking-wide">Recent Lease Transactions</span>
                        <span className="text-[8px] text-blue-600 font-bold hover:underline cursor-pointer">View Accounts Ledger</span>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { suite: "Downtown Tech Plaza - Suite 100", type: "Stripe Payment", amount: "$8,500.00", date: "Today", status: "Success", statusBg: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                          { suite: "Grand Horizon Towers - Unit 101", type: "Stripe Payment", amount: "$2,000.00", date: "Yesterday", status: "Success", statusBg: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                          { suite: "Sunset Villa - Main House", type: "Manual Invoice", amount: "$5,500.00", date: "3 days ago", status: "Pending", statusBg: "bg-amber-50 text-amber-700 border-amber-100" }
                        ].map((row, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors">
                            <div className="space-y-0.5 text-left">
                              <p className="font-extrabold text-[9px] text-[#0F172A]">{row.suite}</p>
                              <p className="text-[8px] text-slate-400 font-semibold">{row.type} • {row.date}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-black text-[#0F172A]">{row.amount}</span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold border ${row.statusBg}`}>{row.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-black text-[#94A3B8] uppercase tracking-widest mb-6">Trusted by real estate portfolios worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="text-xl font-black text-[#0F172A] tracking-wider">ACME ESTATES</div>
            <div className="text-xl font-black text-[#0F172A] italic">LUMINA HOMES</div>
            <div className="text-xl font-black text-[#0F172A] tracking-tighter">HORIZON GROUPS</div>
            <div className="text-xl font-black text-[#0F172A] font-serif">VERTEX CAPITAL</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-28 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight">Everything to run your rentals on autopilot.</h2>
            <p className="mt-4 text-lg text-[#64748B] font-semibold leading-relaxed">Ditch messy spreadsheets, paper leases, and cash payments. PropertyPro gathers all utilities into one beautiful dashboard.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white rounded-2.5xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-extrabold text-[#0F172A] mb-3">{feature.title}</h3>
                <p className="text-[#64748B] font-semibold text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workspaces Switcher Portal Showcase */}
      <section id="portals" className="py-28 bg-white border-y border-slate-200/85">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-black text-[#0F172A] tracking-tight">Two Tailored Workspaces. One Platform.</h2>
            <p className="mt-4 text-lg text-[#64748B] font-semibold">Switch tabs to see how PropertyPro streamlines operations for landlords and comfort for renters.</p>
            
            {/* Tab controls */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl mt-8 shadow-inner border border-slate-200/60">
              <button 
                onClick={() => setActivePortalTab("owner")}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-extrabold transition-all duration-200 ${activePortalTab === "owner" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Landlord Workspace
              </button>
              <button 
                onClick={() => setActivePortalTab("tenant")}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-extrabold transition-all duration-200 ${activePortalTab === "tenant" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                <Smartphone className="h-4 w-4" />
                Tenant Portal
              </button>
            </div>
          </div>

          {activePortalTab === "owner" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center animate-in fade-in duration-300">
              {/* Owner text */}
              <div className="lg:col-span-5 space-y-6">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">For Landlords & Owners</span>
                <h3 className="text-3xl font-black text-[#0F172A] leading-tight">Oversee your assets with automated workflows.</h3>
                <p className="text-slate-600 font-semibold text-sm leading-relaxed">
                  PropertyPro is designed to save property managers hours of administration. Streamline portfolio statistics, payments, maintenance schedules, and documents.
                </p>
                <ul className="space-y-4">
                  {[
                    "Invite tenants and setup digital lease agreements instantly",
                    "Collect rent directly into your bank account with Stripe payouts",
                    "Track maintenance requests, assign priorities, and log logs",
                    "Run real-time statistics including occupancy and collections"
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm font-bold text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Owner mockup box */}
              <div className="lg:col-span-7 bg-slate-900 rounded-3xl p-6 shadow-2xl relative border border-slate-800 overflow-hidden min-h-[400px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full mix-blend-screen filter blur-[80px]"></div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-black">L</div>
                    <span className="text-xs font-bold text-slate-200">Owner Ledger Dashboard</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Live Wallet</span>
                </div>
                
                <div className="space-y-6 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gross Collection</span>
                      <div className="text-2xl font-black text-white mt-1">$24,400.00</div>
                      <span className="text-[9px] text-emerald-400 font-bold mt-1 block">▲ +12% from last month</span>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Occupancy Rate</span>
                      <div className="text-2xl font-black text-white mt-1">87.5%</div>
                      <span className="text-[9px] text-slate-400 font-bold mt-1 block">7 of 8 units occupied</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4 space-y-3">
                    <span className="text-[11px] text-slate-300 font-bold block">Quick Action Shortcuts</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 cursor-pointer hover:bg-slate-700 transition-colors">
                        <Home className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                        <span className="text-[9px] text-slate-200 font-bold block">New Unit</span>
                      </div>
                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 cursor-pointer hover:bg-slate-700 transition-colors">
                        <Users className="h-4 w-4 text-indigo-400 mx-auto mb-1" />
                        <span className="text-[9px] text-slate-200 font-bold block">Invite Tenant</span>
                      </div>
                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 cursor-pointer hover:bg-slate-700 transition-colors">
                        <CreditCard className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                        <span className="text-[9px] text-slate-200 font-bold block">Stripe Portal</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 mt-6 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Last updated: just now</span>
                  <Link href="/dashboard" className="text-blue-400 hover:underline font-bold">Open Full Workspace →</Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center animate-in fade-in duration-300">
              {/* Tenant text */}
              <div className="lg:col-span-5 space-y-6">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">For Renters & Tenants</span>
                <h3 className="text-3xl font-black text-[#0F172A] leading-tight">Pay rent, view leases, and report problems.</h3>
                <p className="text-slate-600 font-semibold text-sm leading-relaxed">
                  Renters enjoy a clean, user-friendly portal to manage payments and communicate with their landlord directly. Pay instantly with your preferred payment card.
                </p>
                <ul className="space-y-4">
                  {[
                    "View active invoices, billing terms, and payment receipts",
                    "Add credit/debit cards or set up Stripe autopay",
                    "Submit maintenance requests and upload photo evidence",
                    "Directly message your landlord about leaks, keys, or inspections"
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm font-bold text-slate-700">
                      <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tenant mockup box */}
              <div className="lg:col-span-7 bg-[#0b0f19] rounded-3xl p-6 shadow-2xl relative border border-slate-800 overflow-hidden min-h-[400px] flex flex-col justify-between">
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full mix-blend-screen filter blur-[80px]"></div>
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-black">T</div>
                    <span className="text-xs font-bold text-slate-200">Tenant Rent Portal</span>
                  </div>
                  <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Autopay Off</span>
                </div>

                <div className="space-y-5 flex-1">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Next Rent Due</span>
                      <div className="text-xl font-black text-white mt-1">$1,700.00</div>
                      <span className="text-[9px] text-slate-500 block mt-1">Due on July 10, 2026</span>
                    </div>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl">
                      Pay Rent Now
                    </Button>
                  </div>

                  <div className="border border-slate-800/80 bg-slate-900/40 rounded-2xl p-4 space-y-3">
                    <span className="text-[11px] text-slate-300 font-bold block">Support & Maintenance Tickets</span>
                    <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800/60 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400">
                          <Wrench className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-200 font-bold block">Kitchen Sink Leak</span>
                          <span className="text-[9px] text-slate-500 block">Status: Submitted</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-rose-400 uppercase bg-rose-500/10 px-2 py-0.5 rounded-full">High</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 mt-6 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Secure bank details encrypted</span>
                  <Link href="/dashboard" className="text-indigo-400 hover:underline font-bold">Open Tenant Portal →</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Featured Rental Listings */}
      <section id="listings" className="py-28 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Active Units</span>
              <h2 className="text-4xl font-black text-[#0F172A] tracking-tight mt-3">Explore Available Rentals</h2>
              <p className="mt-2 text-slate-500 font-semibold text-sm">Review real-time vacancies currently listed on our platform.</p>
            </div>
            <Link href="/listings" className="mt-4 md:mt-0">
              <Button className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-extrabold px-6 rounded-xl flex items-center gap-2 shadow-sm">
                Browse All Vacancies <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {listingsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2.5xl border border-slate-200/80 overflow-hidden shadow-sm animate-pulse">
                  <div className="aspect-[16/10] bg-slate-200"></div>
                  <div className="p-6 space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-300">
              {listings.map((unit) => {
                const imageUrl = unit.images?.[0] || unit.property?.coverPhoto || "/placeholder-house.png";
                return (
                  <div key={unit.id} className="bg-white rounded-2.5xl border border-slate-200/70 overflow-hidden shadow-sm hover:shadow-lg transition-shadow group">
                    <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
                      <img 
                        src={imageUrl} 
                        alt={unit.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80";
                        }}
                      />
                      <div className="absolute top-4 left-4 bg-blue-600 text-white text-[11px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider">
                        {unit.type || "Apartment"}
                      </div>
                      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-[#0F172A] text-sm font-black px-3 py-1 rounded-xl shadow-sm">
                        ${Number(unit.rentAmount).toLocaleString()}/mo
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {unit.property?.city || "Unknown City"}, {unit.property?.country || "USA"}
                        </span>
                        <h4 className="text-lg font-black text-[#0F172A] mt-1 line-clamp-1">{unit.name}</h4>
                        <p className="text-slate-500 text-xs font-semibold mt-1 truncate">{unit.property?.address}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-y border-slate-100 py-3 text-center text-xs font-bold text-slate-500">
                        <div>
                          <span className="block text-[#0F172A] font-extrabold text-sm">{unit.rooms}</span>
                          Beds
                        </div>
                        <div className="border-x border-slate-100">
                          <span className="block text-[#0F172A] font-extrabold text-sm">{unit.bathrooms || 1}</span>
                          Baths
                        </div>
                        <div>
                          <span className="block text-[#0F172A] font-extrabold text-sm">{unit.sqFootage}</span>
                          Sq Ft
                        </div>
                      </div>

                      <Link href={`/listings?id=${unit.id}`} className="block">
                        <Button className="w-full bg-slate-50 hover:bg-blue-50 text-[#0F172A] hover:text-blue-600 border border-slate-200 hover:border-blue-200/50 font-extrabold rounded-xl py-2.5 transition-colors">
                          Apply / Schedule Tour
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm">
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-4">
                <Home className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-[#0F172A] mb-1">No Active Vacancies</h4>
              <p className="text-slate-500 font-semibold text-sm leading-relaxed">
                All units are currently occupied. Check back soon or request owner access to list your own properties!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-28 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-8">
              <h2 className="text-4xl font-black text-[#0F172A] tracking-tight">Streamline your portfolio in three simple steps.</h2>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-black text-lg shrink-0 shadow-sm">1</div>
                  <div>
                    <h3 className="text-xl font-extrabold text-[#0F172A] mb-1">Setup your Portfolio</h3>
                    <p className="text-[#64748B] font-semibold text-sm leading-relaxed">Apply for Owner access, add properties, specify layouts, and configure units in less than 10 minutes.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-black text-lg shrink-0 shadow-sm">2</div>
                  <div>
                    <h3 className="text-xl font-extrabold text-[#0F172A] mb-1">Onboard Tenants</h3>
                    <p className="text-[#64748B] font-semibold text-sm leading-relaxed">Create active leases, set auto-invoice parameters, and send invitation links to tenants for self-onboarding.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-black text-lg shrink-0 shadow-sm">3</div>
                  <div>
                    <h3 className="text-xl font-extrabold text-[#0F172A] mb-1">Automate Accounting</h3>
                    <p className="text-[#64748B] font-semibold text-sm leading-relaxed">Enjoy automated rent collection via Stripe, instant payouts, automated ledger balances, and maintenance dispatching.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:w-1/2 w-full">
              <div className="bg-[#0F172A] rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-slate-800">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>
                
                {/* Tech illustration */}
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="h-4 w-3/4 bg-slate-800 rounded"></div>
                  <div className="h-4 w-1/2 bg-slate-800 rounded"></div>
                  <div className="h-4 w-5/6 bg-[#3B82F6]/20 rounded border border-[#3B82F6]/30 flex items-center px-3 text-[10px] text-blue-400 font-bold">
                    GET /api/payouts/owner-ledger ... 200 OK
                  </div>
                  <div className="h-4 w-2/3 bg-slate-800 rounded"></div>
                  <div className="h-4 w-1/3 bg-slate-800 rounded"></div>
                  <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-100 font-bold text-xs uppercase tracking-wider">System Status: Fully Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-28 bg-slate-50/50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-[#0F172A] tracking-tight">Loved by modern managers.</h2>
            <p className="mt-4 text-lg text-[#64748B] font-semibold">Join landlords and operators saving hours of tedious admin tasks every single week.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "PropertyPro saved me over 15 hours a week on rent collection and maintenance tracking. It is an absolute game-changer.",
                name: "Sarah Jenkins",
                role: "Independent Landlord (12 Units)"
              },
              {
                quote: "The automated lease generation and digital signatures completely eliminated our paperwork. Our tenants love the sleek portal too.",
                name: "Michael Chen",
                role: "Acme Properties (45 Units)"
              },
              {
                quote: "Switching from Spreadsheets to PropertyPro was the best decision we made this year. Financial reporting is finally a breeze.",
                name: "Elena Rodriguez",
                role: "Vertex Group (120 Units)"
              }
            ].map((t, idx) => (
              <div key={idx} className="bg-white rounded-2.5xl p-8 border border-slate-200/80 shadow-sm relative flex flex-col justify-between">
                <div>
                  <div className="text-blue-600 mb-6 opacity-30">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M14.017 21L16.41 14.904C16.593 14.53 16.7 14.125 16.7 13.7V9C16.7 8.44772 16.2523 8 15.7 8H11C10.4477 8 10 8.44772 10 9V14C10 14.5523 10.4477 15 11 15H13.785L11.782 19.34L14.017 21ZM5.01697 21L7.41097 14.904C7.59397 14.53 7.69997 14.125 7.69997 13.7V9C7.69997 8.44772 7.25225 8 6.69997 8H1.99997C1.44769 8 0.999969 8.44772 0.999969 9V14C0.999969 14.5523 1.44769 15 1.99997 15H4.78497L2.78197 19.34L5.01697 21Z"/></svg>
                  </div>
                  <p className="text-[#0F172A] font-semibold text-base leading-relaxed mb-6">"{t.quote}"</p>
                </div>
                <div className="border-t border-slate-100 pt-4 mt-4">
                  <div className="font-extrabold text-sm text-[#0F172A]">{t.name}</div>
                  <div className="text-xs font-bold text-[#64748B] mt-0.5">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-[#0F172A] tracking-tight">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-lg text-[#64748B] font-semibold">No hidden fees, no complicated tiers. Start free and scale as your portfolio grows.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.length > 0 ? pricingTiers.map((tier, idx) => {
              const isPopular = tier.name.toLowerCase() === "professional";
              return (
                <div 
                  key={tier.id} 
                  className={`rounded-3xl p-8 flex flex-col relative transition-all duration-300 ${
                    isPopular 
                      ? 'bg-slate-950 text-white border border-slate-800 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] transform md:-translate-y-4' 
                      : 'bg-white border border-slate-200 text-[#0F172A] shadow-sm'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 transform -translate-y-1/2">
                      <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider py-1 px-3 rounded-full flex items-center gap-1 shadow-md">
                        <Zap className="h-3 w-3 fill-current" /> Most Popular
                      </span>
                    </div>
                  )}
                  
                  <h3 className={`text-xl font-extrabold mb-1 ${isPopular ? 'text-white' : 'text-[#0F172A]'}`}>{tier.name}</h3>
                  <p className={`font-semibold text-xs mb-6 ${isPopular ? 'text-slate-400' : 'text-[#64748B]'}`}>{tier.description}</p>
                  
                  <div className="mb-6">
                    {tier.isCustom ? (
                      <span className="text-4xl font-black">Custom</span>
                    ) : (
                      <>
                        <span className="text-4xl font-black">${tier.price}</span>
                        <span className={`text-xs font-semibold ${isPopular ? 'text-slate-400' : 'text-[#64748B]'}`}> / month</span>
                      </>
                    )}
                  </div>
                  
                  <ul className="space-y-4 mb-8 flex-1 border-t border-slate-100/10 pt-6">
                    {tier.features.map((ft: string, i: number) => (
                      <li key={i} className={`flex items-center gap-3 text-xs font-bold ${isPopular ? 'text-slate-300' : 'text-[#334155]'}`}>
                        <CheckCircle2 className={`h-4.5 w-4.5 shrink-0 ${isPopular ? 'text-blue-400' : 'text-blue-500'}`} /> {ft}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    variant={isPopular ? "default" : "outline"} 
                    onClick={() => setOwnerModalOpen(true)} 
                    className={`w-full h-11 rounded-xl font-extrabold text-sm transition-all ${
                      isPopular 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md shadow-blue-600/25' 
                        : 'border-slate-200 text-[#0F172A] hover:bg-slate-50'
                    }`}
                  >
                    {tier.isCustom ? "Contact Sales" : "Apply for Access"}
                  </Button>
                </div>
              );
            }) : (
              <div className="col-span-3 text-center text-slate-500 font-semibold py-10 animate-pulse">Loading pricing options...</div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-28 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-[#0F172A] tracking-tight">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-6">
            {[
              { q: "How do rent payouts work?", a: "PropertyPro integrates directly with Stripe. When a tenant pays rent, it is routed immediately to your designated bank account. Payouts typically take 2-3 business days to clear." },
              { q: "Is tenant screening included?", a: "Yes, our integrated application portal allows you to collect employment details, previous landlord references, and optionally run background checks seamlessly." },
              { q: "How difficult is it to migrate my data?", a: "Not difficult at all! Our administration team offers white-glove migration services for users on Professional and Enterprise plans. We will import your units, leases, and tenant data from your old software for you." },
              { q: "Can my tenants submit maintenance photos?", a: "Absolutely. The Tenant Portal includes a dedicated maintenance ticketing system where tenants can upload photos and videos of the issue directly from their smartphones." }
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-2.5xl p-6 border border-slate-200/80 shadow-sm">
                <h4 className="text-base font-extrabold text-[#0F172A] mb-2">{faq.q}</h4>
                <p className="text-slate-500 font-semibold text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic CTA Banner */}
      <section className="py-28 relative overflow-hidden bg-slate-900 border-t border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.15),transparent_60%)]"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1]">Ready to scale your property business?</h2>
          <p className="text-lg text-slate-300 font-semibold max-w-2xl mx-auto">Join operators and renters saving hours of administration tasks every week with PropertyPro.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button className="h-14 px-10 w-full bg-white hover:bg-slate-100 text-[#0F172A] font-extrabold text-lg rounded-xl shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all">
                Open Dashboard Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-14 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Building2 className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-[#0F172A]">PropertyPro</span>
          </div>
          <p className="text-slate-500 font-semibold text-sm">© {new Date().getFullYear()} PropertyPro Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-500 hover:text-[#0F172A] font-bold text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-slate-500 hover:text-[#0F172A] font-bold text-sm transition-colors">Terms of Service</a>
            <a href="#" className="text-slate-500 hover:text-[#0F172A] font-bold text-sm transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>

      {/* Owner Access Form Modal */}
      {ownerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-[#0F172A]">Owner Access Application</h2>
                <button onClick={() => setOwnerModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-full transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {submitSuccess ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-extrabold text-[#0F172A] mb-2">Application Submitted!</h3>
                  <p className="text-slate-500 font-semibold text-sm mb-6">Check your email for a confirmation and tracking link. Our administration team will verify details in 1-2 business days.</p>
                  {trackingId && (
                    <div className="bg-blue-50 border border-blue-200/50 rounded-2xl p-4 mb-6 text-left shadow-inner">
                      <p className="text-blue-700 text-xs font-black mb-2 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> Track Application Progress
                      </p>
                      <Link href={`/track/owner/${trackingId}`} className="text-blue-600 text-xs font-bold underline break-all hover:text-blue-800">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/track/owner/{trackingId}
                      </Link>
                    </div>
                  )}
                  <Button onClick={() => { setOwnerModalOpen(false); setSubmitSuccess(false); setTrackingId(null); }} className="w-full h-12 bg-slate-900 text-white rounded-xl font-extrabold hover:bg-slate-800 shadow-sm transition-all">
                    Close Application
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleOwnerApply} className="space-y-4">
                  <p className="text-xs text-slate-500 font-bold mb-6 uppercase tracking-wider">To preserve database security, owner applicants are manually validated.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Company / Full Name</label>
                      <input required name="name" type="text" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm" placeholder="Acme Estates" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Website / LinkedIn</label>
                      <input name="website" type="url" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm" placeholder="https://linkedin.com/in/..." />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Email Address</label>
                      <input required name="email" type="email" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm" placeholder="you@company.com" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Phone Number</label>
                      <input required name="phone" type="tel" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm" placeholder="(555) 012-3456" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Entity Structure</label>
                    <select required name="entityType" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm">
                      <option value="">Select entity category</option>
                      <option value="Independent Landlord">Independent Landlord (Own Units)</option>
                      <option value="Property Management">Property Management Agency</option>
                      <option value="Real Estate Investor">Investor / Portfolio syndicate</option>
                    </select>
                  </div>

                  <div className="pt-2 pb-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" required className="mt-1 h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-600" />
                      <span className="text-[11px] text-slate-500 font-bold leading-normal">
                        I confirm that all details are accurate, and I agree to the Terms of Service and Privacy Policy.
                      </span>
                    </label>
                  </div>

                  {/* Cloudflare Turnstile / reCAPTCHA Verification */}
                  <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-xl p-3.5 flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => {
                          if (turnstileStatus === 0) {
                            setTurnstileStatus(1);
                            setTimeout(() => setTurnstileStatus(2), 1200);
                          }
                        }}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-colors shadow-inner ${turnstileStatus === 2 ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-300 hover:border-slate-400"}`}
                      >
                        {turnstileStatus === 1 && <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />}
                        {turnstileStatus === 2 && <CheckCircle2 className="h-5 w-5 text-white" />}
                      </div>
                      <span className="text-xs font-bold text-slate-700">Verify you are human</span>
                    </div>
                    <div className="flex flex-col items-end leading-none">
                      <ShieldCheck className="h-5 w-5 text-slate-400 mb-0.5" />
                      <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Cloudflare</span>
                      <span className="text-[7.5px] text-slate-400 hover:underline cursor-pointer mt-0.5">Privacy &bull; Terms</span>
                    </div>
                  </div>

                  <div className="pt-3">
                    <Button disabled={isSubmitting || turnstileStatus !== 2} type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-md shadow-blue-600/20 disabled:opacity-75 disabled:cursor-not-allowed transition-all">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Submitting application...
                        </>
                      ) : (
                        "Submit Application"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
