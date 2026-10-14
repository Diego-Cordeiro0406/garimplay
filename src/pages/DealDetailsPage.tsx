import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  Gamepad2,
  Store,
  Wallet,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CouponCode } from "@/components/deals/CouponCode";
import { calculateDiscount, formatPrice, PLATFORM_LABELS } from "@/lib/deals";
import { dateFormatter, dateTimeFormatter } from "@/lib/formatters";
import { useDeal } from "@/hooks/useDeals";
import { useDealExpiration } from "@/hooks/useDealExpiration";

export default function DealDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const { data: deal, isPending, isError, refetch } = useDeal(id);
  const isExpired = useDealExpiration(deal);

  if (isPending) {
    return (
      <div className="grid animate-pulse gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="min-h-80 rounded-md bg-secondary lg:min-h-120" />

        <div className="space-y-6">
          <div className="h-5 w-32 rounded bg-secondary" />
          <div className="h-10 w-3/4 rounded bg-secondary" />
          <div className="h-5 w-full rounded bg-secondary" />
          <div className="h-12 w-40 rounded bg-secondary" />
          <div className="h-12 w-full rounded bg-secondary" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">Erro ao carregar a oferta</h1>

        <p className="text-sm text-muted-foreground">
          Não foi possível consultar os detalhes desta promoção.
        </p>

        <Button variant="outline" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Gamepad2 className="size-12 text-muted-foreground" strokeWidth={1.25} />

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Oferta não encontrada</h1>

          <p className="text-sm text-muted-foreground">
            A oferta não existe ou não está disponível.
          </p>
        </div>

        <Button nativeButton={false} variant="outline" render={<Link to="/" />}>
          <ArrowLeft className="size-4" />
          Voltar para ofertas
        </Button>
      </div>
    );
  }

  const discount = calculateDiscount(deal.price, deal.originalPrice);

  const hasConditions = Boolean(deal.paymentConditions || deal.rules || deal.expiresAt);

  return (
    <div className="space-y-8">
      {/* Navegação */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar para ofertas
      </Link>

      {/* Conteúdo principal */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        {/* Capa */}
        <div className="flex min-h-80 items-center justify-center rounded-md border border-border bg-secondary p-8 sm:p-12">
          {deal.imageUrl ? (
            <img
              src={deal.imageUrl}
              alt={`Capa do jogo ${deal.title}`}
              className="max-h-120 w-full object-contain"
            />
          ) : (
            <div className="flex min-h-64 items-center justify-center text-muted-foreground">
              <Gamepad2 className="size-20" strokeWidth={1} />
            </div>
          )}
        </div>

        {/* Informações principais */}
        <div className="flex min-w-0 flex-col">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{PLATFORM_LABELS[deal.platform]}</Badge>

              {isExpired && <Badge variant="destructive">Oferta expirada</Badge>}
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{deal.title}</h1>

            {deal.description && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {deal.description}
              </p>
            )}
          </div>

          {/* Preço */}
          <div className="mt-8 border-t border-border pt-6">
            {deal.originalPrice != null && deal.originalPrice > deal.price && (
              <p className="text-sm text-muted-foreground line-through">
                {formatPrice(deal.originalPrice)}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-4xl font-semibold tracking-tight text-primary">
                {formatPrice(deal.price)}
              </span>

              {discount !== null && (
                <Badge variant="secondary" className="rounded-sm bg-primary/10 text-primary">
                  -{discount}%
                </Badge>
              )}
            </div>

            {discount !== null && (
              <p className="mt-2 text-sm text-muted-foreground">
                {discount}% de desconto em relação ao preço original informado.
              </p>
            )}
          </div>

          {/* Cupom */}
          {deal.couponCode && (
            <div className="mt-8 border-t border-border pt-6">
              <CouponCode code={deal.couponCode} />
            </div>
          )}

          {/* Loja */}
          <div className="mt-8 rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                <Store className="size-5 text-muted-foreground" />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Oferta disponível em</p>

                <p className="font-medium">{deal.store.name}</p>
              </div>
            </div>
          </div>

          {/* Botão principal */}
          <div className="mt-6 space-y-3">
            {isExpired ? (
              <Button size="lg" className="w-full" disabled>
                Oferta expirada
              </Button>
            ) : (
              <Button size="lg" className="w-full">
                <a
                  className="flex items-center"
                  href={deal.dealUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver oferta na {deal.store.name}
                  <ArrowUpRight className="size-4 ml-1" />
                </a>
              </Button>
            )}

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Você será redirecionado para o site da loja. Preços e disponibilidade podem mudar sem
              aviso prévio.
            </p>
          </div>
        </div>
      </div>

      {/* Condições da promoção */}
      {hasConditions && (
        <section className="border-t border-border pt-8">
          <h2 className="text-xl font-semibold tracking-tight">Condições da promoção</h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {deal.paymentConditions && (
              <div className="flex items-start gap-3">
                <Wallet className="mt-0.5 size-5 shrink-0 text-primary" />

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Condições de pagamento</h3>

                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {deal.paymentConditions}
                  </p>
                </div>
              </div>
            )}

            {deal.rules && (
              <div className="flex items-start gap-3">
                <ClipboardList className="mt-0.5 size-5 shrink-0 text-primary" />

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Regras da promoção</h3>

                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {deal.rules}
                  </p>
                </div>
              </div>
            )}

            {deal.expiresAt && (
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" />

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Validade informada</h3>

                  <p className="text-sm text-muted-foreground">
                    {dateTimeFormatter.format(new Date(deal.expiresAt))}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Informações adicionais */}
      <section className="border-t border-border pt-8">
        <h2 className="text-lg font-semibold">Sobre esta oferta</h2>

        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Plataforma</p>

            <p className="mt-1 font-medium">{PLATFORM_LABELS[deal.platform]}</p>
          </div>

          <div>
            <p className="text-muted-foreground">Formato</p>

            <p className="mt-1 font-medium">Mídia física</p>
          </div>

          <div>
            <p className="text-muted-foreground">Loja</p>

            <p className="mt-1 font-medium">{deal.store.name}</p>
          </div>

          <div>
            <p className="text-muted-foreground">Publicada em</p>

            <p className="mt-1 font-medium">{dateFormatter.format(new Date(deal.createdAt))}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
