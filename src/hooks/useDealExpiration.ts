import { useEffect, useState } from "react";

import type { Deal } from "@/types/deal";

type ExpirableDeal = Pick<Deal, "status" | "expiresAt">;

export function useDealExpiration(deal: ExpirableDeal | null | undefined): boolean {
  const status = deal?.status;
  const expiresAt = deal?.expiresAt;

  const [now, setNow] = useState(() => Date.now());

  const expirationTime = expiresAt ? new Date(expiresAt).getTime() : NaN;

  const hasValidExpiration = Number.isFinite(expirationTime);

  useEffect(() => {
    if (status !== "published" || !hasValidExpiration) {
      return;
    }

    function checkExpiration() {
      setNow(Date.now());
    }

    // Atualiza o horário ao receber uma nova oferta
    checkExpiration();

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

  return (
    status === "expired" || (status === "published" && hasValidExpiration && now >= expirationTime)
  );
}
