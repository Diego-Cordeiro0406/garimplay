import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Separator } from "./ui/separator";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();

  function handleSearch() {
    navigate("/?search=open");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-360 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="Garimplay - Página inicial"
          >
            <img
              src="/logos/garimplay-horizontal-color.svg"
              alt="Garimplay"
              width={175}
              height={48}
              className="h-12 w-43.75 object-contain"
            />
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Pesquisar ofertas"
            onClick={handleSearch}
          >
            <Search className="size-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-360 flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-3">
            <h2 className="text-xs font-medium text-foreground">Sobre as ofertas</h2>

            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
              O Garimplay é uma plataforma independente de divulgação de ofertas de jogos. Não
              vendemos produtos nem processamos pagamentos. As compras são realizadas diretamente
              nos sites das lojas, que são responsáveis pelos pedidos, entregas e atendimento ao
              consumidor.
            </p>

            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Não possuímos vínculo comercial ou parceria oficial com as lojas divulgadas.
            </p>
          </div>

          <nav
            aria-label="Links institucionais"
            className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            <Link
              to="/privacidade"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Política de Privacidade
            </Link>

            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event("open-cookie-preferences"));
              }}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Preferências de cookies
            </button>
          </nav>

          <Separator className="my-5" />

          <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Garimplay</span>

            <span>Feito para quem gosta de colecionar jogos.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
