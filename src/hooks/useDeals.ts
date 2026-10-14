import { useQuery } from "@tanstack/react-query";

import { getDealById, getPublishedDeals, type PlatformFilter } from "@/services/deals";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function usePublishedDeals(page: number, platform: PlatformFilter, search = "") {
  return useQuery({
    queryKey: ["deals", "published", platform, page, search],
    queryFn: () => getPublishedDeals({ page, platform, search }),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

export function useDeal(id: string | undefined) {
  const isValidId = Boolean(id && UUID_REGEX.test(id));
  return useQuery({
    queryKey: ["deals", "detail", id],
    queryFn: () => getDealById(id!),
    enabled: isValidId,
    staleTime: 1000 * 60 * 2,
    retry: false,
  });
}
