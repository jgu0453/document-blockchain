import { supabase, signIn, signOut, getSessionUser, onAuthChange, getUserRole } from "./supabaseClient.js";
import { createRequest, listMyRequests } from "./requestsApi.js";
import { bindWalletButton } from "./registry.js";

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("nav-logout") || document.getElementById("logout-btn");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const authStatus = document.getElementById("auth-status");

const form = document.getElementById("request-form");
const messageEl = document.getElementById("request-message");
const myRequestsEl = document.getElementById("my-requests");

const walletButton = document.getElementById("walletButton");
const navLinks = document.getElementById("nav-links");

function showStatus(el, text, kind = "") {
  if (!el) return;
  el.textContent = text;
  el.className = `status ${kind}`.trim();
}

async function ensureSignedIn() {
  const user = await getSessionUser();
  if (!user) {
    window.location.href = "signin.html";
    return null;
  }
  return user;
}

function configureNavForRole(role) {
  if (!navLinks) return;
  if (role === "admin") {
    navLinks.innerHTML = `
      <li><a href="admin.html">Profile</a></li>
      <li><a href="faculty_staff.html">Register</a></li>
      <li><a href="verify.html">Verify</a></li>
      <li><a href="request.html" class="active">Request</a></li>
    `;
    if (walletButton) {
      walletButton.classList.remove("hidden", "disabled");
      walletButton.disabled = false;
      bindWalletButton(walletButton);
    }
  } else {
    navLinks.innerHTML = `
      <li><a href="signin.html">Sign In</a></li>
      <li><a href="my_documents.html">Profile</a></li>
      <li><a href="request.html" class="active">Request</a></li>
      <li><a href="verify.html">Verify</a></li>
    `;
    if (walletButton) {
      walletButton.classList.add("hidden");
      walletButton.disabled = true;
    }
  }
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
      const user = await ensureSignedIn();
      if (user) {
        configureNavForRole(getUserRole(user));
        refreshRequests();
      }
    } catch (err) {
      showStatus(authStatus, err.message || err, "error");
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut();
    showStatus(authStatus, "Signed out", "muted");
    myRequestsEl.innerHTML = "";
    window.location.href = "signin.html";
  });

  onAuthChange((user) => {
    if (user) {
      showStatus(authStatus, `Signed in as ${user.email}`, "success");
      configureNavForRole(getUserRole(user));
    } else {
      showStatus(authStatus, "Not signed in", "muted");
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

async function init() {
  if (!supabase) {
    showStatus(authStatus, "Supabase config missing (add supabase-config.js)", "error");
    return;
  }
  const user = await ensureSignedIn();
  if (!user) return;
  const role = getUserRole(user);
  configureNavForRole(role);
  showStatus(authStatus, `Signed in as ${user.email}`, "success");
  bindAuth();
  bindForm();
  refreshRequests();
}

init();
