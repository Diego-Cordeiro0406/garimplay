import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { parsePriceToCents, type DealFormValues } from "@/schemas/deal.schema";

type DealInsert = Database["public"]["Tables"]["deals"]["Insert"];

export type DealOption = {
  id: string;
  name: string;
};

export async function getDealFormOptions() {
  const [storesResult, platformsResult] = await Promise.all([
    supabase.from("stores").select("id, name").order("name"),
    supabase.from("platforms").select("id, name").order("name"),
  ]);

  if (storesResult.error) throw storesResult.error;
  if (platformsResult.error) throw platformsResult.error;

  return {
    stores: storesResult.data as DealOption[],
    platforms: platformsResult.data as DealOption[],
  };
}

export async function getAdminDealForEdit(id: string) {
  const { data, error } = await supabase.from("deals").select("*").eq("id", id).single();

  if (error) throw error;

  return data;
}

function toPayload(values: DealFormValues): DealInsert {
  const priceCents = parsePriceToCents(values.price);

  if (priceCents === null) {
    throw new Error("Preço inválido.");
  }

  const originalPriceCents = values.originalPrice ? parsePriceToCents(values.originalPrice) : null;

  const nullable = (value: string) => value.trim() || null;

  return {
    title: values.title.trim(),
    description: nullable(values.description),
    image_url: nullable(values.imageUrl),
    platform_id: values.platformId,
    store_id: values.storeId,
    price_cents: priceCents,
    original_price_cents: originalPriceCents,
    deal_url: values.dealUrl.trim(),
    coupon_code: nullable(values.couponCode),
    payment_conditions: nullable(values.paymentConditions),
    rules: nullable(values.rules),
    expires_at: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
    status: values.status,
  };
}

export async function createAdminDeal(values: DealFormValues) {
  const payload = toPayload(values);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Sessão administrativa inválida.");
  }

  const { data, error } = await supabase
    .from("deals")
    .insert({
      ...payload,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw error;

  return data;
}

export async function updateAdminDeal(id: string, values: DealFormValues) {
  const { data, error } = await supabase
    .from("deals")
    .update(toPayload(values))
    .eq("id", id)
    .select("id")
    .single();

  if (error) throw error;

  return data;
}
