"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, XCircle, FileText, User, Building, PhoneCall, Briefcase, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function ApplicationDetailsPage() {
  const { appId } = useParams();
  const router = useRouter();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For demo purposes, we will fetch all applications and find by id since we don't have a specific GET by id for apps yet, 
    // but typically we'd hit /api/applications?id=appId
    const fetchApp = async () => {
      try {
        const res = await fetch("/api/applications");
        if (res.ok) {
          const data = await res.json();
          const found = data.find((a: any) => a.id === appId);
          if (found) {
            setApp(found);
          } else {
            toast.error("Application not found");
            router.push("/dashboard/tenants/applications");
          }
        }
      } catch (err) {
        toast.error("Error loading application");
      } finally {
        setLoading(false);
      }
    };
    if (appId) fetchApp();
  }, [appId, router]);

  if (loading) {
    return <div className="p-10 text-center font-bold text-[#64748B]">Loading Application...</div>;
  }
  if (!app) return null;

  return (
    <div className="w-full max-w-5xl mx-auto pt-6 space-y-6 pb-24">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-col gap-2">
          <Link href="/dashboard/tenants/applications" className="text-sm font-bold text-[#64748B] hover:text-[#3B82F6] flex items-center gap-2 mb-2 transition-colors w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to Applications
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Application Details</h1>
            <Badge className={`border-0 rounded-lg px-3 py-1 font-bold shadow-sm ${
              app.status === "APPROVED" ? "bg-[#DCFCE7] text-[#16A34A]" :
              app.status === "REJECTED" ? "bg-[#FEE2E2] text-[#EF4444]" :
              "bg-[#FEF9C3] text-[#CA8A04]"
            }`}>
              {app.status}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-[#64748B]">App ID: {app.id}</p>
        </div>

        {app.status === "PENDING" && (
          <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <Button className="flex-1 md:flex-none bg-white text-red-500 border border-red-200 hover:bg-red-50 shadow-sm rounded-xl h-11 font-bold px-6">
              <XCircle className="h-4 w-4 mr-2" /> Reject
            </Button>
            <Button className="flex-1 md:flex-none bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm rounded-xl h-11 font-bold px-6">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shrink-0">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#64748B] uppercase">Submitted</p>
              <p className="font-extrabold text-[#0F172A] text-lg">{new Date(app.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
            <User className="h-5 w-5 text-[#3B82F6]" />
            <h2 className="font-bold text-[#0F172A] text-lg">Applicant Info</h2>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Full Name</div>
              <div className="font-semibold text-[#0F172A]">{app.name}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Email</div>
              <div className="font-semibold text-[#0F172A]">{app.email}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Phone</div>
              <div className="font-semibold text-[#0F172A]">{app.phone}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E8F0] shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center gap-2">
            <Building className="h-5 w-5 text-[#3B82F6]" />
            <h2 className="font-bold text-[#0F172A] text-lg">Target Property</h2>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Property Name</div>
              <div className="font-semibold text-[#0F172A]">{app.unit?.property?.name || "N/A"}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Unit</div>
              <div className="font-semibold text-[#0F172A]">{app.unit?.name || "N/A"}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-[#F1F5F9] pb-4">
              <div className="text-sm font-bold text-[#64748B]">Rent Amount</div>
              <div className="font-semibold text-[#0F172A]">${Number(app.unit?.rentAmount || 0).toFixed(2)}/mo</div>
            </div>
            <Link href={`/dashboard/properties/${app.unit?.property?.id}`}>
              <Button variant="outline" className="w-full font-bold border-[#E2E8F0] mt-2">View Property</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
