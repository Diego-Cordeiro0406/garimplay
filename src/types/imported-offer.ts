import type { Json } from "@/integrations/supabase/types";

export type ImportStatus = "pending" | "discarded" | "imported";
export type ImportedOffer = {
  id: string;
  source: string;
  external_id: string;
  source_data: Json;
  source_collected_at: string;
  received_at: string;
  updated_at: string;
  review_status: ImportStatus;
  deal_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
};
