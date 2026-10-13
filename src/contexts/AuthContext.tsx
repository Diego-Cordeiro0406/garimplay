import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { AuthContext, type AuthStatus } from "@/contexts/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin, signOutAdmin } from "@/services/auth";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  // Identifica a verificação mais recente.
  const requestId = useRef(0);

  // Guarda o ID do usuário cuja permissão foi validada.
  const verifiedUserId = useRef<string | null>(null);

  const verifyUser = useCallback(async (currentUser: User | null) => {
    const currentRequest = ++requestId.current;

    if (!currentUser) {
      verifiedUserId.current = null;
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    setUser(currentUser);
    setStatus("loading");

    try {
      // Confirma a identidade junto ao Supabase Auth.
      const {
        data: { user: validatedUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (currentRequest !== requestId.current) return;

      if (authError || !validatedUser) {
        if (authError?.name === "AuthSessionMissingError") {
          verifiedUserId.current = null;
          setUser(null);
          setStatus("unauthenticated");
          return;
        }

        throw authError ?? new Error("Usuário não encontrado.");
      }

      // Consulta a permissão administrativa.
      const admin = await checkIsAdmin(validatedUser.id);

      if (currentRequest !== requestId.current) return;

      verifiedUserId.current = validatedUser.id;
      setUser(validatedUser);
      setStatus(admin ? "authenticated" : "forbidden");
    } catch (error) {
      if (currentRequest !== requestId.current) return;

      console.error("Erro ao verificar autenticação:", error);
      setStatus("error");
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const currentRequest = ++requestId.current;

    setStatus("loading");

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (currentRequest !== requestId.current) return;

      if (error) throw error;

      // Não existe sessão: situação normal.
      if (!session) {
        verifiedUserId.current = null;
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      await verifyUser(session.user);
    } catch (error) {
      if (currentRequest !== requestId.current) return;

      console.error("Erro ao atualizar autenticação:", error);
      setStatus("error");
    }
  }, [verifyUser]);

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        void verifyUser(null);
        return;
      }

      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "USER_UPDATED") {
        const currentUser = session?.user ?? null;

        if (!currentUser) {
          void verifyUser(null);
          return;
        }

        // Evita repetir a verificação quando o mesmo
        // usuário já foi validado e o estado não mudou.
        if (event === "SIGNED_IN" && verifiedUserId.current === currentUser.id) {
          return;
        }

        void verifyUser(currentUser);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [verifyUser]);

  const logout = useCallback(async () => {
    await signOutAdmin();

    // O evento SIGNED_OUT também atualizará o contexto.
    // A atualização explícita garante o estado esperado
    // mesmo se o evento ainda não tiver sido processado.
    await verifyUser(null);
  }, [verifyUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isAdmin: status === "authenticated",
        refreshAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
