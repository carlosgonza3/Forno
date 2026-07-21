import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "../../config/env";
import { supabase } from "../../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assuranceLevel, setAssuranceLevel] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);

  const loadIdentity = useCallback(async (activeSession) => {
    if (!supabase || !activeSession?.user) {
      setProfile(null);
      setAssuranceLevel(null);
      return;
    }

    const [profileResult, assuranceResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", activeSession.user.id)
        .single(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    if (profileResult.error) {
      setError("No pudimos cargar el perfil de este usuario.");
      setProfile(null);
    } else {
      setProfile(profileResult.data);
    }

    if (!assuranceResult.error) {
      setAssuranceLevel(assuranceResult.data?.currentLevel ?? null);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError("No pudimos restaurar la sesión.");
      setSession(data.session);
      loadIdentity(data.session).finally(() => active && setLoading(false));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setError(null);
      if (event === "PASSWORD_RECOVERY") {
        // Supabase consumes recovery credentials from the URL fragment first.
        // Only then can HashRouter safely replace the fragment with our route.
        window.location.hash = "/reset-password";
      }
      queueMicrotask(() => {
        loadIdentity(nextSession).finally(() => setLoading(false));
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadIdentity]);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: new Error("Supabase no está configurado.") };
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return { error: new Error("Supabase no está configurado.") };
    const result = await supabase.auth.signOut({ scope: "local" });
    if (!result.error) {
      setSession(null);
      setProfile(null);
      setAssuranceLevel(null);
    }
    return result;
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    if (!supabase) return { error: new Error("Supabase no está configurado.") };
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  }, []);

  const value = useMemo(
    () => ({
      configured: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? null,
      assuranceLevel,
      needsAdminMfa: profile?.role === "admin" && assuranceLevel !== "aal2",
      loading,
      error,
      signIn,
      signOut,
      requestPasswordReset,
    }),
    [assuranceLevel, error, loading, profile, requestPasswordReset, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
