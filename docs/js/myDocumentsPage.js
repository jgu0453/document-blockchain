import {
  bindWalletButton,
  clearRememberedDocuments,
  getRememberedDocuments,
  rememberDocument,
  removeRememberedDocument,
  verifyDocument
} from "./registry.js";

const setupWalletButton = () => bindWalletButton(document.getElementById("walletButton"));


document.addEventListener("DOMContentLoaded", () => {
  setupWalletButton();

  const tableBody = document.querySelector("#historyTable tbody");
  const resultBox = document.getElementById("verifyResult");
  const statusEl = document.getElementById("verifyStatus");
  const detailsEl = document.getElementById("verifyDetails");
  const clearBtn = document.getElementById("clearHistoryBtn");

  const renderRows = () => {
    const docs = getRememberedDocuments();
    tableBody.innerHTML = "";
    if (!docs.length) {
      const row = document.createElement("tr");
      row.classList.add("placeholder");
      row.innerHTML = `<td colspan="4">No documents stored yet. Register or verify a document to see it here.</td>`;
      tableBody.appendChild(row);
      return;
    }

    docs.forEach((entry) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${entry.docId}</td>
        <td class="hash">${entry.docHash}</td>
        <td>${formatTimestamp(entry)}</td>
        <td class="actions">
          <button class="uc-button inline" data-action="verify">Verify</button>
          <button class="uc-button inline subtle" data-action="remove">Remove</button>
        </td>
      `;

      row.querySelector('[data-action="verify"]').addEventListener("click", async () => {
        await handleVerify(entry);
      });

      row.querySelector('[data-action="remove"]').addEventListener("click", () => {
        removeRememberedDocument(entry.docId, entry.docHash);
        renderRows();
      });

      tableBody.appendChild(row);
    });
  };

  const handleVerify = async (entry) => {
    resultBox.classList.remove("hidden");
    statusEl.textContent = "Verifying document...";
    detailsEl.innerHTML = "";

    try {
      const result = await verifyDocument({ docId: entry.docId, docHash: entry.docHash });
      const now = new Date().toLocaleString();

      detailsEl.innerHTML = `
        <dt>Document ID</dt><dd>${result.docId}</dd>
        <dt>Document Hash</dt><dd class="hash">${result.docHash}</dd>
        <dt>Checked At</dt><dd>${now}</dd>
      `;

      if (result.match) {
        statusEl.textContent = "? Blockchain record matches.";
        rememberDocument({ ...entry, verifiedAt: new Date().toISOString() });
        renderRows();
      } else {
        statusEl.textContent = "?? No matching record found.";
      }
    } catch (error) {
      console.error(error);
      statusEl.textContent = `? ${error.message ?? error}`;
    }
  };

  clearBtn.addEventListener("click", () => {
    clearRememberedDocuments();
    renderRows();
    resultBox.classList.add("hidden");
  });

  const formatTimestamp = (entry) => {
    if (entry.registeredAt) {
      return `Registered ${new Date(entry.registeredAt).toLocaleString()}`;
    }
    if (entry.verifiedAt) {
      return `Verified ${new Date(entry.verifiedAt).toLocaleString()}`;
    }
    return "—";
  };

  renderRows();
});

