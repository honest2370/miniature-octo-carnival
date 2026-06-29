import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Profile } from "./types";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    full_name: string,
    phone: string
  ) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateMyProfile: (p: {
    full_name: string;
    phone: string;
    avatar_url: string | null;
  }) => Promise<void>;
}

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Charge le profil utilisateur avec retries.
   * La ligne `profiles` est créée par un trigger côté base de données lors de
   * l'inscription ; il peut y avoir une (très courte) latence avant qu'elle ne
   * soit disponible. On interroge donc plusieurs fois pour ne jamais rester
   * bloqué sur l'écran de connexion.
   */
  const loadProfile = useCallback(async (uid: string, retries = 15): Promise<Profile | null> => {
    let last: Profile | null = null;
    for (let i = 0; i < retries; i++) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (error) {
        // table inexistante ou schéma absent : on arrête net.
        break;
      }
      last = (data as Profile) ?? null;
      if (last) break;
      await new Promise((r) => setTimeout(r, 350));
    }
    setProfile(last);
    return last;
  }, []);

  useEffect(() => {
    let mounted = true;

    // État initial (rechargement / deep-link après confirmation e-mail).
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      if (mounted) setLoading(false);
    });

    // Toute transition d'auth (login, signup, logout).
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        await loadProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id, 3);
  }, [session, loadProfile]);

  const signIn: AuthState["signIn"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: translateError(error.message) };
    // On s'assure que le profil est chargé avant de rendre la main :
    // la transition vers l'app se fait ainsi de façon fiable.
    if (data.user) await loadProfile(data.user.id);
    return {};
  };

  const signUp: AuthState["signUp"] = async (
    email,
    password,
    full_name,
    phone
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, phone } },
    });
    if (error) return { error: translateError(error.message) };

    // Confirmation par e-mail désactivée → on reçoit directement une session.
    if (data.session && data.user) {
      await loadProfile(data.user.id);
      return {};
    }
    // Tentative de connexion immédiate (confirmation désactivée côté dashboard).
    const { data: li, error: liErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (liErr) return { needsConfirm: true };
    if (li.user) await loadProfile(li.user.id);
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const updateMyProfile: AuthState["updateMyProfile"] = async (p) => {
    const { error } = await supabase.rpc("update_my_profile", {
      p_full_name: p.full_name,
      p_phone: p.phone,
      p_avatar_url: p.avatar_url,
    });
    if (!error && session) await loadProfile(session.user.id, 3);
  };

  return (
    <Ctx.Provider
      value={{
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateMyProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials"))
    return "E-mail ou mot de passe incorrect.";
  if (m.includes("not confirmed")) return "Veuillez confirmer votre adresse e-mail.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Cet e-mail est déjà utilisé.";
  if (m.includes("password") && m.includes("weak"))
    return "Le mot de passe doit contenir au moins 6 caractères.";
  if (m.includes("rate limit")) return "Trop de tentatives. Réessayez dans un instant.";
  return msg;
}
