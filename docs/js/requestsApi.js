import { supabase, getUserRole } from "./supabaseClient.js";

function assertSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add docs/supabase-config.js with URL and anon key.");
  }
}

export async function createRequest({ docType, notes }) {
  assertSupabase();
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) {
    throw new Error("Please sign in to submit a request.");
  }
  const { error } = await supabase.from("requests").insert({
    student_id: user.user.id,
    doc_type: docType,
    status: "pending",
    notes,
  });
  if (error) throw error;
}

export async function listMyRequests() {
  assertSupabase();
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) {
    throw new Error("Please sign in to view your requests.");
  }
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("student_id", user.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listPendingRequests() {
  assertSupabase();
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) {
    throw new Error("Please sign in.");
  }
  if (getUserRole(user.user) !== "admin") {
    throw new Error("Admin role required.");
  }
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateRequestStatus(id, status, extras = {}) {
  assertSupabase();
  const { error } = await supabase.from("requests").update({ status, ...extras }).eq("id", id);
  if (error) throw error;
}
