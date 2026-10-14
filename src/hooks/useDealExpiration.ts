import { useEffect, useState } from "react";

import type { Deal } from "@/types/deal";

type ExpirableDeal = Pick<Deal, "status" | "expiresAt">;

export function useDealExpiration(deal: ExpirableDeal | null | undefined): boolean {
  const status = deal?.status;
  const expiresAt = deal?.expiresAt;

  const [expiredDeadline, setExpiredDeadline] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "published" || !expiresAt) {
      return;
    }

    const expirationTime = new Date(expiresAt).getTime();

    if (!Number.isFinite(expirationTime)) {
      return;
    }

    function checkExpiration() {
      if (Date.now() >= expirationTime) {
        setExpiredDeadline(expiresAt!);
      }
    }

    const remaining = expirationTime - Date.now();

    const timeout = window.setTimeout(checkExpiration, Math.max(0, remaining));

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkExpiration();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkExpiration);

    return () => {
      window.clearTimeout(timeout);

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkExpiration);
    };
  }, [status, expiresAt]);

  if (status === "expired") {
    return true;
  }

  if (status !== "published" || !expiresAt) {
    return false;
  }

  return expiredDeadline === expiresAt;
}
