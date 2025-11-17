import { rememberDocument, verifyDocument } from "./registry.js";
import { supabase, getSessionUser, getUserRole, signOut } from "./supabaseClient.js";

const form = document.getElementById("request-form");
const messageEl = document.getElementById("request-message");
const resultEl = document.getElementById("my-requests");
const walletButton = document.getElementById("walletButton");
const navLogout = document.getElementById("nav-logout");

function hideWallet() {
  if (walletButton) {
    walletButton.classList.add("hidden", "disabled");
    walletButton.disabled = true;
  }
}

function setResult(text, kind = "") {
  resultEl.className = `status ${kind}`.trim();
  resultEl.innerHTML = text;
}

async function ensureSignedIn() {
  const user = await getSessionUser();
  if (!user) {
    window.location.href = "signin.html";
    return null;
  }
  return user;
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const docId = data.get("docId")?.toString().trim();
  if (!docId) {
    setResult("Document ID is required", "error");
    return;
  }
  try {
    const { data: row, error } = await supabase
      .from("requests")
      .select("file_url, doc_hash")
      .eq("doc_id", docId)
      .eq("status", "issued")
      .limit(1)
      .single();
    if (error || !row?.file_url) {
      setResult("No document found in the database.", "error");
      return;
    }
    // Optional on-chain verify
    if (row.doc_hash) {
      try {
        const { match } = await verifyDocument({ docId, docHash: row.doc_hash });
        if (!match) {
          setResult("Hash mismatch: stored file does not match on-chain.", "error");
          return;
        }
      } catch {
        // Ignore on-chain errors for download
      }
    }
    setResult(`<a href="${row.file_url}" target="_blank" rel="noopener">Download Document</a>`, "success");
    if (row.doc_hash) {
      rememberDocument({ docId, docHash: row.doc_hash, verifiedAt: new Date().toISOString() });
    }
  } catch (err) {
    setResult(err.message || err, "error");
  }
});

navLogout?.classList.add("uc-button", "secondary");
navLogout?.addEventListener("click", async () => {
  await signOut();
  window.location.href = "signin.html";
});

(async () => {
  const user = await ensureSignedIn();
  if (!user) return;
  const role = getUserRole(user);
  if (role !== "admin") {
    hideWallet();
  }
})();
