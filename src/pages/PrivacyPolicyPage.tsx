import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const LAST_UPDATED = "15 de outubro de 2026";

export function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        className="mb-6 -ml-3"
        nativeButton={false}
        render={<Link to="/" />}
      >
        <ArrowLeft className="size-4" />
        Voltar para ofertas
      </Button>

      <header className="space-y-4">
        <div className="flex size-11 items-center justify-center rounded-lg border bg-muted">
          <ShieldCheck className="size-5 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Política de Privacidade</h1>

          <p className="text-sm text-muted-foreground">Última atualização: {LAST_UPDATED}</p>
        </div>

        <p className="text-sm leading-7 text-muted-foreground">
          O Garimplay respeita a privacidade de seus visitantes. Esta Política de Privacidade
          explica quais informações podem ser tratadas durante a utilização da plataforma, para
          quais finalidades e como você pode gerenciar suas preferências.
        </p>
      </header>

      <Separator className="my-8" />

      <div className="space-y-9 text-sm leading-7">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">1. Sobre o Garimplay</h2>

          <p className="text-muted-foreground">
            O Garimplay é uma plataforma independente de divulgação de ofertas de jogos, com foco em
            mídia física. Reunimos informações sobre produtos anunciados por lojas externas para
            facilitar a descoberta de ofertas.
          </p>

          <p className="text-muted-foreground">
            O Garimplay não realiza vendas, não processa pagamentos e não é responsável pelo
            processamento de dados pessoais realizado pelas lojas após o redirecionamento para seus
            respectivos sites.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">2. Informações que podemos tratar</h2>

          <p className="text-muted-foreground">
            Durante a navegação, podemos tratar informações relacionadas ao funcionamento e à
            utilização do site, incluindo:
          </p>

          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Páginas acessadas e ofertas visualizadas.</li>
            <li>Cliques nos links que direcionam para lojas externas.</li>
            <li>
              Informações técnicas, como tipo de navegador, dispositivo e dados aproximados de
              localização, quando disponibilizados pelas ferramentas analíticas.
            </li>
            <li>Sua preferência sobre a utilização de cookies analíticos.</li>
          </ul>

          <p className="text-muted-foreground">
            Os dados analíticos são coletados por meio do Google Analytics apenas após sua
            autorização.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">3. Cookies e tecnologias semelhantes</h2>

          <p className="text-muted-foreground">
            Utilizamos armazenamento local para preservar suas preferências de privacidade. Também
            podemos utilizar cookies analíticos, mediante consentimento, para compreender como os
            visitantes interagem com o site.
          </p>

          <div className="overflow-hidden rounded-lg border">
            <div className="border-b p-4">
              <h3 className="font-medium">Armazenamento essencial</h3>

              <p className="mt-1 text-muted-foreground">
                Utilizado para lembrar sua escolha sobre cookies e manter funcionalidades
                necessárias ao site. Não depende de consentimento para analytics.
              </p>
            </div>

            <div className="p-4">
              <h3 className="font-medium">Cookies analíticos</h3>

              <p className="mt-1 text-muted-foreground">
                Utilizados pelo Google Analytics 4 para medir visitas, visualizações de ofertas e
                interações com links externos. São opcionais e somente utilizados após sua
                autorização.
              </p>
            </div>
          </div>

          <p className="text-muted-foreground">
            Você pode aceitar, recusar ou alterar sua escolha a qualquer momento por meio da opção
            "Preferências de cookies", disponível no rodapé do Garimplay.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">4. Google Analytics</h2>

          <p className="text-muted-foreground">
            Com seu consentimento, utilizamos o Google Analytics 4, serviço fornecido pelo Google,
            para produzir estatísticas sobre o uso do Garimplay e identificar oportunidades de
            melhoria.
          </p>

          <p className="text-muted-foreground">
            Entre os eventos monitorados estão as visualizações de páginas, as visualizações de
            ofertas e os cliques nos botões que direcionam para as lojas.
          </p>

          <p className="text-muted-foreground">
            O tratamento dessas informações pode envolver infraestrutura localizada fora do Brasil,
            conforme as práticas e condições aplicáveis aos serviços do Google.
          </p>

          <a
            href="https://policies.google.com/privacy?hl=pt-BR"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            Política de Privacidade do Google
            <ExternalLink className="size-3.5" />
          </a>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">5. Links para lojas externas</h2>

          <p className="text-muted-foreground">
            As ofertas divulgadas podem conter links para sites de terceiros. Ao acessar uma dessas
            lojas, você estará sujeito às políticas de privacidade, cookies e condições comerciais
            do respectivo estabelecimento.
          </p>

          <p className="text-muted-foreground">
            Recomendamos consultar essas informações antes de realizar qualquer compra.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">6. Finalidades e bases legais</h2>

          <p className="text-muted-foreground">
            Tratamos informações para viabilizar o funcionamento da plataforma, preservar
            preferências de privacidade e, quando autorizado, analisar a utilização do site para
            aprimorar seus recursos.
          </p>

          <p className="text-muted-foreground">
            O uso de cookies analíticos é baseado no consentimento do visitante, que pode ser
            revogado a qualquer momento. Outras operações necessárias ao funcionamento do serviço
            podem utilizar bases legais aplicáveis previstas na Lei Geral de Proteção de Dados
            Pessoais (LGPD).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">7. Armazenamento e segurança</h2>

          <p className="text-muted-foreground">
            Adotamos medidas técnicas e organizacionais para proteger as informações tratadas pela
            plataforma contra acessos não autorizados, alterações e usos indevidos.
          </p>

          <p className="text-muted-foreground">
            Os períodos de armazenamento podem variar conforme a finalidade do tratamento, as
            configurações dos serviços utilizados e eventuais obrigações legais.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">8. Seus direitos</h2>

          <p className="text-muted-foreground">
            Nos termos da LGPD, você pode solicitar, quando aplicável, acesso, correção, confirmação
            de tratamento, eliminação, informações sobre compartilhamento e outros direitos
            previstos na legislação.
          </p>

          <p className="text-muted-foreground">
            Você também pode revogar o consentimento para cookies analíticos a qualquer momento pelo
            rodapé. A revogação não afeta a legalidade do tratamento realizado anteriormente.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">9. Alterações nesta política</h2>

          <p className="text-muted-foreground">
            Esta Política de Privacidade poderá ser atualizada para refletir alterações no
            funcionamento do Garimplay, nos serviços utilizados ou na legislação. A data da última
            atualização será informada nesta página.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">10. Contato</h2>

          <p className="text-muted-foreground">
            Para dúvidas sobre esta política ou solicitações relacionadas à privacidade e à proteção
            de dados, entre em contato pelo canal oficial:
          </p>

          <p className="font-medium">diegocordeiro121@gmail.com</p>
        </section>
      </div>
    </div>
  );
}
