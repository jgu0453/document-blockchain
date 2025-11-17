import { bindWalletButton } from "./registry.js";
import { supabase, getUserRole, signIn, signOut, onAuthChange, getSessionUser } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", () => {
  const walletButton = document.getElementById("walletButton");
  let walletBound = false;

  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const authStatus = document.getElementById("auth-status");

  function setStatus(text, kind = "") {
    authStatus.textContent = text;
    authStatus.className = `status ${kind}`.trim();
  }

  function ensureAdminWallet(user) {
    if (!walletButton) return false;
    const role = getUserRole(user);
    if (role === "admin") {
      if (!walletBound) {
        bindWalletButton(walletButton);
        walletBound = true;
      }
      walletButton.disabled = false;
      walletButton.textContent = "Connect Wallet";
      walletButton.classList.remove("disabled");
      return true;
    }
    walletButton.disabled = true;
    walletButton.textContent = "Admin-only wallet";
    walletButton.classList.add("disabled");
    return false;
  }

  async function redirectByRole(user) {
    const role = getUserRole(user);
    if (role === "admin") {
      window.location.href = "admin.html";
    } else if (role === "student") {
      window.location.href = "request.html";
    }
  }

  loginBtn?.addEventListener("click", async () => {
    if (!supabase) {
      setStatus("Supabase config missing", "error");
      return;
    }
    try {
      await signIn(emailInput.value, passwordInput.value);
      setStatus("Signed in", "success");
      const user = await getSessionUser();
      if (user) {
        ensureAdminWallet(user);
        setTimeout(() => redirectByRole(user), 300);
      }
    } catch (err) {
      setStatus(err.message || err, "error");
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut();
    setStatus("Signed out", "muted");
    if (walletButton) {
      walletButton.disabled = true;
      walletButton.textContent = "Admin-only wallet";
    }
  });

  onAuthChange((user) => {
    if (user) {
      setStatus(`Signed in as ${user.email}`, "success");
      ensureAdminWallet(user);
    } else {
      setStatus("Not signed in", "muted");
      if (walletButton) {
        walletButton.disabled = true;
        walletButton.textContent = "Admin-only wallet";
      }
    }
  });

  (async () => {
    const user = await getSessionUser();
    if (user) {
      setStatus(`Signed in as ${user.email}`, "success");
      ensureAdminWallet(user);
    } else if (walletButton) {
      walletButton.disabled = true;
      walletButton.textContent = "Admin-only wallet";
    }
  })();
});
