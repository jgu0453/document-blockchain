import { bindWalletButton, registerDocument } from "./registry.js";
const setupWalletButton = () => bindWalletButton(document.getElementById("walletButton"));


document.addEventListener("DOMContentLoaded", () => {
  setupWalletButton();

  const docIdInput = document.getElementById("docIdInput");
  const fileInput = document.getElementById("fileInput");
  const uriInput = document.getElementById("uriInput");
  const registerBtn = document.getElementById("registerBtn");
  const resetBtn = document.getElementById("resetBtn");
  const resultSection = document.getElementById("result");
  const statusEl = document.getElementById("status");
  const detailsEl = document.getElementById("details");

  const resetForm = () => {
    docIdInput.value = "";
    fileInput.value = "";
    uriInput.value = "";
    resultSection.classList.add("hidden");
    statusEl.textContent = "Awaiting submission…";
    detailsEl.innerHTML = "";
  };

  resetBtn.addEventListener("click", (event) => {
    event.preventDefault();
    resetForm();
  });

  registerBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    const docId = docIdInput.value.trim();
    const file = fileInput.files[0];
    const uri = uriInput.value.trim();

    resultSection.classList.remove("hidden");
    statusEl.textContent = "Registering document on-chain…";
    detailsEl.innerHTML = "";

    try {
      if (!docId) {
        throw new Error("Document ID is required.");
      }
      if (!file) {
        throw new Error("Select a document file to register.");
      }

      const result = await registerDocument({ docId, file, uri });
      const now = new Date().toLocaleString();

      statusEl.textContent = "✅ Document registered successfully.";
      detailsEl.innerHTML = `
        <dt>Document ID</dt><dd>${docId}</dd>
        <dt>Document Hash</dt><dd class="hash">${result.docHash}</dd>
        <dt>Transaction Hash</dt><dd><a href="https://sepolia.etherscan.io/tx/${result.txHash}" target="_blank" rel="noopener">${result.txHash}</a></dd>
        <dt>Registered At</dt><dd>${now}</dd>
        ${uri ? `<dt>Public URI</dt><dd><a href="${uri}" target="_blank" rel="noopener">${uri}</a></dd>` : ""}
      `;

      fileInput.value = "";
      uriInput.value = "";
    } catch (error) {
      console.error(error);
      statusEl.textContent = `❌ ${error.message ?? error}`;
    }
  });
});

