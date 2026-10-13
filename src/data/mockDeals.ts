
import type { Deal } from "@/types/deal";

export const mockDeals: Deal[] = [
  {
    id: "1",
    title: "Elden Ring",
    description:
      "Elden Ring para PlayStation 5 em mídia física. Confira as condições da promoção antes de finalizar a compra.",
    imageUrl: null,
    price: 14990,
    originalPrice: 24990,
    dealUrl: "https://www.amazon.com.br/",
    store: {
      id: "amazon",
      name: "Amazon",
    },
    platform: "ps5",
    status: "published",

    couponCode: "GAMER20",
    paymentConditions:
      "Preço anunciado válido para pagamento via Pix. Outras formas de pagamento podem apresentar valores diferentes.",
    rules:
      "Adicione o produto ao carrinho e aplique o cupom GAMER20 antes de finalizar a compra.\nPromoção sujeita à disponibilidade de estoque.",
    expiresAt: "2026-10-15T23:59:00-03:00",

    createdAt: "2026-10-13T10:00:00Z",
  },
  {
    id: "2",
    title: "Super Mario Bros. Wonder",
    imageUrl: null,
    price: 19990,
    originalPrice: 29990,
    dealUrl: "https://www.mercadolivre.com.br/",
    store: {
      id: "mercado-livre",
      name: "Mercado Livre",
    },
    platform: "switch",
    status: "published",
    createdAt: "2026-10-13T09:00:00Z",
  },
  {
    id: "3",
    title: "God of War Ragnarök",
    imageUrl: null,
    price: 12990,
    originalPrice: 19990,
    dealUrl: "https://www.amazon.com.br/",
    store: {
      id: "amazon",
      name: "Amazon",
    },
    platform: "ps5",
    status: "published",
    createdAt: "2026-10-12T18:00:00Z",
  },
  {
    id: "4",
    title: "The Legend of Zelda: Tears of the Kingdom",
    imageUrl: null,
    price: 22990,
    originalPrice: 34990,
    dealUrl: "https://www.mercadolivre.com.br/",
    store: {
      id: "mercado-livre",
      name: "Mercado Livre",
    },
    platform: "switch",
    status: "published",
    createdAt: "2026-10-12T15:00:00Z",
  },
  {
    id: "5",
    title: "Resident Evil 4",
    imageUrl: null,
    price: 9990,
    originalPrice: 19990,
    dealUrl: "https://www.amazon.com.br/",
    store: {
      id: "amazon",
      name: "Amazon",
    },
    platform: "ps4",
    status: "published",
    createdAt: "2026-10-11T12:00:00Z",
  },
  {
    id: "6",
    title: "Cyberpunk 2077: Ultimate Edition",
    imageUrl: null,
    price: 17990,
    originalPrice: 25990,
    dealUrl: "https://www.mercadolivre.com.br/",
    store: {
      id: "mercado-livre",
      name: "Mercado Livre",
    },
    platform: "xbox-series",
    status: "expired",
    createdAt: "2026-10-10T10:00:00Z",
  },
];
