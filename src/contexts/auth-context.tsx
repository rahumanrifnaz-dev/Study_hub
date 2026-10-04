import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabaseClient } from "../integrations/supabase/client";

export type Role = "member" | "admin" | "super_admin";

export interface UserSession {
  id: string;
  name: string;
  role: Role;
  token: string; // Supabase access token
  apiToken?: string; // backend API JWT
}

interface AuthContextValue {
  user: UserSession | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  requestAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface ProfileRow {
  id: string;
  full_name: string | null;
  role: Role | null;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data, error } = await supabaseClient.auth.getSession();

        // handle Supabase returned error (e.g. invalid/expired refresh token)
        if (error) {
          const msg = String((error as any)?.message ?? error);
          if (/invalid refresh token/i.test(msg)) {
            // clear local session to stop repeated refresh attempts and surface a clean state
            await supabaseClient.auth.signOut();
            setUser(null);
            return;
          }
          console.warn('supabase.auth.getSession error:', error);
          setUser(null);
          return;
        }

        const session = data.session;
        if (!session?.user) {
          setUser(null);
          return;
        }

        let { data: profile } = await supabaseClient
          .from("profiles")
          .select("id, full_name, role")
          .eq("id", session.user.id)
          .maybeSingle<ProfileRow>();

        const fallbackName =
          (session.user.user_metadata as { full_name?: string } | undefined)?.full_name ??
          session.user.email ??
          "Member";

        if (!profile) {
          const { data: createdProfile } = await supabaseClient
            .from("profiles")
            .upsert({
              id: session.user.id,
              full_name: fallbackName,
              email: session.user.email ?? "",
              role: "member",
            })
            .select("id, full_name, role")
            .maybeSingle<ProfileRow>();

          if (createdProfile) {
            profile = createdProfile;
          }
        }

        setUser({
          id: session.user.id,
          name: profile?.full_name ?? fallbackName,
          role: (profile?.role ?? "member") as Role,
          token: session.access_token,
          apiToken: undefined,
        });

        // attempt to obtain a backend API JWT (dev-friendly flow)
        // NOTE: require explicit VITE_API_URL — do NOT rely on relative `/health` or proxied paths
        (async () => {
          try {
            const API_URL = import.meta.env.VITE_API_URL;
            if (!API_URL) {
              // backend not configured — skip backend login
              return;
            }

            const base = API_URL.replace(/\/$/, '');

            // 1) health check against the configured backend only
            try {
              const h = await fetch(`${base}/health`, { method: 'GET' });
              if (!h.ok) return; // backend not healthy
            } catch (e) {
              return; // unreachable backend
            }

            // 2) login to backend API to obtain API JWT
            try {
              const res = await fetch(`${base}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: session.user.email }),
              });
              if (!res.ok) return;
              const body = await res.json();
              const apiToken = body.token as string | undefined;
              setUser((prev) => (prev ? { ...prev, apiToken } : prev));
            } catch (e) {
              /* ignore backend login failures — dev convenience only */
            }
          } catch (err) {
            console.debug('backend auth login skipped or failed', err);
          }
        })();
      } catch (err) {
        const msg = String((err as any)?.message ?? err);
        if (/invalid refresh token/i.test(msg)) {
          // ensure we clear any stale session storage
          await supabaseClient.auth.signOut();
        }
        console.warn('loadSession failed:', err);
        setUser(null);
      }
    };

    loadSession();

    const { data: subscription } = supabaseClient.auth.onAuthStateChange(
      () => {
        loadSession();
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });
    if (error) {
      throw error;
    }
  };

  const logout = async () => {
    await supabaseClient.auth.signOut();
    setUser(null);
  };

  const requestAdmin = async () => {
    if (!user) {
      throw new Error("You must be logged in to request admin access.");
    }

    const { error } = await supabaseClient
      .from("admin_requests")
      .insert({ user_id: user.id, status: "pending" });

    if (error && error.code !== "23505") {
      throw error;
    }
  };

  const value = useMemo(
    () => ({ user, login, register, logout, requestAdmin }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
