import type { QueryData } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Deal, DealPlatform, DealStatus } from "@/types/deal";

const DEAL_SELECT = `
  id,
  title,
  description,
  image_url,
  price_cents,
  original_price_cents,
  deal_url,
  coupon_code,
  payment_conditions,
  rules,
  status,
  expires_at,
  created_at,
  store:stores!deals_store_id_fkey (
    id,
    name
  ),
  platform:platforms!deals_platform_id_fkey (
    id
  )
` as const;

// Consulta base reutilizada pelas funções do serviço
const dealsQuery = () => supabase.from("deals").select(DEAL_SELECT);

// Tipo inferido diretamente da consulta
type DealsQueryResult = QueryData<ReturnType<typeof dealsQuery>>;

type DealRecord = DealsQueryResult[number];

// Converte o formato do banco para o formato da interface
function mapDeal(record: DealRecord): Deal {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    imageUrl: record.image_url,

    price: record.price_cents,
    originalPrice: record.original_price_cents,

    dealUrl: record.deal_url,

    store: {
      id: record.store.id,
      name: record.store.name,
    },

    platform: record.platform.id as DealPlatform,
    status: record.status as DealStatus,

    couponCode: record.coupon_code,
    paymentConditions: record.payment_conditions,
    rules: record.rules,
    expiresAt: record.expires_at,

    createdAt: record.created_at,
  };
}

export const DEALS_PER_PAGE = 10;

export type PlatformFilter = "all" | "playstation" | "nintendo" | "xbox" | "other";

type PublishedDealsParams = {
  page: number;
  platform: PlatformFilter;
  search?: string;
};

export type PaginatedDeals = {
  deals: Deal[];
  total: number;
  totalPages: number;
};

export async function getPublishedDeals({
  page,
  platform,
  search,
}: PublishedDealsParams): Promise<PaginatedDeals> {
  const from = (page - 1) * DEALS_PER_PAGE;
  const to = from + DEALS_PER_PAGE - 1;

  let query = supabase
    .from("deals")
    .select(DEAL_SELECT, { count: "exact" })
    .eq("status", "published");

  switch (platform) {
    case "playstation":
      query = query.in("platform_id", ["ps4", "ps5"]);
      break;

    case "nintendo":
      query = query.in("platform_id", ["switch", "switch-2"]);
      break;

    case "xbox":
      query = query.in("platform_id", ["xbox-one", "xbox-series"]);
      break;

    case "other":
      query = query.eq("platform_id", "other");
      break;
  }

  const term = search?.trim();

  if (term) {
    query = query.ilike("title", `%${term}%`);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Erro ao carregar ofertas: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    deals: (data ?? []).map(mapDeal),
    total,
    totalPages: Math.ceil(total / DEALS_PER_PAGE),
  };
}

// Busca uma oferta específica pelo UUID
export async function getDealById(id: string): Promise<Deal | null> {
  const { data, error } = await dealsQuery()
    .eq("id", id)
    .in("status", ["published", "expired"])
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao carregar oferta: ${error.message}`);
  }

  return data ? mapDeal(data) : null;
}
