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
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-center items-center px-4 py-10 relative font-sans">
      {/* Brand logo */}
      <Link href="/listings" className="flex items-center gap-2.5 font-bold text-2xl text-[#1D1D1F] mb-6 z-10">
        <div className="bg-[#007AFF] text-white p-2 rounded-xl shadow-xs">
          <Building className="h-6 w-6" />
        </div>
        <span>Property<span className="text-[#007AFF]">Pro</span></span>
      </Link>

      <Card className="w-full max-w-md bg-white border border-[#E5E5EA] shadow-xl rounded-2xl z-10 overflow-hidden">
        <CardHeader className="space-y-1.5 pt-8 px-6 md:px-8 text-center">
          <CardTitle className="text-2xl font-bold text-[#1D1D1F]">Welcome Back</CardTitle>
          <CardDescription className="text-[#6E6E73] text-xs">
            Sign in to manage properties, leases, and financial operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 md:px-8 pb-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-[#1D1D1F] font-semibold text-xs uppercase tracking-wider">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner_full@propertypro.test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#F0F0F0] border-0 text-[#1D1D1F] placeholder-[#C7C7CC] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#007AFF]/40 rounded-lg h-10 text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-[#1D1D1F] font-semibold text-xs uppercase tracking-wider">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#F0F0F0] border-0 text-[#1D1D1F] placeholder-[#C7C7CC] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#007AFF]/40 rounded-lg h-10 text-sm"
                required
              />
              <div className="flex justify-end pt-1">
                <Link href="/auth/forgot-password" className="text-xs font-semibold text-[#007AFF] hover:underline transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#007AFF] hover:bg-[#0066D9] text-white font-bold flex justify-center items-center gap-2 transition-all h-10 rounded-lg mt-2 shadow-xs"
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
        <CardFooter className="flex flex-col gap-3 pt-4 text-center text-xs text-[#6E6E73] bg-[#F5F5F7] border-t border-[#E5E5EA] p-6">
          <p className="font-semibold text-[#1D1D1F]">
            Demo Credentials (Password: <code className="text-[#007AFF] bg-[#007AFF]/10 px-1.5 py-0.5 rounded font-mono text-[11px]">Demo@1234</code>):
          </p>
          <div className="flex flex-col gap-1 text-[11px] text-[#6E6E73] w-full text-left bg-white p-3 rounded-lg border border-[#E5E5EA] max-h-44 overflow-y-auto">
            <div>Admin: <span className="text-[#007AFF] font-semibold cursor-pointer hover:underline" onClick={() => fillDemoAccount("admin@yopmail.com")}>admin@yopmail.com</span></div>
            <div>Owner (Full): <span className="text-[#007AFF] font-semibold cursor-pointer hover:underline" onClick={() => fillDemoAccount("owner.atlas@yopmail.com")}>owner.atlas@yopmail.com</span></div>
            <div>Owner (New): <span className="text-[#007AFF] font-semibold cursor-pointer hover:underline" onClick={() => fillDemoAccount("owner.new@yopmail.com")}>owner.new@yopmail.com</span></div>
            <div>Tenant (Perfect): <span className="text-[#007AFF] font-semibold cursor-pointer hover:underline" onClick={() => fillDemoAccount("tenant.adam@yopmail.com")}>tenant.adam@yopmail.com</span></div>
            <div>Tenant (Overdue): <span className="text-[#007AFF] font-semibold cursor-pointer hover:underline" onClick={() => fillDemoAccount("tenant.oscar@yopmail.com")}>tenant.oscar@yopmail.com</span></div>
            <div>Tenant (Maint.): <span className="text-[#007AFF] font-semibold cursor-pointer hover:underline" onClick={() => fillDemoAccount("tenant.marvin@yopmail.com")}>tenant.marvin@yopmail.com</span></div>
            <div>Tenant (New): <span className="text-[#007AFF] font-semibold cursor-pointer hover:underline" onClick={() => fillDemoAccount("tenant.new@yopmail.com")}>tenant.new@yopmail.com</span></div>
            <div>Inspector: <span className="text-[#007AFF] font-semibold cursor-pointer hover:underline" onClick={() => fillDemoAccount("inspector.jake@yopmail.com")}>inspector.jake@yopmail.com</span></div>
          </div>
          <Link href="/listings" className="text-[#007AFF] hover:underline font-semibold mt-1">
            ← Back to Listings
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
