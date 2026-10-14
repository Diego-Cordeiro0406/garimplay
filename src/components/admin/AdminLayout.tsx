import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ExternalLink,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Store,
  Tags,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  {
    label: "Visão geral",
    to: "/admin",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "Ofertas",
    to: "/admin/ofertas",
    icon: Tags,
    end: false,
  },
  {
    label: "Lojas",
    to: "/admin/lojas",
    icon: Store,
    end: false,
  },
];

function AdminNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="Navegação administrativa">
      {navigation.map(({ label, to, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            ].join(" ")
          }
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError(null);

    try {
      await logout();
      navigate("/admin/login", { replace: true });
    } catch {
      setLogoutError("Não foi possível encerrar a sessão.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground lg:flex">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-17 items-center border-b border-border px-5">
          <Link to="/admin" className="flex items-center gap-3">
            <img
              src="/logos/garimplay-horizontal-color.svg"
              alt="Garimplay"
              width={175}
              height={48}
              className="h-12 w-43.75 object-contain"
            />
          </Link>
        </div>

        <div className="flex-1 px-3 py-6">
          <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Gerenciamento
          </p>
          <AdminNavigation />
        </div>

        <div className="space-y-3 border-t border-border p-3">
          <Link
            className="flex px-2.5 items-center"
            to="/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="size-4 mr-1" />
            Visualizar site
          </Link>

          <div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
            >
              {loggingOut ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger>
                <div className="lg:hidden" aria-label="Abrir menu administrativo">
                  <Menu className="size-5" />
                </div>
              </SheetTrigger>

              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b border-border px-5 py-5">
                  <SheetTitle className="flex items-center gap-2">
                    <img
                      src="/logos/garimplay-horizontal-color.svg"
                      alt="Garimplay"
                      width={175}
                      height={48}
                      className="h-12 w-43.75 object-contain"
                    />
                  </SheetTitle>
                </SheetHeader>

                <div className="px-3 py-5">
                  <AdminNavigation onNavigate={() => setMenuOpen(false)} />
                </div>

                <div className="mt-auto space-y-2 border-t border-border p-3">
                  <Link className="flex px-2.5" to="/" onClick={() => setMenuOpen(false)}>
                    <ExternalLink className="size-4 mr-2 mt-0.5" />
                    Visualizar site
                  </Link>

                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    disabled={loggingOut}
                    onClick={() => void handleLogout()}
                  >
                    <LogOut className="size-4" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <span className="hidden text-sm text-muted-foreground lg:inline">
              Painel administrativo
            </span>
          </div>

          <span className="hidden max-w-56 truncate text-xs text-muted-foreground sm:block">
            {user?.email}
          </span>
        </header>

        {logoutError && (
          <p role="alert" className="px-4 pt-3 text-sm text-destructive">
            {logoutError}
          </p>
        )}

        <main className="w-full flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
