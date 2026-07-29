"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { UserFeatureKey } from "@/lib/UserFeatureRegistry";

export interface FeatureAccessState {
  allowed: boolean;
  loading: boolean;
  reason?: string;
  adminNote?: string;
  expiresAt?: string | null;
  daysRemaining?: number | null;
  blockedAt?: string | null;
  featureLabel?: string;
  source?: string;
}

export function useFeatureAccess(featureKey: UserFeatureKey): FeatureAccessState {
  const { data: session, status } = useSession();
  const [accessState, setAccessState] = useState<FeatureAccessState>({
    allowed: true,
    loading: true,
  });

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      setAccessState({
        allowed: false,
        loading: false,
        reason: "You must be signed in to access this feature.",
      });
      return;
    }

    const role = (session?.user as any)?.role;

    // Owners and Superadmins pass by default
    if (role === "SUPERADMIN" || role === "OWNER") {
      setAccessState({
        allowed: true,
        loading: false,
      });
      return;
    }

    fetch(`/api/subscription/check-feature-access?feature=${featureKey}`)
      .then((res) => {
        if (!res.ok) throw new Error("Access check failed");
        return res.json();
      })
      .then((data) => {
        setAccessState({
          allowed: data.allowed,
          loading: false,
          reason: data.reason,
          adminNote: data.adminNote,
          expiresAt: data.expiresAt,
          daysRemaining: data.daysRemaining,
          blockedAt: data.blockedAt,
          featureLabel: data.featureLabel,
          source: data.source,
        });
      })
      .catch(() => {
        setAccessState({
          allowed: true,
          loading: false,
        });
      });
  }, [featureKey, status, session]);

  return accessState;
}
