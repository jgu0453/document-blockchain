import { supabase, signIn, getSessionUser, getUserRole, onAuthChange } from "./supabaseClient.js";

const form = document.getElementById("signin-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const authStatus = document.getElementById("auth-status");

function setStatus(text, kind = "") {
  if (!authStatus) return;
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

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabase) {
    setStatus("Supabase config missing", "error");
    return;
  }
  try {
    await signIn(emailInput.value, passwordInput.value);
    const user = await getSessionUser();
    if (user) {
      setStatus("Signed in", "success");
      redirectByRole(user);
    }
  } catch (err) {
    setStatus(err.message || err, "error");
  }
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
    redirectByRole(user);
  }
})();
