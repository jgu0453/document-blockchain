import {
  rememberDocument,
  removeRememberedDocument,
  getRememberedDocuments,
  verifyDocument,
} from "./registry.js";
import { supabase, getSessionUser, getUserRole, signOut } from "./supabaseClient.js";

const walletButton = document.getElementById("walletButton");
const clearBtn = document.getElementById("clearHistoryBtn");
const historyTable = document.getElementById("historyTable");
const verifyResult = document.getElementById("verifyResult");
const verifyStatus = document.getElementById("verifyStatus");
const verifyDetails = document.getElementById("verifyDetails");
const navLogout = document.getElementById("nav-logout");
let currentHistory = [];

function disableWalletButton() {
  if (walletButton) {
    walletButton.disabled = true;
    walletButton.textContent = "Admin-only wallet";
    walletButton.classList.add("disabled");
  }
}

async function ensureStudent() {
  const user = await getSessionUser();
  if (!user || getUserRole(user) !== "student") {
    window.location.href = "signin.html";
    return null;
  }
  return user;
}

function renderHistory() {
  const tbody = historyTable.querySelector("tbody");
  tbody.innerHTML = "";
  if (!currentHistory.length) {
    const row = document.createElement("tr");
    row.className = "placeholder";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "No documents stored yet. Register or verify a document to see it here.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  currentHistory.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.docId}</td>
      <td class="hash">${item.docHash}</td>
      <td>${new Date(item.registeredAt || item.verifiedAt || Date.now()).toLocaleString()}</td>
      <td class="actions">
        <button data-action="verify" data-index="${index}">Verify</button>
        <button data-action="remove" data-index="${index}" class="secondary">Remove</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function showResult(match, entry) {
  verifyResult.classList.remove("hidden");
  verifyStatus.textContent = match ? "Blockchain record matches." : "No matching record found.";
  verifyDetails.innerHTML = `
    <dt>Document ID</dt><dd>${entry.docId}</dd>
    <dt>Hash</dt><dd>${entry.docHash}</dd>
  `;
}

async function handleTableClick(e) {
  const action = e.target.dataset.action;
  const idx = Number(e.target.dataset.index);
  if (Number.isNaN(idx)) return;
  const entry = currentHistory[idx];
  if (!entry) return;

  if (action === "remove") {
    removeRememberedDocument(entry.docId, entry.docHash);
    currentHistory = getRememberedDocuments();
    renderHistory();
    return;
  }

  if (action === "verify") {
    try {
      const { match } = await verifyDocument({ docId: entry.docId, docHash: entry.docHash });
      showResult(match, entry);
    } catch (err) {
      alert(err.message || err);
    }
  }
}

async function init() {
  disableWalletButton();
  const user = await ensureStudent();
  if (!user) return;

  currentHistory = getRememberedDocuments();
  renderHistory();

  clearBtn?.addEventListener("click", () => {
    localStorage.clear();
    currentHistory = [];
    renderHistory();
  });

  historyTable?.addEventListener("click", handleTableClick);
  navLogout?.addEventListener("click", async () => {
    await signOut();
    window.location.href = "signin.html";
  });
}

if (supabase) {
  init();
} else {
  disableWalletButton();
}
