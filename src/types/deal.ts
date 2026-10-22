export type DealPlatform =
  "ps4" | "ps5" | "switch" | "switch-2" | "xbox-one" | "xbox-series" | "other";

export type DealStatus = "draft" | "published" | "expired";

export interface Deal {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string | null;

  // Valores em centavos
  price: number;
  originalPrice?: number | null;

  dealUrl: string;

  store: {
    id: string;
    name: string;
  };

  platform: DealPlatform;
  status: DealStatus;

  // Informações adicionais da promoção
  couponCode?: string | null;
  couponUrl?: string | null;
  paymentConditions?: string | null;
  rules?: string | null;
  expiresAt?: string | null;

  preOrder: boolean;

  createdAt: string;
  updatedAt: string;
}
