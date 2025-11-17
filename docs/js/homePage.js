import { supabase, getSessionUser, signOut } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut();
      window.location.href = "signin.html";
    });
  }

  const user = await getSessionUser();
  if (user && logoutBtn) {
    logoutBtn.classList.remove("hidden");
  }
});
