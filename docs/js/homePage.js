import { bindWalletButton } from "./registry.js";

document.addEventListener("DOMContentLoaded", () => {
  bindWalletButton(document.getElementById("walletButton"));
});
