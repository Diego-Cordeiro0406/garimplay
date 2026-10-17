import { useEffect, useState } from "react";

import type { Deal } from "@/types/deal";

type ExpirableDeal = Pick<Deal, "status" | "expiresAt">;

const dateNow = Date.now();

export function useDealExpiration(deal: ExpirableDeal | null | undefined): boolean {
  const status = deal?.status;
  const expiresAt = deal?.expiresAt;

  const [, setExpirationTick] = useState(0);

  const expirationTime = expiresAt ? new Date(expiresAt).getTime() : NaN;

  const hasValidExpiration = Number.isFinite(expirationTime);

  const isExpired =
    status === "expired" ||
    (status === "published" && hasValidExpiration && dateNow >= expirationTime);

  useEffect(() => {
    if (status !== "published" || !hasValidExpiration || Date.now() >= expirationTime) {
      return;
    }

    const checkExpiration = () => {
      if (Date.now() >= expirationTime) {
        setExpirationTick((value) => value + 1);
      }
    };

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
  }, [status, expiresAt, expirationTime, hasValidExpiration]);

  return Boolean(isExpired);
}
