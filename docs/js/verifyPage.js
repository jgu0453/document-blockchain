import { rememberDocument, verifyDocument } from "./registry.js";
import { supabase, getSessionUser, getUserRole, signOut } from "./supabaseClient.js";

const disableWalletButton = () => {
  const btn = document.getElementById("walletButton");
  if (btn) {
    btn.disabled = true;
    btn.classList.add("hidden", "disabled");
  }
};

async function ensureAdmin() {
  const user = await getSessionUser();
  if (!user || getUserRole(user) !== "admin") {
    window.location.href = "signin.html";
    return null;
  }
  return user;
}

const walletButton = document.getElementById("walletButton");
const navLogout = document.getElementById("nav-logout");
const fileInputId = "fileInput";
const docIdInputId = "docIdInput";
const hashInputId = "hashInput";
const verifyForm = document.getElementById("verifyForm");
const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const resultSection = document.getElementById("result");

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

document.addEventListener("DOMContentLoaded", async () => {
  disableWalletButton();
  const user = await ensureAdmin();
  if (!user) return;
  navLogout?.addEventListener("click", async () => {
    await signOut();
    window.location.href = "signin.html";
  });
});
