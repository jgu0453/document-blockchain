import { bindWalletButton } from "./registry.js";

const setupWalletButton = () => bindWalletButton(document.getElementById("walletButton"));

document.addEventListener("DOMContentLoaded", setupWalletButton);

