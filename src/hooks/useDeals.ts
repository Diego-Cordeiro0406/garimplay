
import { useQuery } from "@tanstack/react-query";

import {
  getDealById,
  getPublishedDeals,
} from "@/services/deals";


const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


export function usePublishedDeals() {
  return useQuery({
    queryKey: ["deals", "published"],
    queryFn: getPublishedDeals,
    staleTime: 1000 * 60 * 2,
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
