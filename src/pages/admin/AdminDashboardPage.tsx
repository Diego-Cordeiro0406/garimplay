import { Link } from "react-router-dom";
import { Clock3, FilePenLine, Plus, RefreshCw, Tags, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { formatPrice } from "@/lib/deals";
import type { AdminDealStatus } from "@/services/admin-dashboard";

const statusLabels: Record<AdminDealStatus, string> = {
  published: "Publicada",
  draft: "Rascunho",
  expired: "Expirada",
};

const statusStyles: Record<AdminDealStatus, string> = {
  published: "bg-primary/10 text-primary",
  draft: "bg-secondary text-muted-foreground",
  expired: "bg-destructive/10 text-destructive",
};

export default function AdminDashboardPage() {
  const { data, isPending, isError, refetch } = useAdminDashboard();

  const stats = [
    {
      label: "Total de ofertas",
      value: data?.total,
      icon: Tags,
    },
    {
      label: "Publicadas",
      value: data?.published,
      icon: Tags,
    },
    {
      label: "Rascunhos",
      value: data?.drafts,
      icon: FilePenLine,
    },
    {
      label: "Expiradas",
      value: data?.expired,
      icon: XCircle,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Administração
          </p>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Visão geral</h1>

          <p className="text-sm text-muted-foreground">
            Acompanhe as ofertas cadastradas no Garimplay.
          </p>
        </div>

        <Button nativeButton={false} className="h-10" render={<Link to="/admin/ofertas/nova" />}>
          <Plus className="size-4" />
          Nova oferta
        </Button>
      </div>

      {isError ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="font-semibold">Não foi possível carregar o painel</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>

          <Button variant="outline" className="mt-5" onClick={() => void refetch()}>
            <RefreshCw className="size-4" />
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>

                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                </div>

                {isPending ? (
                  <Skeleton className="mt-5 h-9 w-16" />
                ) : (
                  <p className="mt-4 text-3xl font-semibold tabular-nums">{value ?? 0}</p>
                )}
              </div>
            ))}
          </div>

          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <div className="space-y-1">
                <h2 className="font-semibold">Ofertas recentes</h2>

                <p className="text-xs text-muted-foreground">Últimas cinco ofertas cadastradas</p>
              </div>

              <Button
                nativeButton={false}
                variant="outline"
                className="w-28"
                render={<Link to="/admin/ofertas" />}
              >
                Ver todas
              </Button>
            </div>

            {isPending ? (
              <div className="space-y-4 p-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : data?.recentDeals.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
                <Tags className="size-9 text-muted-foreground" />

                <p className="font-medium">Nenhuma oferta cadastrada</p>

                <p className="text-sm text-muted-foreground">
                  As ofertas aparecerão aqui quando forem adicionadas.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data?.recentDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-5"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium">{deal.title}</p>

                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" />
                        {new Date(deal.createdAt).toLocaleDateString("pt-BR")}
                        <span aria-hidden="true">·</span>
                        {deal.storeName}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${statusStyles[deal.status]}`}
                      >
                        {statusLabels[deal.status]}
                      </span>

                      <span className="min-w-22 text-right text-sm font-semibold tabular-nums">
                        {formatPrice(deal.priceCents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
