import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.11.1/dist/ethers.min.js";

const CONTRACT_ADDRESS = "0xE8012eB7fA14Db7e83Abfd96ac6fD0D58292AB03";
const CONTRACT_ABI = [
  "function registerDocument(bytes32 docId, bytes32 docHash, string uri)",
  "function verifyDocument(bytes32 docId, bytes32 docHash) view returns (bool)"
];

const STORAGE_KEY = "doc-registry:documents";
const SESSION_CONNECTED_KEY = "doc-registry:connected";

let provider;
let signer;
let signerContract;
let readContract;
let currentAddress = null;
const listeners = new Set();

function isSessionConnected() {
  return sessionStorage.getItem(SESSION_CONNECTED_KEY) === "true";
}

function setSessionConnected(value) {
  if (value) {
    sessionStorage.setItem(SESSION_CONNECTED_KEY, "true");
  } else {
    sessionStorage.removeItem(SESSION_CONNECTED_KEY);
  }
}


function getDefaultProvider() {
  if (!readContract) {
    const readProvider = window.ethereum
      ? new ethers.BrowserProvider(window.ethereum)
      : ethers.getDefaultProvider("sepolia");
    readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
  }
  return readContract;
}

async function ensureSignerContract() {
  if (signerContract) {
    return signerContract;
  }
  if (!window.ethereum) {
    throw new Error("Please install MetaMask or an Ethereum-compatible wallet.");
  }

  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  if (!accounts || accounts.length === 0) {
    throw new Error("Connect your wallet before registering documents.");
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  currentAddress = await signer.getAddress();
  setSessionConnected(true);
  signerContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  readContract = signerContract;
  notifyListeners();
  return signerContract;
}

function notifyListeners() {
  for (const callback of listeners) {
    try {
      callback(currentAddress);
    } catch (err) {
      console.error("Wallet listener error:", err);
    }
  }
}

async function restoreWallet() {
  if (!window.ethereum || !isSessionConnected()) {
    return null;
  }
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (!accounts || accounts.length === 0) {
      setSessionConnected(false);
      return null;
    }
    if (!signerContract) {
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      signerContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      readContract = signerContract;
    }
    currentAddress = accounts[0];
    notifyListeners();
    return currentAddress;
  } catch (error) {
    console.error("Unable to restore wallet:", error);
    setSessionConnected(false);
    return null;
  }
}

function disconnectWallet() {
  signer = null;
  signerContract = null;
  currentAddress = null;
  setSessionConnected(false);
  notifyListeners();
}


export function onWalletChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getCurrentAddress() {
  return currentAddress;
}

export function formatAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask or an Ethereum-compatible wallet.");
  }
  await window.ethereum.request({ method: "eth_requestAccounts" });
  await ensureSignerContract();
  return currentAddress;
}

export function bindWalletButton(button) {
  if (!button) return;

  const renderConnected = () => {
    button.innerHTML = `<span class="wallet-status">Connected</span><span class="wallet-sub">Click to disconnect</span>`;
    button.classList.add("connected");
  };

  const renderDisconnected = () => {
    button.textContent = "Connect Wallet";
    button.classList.remove("connected");
  };

  const update = (address) => {
    if (address) {
      renderConnected();
    } else {
      renderDisconnected();
    }
  };

  if (button.dataset.walletBound === "true") {
    update(currentAddress);
    return;
  }
  button.dataset.walletBound = "true";

  button.addEventListener("click", async () => {
    try {
      if (currentAddress) {
        disconnectWallet();
        update(null);
        return;
      }
      const address = await connectWallet();
      if (address) {
        setSessionConnected(true);
      }
      update(address);
    } catch (error) {
      console.error(error);
      alert(error.message ?? error);
    }
  });

  onWalletChange(update);
  update(currentAddress);

  if (!currentAddress && isSessionConnected()) {
    restoreWallet().then((address) => {
      if (address) {
        update(address);
      }
    });
  }
}

export async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return ethers.hexlify(new Uint8Array(hashBuffer));
}

function normaliseHash(hash) {
  if (!hash) {
    throw new Error("Document hash is required.");
  }
  let value = hash.trim();
  if (!value.startsWith("0x")) {
    value = `0x${value}`;
  }
  if (value.length !== 66) {
    throw new Error("Document hash must be a 32-byte hex string.");
  }
  return value.toLowerCase();
}

export async function registerDocument({ docId, file, docHash, uri = "" }) {
  const cleanId = docId?.trim();
  if (!cleanId) {
    throw new Error("Document ID is required.");
  }

  let hashValue;
  if (file) {
    hashValue = await hashFile(file);
  } else if (docHash) {
    hashValue = normaliseHash(docHash);
  } else {
    throw new Error("Provide a document file or hash.");
  }

  const contract = await ensureSignerContract();
  const tx = await contract.registerDocument(ethers.id(cleanId), hashValue, uri.trim());
  await tx.wait();

  rememberDocument({
    docId: cleanId,
    docHash: hashValue,
    txHash: tx.hash,
    registeredAt: new Date().toISOString()
  });

  return {
    txHash: tx.hash,
    docHash: hashValue
  };
}

export async function verifyDocument({ docId, file, docHash }) {
  const cleanId = docId?.trim();
  if (!cleanId) {
    throw new Error("Document ID is required.");
  }

  let hashValue;
  if (file) {
    hashValue = await hashFile(file);
  } else if (docHash) {
    hashValue = normaliseHash(docHash);
  } else {
    throw new Error("Provide a document file or hash.");
  }

  const contract = signerContract ?? getDefaultProvider();
  const match = await contract.verifyDocument(ethers.id(cleanId), hashValue);

  return {
    match,
    docId: cleanId,
    docHash: hashValue
  };
}

export function rememberDocument(entry) {
  try {
    const existing = getRememberedDocuments();
    const filtered = existing.filter(
      (item) => !(item.docId === entry.docId && item.docHash === entry.docHash)
    );
    filtered.unshift(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 20)));
  } catch (error) {
    console.error("Unable to store document history:", error);
  }
}

export function getRememberedDocuments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeRememberedDocument(docId, docHash) {
  const filtered = getRememberedDocuments().filter(
    (item) => !(item.docId === docId && item.docHash === docHash)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearRememberedDocuments() {
  localStorage.removeItem(STORAGE_KEY);
}

if (window.ethereum) {
  window.ethereum.on("accountsChanged", async (accounts) => {
    signerContract = null;
    signer = null;
    currentAddress = accounts && accounts.length ? accounts[0] : null;
    if (currentAddress && window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      signerContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      readContract = signerContract;
    }
    notifyListeners();
  });
}




restoreWallet();



