import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.11.1/dist/ethers.min.js";

const CONTRACT_ADDRESS = "0x8b4e10c530EC6d0850508Ad33Dc9535f5f04b720";
const CONTRACT_ABI = [
  "function registerDocument(bytes32 docId, bytes32 docHash, string uri)",
  "function verifyDocument(bytes32 docId, bytes32 docHash) view returns (bool)"
];

let provider;
let signer;
let contract;

const connectButton = document.getElementById("connectButton");
const registerForm = document.getElementById("registerForm");
const registerStatus = document.getElementById("registerStatus");
const verifyForm = document.getElementById("verifyForm");
const verifyStatus = document.getElementById("verifyStatus");

connectButton.addEventListener("click", async () => {
  if (!window.ethereum) {
    alert("Please install MetaMask to use this app.");
    return;
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  const address = await signer.getAddress();
  connectButton.textContent = `${address.slice(0, 6)}…${address.slice(-4)}`;
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!contract) {
    registerStatus.textContent = "Connect your wallet first.";
    return;
  }

  const docIdInput = document.getElementById("docId").value.trim();
  const file = document.getElementById("docFile").files[0];
  const uri = document.getElementById("docUri").value.trim();

  if (!docIdInput || !file) {
    registerStatus.textContent = "Provide a document ID and file.";
    return;
  }

  try {
    registerStatus.textContent = "Hashing document…";
    const docHash = await hashFile(file);
    const docId = ethers.id(docIdInput);

    registerStatus.textContent = "Sending transaction…";
    const tx = await contract.registerDocument(docId, docHash, uri);
    await tx.wait();

    registerStatus.textContent = `Registered. Tx hash: ${tx.hash}`;
    registerForm.reset();
  } catch (error) {
    console.error(error);
    registerStatus.textContent = shortError(error);
  }
});

verifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const docIdInput = document.getElementById("verifyDocId").value.trim();
  const file = document.getElementById("verifyFile").files[0];

  if (!docIdInput || !file) {
    verifyStatus.textContent = "Provide a document ID and file.";
    return;
  }

  try {
    verifyStatus.textContent = "Hashing document…";
    const docHash = await hashFile(file);
    const docId = ethers.id(docIdInput);

    const readOnly = contract ?? new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, await getProvider());
    const valid = await readOnly.verifyDocument(docId, docHash);

    verifyStatus.textContent = valid ? "✅ Document verified on-chain." : "❌ No matching record found.";
  } catch (error) {
    console.error(error);
    verifyStatus.textContent = shortError(error);
  }
});

async function getProvider() {
  if (provider) {
    return provider;
  }
  if (!window.ethereum) {
    throw new Error("MetaMask required for verification.");
  }
  provider = new ethers.BrowserProvider(window.ethereum);
  return provider;
}

async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return ethers.hexlify(new Uint8Array(hashBuffer));
}

function shortError(error) {
  if (error?.shortMessage) return error.shortMessage;
  if (error?.message) return error.message.split("\n")[0];
  return "Unexpected error occurred.";
}


