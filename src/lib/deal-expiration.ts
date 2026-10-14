import type { Deal } from "@/types/deal";

type ExpirableDeal = Pick<Deal, "status" | "expiresAt">;

export function isDealExpired(deal: ExpirableDeal, now = Date.now()): boolean {
  if (deal.status === "expired") {
    return true;
  }

  if (deal.status !== "published" || !deal.expiresAt) {
    return false;
  }

  const expirationTime = new Date(deal.expiresAt).getTime();

  return Number.isFinite(expirationTime) && expirationTime <= now;
}
