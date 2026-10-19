import { ArrowRight, ExternalLink, Gamepad2, Search, ShieldCheck, Tag } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PageSEO } from "@/components/PageSEO";

const steps = [
  {
    icon: Search,
    title: "Encontre",
    description: "Explore ofertas de jogos em mídia física para diferentes plataformas.",
  },
  {
    icon: Tag,
    title: "Confira",
    description: "Veja preços, cupons e condições disponíveis antes de aproveitar uma oferta.",
  },
  {
    icon: ExternalLink,
    title: "Aproveite",
    description:
      "Acesse a loja responsável pela oferta para conferir os detalhes e finalizar sua compra.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageSEO
        title="Sobre o Garimplay | Promoções de jogos físicos"
        description="Conheça o Garimplay, um espaço dedicado à descoberta de promoções de jogos em mídia física para PlayStation, Nintendo e Xbox."
        canonical="/sobre"
      />

      <main className="container mx-auto max-w-5xl px-4 py-12 sm:py-20">
        <div className="space-y-16 sm:space-y-24">
          {/* Apresentação */}
          <section className="mx-auto max-w-3xl space-y-6 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border bg-card">
              <img
                src="/logos/garimplay-symbol-color.svg"
                alt="Garimplay"
                width={175}
                height={48}
                className="h-12 w-43.75 object-contain"
              />
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                Sobre o Garimplay
              </p>

              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                Bons jogos merecem bons achados.
              </h1>

              <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                O Garimplay nasceu para facilitar a descoberta de promoções de jogos em mídia
                física. Reunimos ofertas em um só lugar para ajudar você a encontrar bons preços e
                aumentar sua coleção.
              </p>
            </div>

            <Button nativeButton={false} size="lg" render={<Link to="/" />}>
              Explorar ofertas
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </section>

          {/* Como funciona */}
          <section className="space-y-8">
            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">Como funciona?</h2>
              <p className="text-muted-foreground">Encontrar uma boa oferta pode ser simples.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div key={step.title} className="space-y-4 rounded-xl border bg-card p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>

                      <span className="text-sm font-medium text-muted-foreground">
                        0{index + 1}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Propósito */}
          <section className="grid items-center gap-8 rounded-xl border bg-card p-6 sm:p-10 md:grid-cols-2">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Gamepad2 className="size-8" />
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Feito para quem gosta de mídia física</h2>

              <p className="leading-relaxed text-muted-foreground">
                Seja para adicionar um clássico à coleção, encontrar aquele jogo que faltava ou
                acompanhar uma pré-venda, queremos tornar a busca por oportunidades mais prática.
              </p>

              <p className="leading-relaxed text-muted-foreground">
                Nosso foco está nos jogos físicos, reunindo ofertas para diferentes consoles e
                gerações.
              </p>
            </div>
          </section>

          {/* Transparência */}
          <section className="mx-auto max-w-3xl space-y-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-6 shrink-0 text-primary" />

              <h2 className="text-2xl font-bold">Transparência em primeiro lugar</h2>
            </div>

            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                O Garimplay é uma plataforma de divulgação de ofertas. Não realizamos a venda dos
                produtos diretamente.
              </p>

              <p>
                Ao escolher uma promoção, você é direcionado para a loja responsável, onde poderá
                consultar as condições e finalizar sua compra.
              </p>

              <p>
                Preços, disponibilidade, cupons e condições de pagamento podem mudar sem aviso
                prévio. Por isso, recomendamos conferir todas as informações na loja antes de
                comprar.
              </p>
            </div>
          </section>

          {/* Chamada final */}
          <section className="space-y-5 rounded-xl border bg-card p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold sm:text-3xl">Seu próximo achado pode estar aqui.</h2>

            <p className="mx-auto max-w-xl text-muted-foreground">
              Explore as ofertas disponíveis e encontre novos jogos para sua coleção.
            </p>

            <Button nativeButton={false} size="lg" render={<Link to="/" />}>
              Ver promoções
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </section>
        </div>
      </main>
    </>
  );
}
