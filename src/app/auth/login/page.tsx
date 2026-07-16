"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building, Loader2, ArrowRight } from "lucide-react";
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

        // Fetch session to determine role
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        const role = session?.user?.role;

        if (role) {
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

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden font-sans">
      {/* Brand logo */}
      <Link href="/listings" className="flex items-center gap-2 font-bold text-2xl text-primary mb-8 z-10">
        <Building className="h-7 w-7 text-primary" />
        <span>Property<span className="text-[#111111]">Pro</span></span>
      </Link>

      <Card className="w-full max-w-md bg-white border border-slate-100 shadow-xl rounded-[2rem] z-10 overflow-hidden">
        <CardHeader className="space-y-2 pt-8 px-8">
          <CardTitle className="text-2xl font-extrabold text-slate-800 text-center">Welcome back</CardTitle>
          <CardDescription className="text-slate-400 text-center text-xs">
            Sign in to manage properties, leases, and payouts.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 font-bold text-xs uppercase tracking-wider">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner_full@propertypro.test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-50 border-0 text-slate-800 placeholder-slate-400 focus-visible:ring-primary/20 rounded-xl h-11"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700 font-bold text-xs uppercase tracking-wider">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-50 border-0 text-slate-800 placeholder-slate-400 focus-visible:ring-primary/20 rounded-xl h-11"
                required
              />
              <div className="flex justify-end pt-1">
                <Link href="/auth/forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold flex justify-center items-center gap-1.5 transition-colors h-11 rounded-xl mt-2"
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
        <CardFooter className="flex flex-col gap-4 pt-4 text-center text-xs text-slate-400 bg-slate-50/50 border-t border-slate-100 p-8">
          <p className="font-bold text-slate-600">
            Demo Accounts (Password: <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">Demo@1234</code>):
          </p>
          <div className="flex flex-col gap-1.5 text-[11px] text-slate-500 w-full text-left bg-white p-3.5 rounded-xl border border-slate-100 max-h-56 overflow-y-auto">
            <div>Admin: <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => fillDemoAccount("admin@yopmail.com")}>admin@yopmail.com</span></div>
            <div>Owner (Full): <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => fillDemoAccount("owner.atlas@yopmail.com")}>owner.atlas@yopmail.com</span></div>
            <div>Owner (New): <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => fillDemoAccount("owner.new@yopmail.com")}>owner.new@yopmail.com</span></div>
            <div>Tenant (Perfect): <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => fillDemoAccount("tenant.adam@yopmail.com")}>tenant.adam@yopmail.com</span></div>
            <div>Tenant (Overdue): <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => fillDemoAccount("tenant.oscar@yopmail.com")}>tenant.oscar@yopmail.com</span></div>
            <div>Tenant (Maint.): <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => fillDemoAccount("tenant.marvin@yopmail.com")}>tenant.marvin@yopmail.com</span></div>
            <div>Tenant (New): <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => fillDemoAccount("tenant.new@yopmail.com")}>tenant.new@yopmail.com</span></div>
            <div>Inspector: <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => fillDemoAccount("inspector.jake@yopmail.com")}>inspector.jake@yopmail.com</span></div>
          </div>
          <Link href="/listings" className="text-primary hover:underline font-bold mt-1">
            ← Back to Listings
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
