import { supabase, signIn, getSessionUser, getUserRole, signOut } from "./supabaseClient.js";

const form = document.getElementById("signin-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");

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
    alert("Supabase config missing");
    return;
  }
  try {
    await signIn(emailInput.value, passwordInput.value);
    const user = await getSessionUser();
    if (user) {
      redirectByRole(user);
    }
  } catch (err) {
    alert(err.message || err);
  }
});

(async () => {
  // Clear any existing session when loading sign-in so users must sign in each visit
  if (supabase) {
    await signOut();
  }
})();
