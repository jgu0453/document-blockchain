# Document Verification Blockchain

A minimal Ethereum project that anchors document hashes on-chain and lets anyone verify them.

## Prerequisites

- Node.js 18+
- npm

## Setup

```
npm install
npm run build
npm run test
```

## Local Deployment

1. Start a local Ethereum node:
   ```
   npx hardhat node
   ```
2. Deploy to that node:
   ```
   npm run deploy:local
   ```

## Testnet Deployment (Sepolia)

Create a `.env` file:

```
ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/<KEY>
PRIVATE_KEY=0x<YOUR_PRIVATE_KEY>
```

Then run:

```
npm run deploy:sepolia
```

The script prints the contract address you’ll reuse in frontends or APIs.

## Contract Highlights

- `registerDocument(docId, docHash, uri)` (issuer-only) records a hash and metadata once.
- `getDocument(docId)` returns the stored record.
- `verifyDocument(docId, docHash)` returns `true` if the stored hash matches.

Document IDs can be any unique string hashed off-chain (for example `sha256(filename + serial)`). Document hashes come from hashing the file contents off-chain before calling the contract.

## GitHub Pages Frontend

This repository includes a static interface in the `docs/` folder that GitHub Pages can serve.

1. Deploy the smart contract (local or Sepolia) and copy the deployed address.
2. Edit `docs/main.js` and replace `REPLACE_WITH_DEPLOYED_ADDRESS` with the actual contract address.
3. Commit and push. In your repository settings, set GitHub Pages to serve from the `docs/` directory.
4. Open the published URL, connect MetaMask (ensure it points to the same network you deployed on), and register/verify documents directly from the browser.

The frontend hashes documents locally in the browser (SHA-256) before interacting with the smart contract; no file contents leave the client.
