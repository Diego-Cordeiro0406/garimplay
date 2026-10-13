import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Gamepad2, LoaderCircle, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { signInAdmin } from "@/services/auth";

export default function LoginPage() {
  const location = useLocation();
  const { status } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestedPath = (location.state as { from?: string } | null)?.from;

  const redirectTo =
    requestedPath?.startsWith("/admin/") && !requestedPath.startsWith("/admin/login")
      ? requestedPath
      : "/admin";

  if (status === "authenticated") {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      await signInAdmin(email.trim(), password);
    } catch (error) {
      console.error("Erro ao entrar:", error);

      setError("Não foi possível entrar. Verifique suas credenciais e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para ofertas
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 space-y-6">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Gamepad2 className="size-7" />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-primary">Garimplay Admin</p>

              <h1 className="text-3xl font-semibold tracking-tight">Acesse sua conta</h1>

              <p className="text-sm leading-relaxed text-muted-foreground">
                Entre com suas credenciais para gerenciar as ofertas do Garimplay.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                E-mail
              </label>

              <Input
                id="email"
                type="email"
                placeholder="admin@exemplo.com"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={submitting}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Senha
              </label>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={submitting}
                  className="h-11 pr-12"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full"
              disabled={submitting || status === "loading"}
            >
              {submitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Verificando acesso...
                </>
              ) : (
                <>
                  <LockKeyhole className="size-4" />
                  Entrar no painel
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Acesso restrito aos administradores do Garimplay.
          </p>
        </div>
      </main>
    </div>
  );
}
