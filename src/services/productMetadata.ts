import { supabase } from "@/integrations/supabase/client";

export type ExtractedProduct = {
  url: string;
  store: "amazon" | "mercadolivre" | "kabum" | "shopee";
  title: string | null;
  imageUrl: string | null;
  price: number | null;
  originalPrice: number | null;
  platform: string | null;
  warnings: string[];
};

export async function extractProductMetadata(url: string): Promise<ExtractedProduct> {
  const { data, error } = await supabase.functions.invoke("extract-product-metadata", {
    body: { url },
  });

  if (error) {
    throw new Error("Não foi possível buscar as informações do produto.");
  }

  return data as ExtractedProduct;
}
