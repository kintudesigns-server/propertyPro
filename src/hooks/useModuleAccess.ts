import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useModuleAccessContext } from "@/contexts/ModuleAccessContext";

export function useModuleAccess(moduleKey: string) {
  const context = useModuleAccessContext();
  const { data: session, status } = useSession();
  const [fallbackAllowed, setFallbackAllowed] = useState<boolean>(true);
  const [fallbackLoading, setFallbackLoading] = useState<boolean>(false);

  // If context is available and finished loading
  if (context && !context.loading && Object.keys(context.modulesAccess).length > 0) {
    const role = (session?.user as any)?.role;
    if (role !== "OWNER") {
      return { allowed: true, loading: false };
    }
    const state = context.modulesAccess[moduleKey];
    return {
      allowed: state ? state.allowed : true,
      loading: false,
      reason: state?.reason,
      source: state?.source
    };
  }

  // Fallback behavior if rendered outside ModuleAccessProvider
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setFallbackAllowed(false);
      setFallbackLoading(false);
      return;
    }

    const role = (session?.user as any)?.role;
    if (role !== "OWNER") {
      setFallbackAllowed(true);
      setFallbackLoading(false);
      return;
    }

    setFallbackLoading(true);
    fetch(`/api/subscription/check-access?module=${moduleKey}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setFallbackAllowed(data.allowed);
      })
      .catch(() => {
        setFallbackAllowed(false);
      })
      .finally(() => {
        setFallbackLoading(false);
      });
  }, [moduleKey, status, session]);

  return { allowed: fallbackAllowed, loading: fallbackLoading, reason: undefined, source: undefined };
}
