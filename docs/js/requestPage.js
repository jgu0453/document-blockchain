import { supabase, signIn, signOut, getSessionUser, onAuthChange } from "./supabaseClient.js";
import { createRequest, listMyRequests } from "./requestsApi.js";

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const authStatus = document.getElementById("auth-status");

const form = document.getElementById("request-form");
const messageEl = document.getElementById("request-message");
const myRequestsEl = document.getElementById("my-requests");

function showStatus(el, text, kind = "") {
  el.textContent = text;
  el.className = `status ${kind}`.trim();
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

function bindAuth() {
  loginBtn?.addEventListener("click", async () => {
    try {
      await signIn(emailInput.value, passwordInput.value);
      showStatus(authStatus, "Signed in", "success");
      refreshRequests();
    } catch (err) {
      showStatus(authStatus, err.message || err, "error");
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut();
    showStatus(authStatus, "Signed out", "muted");
    myRequestsEl.innerHTML = "";
  });

  onAuthChange((user) => {
    if (user) {
      showStatus(authStatus, `Signed in as ${user.email}`, "success");
      refreshRequests();
    } else {
      showStatus(authStatus, "Not signed in", "muted");
      myRequestsEl.innerHTML = "";
    }
  });
}

function bindForm() {
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const docType = data.get("docType")?.toString().trim();
    const notes = data.get("notes")?.toString().trim() || null;
    if (!docType) {
      showStatus(messageEl, "Document type is required", "error");
      return;
    }
    try {
      await createRequest({ docType, notes });
      form.reset();
      showStatus(messageEl, "Request submitted", "success");
      refreshRequests();
    } catch (err) {
      showStatus(messageEl, err.message || err, "error");
    }
  });
}

function init() {
  if (!supabase) {
    showStatus(authStatus, "Supabase config missing (add supabase-config.js)", "error");
    return;
  }
  bindAuth();
  bindForm();
  getSessionUser().then((user) => {
    if (user) {
      showStatus(authStatus, `Signed in as ${user.email}`, "success");
      refreshRequests();
    } else {
      showStatus(authStatus, "Not signed in", "muted");
    }
  });
}

init();
