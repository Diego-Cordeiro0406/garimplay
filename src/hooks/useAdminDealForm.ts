import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdminDeal,
  getAdminDealForEdit,
  getDealFormOptions,
  updateAdminDeal,
} from "@/services/admin-deal-form";
import type { DealFormValues } from "@/schemas/deal.schema";

export function useDealFormOptions() {
  return useQuery({
    queryKey: ["admin", "deal-form-options"],
    queryFn: getDealFormOptions,
    staleTime: 5 * 60_000,
  });
}

export function useAdminDealForEdit(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "deal-edit", id],
    queryFn: () => getAdminDealForEdit(id!),
    enabled: Boolean(id),
  });
}

export function useSaveAdminDeal(id?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: DealFormValues) =>
      id ? updateAdminDeal(id, values) : createAdminDeal(values),

    onSuccess: async () => {
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
    },
  });
}
