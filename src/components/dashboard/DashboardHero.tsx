"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building, Users, Home, Shield, RefreshCw, BarChart3, MapPin, Calendar, Wallet, CreditCard, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeroProps {
  role?: string;
  session?: any;
  stats?: any;
  statsLoading?: boolean;
  onRefresh?: () => void;
  onViewFinancials?: () => void;
  // Tenant-specific props
  unitInfo?: string;
  tenantStats?: {
    leaseStatus: string;
    balanceDue: string;
    nextRentDue: string;
    hasUnpaid: boolean;
  };
}

const HERO_SLIDES = [
  {
    src: "/images/hero/hero_apartment.png",
    tag: "Luxury Residential Complex",
  },
  {
    src: "/images/hero/hero_commercial.png",
    tag: "Commercial & Retail Space",
  },
  {
    src: "/images/hero/hero_townhouse.png",
    tag: "Multi-Family Townhouses",
  },
];

export function DashboardHero({
  role,
  session,
  stats,
  statsLoading,
  onRefresh,
  onViewFinancials,
  unitInfo,
  tenantStats,
}: DashboardHeroProps) {
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const displayName = (() => {
    const rawName = session?.user?.name?.trim();
    if (rawName && !rawName.toLowerCase().includes("system")) {
      return rawName.split(" ")[0];
    }
    if (session?.user?.email) return session.user.email.split("@")[0];
    if (role === "TENANT") return "Resident";
    return role === "SUPERADMIN" ? "Admin" : "Landlord";
  })();

  const activeSlide = HERO_SLIDES[slideIndex];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-xs min-h-[220px] font-sans">
      {/* Background Image Crossfade Stack */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-100">
        {HERO_SLIDES.map((slide, idx) => {
          const isActive = idx === slideIndex;
          return (
            <motion.img
              key={slide.src}
              src={slide.src}
              alt={slide.tag}
              initial={false}
              animate={{
                opacity: isActive ? 0.78 : 0,
                scale: isActive ? 1.07 : 1.0,
              }}
              transition={{
                opacity: { duration: 1.6, ease: "easeInOut" },
                scale: { duration: 6, ease: "linear" },
              }}
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
            />
          );
        })}

        {/* Light theme gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/40 z-10" />
        
        <div
          className="absolute inset-0 opacity-[0.03] z-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #0F172A 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Hero Foreground Content */}
      <div className="relative z-20 p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        {/* Left Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-2.5 flex-1 max-w-2xl"
        >
          {/* Active slide badge + role indicator */}
          <div className="flex flex-wrap items-center gap-2">
            {role === "SUPERADMIN" ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs"
              >
                <Shield className="h-3 w-3 text-[#007AFF]" />
                <span>Platform Administrator</span>
              </motion.div>
            ) : role === "TENANT" ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>TENANT PORTAL ACTIVE</span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>
                  {stats?.subscriptionTier || "Hobbyist"} Plan •{" "}
                  {stats?.subscriptionStatus === "active" ? "Active" : "Trial"}
                </span>
              </motion.div>
            )}

            {/* Slide category tag indicator */}
            <motion.span
              key={activeSlide.tag}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-white border border-slate-200 text-[#6E6E73] shadow-2xs"
            >
              <ImageIcon className="h-3 w-3 text-slate-400" />
              {activeSlide.tag}
            </motion.span>
          </div>

          {/* Main Greeting Header */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-3xl font-semibold text-[#1D1D1F] tracking-tight leading-tight"
          >
            {getGreeting()},{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007AFF] via-indigo-600 to-purple-600">
              {displayName}
            </span>
            !
          </motion.h1>

          {/* Subtitle / Key metric preview */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {role === "SUPERADMIN" ? (
              <p className="text-xs font-normal text-[#6E6E73] leading-relaxed">
                Managing PropertyPro platform operations •{" "}
                <span className="text-[#1D1D1F] font-semibold">{stats?.totalProperties ?? 0} properties</span> across{" "}
                <span className="text-[#1D1D1F] font-semibold">{stats?.activeTenantsCount ?? 0} active tenants</span>
              </p>
            ) : role === "TENANT" ? (
              <p className="text-xs font-normal text-[#6E6E73] leading-relaxed flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{unitInfo || "Welcome to your tenant portal"}</span>
              </p>
            ) : stats ? (
              <p className="text-xs font-normal text-[#6E6E73] leading-relaxed">
                Portfolio Revenue:{" "}
                <span className="font-semibold text-xs text-[#1D1D1F]">${stats.monthlyRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>{" "}
                collected this month
              </p>
            ) : null}
          </motion.div>
        </motion.div>

        {/* Right Section: Stat Cards + Actions */}
        <div className="flex items-center gap-4 w-full lg:w-auto">
          {/* Animated floating stat pills for TENANT */}
          {role === "TENANT" && tenantStats && (
            <div className="hidden sm:flex items-end gap-3 mr-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
                transition={{
                  opacity: { duration: 0.4, delay: 0.3 },
                  scale: { duration: 0.4, delay: 0.3 },
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                }}
                whileHover={{ scale: 1.04 }}
                className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl p-4 min-w-[85px] text-center shadow-xs cursor-pointer"
              >
                <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs mb-1">
                  <Home className="h-4 w-4" />
                </div>
                <span className="font-semibold text-xl text-[#1D1D1F] tracking-tight leading-none">{tenantStats.leaseStatus}</span>
                <span className="text-xs font-normal text-[#6E6E73] mt-0.5">Lease</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
                transition={{
                  opacity: { duration: 0.4, delay: 0.45 },
                  scale: { duration: 0.4, delay: 0.45 },
                  y: { duration: 3.8, delay: 0.5, repeat: Infinity, ease: "easeInOut" },
                }}
                whileHover={{ scale: 1.04 }}
                className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl p-4 min-w-[85px] text-center shadow-xs cursor-pointer"
              >
                <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs mb-1">
                  <Wallet className="h-4 w-4" />
                </div>
                <span className={`font-semibold text-xl tracking-tight leading-none ${tenantStats.hasUnpaid ? "text-rose-600" : "text-[#1D1D1F]"}`}>
                  {tenantStats.balanceDue}
                </span>
                <span className="text-xs font-normal text-[#6E6E73] mt-0.5">Balance</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
                transition={{
                  opacity: { duration: 0.4, delay: 0.6 },
                  scale: { duration: 0.4, delay: 0.6 },
                  y: { duration: 4.2, delay: 1.0, repeat: Infinity, ease: "easeInOut" },
                }}
                whileHover={{ scale: 1.04 }}
                className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl p-4 min-w-[85px] text-center shadow-xs cursor-pointer"
              >
                <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs mb-1">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="font-semibold text-xl text-[#1D1D1F] tracking-tight leading-none">{tenantStats.nextRentDue}</span>
                <span className="text-xs font-normal text-[#6E6E73] mt-0.5">Rent Due</span>
              </motion.div>
            </div>
          )}

          {/* Animated floating stat pills for OWNER/ADMIN */}
          {role !== "TENANT" && stats && (
            <div className="hidden sm:flex items-end gap-3 mr-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: [0, -7, 0] }}
                transition={{
                  opacity: { duration: 0.4, delay: 0.3 },
                  scale: { duration: 0.4, delay: 0.3 },
                  y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                }}
                whileHover={{ scale: 1.04 }}
                className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl p-4 min-w-[85px] text-center shadow-xs cursor-pointer"
              >
                <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs mb-1">
                  <Building className="h-4 w-4" />
                </div>
                <span className="font-semibold text-2xl text-[#1D1D1F] tracking-tight leading-none">{stats.totalProperties}</span>
                <span className="text-xs font-normal text-[#6E6E73] mt-0.5">Properties</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
                transition={{
                  opacity: { duration: 0.4, delay: 0.45 },
                  scale: { duration: 0.4, delay: 0.45 },
                  y: { duration: 3.2, delay: 0.5, repeat: Infinity, ease: "easeInOut" },
                }}
                whileHover={{ scale: 1.04 }}
                className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl p-4 min-w-[85px] text-center shadow-xs cursor-pointer"
              >
                <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs mb-1">
                  <Users className="h-4 w-4" />
                </div>
                <span className="font-semibold text-2xl text-[#1D1D1F] tracking-tight leading-none">{stats.activeTenantsCount}</span>
                <span className="text-xs font-normal text-[#6E6E73] mt-0.5">Tenants</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: [0, -9, 0] }}
                transition={{
                  opacity: { duration: 0.4, delay: 0.6 },
                  scale: { duration: 0.4, delay: 0.6 },
                  y: { duration: 4.0, delay: 1.0, repeat: Infinity, ease: "easeInOut" },
                }}
                whileHover={{ scale: 1.04 }}
                className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl p-4 min-w-[85px] text-center shadow-xs cursor-pointer"
              >
                <div className="h-9 w-9 bg-slate-100 border border-slate-200/60 rounded-xl flex items-center justify-center text-slate-700 shadow-2xs mb-1">
                  <Home className="h-4 w-4" />
                </div>
                <span className="font-semibold text-2xl text-[#1D1D1F] tracking-tight leading-none">{stats.occupancyRate}%</span>
                <span className="text-xs font-normal text-[#6E6E73] mt-0.5">Occupied</span>
              </motion.div>
            </div>
          )}

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="flex items-center gap-2 ml-auto"
          >
            <button
              onClick={onRefresh}
              disabled={statsLoading}
              title="Refresh Dashboard Data"
              className="h-9 w-9 border border-slate-200 bg-white text-[#1D1D1F] hover:bg-slate-50 font-medium text-xs rounded-xl shadow-2xs flex items-center justify-center cursor-pointer transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${statsLoading ? "animate-spin" : ""}`} />
            </button>

            <Button
              onClick={onViewFinancials}
              className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 rounded-xl shadow-xs border-none cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              {role === "TENANT" ? (
                <>
                  <CreditCard className="h-3.5 w-3.5 text-white" /> Pay Rent
                </>
              ) : (
                <>
                  <BarChart3 className="h-3.5 w-3.5 text-white" /> View Financials
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Slide dots indicator bar at bottom */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setSlideIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
              idx === slideIndex
                ? "w-6 bg-[#007AFF] shadow-2xs"
                : "w-1.5 bg-slate-300 hover:bg-slate-400"
            }`}
            title={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

