import type { DealPlatform } from "@/types/deal";

export const PLATFORM_LABELS: Record<DealPlatform, string> = {
  ps4: "PlayStation 4",
  ps5: "PlayStation 5",
  switch: "Nintendo Switch",
  "switch-2": "Nintendo Switch 2",
  "xbox-one": "Xbox One",
  "xbox-series": "Xbox Series X|S",
  other: "Outras plataformas",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatPrice(priceInCents: number): string {
  return currencyFormatter.format(priceInCents / 100);
}

export function calculateDiscount(price: number, originalPrice?: number | null): number | null {
  if (!originalPrice || originalPrice <= price || price < 0) {
    return null;
  }

  return Math.round(((originalPrice - price) / originalPrice) * 100);
}
