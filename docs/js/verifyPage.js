import { rememberDocument, verifyDocument, bindWalletButton } from "./registry.js";
import { supabase, getSessionUser, getUserRole, signOut } from "./supabaseClient.js";

const walletButton = document.getElementById("walletButton");
const navLogout = document.getElementById("nav-logout");
const verifyForm = document.getElementById("verifyForm");
const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const resultSection = document.getElementById("result");

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
    bindWalletButton(walletButton);
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

function setResult(isMatch, docId, hash) {
  resultSection.classList.remove("hidden");
  statusEl.textContent = isMatch ? "✔ Blockchain record matches." : "✖ No matching record found.";
  detailsEl.innerHTML = `
    <dt>Document ID</dt><dd>${docId}</dd>
    <dt>Hash</dt><dd class="hash">${hash}</dd>
  `;
}

verifyForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const docIdInput = document.getElementById("docIdInput");
  const hashInput = document.getElementById("hashInput");
  const fileInput = document.getElementById("fileInput");

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

navLogout?.addEventListener("click", async () => {
  await signOut();
  window.location.href = "signin.html";
});

(async () => {
  await setupUserContext();
})();
