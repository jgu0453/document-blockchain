import { bindWalletButton, rememberDocument, verifyDocument } from "./registry.js";

const setupWalletButton = () => bindWalletButton(document.getElementById("walletButton"));

document.addEventListener("DOMContentLoaded", () => {
  setupWalletButton();

  const docIdInput = document.getElementById("docIdInput");
  const methodSelect = document.getElementById("methodSelect");
  const fileInputGroup = document.getElementById("fileInputGroup");
  const hashInputGroup = document.getElementById("hashInputGroup");
  const fileInput = document.getElementById("fileInput");
  const hashInput = document.getElementById("hashInput");
  const verifyBtn = document.getElementById("verifyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const resultSection = document.getElementById("result");
  const statusEl = document.getElementById("status");
  const detailsEl = document.getElementById("details");

  methodSelect.addEventListener("change", () => {
    const method = methodSelect.value;
    fileInputGroup.classList.toggle("hidden", method !== "file");
    hashInputGroup.classList.toggle("hidden", method !== "hash");
    if (method === "file") {
      hashInput.value = "";
    } else if (method === "hash") {
      fileInput.value = "";
    }
  });

  const resetForm = () => {
    docIdInput.value = "";
    methodSelect.value = "";
    fileInput.value = "";
    hashInput.value = "";
    fileInputGroup.classList.add("hidden");
    hashInputGroup.classList.add("hidden");
    resultSection.classList.add("hidden");
    detailsEl.innerHTML = "";
  };

  clearBtn.addEventListener("click", (event) => {
    event.preventDefault();
    resetForm();
  });

  verifyBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    const docId = docIdInput.value.trim();
    const method = methodSelect.value;
    const file = fileInput.files[0];
    const providedHash = hashInput.value.trim();

    resultSection.classList.remove("hidden");
    statusEl.textContent = "Verifying document...";
    detailsEl.innerHTML = "";

    try {
      if (!docId) {
        throw new Error("Document ID is required.");
      }
      if (method === "file" && !file) {
        throw new Error("Select a document file before verifying.");
      }
      if (method === "hash" && !providedHash) {
        throw new Error("Enter the document hash before verifying.");
      }
      if (!method) {
        throw new Error("Select a verification method.");
      }

      const result = await verifyDocument({
        docId,
        file: method === "file" ? file : undefined,
        docHash: method === "hash" ? providedHash : undefined
      });

      const now = new Date().toLocaleString();
      const methodLabel = method === "file" ? "File Upload" : "Hash Input";
      detailsEl.innerHTML = `
        <dt>Document ID</dt><dd>${result.docId}</dd>
        <dt>Document Hash</dt><dd class="hash">${result.docHash}</dd>
        <dt>Method</dt><dd>${methodLabel}</dd>
        <dt>Checked At</dt><dd>${now}</dd>
      `;

      if (result.match) {
        statusEl.textContent = "Blockchain record matches.";
        rememberDocument({
          docId: result.docId,
          docHash: result.docHash,
          verifiedAt: new Date().toISOString()
        });
      } else {
        statusEl.textContent = "No matching record found on-chain.";
      }
    } catch (error) {
      console.error(error);
      statusEl.textContent = `Error: ${error.message ?? error}`;
    }
  });
});
