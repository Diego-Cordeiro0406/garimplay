import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { StoreFormValues } from "@/schemas/store.schema";

type StoreInsert = Database["public"]["Tables"]["stores"]["Insert"];

export type AdminStore = {
  id: string;
  name: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  createdAt: string;
  dealsCount: number;
};

function toPayload(values: StoreFormValues): StoreInsert {
  return {
    name: values.name.trim(),
    website_url: values.websiteUrl.trim() || null,
    logo_url: values.logoUrl.trim() || null,
  };
}

export async function getAdminStores(): Promise<AdminStore[]> {
  const { data, error } = await supabase
    .from("stores")
    .select(
      `
      id,
      name,
      website_url,
      logo_url,
      created_at,
      deals(count)
      `
    )
    .order("name", { ascending: true });

  if (error) throw error;

  return data.map((store) => ({
    id: store.id,
    name: store.name,
    websiteUrl: store.website_url,
    logoUrl: store.logo_url,
    createdAt: store.created_at,
    dealsCount: store.deals?.[0]?.count ?? 0,
  }));
}

export async function createAdminStore(values: StoreFormValues) {
  const { data, error } = await supabase
    .from("stores")
    .insert(toPayload(values))
    .select("id")
    .single();

  if (error) throw error;

  return data;
}

export async function updateAdminStore(id: string, values: StoreFormValues) {
  const { data, error } = await supabase
    .from("stores")
    .update(toPayload(values))
    .eq("id", id)
    .select("id")
    .single();

  if (error) throw error;

  return data;
}

export async function deleteAdminStore(id: string) {
  // Verificação adicional no servidor, antes da exclusão.
  const { count, error: countError } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("store_id", id);

  if (countError) throw countError;

  if (count === null) {
    throw new Error("Não foi possível verificar as ofertas vinculadas.");
  }

  if (count > 0) {
    throw new Error("Esta loja possui ofertas vinculadas e não pode ser excluída.");
  }

  const { data, error } = await supabase.from("stores").delete().eq("id", id).select("id").single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Esta loja possui ofertas vinculadas e não pode ser excluída.");
    }

    throw error;
  }

  return data;
}
