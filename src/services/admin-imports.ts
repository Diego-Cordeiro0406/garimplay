import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { ImportStatus } from "@/types/imported-offer";

const https = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
});
const sourceSchema = z.object({
  title: z.string().catch("Oferta sem título"),
  price_cents: z.number().int().nonnegative().nullable().catch(null),
  source_url: https.nullable().catch(null),
  product_url: https.nullable().catch(null),
  image_url: https.nullable().catch(null),
  store: z.object({ name: z.string() }).nullable().catch(null),
  platform_suggestions: z.array(z.string()).catch([]),
  physical_media: z.string().catch("uncertain"),
  found_by_queries: z.array(z.string()).catch([]),
  approved_at: z.string().nullable().catch(null),
  verification: z
    .object({
      result: z.string().catch("unverified"),
      checked_at: z.string().catch(""),
      evidence: z
        .array(z.object({ excerpt: z.string(), section: z.string().optional() }))
        .catch([]),
      errors: z.array(z.string()).catch([]),
    })
    .nullable()
    .catch(null),
});
export function importSource(value: unknown) {
  return sourceSchema.parse(value ?? {});
}

export async function getImports(status: ImportStatus, page: number) {
  const start = (page - 1) * 20;
  const { data, error, count } = await supabase
    .from("imported_offers")
    .select("*", { count: "exact" })
    .eq("review_status", status)
    .order("received_at", { ascending: false })
    .order("id")
    .range(start, start + 19);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}
export async function getImport(id: string) {
  const { data, error } = await supabase.from("imported_offers").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}
export async function reviewImport(id: string, status: "pending" | "discarded") {
  const { error } = await supabase.rpc("review_imported_offer", { p_id: id, p_status: status });
  if (error) throw error;
}

export async function verifyImport(id: string) {
  const { data, error } = await supabase.functions.invoke<{ error?: string; cached?: boolean }>(
    "verify-imported-offer",
    { body: { id } }
  );
  if (error || data?.error)
    throw new Error(data?.error ?? "Não foi possível verificar agora. Tente novamente mais tarde.");
  return data;
}
