import { Search, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DealCard } from "@/components/deals/DealCard";
import { usePublishedDeals } from "@/hooks/useDeals";
import { useHomeScrollRestoration } from "@/hooks/useHomeScrollRestoration";
import type { PlatformFilter } from "@/services/deals";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { PageSEO } from "@/components/PageSEO";

const platforms = [
  { id: "all", label: "Todas" },
  { id: "playstation", label: "PlayStation" },
  { id: "nintendo", label: "Nintendo" },
  { id: "xbox", label: "Xbox" },
  { id: "other", label: "Outras" },
] as const;

function getPlatform(value: string | null): PlatformFilter {
  const valid = platforms.find((item) => item.id === value);
  return valid?.id ?? "all";
}

function getPage(value: string | null): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;

  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const searchOpen = searchParams.get("search") === "open" || Boolean(search);
  const [searchInput, setSearchInput] = useState(search);
  const offersRef = useRef<HTMLDivElement>(null);

  const page = getPage(searchParams.get("page"));
  const selectedPlatform = getPlatform(searchParams.get("platform"));

  const { data, isPending, isError, isSuccess, refetch } = usePublishedDeals(
    page,
    selectedPlatform,
    search
  );

  useHomeScrollRestoration(isSuccess);

  const deals = data?.deals ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      searchRef.current?.focus();
    }
  }, [searchOpen]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchInput.trim();

    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);

      next.delete("search");
      next.delete("page");

      if (query) {
        next.set("q", query);
      } else {
        next.delete("q");
      }

      return next;
    });
  }

  function handlePlatformChange(platform: PlatformFilter) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);

      next.delete("page");

      if (platform === "all") {
        next.delete("platform");
      } else {
        next.set("platform", platform);
      }

      return next;
    });
  }

  function handlePageChange(nextPage: number) {
    if (nextPage === page) return;

    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);

        if (nextPage === 1) {
          next.delete("page");
        } else {
          next.set("page", String(nextPage));
        }

        return next;
      },
      { preventScrollReset: true }
    );

    requestAnimationFrame(() => {
      offersRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleCloseSearch() {
    setSearchInput("");

    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);

      next.delete("search");
      next.delete("q");
      next.delete("page");

      return next;
    });
  }

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (item) => item === 1 || item === totalPages || Math.abs(item - page) <= 1
  );

  return (
    <section className="space-y-8">
      <PageSEO
        title="Promoções de jogos em mídia física"
        description="Encontre ofertas de jogos físicos para PlayStation, Nintendo e Xbox. Garimpe bons preços para aumentar sua coleção."
        canonical="/"
      />
      <div className="max-w-3xl space-y-2 sm:space-y-3">
        <div className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />

          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:text-xs">
            Ofertas de jogos físicos
          </p>
        </div>

        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
          <span className="text-foreground">Mais jogos.</span>{" "}
          <span className="text-primary">Menos gastos.</span>
        </h1>

        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Garimpe ofertas para aumentar sua coleção sem pesar no bolso.
        </p>
      </div>

      <Separator />

      <div ref={offersRef} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Ofertas</h2>

          <Button variant="outline" size="sm" disabled>
            <SlidersHorizontal className="size-4" />
            Filtros
          </Button>
        </div>

        {searchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center"
          >
            <div className="flex w-full min-w-0 items-center gap-2 sm:flex-1">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />

                <Input
                  ref={searchRef}
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar jogos..."
                  aria-label="Buscar jogos"
                  className="w-full pl-9 h-9"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                aria-label="Fechar pesquisa"
                title="Fechar pesquisa"
                onClick={handleCloseSearch}
              >
                <X className="size-4" />
              </Button>
            </div>

            <Button type="submit" size="sm" className="h-9 w-full sm:w-20">
              Buscar
            </Button>
          </form>
        )}

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
                onClick={() => handlePlatformChange(platform.id)}
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
        ) : deals.length === 0 ? (
          <div className="rounded-md border border-border bg-card px-6 py-12 text-center">
            <h2 className="font-semibold">
              {search ? "Nenhum jogo encontrado" : "Nenhuma oferta encontrada"}
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              {search
                ? `Não encontramos ofertas para "${search}". Tente pesquisar outro título.`
                : "Ainda não temos promoções disponíveis para esta plataforma."}
            </p>

            {total > 0 && (
              <Button variant="outline" className="mt-4" onClick={() => handlePageChange(1)}>
                Primeira página
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Página {page} de {totalPages} · {total} {total === 1 ? "oferta" : "ofertas"}
            </p>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={page === 1}
                      tabIndex={page === 1 ? -1 : undefined}
                      className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      onClick={(event) => {
                        event.preventDefault();

                        if (page > 1) {
                          handlePageChange(page - 1);
                        }
                      }}
                    />
                  </PaginationItem>

                  {visiblePages.map((item, index) => (
                    <Fragment key={item}>
                      {index > 0 && item - visiblePages[index - 1] > 1 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          isActive={item === page}
                          aria-label={`Ir para a página ${item}`}
                          onClick={(event) => {
                            event.preventDefault();
                            handlePageChange(item);
                          }}
                        >
                          {item}
                        </PaginationLink>
                      </PaginationItem>
                    </Fragment>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={page === totalPages}
                      tabIndex={page === totalPages ? -1 : undefined}
                      className={
                        page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                      }
                      onClick={(event) => {
                        event.preventDefault();

                        if (page < totalPages) {
                          handlePageChange(page + 1);
                        }
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </section>
  );
}
