import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getImport, importSource } from "@/services/admin-imports";
import { useDealFormOptions } from "@/hooks/useAdminDealForm";
import { defaultDealFormValues } from "@/schemas/deal.schema";
import { centsToInput } from "@/lib/formatters";
import { DealForm } from "@/components/admin/DealForm";
import { Button } from "@/components/ui/button";

const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export default function AdminImportReviewPage() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["admin", "import", id],
    queryFn: () => getImport(id!),
    enabled: Boolean(id),
  });
  const options = useDealFormOptions();
  const initialValues = useMemo(() => {
    if (!query.data || !options.data) return null;
    const source = importSource(query.data.source_data);
    const stores = options.data.stores.filter(
      (store) => normalized(store.name) === normalized(source.store?.name ?? "")
    );
    const platform =
      source.platform_suggestions.length === 1
        ? options.data.platforms.find((p) => p.id === source.platform_suggestions[0])
        : undefined;
    return {
      ...defaultDealFormValues,
      title: source.title,
      imageUrl: source.image_url ?? "",
      price: centsToInput(source.price_cents),
      dealUrl: source.product_url ?? "",
      storeId: stores.length === 1 ? stores[0].id : "",
      platformId: platform?.id ?? "",
    };
  }, [query.data, options.data]);
  if (query.isPending || options.isPending) return <p>Carregando importação...</p>;
  if (query.isError || options.isError || !query.data || !initialValues)
    return (
      <div role="alert">
        <p>Não foi possível carregar a importação.</p>
        <Button
          variant="outline"
          onClick={() => {
            void query.refetch();
            void options.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  if (query.data.review_status !== "pending")
    return (
      <div className="space-y-3">
        <p>
          Esta importação já foi revisada. Abra a lista para restaurá-la ou acessar a oferta criada.
        </p>
        <Link className="underline" to="/admin/importacoes">
          Voltar às importações
        </Link>
      </div>
    );
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5 text-sm space-y-2">
        <p>Revise o formato físico, edição, preço e condições. O salvamento cria um rascunho.</p>
        <p>
          Confira ou substitua o link da loja pelo seu link de afiliado. Os dados recebidos não
          comprovam preço ou disponibilidade atual.
        </p>
        <Link className="underline" to="/admin/importacoes">
          Voltar às importações
        </Link>
      </div>
      <DealForm key={id} importId={id} initialValues={initialValues} />
    </div>
  );
}
