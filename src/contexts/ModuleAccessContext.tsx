"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface ModuleAccessState {
  allowed: boolean;
  reason?: string;
  source?: string;
}

interface ModuleAccessContextType {
  modulesAccess: Record<string, ModuleAccessState>;
  loading: boolean;
  isAllowed: (moduleKey: string) => boolean;
  getReason: (moduleKey: string) => string | undefined;
  refetchAccess: () => Promise<void>;
}

const ModuleAccessContext = createContext<ModuleAccessContextType>({
  modulesAccess: {},
  loading: true,
  isAllowed: () => true,
  getReason: () => undefined,
  refetchAccess: async () => {},
});

export function ModuleAccessProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [modulesAccess, setModulesAccess] = useState<Record<string, ModuleAccessState>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAllAccess = useCallback(async () => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setModulesAccess({});
      setLoading(false);
      return;
    }

    const role = (session?.user as any)?.role;
    if (role !== "OWNER") {
      setModulesAccess({});
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/subscription/all-access");
      if (res.ok) {
        const data = await res.json();
        setModulesAccess(data);
      }
    } catch (err) {
      console.error("Failed to fetch all module access states:", err);
    } finally {
      setLoading(false);
    }
  }, [session, status]);

  useEffect(() => {
    fetchAllAccess();
  }, [fetchAllAccess]);

  const isAllowed = useCallback(
    (moduleKey: string): boolean => {
      const role = (session?.user as any)?.role;
      if (role !== "OWNER") return true;
      if (loading) return true; // Default allowed while loading to avoid flash
      if (modulesAccess[moduleKey] === undefined) return true;
      return modulesAccess[moduleKey].allowed;
    },
    [session, loading, modulesAccess]
  );

  const getReason = useCallback(
    (moduleKey: string): string | undefined => {
      return modulesAccess[moduleKey]?.reason;
    },
    [modulesAccess]
  );

  return (
    <ModuleAccessContext.Provider
      value={{
        modulesAccess,
        loading,
        isAllowed,
        getReason,
        refetchAccess: fetchAllAccess,
      }}
    >
      {children}
    </ModuleAccessContext.Provider>
  );
}

export function useModuleAccessContext() {
  return useContext(ModuleAccessContext);
}
