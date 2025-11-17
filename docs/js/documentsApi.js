import { supabase, getUserRole } from "./supabaseClient.js";

function assertSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add docs/supabase-config.js with URL and anon key.");
  }
}

export async function insertDocumentRecord({ docId, studentId, docHash, txHash, fileUrl, issuedAt }) {
  assertSupabase();
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user || getUserRole(user.user) !== "admin") {
    throw new Error("Admin role required to register documents.");
  }
  if (!docId || !studentId || !docHash) {
    throw new Error("docId, studentId, and docHash are required.");
  }
  const { error } = await supabase.from("documents").insert({
    doc_id: docId,
    student_id: studentId,
    doc_hash: docHash,
    tx_hash: txHash ?? null,
    file_url: fileUrl ?? null,
    issued_at: issuedAt ?? new Date().toISOString(),
    issuer_email: user.user.email ?? null,
  });
  if (error) throw error;
}

export async function listDocumentsByStudent(studentId) {
  assertSupabase();
  if (!studentId) {
    throw new Error("Student ID missing on account.");
  }
  const { data, error } = await supabase
    .from("documents")
    .select("doc_id, doc_hash, tx_hash, file_url, issued_at")
    .eq("student_id", studentId)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}