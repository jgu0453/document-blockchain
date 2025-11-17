import { supabase, getSessionUser, getUserRole, signOut } from "./supabaseClient.js";
import { createRequest, listMyRequests } from "./requestsApi.js";
import { bindWalletButton } from "./registry.js";

const form = document.getElementById("request-form");
const messageEl = document.getElementById("request-message");
const myRequestsEl = document.getElementById("my-requests");
const walletButton = document.getElementById("walletButton");
const navLogout = document.getElementById("nav-logout");

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

async function ensureSignedIn() {
  const user = await getSessionUser();
  if (!user) {
    window.location.href = "signin.html";
    return null;
  }
  return user;
}

async function refreshRequests() {
  try {
    const requests = await listMyRequests();
    if (!requests.length) {
      myRequestsEl.innerHTML = "<p class='muted'>No requests yet.</p>";
      return;
    }
    myRequestsEl.innerHTML = requests
      .map(
        (r) => `
        <div class="list-item">
          <div>
            <div class="bold">${r.doc_type}</div>
            <div class="muted">${r.status} — ${new Date(r.created_at).toLocaleString()}</div>
            ${r.tx_hash ? `<div class="muted">Tx: ${r.tx_hash}</div>` : ""}
            ${r.file_url ? `<div class="muted">File: ${r.file_url}</div>` : ""}
          </div>
        </div>
      `
      )
      .join("");
  } catch (err) {
    myRequestsEl.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function bindForm() {
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const docType = data.get("docType")?.toString().trim();
    const notes = data.get("notes")?.toString().trim() || null;
    if (!docType) {
      messageEl.textContent = "Document type is required";
      messageEl.className = "status error";
      return;
    }
    try {
      await createRequest({ docType, notes });
      form.reset();
      messageEl.textContent = "Request submitted";
      messageEl.className = "status success";
      refreshRequests();
    } catch (err) {
      messageEl.textContent = err.message || err;
      messageEl.className = "status error";
    }
  });
}

async function init() {
  if (!supabase) {
    messageEl.textContent = "Supabase config missing";
    messageEl.className = "status error";
    return;
  }
  const user = await ensureSignedIn();
  if (!user) return;
  const role = getUserRole(user);
  if (role === "admin") {
    enableWallet();
  } else {
    hideWallet();
  }
  bindForm();
  refreshRequests();
  navLogout?.classList.add("uc-button", "secondary");
  navLogout?.addEventListener("click", async () => {
    await signOut();
    window.location.href = "signin.html";
  });
}

init();
