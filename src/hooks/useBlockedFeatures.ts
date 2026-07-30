"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Returns a Set of feature keys that are currently blocked for the logged-in user.
 * Used by the sidebar to show lock icons on restricted nav items.
 *
 * Owners and SuperAdmins always get an empty set (no locks).
 */
export function useBlockedFeatures(): {
  blockedFeatures: Set<string>;
  loading: boolean;
} {
  const { data: session, status } = useSession();
  const [blockedFeatures, setBlockedFeatures] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setLoading(false);
      return;
    }

    const role = (session?.user as any)?.role;

    // Owners and Admins have no feature blocks
    if (role === "SUPERADMIN" || role === "OWNER") {
      setBlockedFeatures(new Set());
      setLoading(false);
      return;
    }

    // Tenants and Inspectors: fetch blocked features
    fetch("/api/subscription/check-all-features")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load feature access");
        return res.json();
      })
      .then((data: { blocked: Record<string, boolean> }) => {
        setBlockedFeatures(new Set(Object.keys(data.blocked)));
        setLoading(false);
      })
      .catch(() => {
        // On error, assume no blocks (fail open)
        setBlockedFeatures(new Set());
        setLoading(false);
      });
  }, [status, session]);

  return { blockedFeatures, loading };
}
