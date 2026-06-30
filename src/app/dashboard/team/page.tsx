"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Briefcase, Trash2, Mail, Phone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TeamDashboard() {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users?role=INSPECTOR");
      const data = await res.json();
      if (Array.isArray(data)) {
        setTeam(data);
      }
    } catch (error) {
      console.error("Failed to fetch team:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    
    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTeam();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Failed to delete team member:", error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#E2E8F0]">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Team & Staff</h1>
            <p className="text-sm font-medium text-[#64748B] mt-1">Manage technicians and staff members</p>
          </div>
        </div>
        <Link href="/dashboard/team/new">
          <Button className="w-full md:w-auto h-11 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold px-6 rounded-xl shadow-sm shadow-blue-500/20 transition-all text-sm gap-2">
            <Plus className="h-4 w-4" />
            Add Team Member
          </Button>
        </Link>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="py-4 px-6 text-xs font-extrabold text-[#64748B] uppercase tracking-widest w-1/3">Name</th>
                <th className="py-4 px-6 text-xs font-extrabold text-[#64748B] uppercase tracking-widest w-1/4">Contact</th>
                <th className="py-4 px-6 text-xs font-extrabold text-[#64748B] uppercase tracking-widest">Role</th>
                <th className="py-4 px-6 text-xs font-extrabold text-[#64748B] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm font-semibold text-[#64748B]">Loading team members...</td>
                </tr>
              ) : team.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm font-semibold text-[#64748B]">No team members found. Click "Add Team Member" to get started.</td>
                </tr>
              ) : (
                team.map((member) => (
                  <tr key={member.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC]/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 min-w-[40px] bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {member.name.charAt(0)}
                        </div>
                        <span className="font-bold text-sm text-[#0F172A]">{member.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                          <Mail className="h-3.5 w-3.5" />
                          {member.email}
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                            <Phone className="h-3.5 w-3.5" />
                            {member.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <div className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Technician
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove Team Member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
