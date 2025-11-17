import { rememberDocument, verifyDocument } from "./registry.js";
import { supabase, getSessionUser, signOut, getUserRole } from "./supabaseClient.js";

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

function enableWallet() {
  if (walletButton) {
    walletButton.classList.remove("hidden", "disabled");
    walletButton.disabled = false;
  }
}

async function setupUserContext() {
  const user = await getSessionUser();
  if (!user) {
    hideWallet();
    return;
  }
  const role = getUserRole(user);
  if (role === "admin") {
    enableWallet();
  } else {
    hideWallet();
  }
}

function setResult(text, kind = "") {
  resultEl.className = `status ${kind}`.trim();
  resultEl.textContent = text;
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const docId = data.get("docId")?.toString().trim();
  const docHash = data.get("docHash")?.toString().trim();
  if (!docId || !docHash) {
    setResult("Document ID and hash are required", "error");
    return;
  }
  try {
    const { match } = await verifyDocument({ docId, docHash });
    setResult(match ? "On-chain record found." : "No matching on-chain record.", match ? "success" : "error");
    rememberDocument({ docId, docHash, verifiedAt: new Date().toISOString() });
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
  await setupUserContext();
})();
