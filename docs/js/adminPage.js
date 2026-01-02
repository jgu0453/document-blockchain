import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.11.1/dist/ethers.min.js";
import { supabase, signIn, signOut, getSessionUser, onAuthChange, getUserRole } from "./supabaseClient.js";
import { listPendingRequests, updateRequestStatus } from "./requestsApi.js";
import { registerDocument, hashFile, bindWalletButton, setActiveContractAddress } from "./registry.js";
import { createDeployment, listDeploymentsByUser } from "./deploymentsApi.js";

const walletButton = document.getElementById("walletButton");
const logoutBtn = document.getElementById("nav-logout");
const warningEl = document.getElementById("admin-warning");
const listEl = document.getElementById("pending-requests");
const authStatus = document.getElementById("auth-status");

const factoryAddressInput = document.getElementById("factoryAddress");
const deploymentLabelInput = document.getElementById("deploymentLabel");
const deployBtn = document.getElementById("deployRegistryBtn");
const deploymentStatus = document.getElementById("deployment-status");
const deploymentsList = document.getElementById("deployments-list");

const FACTORY_ADDRESS_KEY = "doc-registry:factory";
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

function getFactoryAddress() {
  return factoryAddressInput?.value?.trim() || localStorage.getItem(FACTORY_ADDRESS_KEY) || "";
}

function rememberFactoryAddress(addr) {
  if (addr) {
    localStorage.setItem(FACTORY_ADDRESS_KEY, addr);
  }
}

async function getSigner() {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask or an Ethereum-compatible wallet.");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

function renderDeployments(items) {
  if (!deploymentsList) return;
  if (!items.length) {
    deploymentsList.innerHTML = `<p class="muted">No registries yet. Deploy one above.</p>`;
    return;
  }
  deploymentsList.innerHTML = items
    .map(
      (d) => `
      <div class="list-item">
        <div>
          <div class="bold">${d.label || "(no label)"}</div>
          <div class="muted">${d.contract_address}</div>
          ${d.created_at ? `<div class="muted">Created: ${new Date(d.created_at).toLocaleString()}</div>` : ""}
        </div>
        <div class="actions">
          <button data-action="use" data-address="${d.contract_address}">Use</button>
          <a class="secondary" href="admin_verify.html?contract=${d.contract_address}">Verify</a>
        </div>
      </div>
    `
    )
    .join("");
}

async function loadDeployments() {
  try {
    const rows = await listDeploymentsByUser();
    renderDeployments(rows);
  } catch (err) {
    renderDeployments([]);
    console.error(err);
  }
}

async function handleDeployRegistry() {
  try {
    deploymentStatus && showStatus(deploymentStatus, "Deploying…", "muted");
    const label = deploymentLabelInput?.value.trim() || "";
    const factoryAddress = getFactoryAddress();
    if (!factoryAddress) throw new Error("Factory address is required.");

    const signer = await getSigner();
    const factoryAbi = [
      "event RegistryDeployed(address indexed registry, address indexed owner, string label)",
      "function deployRegistry(string label) returns(address)",
    ];
    const factory = new ethers.Contract(factoryAddress, factoryAbi, signer);
    const tx = await factory.deployRegistry(label);
    const receipt = await tx.wait();

    let registryAddr = "";
    const iface = new ethers.Interface(factoryAbi);
    for (const log of receipt.logs || []) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "RegistryDeployed") {
          registryAddr = parsed.args?.registry;
          break;
        }
      } catch (e) {
        // ignore non-matching logs
      }
    }
    if (!registryAddr) {
      throw new Error("Unable to read deployed registry address from transaction.");
    }

    rememberFactoryAddress(factoryAddress);
    await createDeployment({ contractAddress: registryAddr, label });
    setActiveContractAddress(registryAddr);
    deploymentStatus && showStatus(deploymentStatus, `Deployed ${registryAddr}`, "success");
    deploymentLabelInput.value = "";
    await loadDeployments();
  } catch (err) {
    deploymentStatus && showStatus(deploymentStatus, err.message || err, "error");
  }
}

async function refreshRequests() {
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
      await refreshRequests();
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
      await refreshRequests();
    } catch (err) {
      alert(err.message || err);
    } finally {
      input.value = "";
    }
  });

  deploymentsList?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const addr = btn.dataset.address;
    if (action === "use" && addr) {
      setActiveContractAddress(addr);
      alert(`Active registry set to ${addr}`);
    }
  });
}

async function init() {
  if (!supabase) {
    showStatus(authStatus, "Supabase config missing (add supabase-config.js)", "error");
    return;
  }
  if (factoryAddressInput) {
    factoryAddressInput.value = localStorage.getItem(FACTORY_ADDRESS_KEY) || "";
  }
  const user = await getSessionUser();
  if (!user || !guardAdmin(user)) return;
  enableWalletForAdmin();
  showStatus(authStatus, `Signed in as ${user.email}`, "success");

  deployBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    await handleDeployRegistry();
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut();
    showStatus(authStatus, "Signed out", "muted");
    window.location.href = "signin.html";
  });

  onAuthChange((u) => {
    if (u) {
      showStatus(authStatus, `Signed in as ${u.email}`, "success");
      guardAdmin(u);
      enableWalletForAdmin();
    } else {
      showStatus(authStatus, "Not signed in", "muted");
    }
  });

  bindListActions();
  await refreshRequests();
  await loadDeployments();
}

init();