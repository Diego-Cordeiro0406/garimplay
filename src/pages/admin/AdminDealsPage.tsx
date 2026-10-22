import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDeals, useDeleteAdminDeal, useUpdateAdminDealStatus } from "@/hooks/useAdminDeals";
import { DealPublicationDialog } from "@/components/admin/DealPublicationDialog";
import { formatPrice } from "@/lib/deals";
import { ADMIN_DEALS_PAGE_SIZE, type AdminDeal } from "@/services/admin-deals";
import type { DealPlatform, DealStatus } from "@/types/deal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusOptions: {
  value: DealStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "Todos os status" },
  { value: "published", label: "Publicadas" },
  { value: "draft", label: "Rascunhos" },
  { value: "expired", label: "Expiradas" },
];

const platformOptions: {
  value: DealPlatform | "all";
  label: string;
}[] = [
  { value: "all", label: "Todas as plataformas" },
  { value: "ps4", label: "PlayStation 4" },
  { value: "ps5", label: "PlayStation 5" },
  { value: "switch", label: "Nintendo Switch" },
  { value: "switch-2", label: "Nintendo Switch 2" },
  { value: "xbox-one", label: "Xbox One" },
  { value: "xbox-series", label: "Xbox Series X|S" },
  { value: "other", label: "Outras" },
];

const statusLabels: Record<DealStatus, string> = {
  published: "Publicada",
  draft: "Rascunho",
  expired: "Expirada",
};

const statusStyles: Record<DealStatus, string> = {
  published: "bg-primary/10 text-primary",
  draft: "bg-secondary text-muted-foreground",
  expired: "bg-destructive/10 text-destructive",
};

function DealRow({
  deal,
  onChangeStatus,
  onDelete,
  onGenerate,
  busy,
}: {
  deal: AdminDeal;
  onChangeStatus: (deal: AdminDeal, status: DealStatus) => void;
  onDelete: (deal: AdminDeal) => void;
  onGenerate: (deal: AdminDeal) => void;
  busy: boolean;
}) {
  return (
    <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium">{deal.title}</p>
        <p className="text-xs text-muted-foreground">
          {deal.platformName} · {deal.storeName}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(deal.createdAt).toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 lg:block">
        <span className="text-xs text-muted-foreground lg:hidden">Preço</span>
        <div>
          <p className="text-sm font-semibold tabular-nums">{formatPrice(deal.price)}</p>
          {deal.originalPrice != null && (
            <p className="text-xs text-muted-foreground line-through">
              {formatPrice(deal.originalPrice)}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 lg:block">
        <span className="text-xs text-muted-foreground lg:hidden">Status</span>
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${statusStyles[deal.status]}`}
        >
          {statusLabels[deal.status]}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-evenly lg:justify-end">
        <Button
          nativeButton={false}
          variant="outline"
          className="w-28"
          render={<Link to={`/admin/ofertas/${deal.id}/editar`} />}
        >
          Editar
        </Button>

        {deal.status !== "published" ? (
          <Button size="sm" disabled={busy} onClick={() => onChangeStatus(deal, "published")}>
            Publicar
          </Button>
        ) : (
          <Button
            className="w-28"
            variant="outline"
            disabled={busy}
            onClick={() => onChangeStatus(deal, "expired")}
          >
            Expirar
          </Button>
        )}

        {deal.status === "published" && (
          <Button variant="outline" disabled={busy} onClick={() => onGenerate(deal)}>
            <ImageIcon className="size-4" /> Gerar arte
          </Button>
        )}

        <Button
          variant="ghost"
          disabled={busy}
          aria-label={`Excluir ${deal.title}`}
          title="Excluir oferta"
          onClick={() => onDelete(deal)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminDealsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DealStatus | "all">("all");
  const [platform, setPlatform] = useState<DealPlatform | "all">("all");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dealToDelete, setDealToDelete] = useState<AdminDeal | null>(null);
  const [publicationDealId, setPublicationDealId] = useState<string | null>(null);

  const { data, isPending, isFetching, isError, refetch } = useAdminDeals({
    search,
    status,
    platform,
    page,
  });

  const updateStatus = useUpdateAdminDealStatus();
  const deleteDeal = useDeleteAdminDeal();

  const busy = updateStatus.isPending || deleteDeal.isPending;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  async function handleChangeStatus(deal: AdminDeal, nextStatus: DealStatus) {
    const action = nextStatus === "published" ? "publicar" : "expirar";

    if (!window.confirm(`Deseja ${action} a oferta "${deal.title}"?`)) {
      return;
    }

    setActionError(null);

    try {
      await updateStatus.mutateAsync({
        id: deal.id,
        status: nextStatus,
      });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Não foi possível atualizar a oferta."
      );
    }
  }

  async function handleDelete() {
    if (!dealToDelete || deleteDeal.isPending) return;

    setActionError(null);

    try {
      await deleteDeal.mutateAsync(dealToDelete.id);

      setDealToDelete(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Não foi possível excluir a oferta.");
    }
  }

  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Administração
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ofertas</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as promoções cadastradas no Garimplay.
          </p>
        </div>

        <Button nativeButton={false} className="h-10" render={<Link to="/admin/ofertas/nova" />}>
          <Plus className="size-4" />
          Nova oferta
        </Button>
      </div>

      <section className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Pesquisar pelo título do jogo..."
            aria-label="Pesquisar ofertas"
            className="pl-9"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Select
            value={status}
            onValueChange={(value) => {
              if (!value) return;

              setStatus(value as DealStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-full sm:w-52" aria-label="Filtrar por status">
              <SelectValue>
                {statusOptions.find((option) => option.value === status)?.label}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={platform}
            onValueChange={(value) => {
              if (!value) return;

              setPlatform(value as DealPlatform | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-full sm:w-56" aria-label="Filtrar por plataforma">
              <SelectValue>
                {platformOptions.find((option) => option.value === platform)?.label}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {platformOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {actionError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {actionError}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-semibold">Ofertas cadastradas</h2>
            <p className="text-xs text-muted-foreground">
              {isPending ? "Carregando..." : `${data?.count ?? 0} oferta(s) encontrada(s)`}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Atualizar ofertas"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {isPending ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-18 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-10 text-center">
            <p className="font-medium">Não foi possível carregar as ofertas.</p>
            <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : data.deals.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium">Nenhuma oferta encontrada</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajuste os filtros ou cadastre uma nova oferta.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.deals.map((deal) => (
              <DealRow
                key={deal.id}
                deal={deal}
                busy={busy}
                onChangeStatus={(item, nextStatus) => void handleChangeStatus(item, nextStatus)}
                onGenerate={(deal) => setPublicationDealId(deal.id)}
                onDelete={(deal) => {
                  deleteDeal.reset();
                  setActionError(null);
                  setDealToDelete(deal);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPages} · {ADMIN_DEALS_PAGE_SIZE} ofertas por página
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Página anterior"
              disabled={page === 1 || isFetching}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              aria-label="Próxima página"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={dealToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteDeal.isPending) {
            setDealToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir oferta?</AlertDialogTitle>

            <AlertDialogDescription>
              Você está prestes a excluir permanentemente a oferta{" "}
              <span className="font-semibold text-foreground">{dealToDelete?.title}</span>.
              <span className="mt-3 block">
                Esta ação não poderá ser desfeita. A oferta será removida do Garimplay e deixará de
                aparecer na plataforma.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteDeal.isError && (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível excluir a oferta. Tente novamente.
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDeal.isPending}>Cancelar</AlertDialogCancel>

            <AlertDialogAction
              variant="destructive"
              disabled={deleteDeal.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleteDeal.isPending ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Excluir oferta
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DealPublicationDialog
        dealId={publicationDealId}
        onClose={() => setPublicationDealId(null)}
      />
    </div>
  );
}
