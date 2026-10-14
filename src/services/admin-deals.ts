import { supabase } from "@/integrations/supabase/client";
import type { DealPlatform, DealStatus } from "@/types/deal";
import type { Database } from "@/integrations/supabase/types";
import { deleteDealImage, getDealImageKey } from "./deal-images";

type DealRow = Database["public"]["Tables"]["deals"]["Row"];

type AdminDealRecord = Pick<
  DealRow,
  | "id"
  | "title"
  | "price_cents"
  | "original_price_cents"
  | "status"
  | "platform_id"
  | "store_id"
  | "created_at"
> & {
  store: {
    id: string;
    name: string;
  };
  platform: {
    id: string;
    name: string;
  };
};

export const ADMIN_DEALS_PAGE_SIZE = 10;

const ADMIN_DEAL_SELECT = `
  id,
  title,
  price_cents,
  original_price_cents,
  status,
  platform_id,
  store_id,
  created_at,
  store:stores!deals_store_id_fkey (
    id,
    name
  ),
  platform:platforms!deals_platform_id_fkey (
    id,
    name
  )
` as const;

export type AdminDeal = {
  id: string;
  title: string;
  price: number;
  originalPrice: number | null;
  status: DealStatus;
  platformId: DealPlatform;
  platformName: string;
  storeId: string;
  storeName: string;
  createdAt: string;
};

export type AdminDealsFilters = {
  search: string;
  status: DealStatus | "all";
  platform: DealPlatform | "all";
  page: number;
};

export type AdminDealsResult = {
  deals: AdminDeal[];
  count: number;
  totalPages: number;
};

function mapAdminDeal(record: AdminDealRecord): AdminDeal {
  return {
    id: record.id,
    title: record.title,
    price: record.price_cents,
    originalPrice: record.original_price_cents,
    status: record.status as DealStatus,
    platformId: record.platform_id as DealPlatform,
    platformName: record.platform.name,
    storeId: record.store_id,
    storeName: record.store.name,
    createdAt: record.created_at,
  };
}

export async function getAdminDeals(filters: AdminDealsFilters): Promise<AdminDealsResult> {
  const page = Math.max(1, Math.floor(filters.page));
  const from = (page - 1) * ADMIN_DEALS_PAGE_SIZE;
  const to = from + ADMIN_DEALS_PAGE_SIZE - 1;

  let query = supabase.from("deals").select(ADMIN_DEAL_SELECT, { count: "exact" });

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.platform !== "all") {
    query = query.eq("platform_id", filters.platform);
  }

  const search = filters.search.trim();

  if (search) {
    // Escapa caracteres especiais do padrão ILIKE.
    const escapedSearch = search.replace(/[\\%_]/g, "\\$&");

    query = query.ilike("title", `%${escapedSearch}%`);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Erro ao consultar ofertas: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    deals: (data ?? []).map(mapAdminDeal),
    count: total,
    totalPages: Math.ceil(total / ADMIN_DEALS_PAGE_SIZE),
  };
}

export async function updateAdminDealStatus(id: string, status: DealStatus): Promise<void> {
  const { data, error } = await supabase
    .from("deals")
    .update({ status })
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar status: ${error.message}`);
  }

  if (!data) {
    throw new Error("Oferta não encontrada.");
  }
}

export async function deleteAdminDeal(id: string) {
  const { data: deal, error: fetchError } = await supabase
    .from("deals")
    .select("id, image_url")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const { error: deleteError } = await supabase
    .from("deals")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  if (deleteError) throw deleteError;

  const imageKey = getDealImageKey(deal.image_url);

  if (imageKey) {
    try {
      await deleteDealImage(imageKey);
    } catch (error) {
      console.warn("Oferta excluída, mas não foi possível remover sua capa do R2:", error);
    }
  }

  return { id };
}
