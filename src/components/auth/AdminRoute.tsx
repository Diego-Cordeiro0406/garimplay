import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AlertCircle, LoaderCircle, ShieldX } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AdminRoute() {
  const { status, refreshAuth, logout } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-foreground">
        <LoaderCircle className="size-8 animate-spin text-primary" />

        <p className="text-sm text-muted-foreground">Verificando suas permissões...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{
          from: location.pathname + location.search,
        }}
      />
    );
  }

  if (status === "forbidden") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-foreground">
        <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
          <ShieldX className="size-12 text-destructive" />

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Acesso não autorizado</h1>

            <p className="text-sm text-muted-foreground">
              Sua conta não possui permissão para acessar o painel administrativo do Garimplay.
            </p>
          </div>

          <Button variant="outline" onClick={() => void logout()}>
            Sair da conta
          </Button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-foreground">
        <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
          <AlertCircle className="size-12 text-destructive" />

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Não foi possível verificar seu acesso</h1>

            <p className="text-sm text-muted-foreground">
              Verifique sua conexão e tente novamente.
            </p>
          </div>

          <Button onClick={() => void refreshAuth()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
