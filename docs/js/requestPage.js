import { supabase, getSessionUser, signOut } from "./supabaseClient.js";

const form = document.getElementById("request-form");
const messageEl = document.getElementById("request-message");
const resultEl = document.getElementById("my-requests");
const navLogout = document.getElementById("nav-logout");
const walletButton = document.getElementById("walletButton");

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
      .select("file_url")
      .eq("doc_id", docId)
      .eq("status", "issued")
      .limit(1)
      .single();
    if (error || !row?.file_url) {
      setResult("No document found in the database.", "error");
      return;
    }
    setResult(`<a href="${row.file_url}" target="_blank" rel="noopener">Download Document</a>`, "success");
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
  hideWallet(); // Request page does not need wallet
})();
