import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdminDeal,
  getAdminDealForEdit,
  getDealFormOptions,
  updateAdminDeal,
} from "@/services/admin-deal-form";

import type { DealFormValues } from "@/schemas/deal.schema";

export type SaveAdminDealInput = {
  values: DealFormValues;
  image: File | null;
};

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

export function useSaveAdminDeal(id?: string, importId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ values, image }: SaveAdminDealInput) =>
      id ? updateAdminDeal(id, values, image) : createAdminDeal(values, image, importId),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "imports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "import"] }),
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

      if (id) {
        await queryClient.invalidateQueries({
          queryKey: ["admin", "deal-edit", id],
        });
      }
    },
  });
}
