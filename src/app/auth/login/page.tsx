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
          router.push("/dashboard/tenant");
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-center items-center px-4 py-12 relative font-sans">
      {/* Brand logo header */}
      <Link href="/" className="flex items-center gap-2.5 group mb-8 z-10">
        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-md shadow-slate-900/10 group-hover:bg-slate-800 transition-all">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight text-slate-900 leading-tight">PropertyPro</span>
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">SaaS OS</span>
        </div>
      </Link>

      <Card className="w-full max-w-md bg-white border border-slate-200 shadow-sm rounded-2xl z-10 overflow-hidden">
        <CardHeader className="space-y-1.5 pt-8 px-6 sm:px-8 text-center border-b border-slate-100">
          <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-slate-500 text-xs font-medium">
            Sign in to access your properties, leases, and financial operations.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 font-bold text-xs uppercase tracking-wider">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 rounded-xl h-11 text-sm font-medium transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-slate-700 font-bold text-xs uppercase tracking-wider">
                  Password
                </Label>
                <Link href="/auth/forgot-password" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 rounded-xl h-11 text-sm font-medium transition-all"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 rounded-xl shadow-xs transition-all flex justify-center items-center gap-2 text-sm mt-2 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        {/* Demo Credentials Quick Switcher */}
        <CardFooter className="flex flex-col gap-3 pt-5 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-100 p-6">
          <div className="flex items-center justify-center gap-1.5 font-bold text-slate-700 text-xs">
            <Key className="h-3.5 w-3.5 text-slate-400" />
            <span>Quick Demo Login</span>
            <code className="text-slate-700 bg-slate-200/60 px-1.5 py-0.5 rounded font-mono text-[11px] ml-1">Demo@1234</code>
          </div>

          <div className="grid grid-cols-2 gap-1.5 w-full text-left max-h-44 overflow-y-auto pt-1">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillDemoAccount(acc.email)}
                className="flex flex-col text-left px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-100/50 transition-all text-xs group"
              >
                <span className="font-bold text-slate-900 text-[11px] group-hover:text-slate-700">{acc.label}</span>
                <span className="text-[10px] text-slate-400 truncate">{acc.email}</span>
              </button>
            ))}
          </div>

          <Link href="/listings" className="text-slate-600 hover:text-slate-900 font-semibold text-xs mt-2 transition-colors">
            ← Back to Listings
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
