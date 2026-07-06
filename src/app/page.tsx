"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, ArrowRight, CheckCircle2, Home, Users, Wrench, CreditCard, ChevronRight, Menu, X, Shield, BarChart3, Clock, Loader2, ShieldCheck } from "lucide-react";
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

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: <Home className="h-6 w-6 text-blue-600" />,
      title: "Property Portfolios",
      desc: "Manage multiple properties and units from a single, unified dashboard with full visibility."
    },
    {
      icon: <Users className="h-6 w-6 text-indigo-600" />,
      title: "Tenant Management",
      desc: "Screen applicants, manage active leases, and communicate directly through the portal."
    },
    {
      icon: <Wrench className="h-6 w-6 text-rose-600" />,
      title: "Maintenance Ticketing",
      desc: "Streamline repairs with a dedicated ticketing system, technician assignment, and photo uploads."
    },
    {
      icon: <CreditCard className="h-6 w-6 text-emerald-600" />,
      title: "Automated Accounting",
      desc: "Generate invoices, collect rent automatically via Stripe, and track your cash flow seamlessly."
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-purple-600" />,
      title: "Financial Reporting",
      desc: "Generate beautiful, comprehensive PDF reports for payouts, taxes, and performance tracking."
    },
    {
      icon: <Shield className="h-6 w-6 text-amber-600" />,
      title: "Secure Data",
      desc: "Bank-level encryption ensures your lease documents, financial data, and tenant records are safe."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-500 selection:text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/80 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-[#0F172A]">PropertyPro</span>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors">How it Works</a>
              <a href="#pricing" className="text-sm font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors">Pricing</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-[#0F172A] font-bold hover:bg-blue-50">Sign In</Button>
              </Link>
              <Link href="/dashboard">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-md shadow-blue-600/20 rounded-full">
                  Dashboard
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-[#0F172A]">
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-20 px-4 md:hidden animate-in slide-in-from-top-4">
          <div className="flex flex-col space-y-4">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-[#0F172A] py-2 border-b border-[#E2E8F0]">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-[#0F172A] py-2 border-b border-[#E2E8F0]">How it Works</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-[#0F172A] py-2 border-b border-[#E2E8F0]">Pricing</a>
            <div className="flex flex-col space-y-3 pt-4">
              <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full h-12 font-bold text-lg">Sign In</Button>
              </Link>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg">Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold mb-6 hover:bg-blue-100 transition-colors cursor-pointer">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            PropertyPro v2.0 is now live! <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-[#0F172A] tracking-tighter leading-[1.1] max-w-4xl mx-auto">
            Manage Properties with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Perfect Precision.</span>
          </h1>
          
          <p className="mt-6 text-lg md:text-xl text-[#64748B] font-medium max-w-2xl mx-auto leading-relaxed">
            The all-in-one operating system for modern landlords and property managers. Streamline leases, automate maintenance, and collect rent effortlessly.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              onClick={() => setOwnerModalOpen(true)}
              className="h-14 px-8 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-full shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
            >
              Request Owner Access
            </Button>
            <Link href="/listings">
              <Button variant="outline" className="h-14 px-8 w-full sm:w-auto bg-white hover:bg-gray-50 text-[#0F172A] border-[#E2E8F0] font-bold text-lg rounded-full shadow-sm transition-all hover:scale-105">
                View Public Listings
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-[#64748B] text-sm font-medium">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Secure Admin Verification</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Free Portfolio Setup</div>
          </div>
        </div>

        {/* Owner Application Modal */}
        {ownerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-[#0F172A]">Owner Access Application</h2>
                  <button onClick={() => setOwnerModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {submitSuccess ? (
                  <div className="text-center py-8">
                    <div className="mx-auto h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-[#0F172A] mb-2">Application Submitted!</h3>
                    <p className="text-slate-600 font-medium mb-4">Check your email for a confirmation and all your application details. Our team will review within 1-2 business days.</p>
                    {trackingId && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-left">
                        <p className="text-blue-700 text-sm font-bold mb-2">📍 Track Your Application</p>
                        <Link href={`/track/owner/${trackingId}`} className="text-blue-600 text-sm font-semibold underline break-all hover:text-blue-800">
                          {typeof window !== 'undefined' ? window.location.origin : ''}/track/owner/{trackingId}
                        </Link>
                      </div>
                    )}
                    <Button onClick={() => { setOwnerModalOpen(false); setSubmitSuccess(false); setTrackingId(null); }} className="mt-2 w-full h-12 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800">
                      Close
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleOwnerApply} className="space-y-4">
                    <p className="text-sm text-slate-500 font-medium mb-6">To maintain platform security, all owner accounts are manually verified by our team.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Company or Full Name</label>
                        <input required name="name" type="text" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" placeholder="Acme Properties" />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Company Website / LinkedIn</label>
                        <input name="website" type="url" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" placeholder="https://..." />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Email Address</label>
                        <input required name="email" type="email" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" placeholder="you@company.com" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Phone Number</label>
                        <input required name="phone" type="tel" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" placeholder="(555) 000-0000" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Entity Type</label>
                      <select required name="entityType" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all">
                        <option value="">Select your business type</option>
                        <option value="Independent Landlord">Independent Landlord (Own Properties)</option>
                        <option value="Property Management">Property Management Company</option>
                        <option value="Real Estate Investor">Real Estate Investor / Syndicate</option>
                      </select>
                    </div>

                    <div className="pt-2 pb-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" required className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                        <span className="text-xs text-slate-500">
                          I agree to the Terms of Service and Privacy Policy, and consent to receive communications regarding my application.
                        </span>
                      </label>
                    </div>

                    {/* Mock Cloudflare Turnstile / reCAPTCHA */}
                    <div className="bg-[#fafafa] border border-slate-200 shadow-sm rounded-lg p-3 flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => {
                            if (turnstileStatus === 0) {
                              setTurnstileStatus(1);
                              setTimeout(() => setTurnstileStatus(2), 1200);
                            }
                          }}
                          className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer transition-colors ${turnstileStatus === 2 ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-300 hover:border-slate-400 shadow-inner"}`}
                        >
                          {turnstileStatus === 1 && <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />}
                          {turnstileStatus === 2 && <CheckCircle2 className="h-5 w-5 text-white" />}
                        </div>
                        <span className="text-[13px] font-medium text-slate-700">Verify you are human</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <ShieldCheck className="h-5 w-5 text-slate-400 mb-0.5" />
                        <span className="text-[9px] text-slate-400 font-semibold uppercase">Cloudflare</span>
                        <span className="text-[8px] text-slate-400 hover:underline cursor-pointer mt-0.5">Privacy &bull; Terms</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button disabled={isSubmitting || turnstileStatus !== 2} type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Submitting securely...
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

        {/* Dashboard Mockup Image */}
        <div className="mt-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white/50 backdrop-blur-sm p-2 shadow-2xl shadow-blue-900/10 transform rotate-1 hover:rotate-0 transition-transform duration-500">
            <div className="rounded-xl overflow-hidden bg-[#F8FAFC] border border-[#F1F5F9] aspect-[16/9] relative flex flex-col">
              {/* Fake Browser Header */}
              <div className="h-10 bg-white border-b border-[#E2E8F0] flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400"></div>
                  <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                  <div className="h-3 w-3 rounded-full bg-green-400"></div>
                </div>
                <div className="mx-auto bg-[#F1F5F9] h-6 w-1/3 rounded-md border border-[#E2E8F0]"></div>
              </div>
              {/* Fake Dashboard Content */}
              <div className="flex-1 flex">
                <div className="w-48 bg-white border-r border-[#E2E8F0] hidden md:block p-4 space-y-3">
                  <div className="h-6 bg-[#F1F5F9] rounded-md w-3/4 mb-8"></div>
                  <div className="h-8 bg-blue-50 rounded-md w-full"></div>
                  <div className="h-8 bg-[#F1F5F9] rounded-md w-full"></div>
                  <div className="h-8 bg-[#F1F5F9] rounded-md w-5/6"></div>
                  <div className="h-8 bg-[#F1F5F9] rounded-md w-full"></div>
                </div>
                <div className="flex-1 p-6 space-y-6">
                  <div className="h-8 bg-[#F1F5F9] rounded-md w-1/4"></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col justify-between">
                      <div className="h-4 bg-[#F1F5F9] w-1/2 rounded"></div>
                      <div className="h-8 bg-blue-100 w-3/4 rounded"></div>
                    </div>
                    <div className="h-24 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col justify-between">
                      <div className="h-4 bg-[#F1F5F9] w-1/2 rounded"></div>
                      <div className="h-8 bg-emerald-100 w-2/3 rounded"></div>
                    </div>
                    <div className="h-24 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col justify-between">
                      <div className="h-4 bg-[#F1F5F9] w-1/2 rounded"></div>
                      <div className="h-8 bg-purple-100 w-4/5 rounded"></div>
                    </div>
                  </div>
                  <div className="h-64 bg-white rounded-xl border border-[#E2E8F0] shadow-sm"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-10 border-y border-[#E2E8F0] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-6">Trusted by modern property managers across the globe</p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Fake logos using text */}
            <div className="text-2xl font-black text-[#0F172A]">Acme Estates</div>
            <div className="text-2xl font-black text-[#0F172A] italic">Lumina Homes</div>
            <div className="text-2xl font-black text-[#0F172A] tracking-tighter">Horizon Properties</div>
            <div className="text-2xl font-black text-[#0F172A] font-serif">Vertex Group</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-[#0F172A] tracking-tight">Everything you need to run your properties on autopilot.</h2>
            <p className="mt-4 text-lg text-[#64748B] font-medium">Say goodbye to messy spreadsheets and disconnected tools. PropertyPro brings your entire portfolio under one roof.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm hover:shadow-xl transition-shadow duration-300">
                <div className="h-14 w-14 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-3">{feature.title}</h3>
                <p className="text-[#64748B] font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-8">
              <h2 className="text-3xl md:text-4xl font-black text-[#0F172A] tracking-tight">Streamline your workflow in three simple steps.</h2>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-lg shrink-0">1</div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0F172A] mb-2">Setup your Portfolio</h3>
                    <p className="text-[#64748B] font-medium">Add your properties, configure units, and invite your team members to collaborate instantly.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-lg shrink-0">2</div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0F172A] mb-2">Onboard Tenants</h3>
                    <p className="text-[#64748B] font-medium">Create active leases, set payment schedules, and grant tenants access to their dedicated portal.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-lg shrink-0">3</div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0F172A] mb-2">Automate Everything</h3>
                    <p className="text-[#64748B] font-medium">Let the system handle recurring invoices, maintenance dispatch, and financial reporting automatically.</p>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="h-12 px-6 rounded-full border-[#E2E8F0] font-bold text-[#0F172A] hover:bg-gray-50 flex items-center gap-2">
                Explore Documentation <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="lg:w-1/2 w-full">
              <div className="bg-[#0F172A] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>
                
                {/* Code / Tech visual */}
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="h-4 w-3/4 bg-[#1E293B] rounded"></div>
                  <div className="h-4 w-1/2 bg-[#1E293B] rounded"></div>
                  <div className="h-4 w-5/6 bg-[#3B82F6]/20 rounded border border-[#3B82F6]/30"></div>
                  <div className="h-4 w-2/3 bg-[#1E293B] rounded"></div>
                  <div className="h-4 w-1/3 bg-[#1E293B] rounded"></div>
                  <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="text-emerald-100 font-medium text-sm">System Status: Fully Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-[#0F172A] tracking-tight">Loved by Property Managers</h2>
            <p className="mt-4 text-lg text-[#64748B] font-medium">Don't just take our word for it. Here is what our top users have to say.</p>
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
              <div key={idx} className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm relative">
                <div className="text-blue-600 mb-4 opacity-50">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M14.017 21L16.41 14.904C16.593 14.53 16.7 14.125 16.7 13.7V9C16.7 8.44772 16.2523 8 15.7 8H11C10.4477 8 10 8.44772 10 9V14C10 14.5523 10.4477 15 11 15H13.785L11.782 19.34L14.017 21ZM5.01697 21L7.41097 14.904C7.59397 14.53 7.69997 14.125 7.69997 13.7V9C7.69997 8.44772 7.25225 8 6.69997 8H1.99997C1.44769 8 0.999969 8.44772 0.999969 9V14C0.999969 14.5523 1.44769 15 1.99997 15H4.78497L2.78197 19.34L5.01697 21Z"/></svg>
                </div>
                <p className="text-[#0F172A] font-medium text-lg leading-relaxed mb-6">"{t.quote}"</p>
                <div>
                  <div className="font-bold text-[#0F172A]">{t.name}</div>
                  <div className="text-sm font-medium text-[#64748B]">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-[#0F172A] tracking-tight">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-lg text-[#64748B] font-medium">No hidden fees, no complicated tiers. Start free and scale as your portfolio grows.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.length > 0 ? pricingTiers.map((tier, idx) => {
              const isPopular = tier.name.toLowerCase() === "professional";
              return (
                <div key={tier.id} className={`rounded-3xl p-8 shadow-sm flex flex-col relative ${isPopular ? 'bg-[#0F172A] border border-[#1E293B] shadow-2xl transform md:-translate-y-4' : 'bg-white border border-[#E2E8F0]'}`}>
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 transform -translate-y-1/2">
                      <span className="bg-blue-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">Most Popular</span>
                    </div>
                  )}
                  <h3 className={`text-xl font-bold mb-2 ${isPopular ? 'text-white' : 'text-[#0F172A]'}`}>{tier.name}</h3>
                  <p className={`font-medium text-sm mb-6 ${isPopular ? 'text-slate-400' : 'text-[#64748B]'}`}>{tier.description}</p>
                  
                  <div className="mb-6">
                    {tier.isCustom ? (
                      <span className={`text-4xl font-black ${isPopular ? 'text-white' : 'text-[#0F172A]'}`}>Custom</span>
                    ) : (
                      <>
                        <span className={`text-4xl font-black ${isPopular ? 'text-white' : 'text-[#0F172A]'}`}>${tier.price}</span>
                        <span className={`font-medium ${isPopular ? 'text-slate-400' : 'text-[#64748B]'}`}> / month</span>
                      </>
                    )}
                  </div>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                    {tier.features.map((ft: string, i: number) => (
                      <li key={i} className={`flex items-center gap-3 text-sm font-medium ${isPopular ? 'text-slate-300' : 'text-[#334155]'}`}>
                        <CheckCircle2 className={`h-5 w-5 shrink-0 ${isPopular ? 'text-blue-400' : 'text-blue-500'}`} /> {ft}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    variant={isPopular ? "default" : "outline"} 
                    onClick={() => setOwnerModalOpen(true)} 
                    className={`w-full h-12 rounded-xl font-bold ${isPopular ? 'bg-blue-600 hover:bg-blue-700 text-white border-0' : 'border-slate-200'}`}
                  >
                    {tier.isCustom ? "Contact Sales" : "Apply for Access"}
                  </Button>
                </div>
              );
            }) : (
              <div className="col-span-3 text-center text-slate-500 font-medium py-10 animate-pulse">Loading pricing...</div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-6">
            {[
              { q: "How do rent payouts work?", a: "PropertyPro integrates directly with Stripe. When a tenant pays rent, it is routed immediately to your designated bank account. Payouts typically take 2-3 business days to clear." },
              { q: "Is tenant screening included?", a: "Yes, our integrated application portal allows you to collect employment details, previous landlord references, and optionally run background checks seamlessly." },
              { q: "How difficult is it to migrate my data?", a: "Not difficult at all! Our administration team offers white-glove migration services for users on Professional and Enterprise plans. We will import your units, leases, and tenant data from your old software for you." },
              { q: "Can my tenants submit maintenance photos?", a: "Absolutely. The Tenant Portal includes a dedicated maintenance ticketing system where tenants can upload photos and videos of the issue directly from their smartphones." }
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
                <h4 className="text-lg font-bold text-[#0F172A] mb-2">{faq.q}</h4>
                <p className="text-[#64748B] font-medium leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">Ready to scale your property business?</h2>
          <p className="text-xl text-blue-100 font-medium mb-10">Join thousands of property managers saving hours every week with PropertyPro.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button className="h-14 px-10 w-full sm:w-auto bg-white hover:bg-gray-50 text-blue-600 font-bold text-lg rounded-full shadow-xl hover:scale-105 transition-transform">
                Open Dashboard Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-[#0F172A]">PropertyPro</span>
          </div>
          <p className="text-[#64748B] font-medium text-sm">© {new Date().getFullYear()} PropertyPro Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-[#64748B] hover:text-[#0F172A] font-medium text-sm transition-colors">Privacy</a>
            <a href="#" className="text-[#64748B] hover:text-[#0F172A] font-medium text-sm transition-colors">Terms</a>
            <a href="#" className="text-[#64748B] hover:text-[#0F172A] font-medium text-sm transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
