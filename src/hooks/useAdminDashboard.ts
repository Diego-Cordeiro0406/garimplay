import { useQuery } from "@tanstack/react-query";

import { getAdminDashboard } from "@/services/admin-dashboard";

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: getAdminDashboard,
    staleTime: 60_000,
  });
}
