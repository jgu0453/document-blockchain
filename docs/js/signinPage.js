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
  } else {
    alert("Your account does not have a valid role. Please contact support.");
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabase) {
    alert("Supabase configuration is missing.");
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
