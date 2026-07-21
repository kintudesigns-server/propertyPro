"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function UnmaskAccountNumber({ apiUrl, maskedNumber }: { apiUrl: string; maskedNumber: string }) {
  const { data: session } = useSession();
  const [unmasked, setUnmasked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canUnmask = (session?.user as any)?.role === "SUPERADMIN" || (session?.user as any)?.role === "OWNER";

  const handleReveal = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent row click

    if (unmasked) {
      setUnmasked(null);
      return;
    }

    if (!confirm("This will permanently log that you unmasked sensitive PII. Are you sure you need to view this?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl, {
        method: "POST"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unmask");
      }

      const data = await res.json();
      setUnmasked(data.accountNumber);
      toast.success("Account number unmasked. This action has been audited.");
    } catch (err: any) {
      toast.error(err.message || "Failed to unmask");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(unmasked || maskedNumber);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-700">
        {unmasked || maskedNumber}
      </span>
      {canUnmask && maskedNumber.includes("••••") && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-[#8E8E93] hover:text-red-600 rounded-md"
          onClick={handleReveal}
          disabled={loading}
          title={unmasked ? "Hide account number" : "Reveal full account number"}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : unmasked ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-[#8E8E93] hover:text-[#6E6E73] rounded-md"
        onClick={handleCopy}
        title="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
