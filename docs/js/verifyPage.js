import { rememberDocument, verifyDocument, bindWalletButton } from "./registry.js";
import { supabase, getSessionUser, getUserRole, signOut } from "./supabaseClient.js";

const walletButtonId = "walletButton";
const fileInputId = "fileInput";
const docIdInputId = "docIdInput";
const hashInputId = "hashInput";
const verifyForm = document.getElementById("verifyForm");
const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const resultSection = document.getElementById("result");
const navLogout = document.getElementById("nav-logout");

async function ensureAdmin() {
  const user = await getSessionUser();
  if (!user || getUserRole(user) !== "admin") {
    window.location.href = "signin.html";
    return null;
  }
  return user;
}

function enableWallet() {
  const btn = document.getElementById(walletButtonId);
  if (btn) {
    btn.classList.remove("hidden", "disabled");
    btn.disabled = false;
    bindWalletButton(btn);
  }
}

function setResult(isMatch, docId, hash) {
  resultSection.classList.remove("hidden");
  statusEl.textContent = isMatch ? "✔ Blockchain record matches." : "✖ No matching record found.";
  detailsEl.innerHTML = `
    <dt>Document ID</dt><dd>${docId}</dd>
    <dt>Hash</dt><dd class="hash">${hash}</dd>
  `;
}

verifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const docIdInput = document.getElementById(docIdInputId);
  const hashInput = document.getElementById(hashInputId);
  const fileInput = document.getElementById(fileInputId);

  const docId = docIdInput.value.trim();
  if (!docId) {
    alert("Document ID is required.");
    return;
  }

  try {
    const { match, docHash } = await verifyDocument({
      docId,
      file: fileInput.files[0] || null,
      docHash: hashInput.value.trim() || null,
    });
    setResult(match, docId, docHash);
    rememberDocument({ docId, docHash, verifiedAt: new Date().toISOString() });
  } catch (error) {
    alert(error.message ?? error);
  }
});

(async () => {
  const user = await ensureAdmin();
  if (!user) return;
  enableWallet();
  navLogout?.addEventListener("click", async () => {
    await signOut();
    window.location.href = "signin.html";
  });
})();
