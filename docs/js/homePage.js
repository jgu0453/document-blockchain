import { supabase, getSessionUser, getUserRole, signOut } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await getSessionUser();
  if (user) {
    const role = getUserRole(user);
    if (role === "admin") {
      window.location.href = "admin.html";
      return;
    }
    if (role === "student") {
      window.location.href = "my_documents.html";
      return;
    }
  }
});
