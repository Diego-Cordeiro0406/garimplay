import { Eye, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { calculateDiscount, formatPrice, PLATFORM_LABELS } from "@/lib/deals";
import type { Deal } from "@/types/deal";
import { useDealExpiration } from "@/hooks/useDealExpiration";

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  const discount = calculateDiscount(deal.price, deal.originalPrice);

  const isExpired = useDealExpiration(deal);

  return (
    <article
      className="
        group flex h-full min-w-0
        flex-row overflow-hidden rounded-md
        border border-border bg-card
        transition-colors hover:border-muted-foreground/50
        sm:flex-col
      "
    >
      {/* Imagem do jogo */}
      <Link
        to={`/ofertas/${deal.id}`}
        aria-label={`Ver detalhes da oferta: ${deal.title}`}
        className="
          relative flex w-28 shrink-0
          items-center justify-center
          overflow-hidden bg-secondary p-2
          focus-visible:outline-2
          focus-visible:-outline-offset-2
          focus-visible:outline-ring
          sm:aspect-4/5 sm:w-full sm:p-4
        "
      >
        {deal.imageUrl ? (
          <img
            src={deal.imageUrl}
            alt={`Capa do jogo ${deal.title}`}
            loading="lazy"
            decoding="async"
            className="
              h-auto max-h-40 w-full object-contain
              transition-transform duration-200
              group-hover:scale-[1.025]
              sm:size-full sm:max-h-none
            "
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Gamepad2 className="size-10 sm:size-12" strokeWidth={1.25} />
          </div>
        )}

        {isExpired && (
          <span
            className="
              absolute inset-x-0 bottom-0
              bg-background/90 px-2 py-2
              text-center text-[10px]
              font-medium text-foreground
              sm:px-3 sm:text-xs
            "
          >
            Oferta expirada
          </span>
        )}
      </Link>

      {/* Informações da oferta */}
      <div
        className="
          flex min-w-0 flex-1 flex-col
          p-3 sm:p-4
        "
      >
        {/* Plataforma */}
        <span
          className="
            mb-1.5 text-[10px] font-medium
            uppercase tracking-wide
            text-muted-foreground
            sm:mb-2 sm:text-[11px]
          "
        >
          {PLATFORM_LABELS[deal.platform]}
        </span>

        {/* Nome do jogo */}
        <Link
          to={`/ofertas/${deal.id}`}
          className="
            line-clamp-2 text-sm
            font-medium leading-5
            text-card-foreground
            hover:underline
            sm:min-h-10
          "
        >
          {deal.title}
        </Link>

        {/* Preço e loja */}
        <div className="mt-auto pt-3 sm:pt-4">
          {/* Preço original */}
          <div className="min-h-5">
            {deal.originalPrice != null && deal.originalPrice > deal.price && (
              <p className="text-xs text-muted-foreground line-through">
                {formatPrice(deal.originalPrice)}
              </p>
            )}
          </div>

          {/* Preço atual e desconto */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className="
                text-lg font-semibold
                tracking-tight text-primary
                sm:text-xl
              "
            >
              {formatPrice(deal.price)}
            </span>

            {discount !== null && (
              <Badge
                variant="secondary"
                className="
                  rounded-sm bg-primary/10
                  px-1.5 py-0.5 text-[11px]
                  font-semibold text-primary
                "
              >
                -{discount}%
              </Badge>
            )}
          </div>

          {/* Loja e link externo */}

          {/* Loja e botão de detalhes */}
          <div className="mt-3 space-y-3 border-t border-border pt-3 sm:mt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Disponível em</span>

              <span className="truncate text-xs font-medium text-foreground">
                {deal.store.name}
              </span>
            </div>

            <Link
              to={`/ofertas/${deal.id}`}
              className="
      inline-flex h-9 w-full items-center justify-center
      gap-2 rounded-md bg-primary px-3
      text-sm font-medium text-primary-foreground
      transition-colors hover:bg-primary/90
      focus-visible:outline-2
      focus-visible:outline-offset-2
      focus-visible:outline-ring
    "
            >
              <Eye className="size-4" />
              Ver detalhes
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
