// Auth/session state — single source of truth for current user, profile, role,
// institution. Subscribes to Supabase auth changes and triggers sync.
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startSync, syncNow } from "./sync";

export interface SessionProfile {
  id: string;
  name: string;
  username: string;
  institution_id: string | null;
  is_active: boolean;
}
export interface SessionInstitution {
  id: string;
  name: string;
  slug: string;
  currency: string;
  address: string | null;
  phone: string | null;
}
export type SessionRole = "admin" | "employee" | null;

export interface AppSession {
  userId: string | null;
  email: string | null;
  profile: SessionProfile | null;
  institution: SessionInstitution | null;
  role: SessionRole;
  loading: boolean;
}

const initial: AppSession = {
  userId: null,
  email: null,
  profile: null,
  institution: null,
  role: null,
  loading: true,
};

let state: AppSession = initial;
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function set(next: Partial<AppSession>) {
  state = { ...state, ...next };
  emit();
}

async function loadFromAuth() {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    set({ userId: null, email: null, profile: null, institution: null, role: null, loading: false });
    return;
  }
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role,institution_id").eq("user_id", user.id),
  ]);
  let institution: SessionInstitution | null = null;
  if (profile?.institution_id) {
    const { data: inst } = await supabase
      .from("institutions")
      .select("id,name,slug,currency,address,phone")
      .eq("id", profile.institution_id)
      .maybeSingle();
    institution = inst as SessionInstitution | null;
  }
  const role: SessionRole = (roles?.[0]?.role as SessionRole) ?? null;
  set({
    userId: user.id,
    email: user.email ?? null,
    profile: profile as SessionProfile | null,
    institution,
    role,
    loading: false,
  });
}

let initialized = false;
let stopSync: (() => void) | null = null;
export function initSession() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  void loadFromAuth();
  supabase.auth.onAuthStateChange(() => {
    void loadFromAuth().then(() => syncNow(state.institution?.id ?? null));
  });
  stopSync = startSync(() => state.institution?.id ?? null);
  window.addEventListener("beforeunload", () => stopSync?.());
}

export function getSession() {
  return state;
}

export function useSession(): AppSession {
  useEffect(() => initSession(), []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => initial,
  );
}

export async function refreshSession() {
  await loadFromAuth();
}
