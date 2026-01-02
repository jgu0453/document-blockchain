import { supabase, getUserRole } from "./supabaseClient.js";

function assertSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add docs/supabase-config.js with URL and anon key.");
  }
}

export async function createDeployment({ contractAddress, label }) {
  assertSupabase();
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user || getUserRole(user.user) !== "admin") {
    throw new Error("Admin role required to create deployments.");
  }
  if (!contractAddress) {
    throw new Error("contractAddress is required.");
  }
  const { error } = await supabase.from("deployments").insert({
    contract_address: contractAddress,
    label: label ?? "",
    owner_id: user.user.id,
    owner_email: user.user.email ?? null,
  });
  if (error) throw error;
}

export async function listDeploymentsByUser() {
  assertSupabase();
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) {
    throw new Error("Please sign in to view deployments.");
  }
  const { data, error } = await supabase
    .from("deployments")
    .select("contract_address, label, created_at")
    .eq("owner_id", user.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}