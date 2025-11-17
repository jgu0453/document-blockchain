import { supabase, signIn, signOut, getSessionUser, onAuthChange, getUserRole } from "./supabaseClient.js";
import { listPendingRequests, updateRequestStatus } from "./requestsApi.js";
import { registerDocument, hashFile, bindWalletButton } from "./registry.js";

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn") || document.getElementById("nav-logout");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const authStatus = document.getElementById("auth-status");
const warningEl = document.getElementById("admin-warning");
const listEl = document.getElementById("pending-requests");
const walletButton = document.getElementById("walletButton");
let walletBound = false;

function showStatus(el, text, kind = "") {
  if (!el) return;
  el.textContent = text;
  el.className = `status ${kind}`.trim();
}

function guardAdmin(user) {
  const role = getUserRole(user);
  const ok = role === "admin";
  warningEl?.classList.toggle("hidden", ok);
  if (!ok) {
    window.location.href = "signin.html";
  }
  return ok;
}

function enableWalletForAdmin() {
  if (walletButton && !walletBound) {
    walletButton.classList.remove("hidden", "disabled");
    walletButton.disabled = false;
    bindWalletButton(walletButton);
    walletBound = true;
  }
}

async function refresh() {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user || !guardAdmin(user.user)) {
    listEl.innerHTML = "<p class='muted'>Admin role required.</p>";
    return;
  }
  enableWalletForAdmin();
  try {
    const rows = await listPendingRequests();
    if (!rows.length) {
      listEl.innerHTML = "<p class='muted'>No pending requests.</p>";
      return;
    }
    listEl.innerHTML = rows
      .map(
        (r) => `
        <div class="list-item">
          <div>
            <div class="bold">${r.doc_type}</div>
            <div class="muted">Requested: ${new Date(r.created_at).toLocaleString()}</div>
            ${r.notes ? `<div class="muted">Notes: ${JSON.stringify(r.notes)}</div>` : ""}
            <div class="muted">Status: ${r.status}</div>
          </div>
          <div class="actions">
            <button data-action="approve" data-id="${r.id}">Approve</button>
            <button data-action="deny" data-id="${r.id}" class="secondary">Deny</button>
            <label class="file-upload">Issue (upload file)
              <input type="file" data-action="issue" data-id="${r.id}" accept=".pdf,.png,.jpg,.jpeg">
            </label>
          </div>
        </div>
      `
      )
      .join("");
  } catch (err) {
    listEl.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function bindAuth() {
  loginBtn?.addEventListener("click", async () => {
    try {
      await signIn(emailInput.value, passwordInput.value);
      showStatus(authStatus, "Signed in", "success");
      const user = await getSessionUser();
      if (user && guardAdmin(user)) {
        enableWalletForAdmin();
        refresh();
      }
    } catch (err) {
      showStatus(authStatus, err.message || err, "error");
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut();
    showStatus(authStatus, "Signed out", "muted");
    listEl.innerHTML = "";
    window.location.href = "signin.html";
  });

  onAuthChange((user) => {
    if (user) {
      showStatus(authStatus, `Signed in as ${user.email}`, "success");
      guardAdmin(user);
      enableWalletForAdmin();
    } else {
      showStatus(authStatus, "Not signed in", "muted");
    }
  });
}

function bindListActions() {
  listEl?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (!id || !action) return;
    try {
      if (action === "approve") {
        await updateRequestStatus(id, "approved");
      } else if (action === "deny") {
        await updateRequestStatus(id, "denied");
      }
      await refresh();
    } catch (err) {
      alert(err.message || err);
    }
  });

  listEl?.addEventListener("change", async (e) => {
    const input = e.target;
    if (input?.dataset?.action !== "issue") return;
    const file = input.files?.[0];
    const id = input.dataset.id;
    if (!file || !id) return;
    try {
      const docId = crypto.randomUUID();
      const docHashHex = await hashFile(file);
      const { txHash } = await registerDocument({ docId, file });
      const path = `${id}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("documents").getPublicUrl(path);
      await updateRequestStatus(id, "issued", {
        tx_hash: txHash,
        doc_hash: docHashHex,
        doc_id: docId,
        file_url: publicUrlData?.publicUrl ?? null,
        issued_at: new Date().toISOString(),
      });
      alert("Issued and recorded on-chain.");
      await refresh();
    } catch (err) {
      alert(err.message || err);
    } finally {
      input.value = "";
    }
  });
}

async function init() {
  if (!supabase) {
    showStatus(authStatus, "Supabase config missing (add supabase-config.js)", "error");
    return;
  }
  const user = await getSessionUser();
  if (!user || !guardAdmin(user)) return;
  enableWalletForAdmin();
  showStatus(authStatus, `Signed in as ${user.email}`, "success");
  bindAuth();
  bindListActions();
  refresh();
}

init();
