import { bindWalletButton, registerDocument } from "./registry.js";
import { supabase, getSessionUser, getUserRole, signOut } from "./supabaseClient.js";
import { insertDocumentRecord } from "./documentsApi.js";

const walletButton = document.getElementById("walletButton");
let walletBound = false;

async function ensureAdminOrRedirect() {
  const user = await getSessionUser();
  if (!user || getUserRole(user) !== "admin") {
    window.location.href = "signin.html";
    return null;
  }
  return user;
}

function enableWalletForAdmin() {
  if (walletButton && !walletBound) {
    walletButton.classList.remove("hidden", "disabled");
    walletButton.disabled = false;
    bindWalletButton(walletButton);
    walletBound = true;
  }
}

function showError(statusEl, message) {
  statusEl.textContent = message;
}

(async () => {
  const user = await ensureAdminOrRedirect();
  if (!user) return;
  enableWalletForAdmin();

  document.getElementById("nav-logout")?.addEventListener("click", async () => {
    await signOut();
    window.location.href = "signin.html";
  });

  const docIdInput = document.getElementById("docIdInput");
  const studentIdInput = document.getElementById("studentIdInput");
  const fileInput = document.getElementById("fileInput");
  const uriInput = document.getElementById("uriInput");
  const registerBtn = document.getElementById("registerBtn");
  const resetBtn = document.getElementById("resetBtn");
  const resultSection = document.getElementById("result");
  const statusEl = document.getElementById("status");
  const detailsEl = document.getElementById("details");

  const resetForm = () => {
    docIdInput.value = "";
    studentIdInput.value = "";
    fileInput.value = "";
    uriInput.value = "";
    resultSection.classList.add("hidden");
    statusEl.textContent = "Awaiting submission...";
    detailsEl.innerHTML = "";
  };

  resetBtn.addEventListener("click", (event) => {
    event.preventDefault();
    resetForm();
  });

  registerBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    const docId = docIdInput.value.trim();
    const studentId = studentIdInput.value.trim();
    const file = fileInput.files[0];
    const uri = uriInput.value.trim();

    resultSection.classList.remove("hidden");
    statusEl.textContent = "Registering document on-chain...";
    detailsEl.innerHTML = "";

    try {
      if (!docId) throw new Error("Document ID is required.");
      if (!studentId) throw new Error("Student ID is required.");
      if (!file) throw new Error("Select a document file to register.");
      if (!supabase) throw new Error("Supabase is not configured.");

      const regResult = await registerDocument({
        docId,
        file,
        uri,
        onTransactionSent: (txHash) => {
          statusEl.innerHTML = 'Registering document on-chain: <a href="https://sepolia.etherscan.io/tx/' + txHash + '" target="_blank" rel="noopener">' + txHash + '</a>';
        }
      });
      const nowIso = new Date().toISOString();

      const path = `${docId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("documents").getPublicUrl(path);
      const fileUrl = publicUrlData?.publicUrl ?? null;

      await insertDocumentRecord({
        docId,
        studentId,
        docHash: regResult.docHash,
        txHash: regResult.txHash,
        fileUrl,
        issuedAt: nowIso,
      });

      const txLink = `https://sepolia.etherscan.io/tx/${regResult.txHash}`;
      statusEl.textContent = "Document registered and stored.";
      detailsEl.innerHTML = `
        <dt>Document ID</dt><dd>${docId}</dd>
        <dt>Student ID</dt><dd>${studentId}</dd>
        <dt>Document Hash</dt><dd class="hash">${regResult.docHash}</dd>
        <dt>Transaction Hash</dt><dd><a href="${txLink}" target="_blank" rel="noopener">${regResult.txHash}</a></dd>
        <dt>Registered At</dt><dd>${new Date(nowIso).toLocaleString()}</dd>
        ${fileUrl ? `<dt>File</dt><dd><a href="${fileUrl}" target="_blank" rel="noopener">Download</a></dd>` : ""}
        ${uri ? `<dt>Public URI</dt><dd><a href="${uri}" target="_blank" rel="noopener">${uri}</a></dd>` : ""}
      `;

      fileInput.value = "";
      uriInput.value = "";
    } catch (error) {
      console.error(error);
      showError(statusEl, `Error: ${error.message ?? error}`);
    }
  });
})();