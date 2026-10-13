import { supabase } from "@/integrations/supabase/client";

export type AdminDealStatus = "draft" | "published" | "expired";

export type RecentAdminDeal = {
  id: string;
  title: string;
  status: AdminDealStatus;
  priceCents: number;
  createdAt: string;
  storeName: string;
};

export type AdminDashboardData = {
  total: number;
  published: number;
  drafts: number;
  expired: number;
  recentDeals: RecentAdminDeal[];
};

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const [totalResult, publishedResult, draftsResult, expiredResult, recentResult] =
    await Promise.all([
      supabase.from("deals").select("id", { count: "exact", head: true }),
      supabase.from("deals").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("deals").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("deals").select("id", { count: "exact", head: true }).eq("status", "expired"),
      supabase
        .from("deals")
        .select(
          `
          id,
          title,
          status,
          price_cents,
          created_at,
          store:stores!deals_store_id_fkey(name)
        `
        )
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const results = [totalResult, publishedResult, draftsResult, expiredResult, recentResult];

  const failed = results.find((result) => result.error);

  if (failed?.error) {
    throw new Error(`Erro ao carregar painel: ${failed.error.message}`);
  }

  return {
    total: totalResult.count ?? 0,
    published: publishedResult.count ?? 0,
    drafts: draftsResult.count ?? 0,
    expired: expiredResult.count ?? 0,
    recentDeals: (recentResult.data ?? []).map((deal) => ({
      id: deal.id,
      title: deal.title,
      status: deal.status as AdminDealStatus,
      priceCents: deal.price_cents,
      createdAt: deal.created_at,
      storeName: deal.store.name,
    })),
  };
}
