import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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

          {/* <nav className="hidden items-center gap-6 md:flex">
            <Link to="/" className="text-sm font-medium text-foreground">
              Ofertas
            </Link>

            <span className="text-sm text-muted-foreground">Mídias físicas</span>
          </nav> */}

          <Button variant="ghost" size="icon" aria-label="Pesquisar ofertas" disabled>
            <Search className="size-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Garimplay</span>
          <span>Feito para quem gosta de colecionar jogos.</span>
        </div>
      </footer>
    </div>
  );
}
