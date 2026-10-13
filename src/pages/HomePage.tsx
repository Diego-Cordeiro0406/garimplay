import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DealCard } from "@/components/deals/DealCard";
import { usePublishedDeals } from "@/hooks/useDeals";

const platforms = [
  { id: "all", label: "Todas" },
  { id: "playstation", label: "PlayStation" },
  { id: "nintendo", label: "Nintendo" },
  { id: "xbox", label: "Xbox" },
  { id: "other", label: "Outras" },
] as const;

type Platform = (typeof platforms)[number]["id"];

export default function HomePage() {
  const { data: deals = [], isPending, isError, refetch } = usePublishedDeals();

  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("all");

  const filteredDeals = useMemo(() => {
    const publishedDeals = deals.filter((deal) => deal.status === "published");

    if (selectedPlatform === "all") {
      return publishedDeals;
    }

    return publishedDeals.filter((deal) => {
      switch (selectedPlatform) {
        case "playstation":
          return ["ps4", "ps5"].includes(deal.platform);

        case "nintendo":
          return ["switch", "switch-2"].includes(deal.platform);

        case "xbox":
          return ["xbox-one", "xbox-series"].includes(deal.platform);

        case "other":
          return deal.platform === "other";

        default:
          return true;
      }
    });
  }, [deals, selectedPlatform]);

  return (
    <section className="space-y-8">
      <div className="max-w-2xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Mídia física · Brasil
        </p>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Jogos bons. Preços melhores.
        </h1>

        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Promoções selecionadas para quem ainda gosta de ter o jogo na coleção.
        </p>
      </div>

      <Separator />

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Ofertas</h2>

          <Button variant="outline" size="sm" disabled>
            <SlidersHorizontal className="size-4" />
            Filtros
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar por plataforma">
          {platforms.map((platform) => {
            const isSelected = selectedPlatform === platform.id;

            return (
              <Button
                key={platform.id}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "outline"}
                aria-pressed={isSelected}
                className="shrink-0"
                onClick={() => setSelectedPlatform(platform.id)}
              >
                {platform.label}
              </Button>
            );
          })}
        </div>

        {isPending ? (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            aria-label="Carregando ofertas"
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-md border border-border bg-card">
                <div className="h-32 animate-pulse bg-secondary sm:aspect-4/5 sm:h-auto" />

                <div className="space-y-3 p-4">
                  <div className="h-3 w-24 animate-pulse rounded bg-secondary" />
                  <div className="h-5 w-full animate-pulse rounded bg-secondary" />
                  <div className="h-5 w-3/4 animate-pulse rounded bg-secondary" />
                  <div className="mt-6 h-8 w-28 animate-pulse rounded bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-md border border-border bg-card px-6 py-12 text-center">
            <h2 className="font-semibold">Não foi possível carregar as ofertas</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Ocorreu um problema ao consultar as promoções.
            </p>

            <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="rounded-md border border-border bg-card px-6 py-12 text-center">
            <h2 className="font-semibold">Nenhuma oferta encontrada</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Ainda não temos promoções disponíveis para esta plataforma.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
