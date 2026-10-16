import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { parsePriceToCents, type DealFormValues } from "@/schemas/deal.schema";
import { deleteDealImage, getDealImageKey, uploadDealImage } from "./deal-images";

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
    coupon_code: values.couponUrl.trim() ? null : nullable(values.couponCode),

    coupon_url: nullable(values.couponUrl),
    payment_conditions: nullable(values.paymentConditions),
    rules: nullable(values.rules),
    expires_at: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
    status: values.status,
  };
}

export async function createAdminDeal(
  values: DealFormValues,
  image: File | null = null,
  importId?: string
) {
  const payload = toPayload(values);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Sessão administrativa inválida.");
  }

  if (image) {
    const uploaded = await uploadDealImage(image);
    payload.image_url = uploaded.publicUrl;
  }

  if (importId) {
    const { data, error } = await supabase.rpc("convert_imported_offer", {
      p_id: importId,
      p_values: { ...payload, status: "draft" } as Json,
    });
    if (error) throw error;
    return { id: data };
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

export async function updateAdminDeal(
  id: string,
  values: DealFormValues,
  image: File | null = null
) {
  const payload = toPayload(values);

  let previousImageUrl: string | null = null;

  if (image) {
    // Recupera a capa atual antes da substituição.
    const { data: currentDeal, error: currentError } = await supabase
      .from("deals")
      .select("image_url")
      .eq("id", id)
      .single();

    if (currentError) {
      throw currentError;
    }

    previousImageUrl = currentDeal.image_url;

    // Envia a nova capa ao R2.
    const uploaded = await uploadDealImage(image);
    payload.image_url = uploaded.publicUrl;
  }

  // Atualiza os dados da oferta.
  const { data, error } = await supabase
    .from("deals")
    .update(payload)
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  // A nova capa já está salva no banco.
  // A exclusão da anterior é uma operação secundária.
  if (image && previousImageUrl) {
    const oldKey = getDealImageKey(previousImageUrl);

    if (oldKey) {
      try {
        await deleteDealImage(oldKey);
      } catch (cleanupError) {
        console.warn(
          "Oferta atualizada, mas não foi possível excluir a capa anterior:",
          cleanupError
        );
      }
    }
  }

  return data;
}
