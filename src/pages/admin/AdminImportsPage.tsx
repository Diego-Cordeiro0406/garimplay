import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getImports, importSource, reviewImport } from "@/services/admin-imports";
import type { ImportStatus } from "@/types/imported-offer";

const statuses = {
  pending: "Pendentes",
  discarded: "Descartadas",
  imported: "Convertidas",
} as const;
const formats: Record<string, string> = {
  physical_confirmed: "Física indicada no título",
  physical_likely: "Provável embalagem física",
  uncertain: "Formato incerto",
};
export default function AdminImportsPage() {
  const [status, setStatus] = useState<ImportStatus>("pending");
  const [page, setPage] = useState(1);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "imports", status, page],
    queryFn: () => getImports(status, page),
  });
  const review = useMutation({
    mutationFn: ({ id, next }: { id: string; next: "pending" | "discarded" }) =>
      reviewImport(id, next),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin", "imports"] });
    },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importações</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Confira preço, edição e condições antes de criar um rascunho.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(statuses).map(([value, label]) => (
          <Button
            key={value}
            variant={status === value ? "default" : "outline"}
            onClick={() => {
              setStatus(value as ImportStatus);
              setPage(1);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {query.isPending && <p>Carregando importações...</p>}
      {query.isError && (
        <div role="alert">
          <p>Não foi possível carregar as importações.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}
      {review.isError && (
        <p role="alert" className="text-destructive">
          Não foi possível atualizar a revisão.
        </p>
      )}
      {query.data?.rows.length === 0 && (
        <p className="rounded-lg border p-6 text-muted-foreground">
          Nenhuma importação nesta página.
        </p>
      )}
      <div className="space-y-4">
        {query.data?.rows.map((row) => {
          const offer = importSource(row.source_data);
          return (
            <article key={row.id} className="rounded-lg border bg-card p-5 space-y-3">
              <h2 className="font-semibold">{offer.title}</h2>
              <p className="text-sm">
                {offer.store?.name ?? "Loja não identificada"} ·{" "}
                {offer.price_cents === null
                  ? "Preço não informado"
                  : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      offer.price_cents / 100
                    )}
              </p>
              <p className="text-sm text-muted-foreground">
                {formats[offer.physical_media] ?? "Formato para revisão"} ·{" "}
                {offer.verification?.result === "boxed_code_in_store"
                  ? "Código em caixa declarado na loja"
                  : offer.verification?.result === "physical_explicit_in_store"
                    ? "Mídia física declarada na loja"
                    : "Confira o formato na loja"}
              </p>
              <p className="text-xs text-muted-foreground">
                Coletada em {new Date(row.source_collected_at).toLocaleString("pt-BR")} ·{" "}
                {offer.found_by_queries.join(", ")}
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                {offer.source_url && (
                  <a
                    className="underline"
                    href={offer.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver no Pelando
                  </a>
                )}
                {offer.product_url && (
                  <a
                    className="underline"
                    href={offer.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver na loja
                  </a>
                )}
                {row.review_status === "pending" && (
                  <Link className="underline" to={`/admin/importacoes/${row.id}`}>
                    Revisar e criar rascunho
                  </Link>
                )}
                {row.review_status === "imported" &&
                  (row.deal_id ? (
                    <Link className="underline" to={`/admin/ofertas/${row.deal_id}/editar`}>
                      Editar oferta criada
                    </Link>
                  ) : (
                    <span>Oferta criada foi removida.</span>
                  ))}
              </div>
              {offer.verification && (
                <details className="text-sm">
                  <summary className="cursor-pointer">Evidências e limitações</summary>
                  {offer.verification.evidence.map((e, i) => (
                    <p key={i} className="mt-2">
                      {e.excerpt}
                    </p>
                  ))}
                  {offer.verification.errors.map((error, i) => (
                    <p key={i} className="mt-2 text-muted-foreground">
                      {error}
                    </p>
                  ))}
                  {!offer.verification.evidence.length && (
                    <p className="mt-2">Sem evidência suficiente para confirmar o formato.</p>
                  )}
                </details>
              )}
              {row.review_status !== "imported" && (
                <Button
                  variant="outline"
                  disabled={review.isPending}
                  onClick={() =>
                    review.mutate({
                      id: row.id,
                      next: status === "discarded" ? "pending" : "discarded",
                    })
                  }
                >
                  {status === "discarded" ? "Restaurar" : "Descartar"}
                </Button>
              )}
            </article>
          );
        })}
      </div>
      {query.data && (
        <div className="flex items-center gap-4">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span>
            Página {page} · {query.data.total} importações
          </span>
          <Button
            variant="outline"
            disabled={page * 20 >= query.data.total}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
