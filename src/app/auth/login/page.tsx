"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, ArrowRight, ShieldCheck, Key } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const fillDemoAccount = (emailValue: string, passwordValue: string = "Demo@1234") => {
    setEmail(emailValue);
    setPassword(passwordValue);
    toast.info(`Filled credentials for ${emailValue.split('@')[0]}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        toast.error(res.error || "Invalid login credentials.");
        setLoading(false);
      } else {
        toast.success("Logged in successfully! Redirecting...");

        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        const role = session?.user?.role;

        if (role === "INSPECTOR") {
          router.push("/dashboard/inspector");
        } else if (role === "TENANT") {
          router.push("/dashboard");
        } else if (role) {
          router.push("/dashboard");
        } else {
          router.push("/");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("An unexpected error occurred during login.");
      setLoading(false);
    }
  };

  const demoAccounts = [
    { label: "Admin", email: "admin@yopmail.com" },
    { label: "Owner (Full)", email: "owner.atlas@yopmail.com" },
    { label: "Owner (New)", email: "owner.new@yopmail.com" },
    { label: "Owner (Paused)", email: "james.carter@demo.com" },
    { label: "Tenant (Active)", email: "tenant.adam@yopmail.com" },
    { label: "Tenant (Overdue)", email: "tenant.oscar@yopmail.com" },
    { label: "Inspector", email: "inspector.jake@yopmail.com" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1D1D1F] flex flex-col justify-center items-center px-4 py-12 relative font-sans">
      {/* Brand logo header */}
      <Link href="/" className="flex items-center gap-2.5 group mb-8 z-10">
        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs group-hover:bg-slate-800 transition-all">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-semibold tracking-tight text-[#1D1D1F] leading-tight">PropertyPro</span>
          <span className="text-[10px] text-[#6E6E73] font-normal tracking-wider uppercase">SaaS OS</span>
        </div>
      </Link>

      <Card className="w-full max-w-md bg-white border border-slate-200 shadow-xs rounded-3xl z-10 overflow-hidden">
        <CardHeader className="space-y-1.5 pt-8 px-6 sm:px-8 text-center border-b border-slate-100">
          <CardTitle className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-[#6E6E73] text-xs font-normal">
            Sign in to access your properties, leases, and financial operations.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#6E6E73] font-normal text-xs">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 focus-visible:border-slate-900 shadow-2xs transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-[#6E6E73] font-normal text-xs">
                  Password
                </Label>
                <Link href="/auth/forgot-password" className="text-xs font-normal text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-normal text-[#1D1D1F] placeholder:text-[#6E6E73] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 focus-visible:border-slate-900 shadow-2xs transition-all"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-xs border-none cursor-pointer flex justify-center items-center gap-2 transition-all mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        {/* Demo Credentials Quick Switcher */}
        <CardFooter className="flex flex-col gap-3 pt-5 text-center text-xs text-[#6E6E73] bg-slate-50/50 border-t border-slate-100 p-6">
          <div className="flex items-center justify-center gap-1.5 font-normal text-[#6E6E73] text-xs">
            <Key className="h-3.5 w-3.5 text-slate-400" />
            <span>Quick Demo Login</span>
            <code className="text-[#1D1D1F] bg-slate-200/60 px-1.5 py-0.5 rounded font-mono text-[11px] ml-1">Demo@1234</code>
          </div>

          <div className="grid grid-cols-2 gap-1.5 w-full text-left max-h-44 overflow-y-auto pt-1">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillDemoAccount(acc.email)}
                className="flex flex-col text-left px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-xs cursor-pointer shadow-2xs group"
              >
                <span className="font-semibold text-[#1D1D1F] text-xs group-hover:text-slate-700">{acc.label}</span>
                <span className="text-[10px] text-[#6E6E73] truncate">{acc.email}</span>
              </button>
            ))}
          </div>

          <Link href="/listings" className="text-[#6E6E73] hover:text-[#1D1D1F] font-normal text-xs mt-2 transition-colors">
            ← Back to Listings
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
