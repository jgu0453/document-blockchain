import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = window.SUPABASE_URL;
const anonKey = window.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn("Supabase config missing. Add docs/supabase-config.js with URL and anon key.");
}

export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, storage: typeof window !== "undefined" ? window.sessionStorage : undefined } }) : null;

export async function getSessionUser() {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export function getUserRole(user) {
  return user?.user_metadata?.role ?? null;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data?.user ?? null;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function onAuthChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}
