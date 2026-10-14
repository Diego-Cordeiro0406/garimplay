import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdminStore,
  deleteAdminStore,
  getAdminStores,
  updateAdminStore,
} from "@/services/admin-stores";

import type { StoreFormValues } from "@/schemas/store.schema";

export function useAdminStores() {
  return useQuery({
    queryKey: ["admin", "stores"],
    queryFn: getAdminStores,
    staleTime: 60_000,
  });
}

function useInvalidateStores() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["admin", "stores"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["admin", "deal-form-options"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["admin", "deals"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["deals"],
      }),
    ]);
  };
}

export function useCreateAdminStore() {
  const invalidate = useInvalidateStores();

  return useMutation({
    mutationFn: createAdminStore,
    onSuccess: invalidate,
  });
}

export function useUpdateAdminStore() {
  const invalidate = useInvalidateStores();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: StoreFormValues }) =>
      updateAdminStore(id, values),
    onSuccess: invalidate,
  });
}

export function useDeleteAdminStore() {
  const invalidate = useInvalidateStores();

  return useMutation({
    mutationFn: deleteAdminStore,
    onSuccess: invalidate,
  });
}
