import { verifyDocument } from "./registry.js";
import { supabase, getSessionUser, getUserRole, signOut } from "./supabaseClient.js";
import { listDocumentsByStudent } from "./documentsApi.js";

const walletButton = document.getElementById("walletButton");
const refreshBtn = document.getElementById("clearHistoryBtn");
const historyTable = document.getElementById("historyTable");
const verifyResult = document.getElementById("verifyResult");
const verifyStatus = document.getElementById("verifyStatus");
const verifyDetails = document.getElementById("verifyDetails");
const navLogout = document.getElementById("nav-logout");
let documents = [];
let studentId = null;

function disableWalletButton() {
  if (walletButton) {
    walletButton.disabled = true;
    walletButton.textContent = "Admin-only wallet";
    walletButton.classList.add("disabled");
  }
}

async function ensureStudentWithId() {
  const user = await getSessionUser();
  if (!user || getUserRole(user) !== "student") {
    window.location.href = "signin.html";
    return null;
  }
  const sid = user.user_metadata?.studentId;
  if (!sid) {
    alert("Your account is missing a student ID. Please contact an admin.");
    return null;
  }
  studentId = sid;
  return user;
}

function renderDocuments() {
  const tbody = historyTable.querySelector("tbody");
  tbody.innerHTML = "";
  if (!documents.length) {
    const row = document.createElement("tr");
    row.className = "placeholder";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = "No documents found for your account.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  documents.forEach((item, index) => {
    const issued = item.issued_at ? new Date(item.issued_at).toLocaleString() : "-";
    const txLink = item.tx_hash
      ? `<a href="https://sepolia.etherscan.io/tx/${item.tx_hash}" target="_blank" rel="noopener">Transaction</a>`
      : "";
    const downloadLink = item.file_url
      ? `<a href="${item.file_url}" target="_blank" rel="noopener">Download</a>`
      : "";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.doc_id}</td>
      <td class="hash">${item.doc_hash}</td>
      <td>${issued}</td>
      <td class="actions">
        <button data-action="verify" data-index="${index}">Verify</button>
        ${downloadLink ? `<span class="dot"></span>${downloadLink}` : ""}
        ${txLink ? `<span class="dot"></span>${txLink}` : ""}
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function handleTableClick(e) {
  const action = e.target.dataset.action;
  const idx = Number(e.target.dataset.index);
  if (Number.isNaN(idx) || action !== "verify") return;
  const entry = documents[idx];
  if (!entry) return;
  try {
    const { match } = await verifyDocument({ docId: entry.doc_id, docHash: entry.doc_hash });
    verifyResult.classList.remove("hidden");
    verifyStatus.textContent = match ? "Blockchain record matches." : "No matching record found.";
    verifyDetails.innerHTML = `
      <dt>Document ID</dt><dd>${entry.doc_id}</dd>
      <dt>Hash</dt><dd>${entry.doc_hash}</dd>
    `;
  } catch (err) {
    alert(err.message || err);
  }
}

async function loadDocuments() {
  try {
    documents = await listDocumentsByStudent(studentId);
    renderDocuments();
  } catch (err) {
    alert(err.message || err);
  }
}

async function init() {
  disableWalletButton();
  const user = await ensureStudentWithId();
  if (!user) return;

  await loadDocuments();

  refreshBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    loadDocuments();
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