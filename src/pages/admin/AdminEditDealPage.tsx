import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { DealForm } from "@/components/admin/DealForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDealForEdit } from "@/hooks/useAdminDealForm";

export default function AdminEditDealPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isPending, isError, refetch } = useAdminDealForEdit(id);

  if (!id) {
    return <p>Identificador da oferta não informado.</p>;
  }

  if (isPending) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-5 rounded-lg border border-border bg-card p-8">
        <h1 className="text-xl font-semibold">Não foi possível carregar a oferta</h1>

        <p className="text-sm text-muted-foreground">
          Verifique se a oferta existe e tente novamente.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="size-4" />
            Tentar novamente
          </Button>

          <Button variant="ghost">
            <Link to="/admin/ofertas">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <DealForm deal={data} />;
}
