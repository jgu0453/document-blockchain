import { supabase, signIn, signOut, getSessionUser, getUserRole, onAuthChange } from "./supabaseClient.js";

const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const authStatus = document.getElementById("auth-status");

function setStatus(text, kind = "") {
  authStatus.textContent = text;
  authStatus.className = `status ${kind}`.trim();
}

function redirectByRole(user) {
  const role = getUserRole(user);
  if (role === "admin") {
    window.location.href = "admin.html";
  } else if (role === "student") {
    window.location.href = "my_documents.html";
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
    if (user) redirectByRole(user);
  } catch (err) {
    setStatus(err.message || err, "error");
  }
});

logoutBtn?.addEventListener("click", async () => {
  await signOut();
  setStatus("Signed out", "muted");
});

onAuthChange((user) => {
  if (user) {
    setStatus(`Signed in as ${user.email}`, "success");
  } else {
    setStatus("Not signed in", "muted");
  }
});

(async () => {
  const user = await getSessionUser();
  if (user) {
    setStatus(`Signed in as ${user.email}`, "success");
  }
})();
