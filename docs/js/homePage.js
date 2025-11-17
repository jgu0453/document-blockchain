import { supabase, getSessionUser, getUserRole, signOut } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut();
      window.location.href = "signin.html";
    });
  }

  const user = await getSessionUser();
  if (user) {
    const role = getUserRole(user);
    if (role === "admin") {
      window.location.href = "admin.html";
    } else if (role === "student") {
      window.location.href = "my_documents.html";
    }
  }
});
