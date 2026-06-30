"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, ArrowRight, CheckCircle2, Home, Users, Wrench, CreditCard, ChevronRight, Menu, X, Shield, BarChart3, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
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
            <Link href="/dashboard">
              <Button className="h-14 px-8 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-full shadow-lg shadow-blue-600/30 transition-all hover:scale-105">
                Go to Dashboard
              </Button>
            </Link>
            <Link href="/listings">
              <Button variant="outline" className="h-14 px-8 w-full sm:w-auto bg-white hover:bg-gray-50 text-[#0F172A] border-[#E2E8F0] font-bold text-lg rounded-full shadow-sm transition-all hover:scale-105">
                View Public Listings
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-[#64748B] text-sm font-medium">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> No credit card required</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Cancel anytime</div>
          </div>
        </div>

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
