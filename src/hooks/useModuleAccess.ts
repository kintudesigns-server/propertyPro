import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export function useModuleAccess(moduleKey: string) {
  const { data: session, status } = useSession();
  const [allowed, setAllowed] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      setAllowed(false);
      setLoading(false);
      return;
    }

    const role = (session?.user as any)?.role;
    if (role !== "OWNER") {
      setAllowed(true);
      setLoading(false);
      return;
    }

    fetch(`/api/subscription/check-access?module=${moduleKey}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setAllowed(data.allowed);
      })
      .catch(() => {
        setAllowed(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [moduleKey, status, session]);

  return { allowed, loading };
}
