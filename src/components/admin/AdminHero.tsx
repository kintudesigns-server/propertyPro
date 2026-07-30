"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  Building,
  CreditCard,
  RefreshCw,
  UserPlus,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface AdminHeroProps {
  session?: any;
  totalUsers: number;
  propertiesCount: number;
  activeSubscribersCount: number;
  totalVolumeProcessed: number;
  alertCount: number;
  pendingPropertiesCount: number;
  lastSync: string;
  onRefresh: () => void;
}

const ADMIN_SLIDES = [
  {
    src: "/images/admin-hero-bg-1.png",
    tag: "Corporate Operations HQ",
    subtitle: "Multi-tenant portfolio monitoring & system governance",
  },
  {
    src: "/images/admin-hero-bg-2.png",
    tag: "SaaS Command Center",
    subtitle: "Real-time revenue processing, MRR tracking & billing engine",
  },
  {
    src: "/images/admin-hero-bg-3.png",
    tag: "Enterprise Platform Controls",
    subtitle: "Automated onboarding pipeline, property approvals & cron jobs",
  },
];

export function AdminHero({
  session,
  totalUsers,
  propertiesCount,
  activeSubscribersCount,
  totalVolumeProcessed,
  alertCount,
  pendingPropertiesCount,
  lastSync,
  onRefresh,
}: AdminHeroProps) {
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % ADMIN_SLIDES.length);
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
    return "Admin";
  })();

  const activeSlide = ADMIN_SLIDES[slideIndex];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-[#E5E5EA] shadow-sm min-h-[220px]">
      
      {/* ── Background Image Stack with Framer-Motion Crossfade & Ken-Burns Zoom ── */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-100">
        {ADMIN_SLIDES.map((slide, idx) => {
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

      {/* ── Hero Foreground Content ── */}
      <div className="relative z-20 p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        
        {/* Left Column: Greeting, Badges & Subtitle (Now gets 600px+ width) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-3 flex-1 min-w-0"
        >
          {/* Top Badges Row — STRICTLY SIDE-BY-SIDE IN 1 LINE */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 shadow-2xs shrink-0"
            >
              <Shield className="h-3.5 w-3.5 text-[#007AFF]" />
              <span className="text-[10px] font-extrabold tracking-widest uppercase">
                PLATFORM ADMINISTRATOR
              </span>
            </motion.div>

            {/* Slide category tag indicator — SIDE-BY-SIDE WITH BADGE 1 */}
            <motion.span
              key={activeSlide.tag}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-white/90 border border-slate-200/80 px-2.5 py-1 rounded-full shadow-2xs backdrop-blur-xs shrink-0"
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
            className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1D1D1F] tracking-tight leading-tight whitespace-nowrap"
          >
            {getGreeting()},{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007AFF] via-indigo-600 to-purple-600">
              {displayName}
            </span>
            !
          </motion.h1>

          {/* Subtitle — SIDE-BY-SIDE IN 1 CLEAN LINE */}
          <motion.p
            key={activeSlide.subtitle}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-slate-600 text-xs sm:text-sm font-semibold leading-relaxed whitespace-nowrap overflow-hidden text-ellipsis max-w-2xl"
          >
            Managing PropertyPro platform operations &bull;{" "}
            <span className="text-[#007AFF] font-bold">{propertiesCount} properties</span> across{" "}
            <span className="text-[#007AFF] font-bold">{totalUsers} active users</span>
          </motion.p>
        </motion.div>

        {/* Right Column: Stat Cards on top, Action Buttons below (Compact 340px width) */}
        <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
          
          {/* Animated Floating Stat Cards Row */}
          <div className="flex items-center gap-2.5">
            {/* Card 1: Users */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
              transition={{
                opacity: { duration: 0.4, delay: 0.3 },
                scale: { duration: 0.4, delay: 0.3 },
                y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
              }}
              whileHover={{ scale: 1.06, borderColor: "#007AFF" }}
              className="flex flex-col items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl px-3.5 py-2.5 min-w-[76px] cursor-pointer shadow-md transition-all group"
            >
              <div className="p-1 rounded-xl bg-blue-50 text-[#007AFF] group-hover:bg-[#007AFF] group-hover:text-white transition-colors">
                <Users className="h-3.5 w-3.5" />
              </div>
              <span className="text-[#1D1D1F] font-black text-lg leading-none">{totalUsers}</span>
              <span className="text-slate-500 text-[9px] font-extrabold uppercase tracking-widest">Users</span>
            </motion.div>

            {/* Card 2: Properties */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
              transition={{
                opacity: { duration: 0.4, delay: 0.45 },
                scale: { duration: 0.4, delay: 0.45 },
                y: { duration: 3.2, delay: 0.5, repeat: Infinity, ease: "easeInOut" },
              }}
              whileHover={{ scale: 1.06, borderColor: "#34C759" }}
              className="flex flex-col items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl px-3.5 py-2.5 min-w-[76px] cursor-pointer shadow-md transition-all group"
            >
              <div className="p-1 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Building className="h-3.5 w-3.5" />
              </div>
              <span className="text-[#1D1D1F] font-black text-lg leading-none">{propertiesCount}</span>
              <span className="text-slate-500 text-[9px] font-extrabold uppercase tracking-widest">Properties</span>
            </motion.div>

            {/* Card 3: Active Subs */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
              transition={{
                opacity: { duration: 0.4, delay: 0.6 },
                scale: { duration: 0.4, delay: 0.6 },
                y: { duration: 4.0, delay: 1.0, repeat: Infinity, ease: "easeInOut" },
              }}
              whileHover={{ scale: 1.06, borderColor: "#FF9500" }}
              className="flex flex-col items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl px-3.5 py-2.5 min-w-[76px] cursor-pointer shadow-md transition-all group"
            >
              <div className="p-1 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <CreditCard className="h-3.5 w-3.5" />
              </div>
              <span className="text-[#1D1D1F] font-black text-lg leading-none">{activeSubscribersCount}</span>
              <span className="text-slate-500 text-[9px] font-extrabold uppercase tracking-widest">Active Subs</span>
            </motion.div>
          </div>

          {/* Action Buttons Row (Neatly aligned under stat cards) */}
          <div className="flex items-center gap-2">
            <Button
              onClick={onRefresh}
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-xs transition-all hover:scale-105 active:scale-95 shrink-0"
              title="Sync live system data"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#007AFF]" />
            </Button>

            <Link href="/dashboard/admin/owner-applications">
              <Button variant="outline" className="h-9 px-3 rounded-xl border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs">
                <UserPlus className="h-3.5 w-3.5 text-amber-600" />
                <span>Applications</span>
                {pendingPropertiesCount > 0 && (
                  <Badge className="bg-amber-500 text-white font-black text-[9px] px-1 py-0">
                    {pendingPropertiesCount}
                  </Badge>
                )}
              </Button>
            </Link>

            <Link href="/dashboard/admin/users/new">
              <Button className="h-9 px-4 bg-[#007AFF] hover:bg-[#0062CC] text-white font-extrabold rounded-xl shadow-md text-xs flex items-center gap-1.5 transition-all hover:scale-102 active:scale-98">
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add User</span>
              </Button>
            </Link>
          </div>

        </div>

      </div>

      {/* ── Slide Indicator Dots at Bottom Left ── */}
      <div className="absolute bottom-3 left-8 z-30 flex items-center gap-1.5">
        {ADMIN_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setSlideIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === slideIndex
                ? "w-6 bg-[#007AFF]"
                : "w-1.5 bg-slate-300 hover:bg-slate-400"
            }`}
            title={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

    </div>
  );
}
