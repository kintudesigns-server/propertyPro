"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wrench, Clock, Calendar, CheckCircle2, User, Home, Building, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function MaintenanceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/maintenance?id=${id}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setRequest(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-[#64748B] font-semibold">Loading ticket details...</div>;
  }

  if (!request) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#0F172A]">Ticket Not Found</h2>
        <Link href="/dashboard/maintenance">
          <Button variant="outline">Back to Requests</Button>
        </Link>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "EMERGENCY": return "bg-red-100 text-red-700 border-red-200";
      case "HIGH": return "bg-orange-100 text-orange-700 border-orange-200";
      case "MEDIUM": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "LOW": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED": return "bg-blue-100 text-blue-700";
      case "ASSIGNED": return "bg-purple-100 text-purple-700";
      case "RESOLVED": return "bg-green-100 text-green-700";
      case "CLOSED": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="h-10 w-10 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] shadow-sm transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Request Details</h1>
          <p className="text-sm font-medium text-[#64748B] mt-0.5">Ticket ID: {request.id.split("-")[0]}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">{request.title}</h2>
                <div className="flex gap-2 mt-3">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wide border ${getPriorityColor(request.priority)}`}>
                    {request.priority} PRIORITY
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wide border ${getStatusColor(request.status)}`}>
                    STATUS: {request.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wide border bg-slate-100 text-slate-700 border-slate-200">
                    {request.category}
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Wrench className="h-6 w-6" />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <h3 className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#64748B]" /> Description
              </h3>
              <p className="text-sm font-medium text-[#475569] leading-relaxed whitespace-pre-wrap">
                {request.description}
              </p>
            </div>
            
            {request.photos && request.photos.length > 0 && (
              <div className="pt-4 border-t border-[#E2E8F0]">
                <h3 className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide mb-3 flex items-center gap-2">
                  Photos
                </h3>
                <div className="flex flex-wrap gap-4">
                  {request.photos.map((photo: string, i: number) => (
                    <img key={i} src={photo} alt="Issue photo" className="h-24 w-24 object-cover rounded-xl border border-[#E2E8F0]" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Meta Data */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 space-y-5">
            <h3 className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide border-b border-[#E2E8F0] pb-2">Location & People</h3>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <Building className="h-5 w-5 text-[#94A3B8] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#64748B] uppercase">Property</p>
                  <p className="font-semibold text-[#0F172A] text-sm">{request.unit.property.name}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Home className="h-5 w-5 text-[#94A3B8] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#64748B] uppercase">Unit</p>
                  <p className="font-semibold text-[#0F172A] text-sm">{request.unit.name}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <User className="h-5 w-5 text-[#94A3B8] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#64748B] uppercase">Reported By</p>
                  <p className="font-semibold text-[#0F172A] text-sm">{request.tenant.name}</p>
                  <p className="text-xs font-medium text-[#64748B]">{request.tenant.phone || request.tenant.email}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 space-y-5">
            <h3 className="text-[13px] font-bold text-[#0F172A] uppercase tracking-wide border-b border-[#E2E8F0] pb-2">Assignment Details</h3>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <Wrench className="h-5 w-5 text-[#94A3B8] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#64748B] uppercase">Technician</p>
                  {request.inspector ? (
                    <>
                      <p className="font-semibold text-[#0F172A] text-sm">{request.inspector.name}</p>
                      <p className="text-xs font-medium text-[#64748B]">{request.inspector.phone || "No phone provided"}</p>
                    </>
                  ) : (
                    <p className="font-semibold text-[#94A3B8] text-sm italic">Unassigned</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Calendar className="h-5 w-5 text-[#94A3B8] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#64748B] uppercase">Created At</p>
                  <p className="font-semibold text-[#0F172A] text-sm">{format(new Date(request.createdAt), "PPp")}</p>
                </div>
              </div>
              {request.scheduledDate && (
                <div className="flex gap-3">
                  <Clock className="h-5 w-5 text-[#3B82F6] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#64748B] uppercase">Scheduled For</p>
                    <p className="font-semibold text-[#0F172A] text-sm">{format(new Date(request.scheduledDate), "PPp")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
