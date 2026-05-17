import { getCurrentProfile, signOut } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@shared/types";
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type AuthState = {
  user: Profile | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refresh: () => Promise<Profile | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getCurrentProfile();
      setUser(profile);
      if (profile) {
        localStorage.setItem("restaurant-picker-user", JSON.stringify(profile));
      } else {
        localStorage.removeItem("restaurant-picker-user");
      }
      return profile;
    } catch (caught) {
      const nextError = toError(caught);
      setError(nextError);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
        localStorage.removeItem("restaurant-picker-user");
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void refresh();
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    localStorage.removeItem("restaurant-picker-user");
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: Boolean(user),
      refresh,
      logout,
    }),
    [error, loading, logout, refresh, user],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/auth" } = options ?? {};
  const state = useContext(AuthContext);
  if (!state) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.hash === `#${redirectPath}`) return;

    window.location.hash = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, state.loading, state.user]);

  return state;
}
