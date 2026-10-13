import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteAdminDeal,
  getAdminDeals,
  updateAdminDealStatus,
  type AdminDealsFilters,
} from "@/services/admin-deals";
import type { DealStatus } from "@/types/deal";

export function useAdminDeals(filters: AdminDealsFilters) {
  return useQuery({
    queryKey: ["admin", "deals", filters],
    queryFn: () => getAdminDeals(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

function useInvalidateDeals() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["admin", "deals"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["admin", "dashboard"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["deals"],
      }),
    ]);
  };
}

export function useUpdateAdminDealStatus() {
  const invalidateDeals = useInvalidateDeals();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DealStatus }) =>
      updateAdminDealStatus(id, status),
    onSuccess: invalidateDeals,
  });
}

export function useDeleteAdminDeal() {
  const invalidateDeals = useInvalidateDeals();

  return useMutation({
    mutationFn: deleteAdminDeal,
    onSuccess: invalidateDeals,
  });
}
