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
  if (!isSessionConnected()) {
    throw new Error("Connect your wallet before registering documents.");
  }

  try {
    provider = provider ?? new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    currentAddress = await signer.getAddress();
    if (!currentAddress) {
      throw new Error("Connect your wallet before registering documents.");
    }
    signerContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    readContract = signerContract;
    notifyListeners();
    return signerContract;
  } catch (error) {
    disconnectWallet();
    throw error;
  }
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
      provider = provider ?? new ethers.BrowserProvider(window.ethereum);
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
  provider = null;
  readContract = null;
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
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask or an Ethereum-compatible wallet.");
  }

  try {
    provider = provider ?? new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    currentAddress = await signer.getAddress();
    signerContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    readContract = signerContract;
    setSessionConnected(true);
    notifyListeners();
    return currentAddress;
  } catch (error) {
    disconnectWallet();
    throw error;
  }
}

export function bindWalletButton(button) {
  if (!button) return;

  const renderConnected = () => {
    button.innerHTML = '<span class="wallet-status">Connected</span><span class="wallet-sub">Click to disconnect</span>';
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
      if (isSessionConnected() && currentAddress) {
        disconnectWallet();
        update(null);
        return;
      }
      const address = await connectWallet();
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
  if (!isSessionConnected() || !currentAddress) {
    throw new Error("Connect your wallet to register a document.");
  }

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
    if (!accounts || accounts.length === 0) {
      disconnectWallet();
      return;
    }

    currentAddress = accounts[0];

    if (isSessionConnected()) {
      try {
        provider = provider ?? new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        signerContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        readContract = signerContract;
      } catch (error) {
        disconnectWallet();
        console.error("Unable to refresh signer after account change:", error);
        return;
      }
    } else {
      signer = null;
      signerContract = null;
      provider = null;
      readContract = null;
    }

    notifyListeners();
  });
}

restoreWallet();











