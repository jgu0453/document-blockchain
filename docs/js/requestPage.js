import { supabase, getSessionUser, getUserRole, signOut } from "./supabaseClient.js";

const form = document.getElementById("request-form");
const resultEl = document.getElementById("my-requests");
const messageEl = document.getElementById("request-message");
const navLogout = document.getElementById("nav-logout");

async function ensureAdmin() {
  const user = await getSessionUser();
  if (!user || getUserRole(user) !== "admin") {
    window.location.href = "signin.html";
    return null;
  }
  return user;
}

function setResult(text, kind = "") {
  if (messageEl) {
    messageEl.className = `status ${kind}`.trim();
    messageEl.textContent = text;
  }
}

function renderEntry(row) {
  const tx = row.tx_hash
    ? `<a href="https://sepolia.etherscan.io/tx/${row.tx_hash}" target="_blank" rel="noopener">Transaction</a>`
    : "";
  const download = row.file_url
    ? `<a href="${row.file_url}" target="_blank" rel="noopener">Download</a>`
    : "No file URL";
  return `
    <div class="list-item">
      <div>
        <div class="bold">${row.doc_id}</div>
        <div class="muted">Student: ${row.student_id ?? "-"}</div>
        <div class="muted">Issued: ${row.issued_at ? new Date(row.issued_at).toLocaleString() : "-"}</div>
        <div class="muted">Hash: <span class="hash">${row.doc_hash}</span></div>
      </div>
      <div class="actions">
        ${download}
        ${tx ? `<span class="dot"></span>${tx}` : ""}
      </div>
    </div>
  `;
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const docId = data.get("docId")?.toString().trim();
  if (!docId) {
    setResult("Document ID is required", "error");
    return;
  }
  if (!supabase) {
    setResult("Supabase not configured", "error");
    return;
  }
  try {
    const { data: row, error } = await supabase
      .from("documents")
      .select("doc_id, doc_hash, tx_hash, file_url, issued_at, student_id")
      .eq("doc_id", docId)
      .limit(1)
      .single();
    if (error || !row) {
      setResult("No document found in the database.", "error");
      resultEl.innerHTML = "";
      return;
    }
    setResult("", "");
    resultEl.innerHTML = renderEntry(row);
  } catch (err) {
    setResult(err.message || err, "error");
  }
});

navLogout?.addEventListener("click", async () => {
  await signOut();
  window.location.href = "signin.html";
});

(async () => {
  await ensureAdmin();
})();