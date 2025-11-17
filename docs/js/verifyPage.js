import { rememberDocument, verifyDocument } from "./registry.js";
import { getSessionUser, signOut } from "./supabaseClient.js";

const walletButton = document.getElementById("walletButton");
const navLogout = document.getElementById("nav-logout");
const verifyForm = document.getElementById("verifyForm");
const clearBtn = document.getElementById("clearBtn");
const methodSelect = document.getElementById("methodSelect");
const fileInputGroup = document.getElementById("fileInputGroup");
const hashInputGroup = document.getElementById("hashInputGroup");
const fileInput = document.getElementById("fileInput");
const hashInput = document.getElementById("hashInput");
const docIdInput = document.getElementById("docIdInput");
const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const resultSection = document.getElementById("result");

function hideWallet() {
  if (walletButton) {
    walletButton.classList.add("hidden", "disabled");
    walletButton.disabled = true;
  }
}

function setResult(isMatch, docId, hash) {
  resultSection.classList.remove("hidden");
  statusEl.textContent = isMatch ? "Blockchain record matches." : "No matching record found.";
  detailsEl.innerHTML = `
    <dt>Document ID</dt><dd>${docId}</dd>
    <dt>Hash</dt><dd class="hash">${hash}</dd>
  `;
}

function updateMethodUI(value) {
  const useFile = value === "file";
  const useHash = value === "hash";
  fileInputGroup?.classList.toggle("hidden", !useFile);
  hashInputGroup?.classList.toggle("hidden", !useHash);
}

verifyForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const docId = docIdInput.value.trim();
  if (!docId) {
    alert("Document ID is required.");
    return;
  }

  try {
    const { match, docHash } = await verifyDocument({
      docId,
      file: fileInput?.files?.[0] || null,
      docHash: hashInput?.value.trim() || null,
    });
    setResult(match, docId, docHash);
    rememberDocument({ docId, docHash, verifiedAt: new Date().toISOString() });
  } catch (error) {
    alert(error.message ?? error);
  }
});

clearBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  docIdInput.value = "";
  if (fileInput) fileInput.value = "";
  if (hashInput) hashInput.value = "";
  resultSection?.classList.add("hidden");
  statusEl.textContent = "";
  detailsEl.innerHTML = "";
  if (methodSelect) methodSelect.value = "";
  updateMethodUI("");
});

methodSelect?.addEventListener("change", (e) => {
  updateMethodUI(e.target.value);
});

navLogout?.classList.add("uc-button", "secondary");
navLogout?.addEventListener("click", async () => {
  await signOut();
  window.location.href = "signin.html";
});

(async () => {
  const user = await getSessionUser();
  if (!user) {
    window.location.href = "signin.html";
    return;
  }
  hideWallet(); // verify is read-only
  updateMethodUI(methodSelect?.value || "");
})();