import { rememberDocument, verifyDocument, bindWalletButton } from "./registry.js";
import { supabase, getSessionUser, getUserRole, signOut } from "./supabaseClient.js";

const walletButtonId = "walletButton";
const fileInputId = "fileInput";
const docIdInputId = "docIdInput";
const hashInputId = "hashInput";
const verifyForm = document.getElementById("verifyForm");
const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const resultSection = document.getElementById("result");
const navLogout = document.getElementById("nav-logout");
const navLinks = document.getElementById("nav-links");
let walletBound = false;

function setAdminNav() {
  if (!navLinks) return;
  navLinks.innerHTML = `
    <li><a href="admin.html">Profile</a></li>
    <li><a href="faculty_staff.html">Register</a></li>
    <li><a href="verify.html" class="active">Verify</a></li>
    <li><a href="request.html">Request</a></li>
  `;
  const btn = document.getElementById(walletButtonId);
  if (btn && !walletBound) {
    btn.classList.remove("hidden", "disabled");
    btn.disabled = false;
    bindWalletButton(btn);
    walletBound = true;
  }
}

function setStudentNav() {
  if (!navLinks) return;
  navLinks.innerHTML = `
    <li><a href="my_documents.html">Profile</a></li>
    <li><a href="request.html">Request</a></li>
    <li><a href="verify.html" class="active">Verify</a></li>
  `;
  const btn = document.getElementById(walletButtonId);
  if (btn) {
    btn.classList.add("hidden", "disabled");
    btn.disabled = true;
  }
}

function setResult(isMatch, docId, hash) {
  resultSection.classList.remove("hidden");
  statusEl.textContent = isMatch ? "✔ Blockchain record matches." : "✖ No matching record found.";
  detailsEl.innerHTML = `
    <dt>Document ID</dt><dd>${docId}</dd>
    <dt>Hash</dt><dd class="hash">${hash}</dd>
  `;
}

verifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const docIdInput = document.getElementById(docIdInputId);
  const hashInput = document.getElementById(hashInputId);
  const fileInput = document.getElementById(fileInputId);

  const docId = docIdInput.value.trim();
  if (!docId) {
    alert("Document ID is required.");
    return;
  }

  try {
    const { match, docHash } = await verifyDocument({
      docId,
      file: fileInput.files[0] || null,
      docHash: hashInput.value.trim() || null,
    });
    setResult(match, docId, docHash);
    rememberDocument({ docId, docHash, verifiedAt: new Date().toISOString() });
  } catch (error) {
    alert(error.message ?? error);
  }
});

(async () => {
  const user = await getSessionUser();
  if (user) {
    const role = getUserRole(user);
    if (role === "admin") {
      setAdminNav();
    } else {
      setStudentNav();
    }
  } else {
    setStudentNav();
  }

  navLogout?.classList.add("uc-button", "secondary");
  navLogout?.addEventListener("click", async () => {
    await signOut();
    window.location.href = "signin.html";
  });
})();
