import { createContext } from "react";
import type { User } from "@supabase/supabase-js";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "forbidden" | "error";

export type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  isAdmin: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
