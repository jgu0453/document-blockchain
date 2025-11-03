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

The script prints the contract address you'll reuse in frontends or APIs.

## Contract Highlights

- `registerDocument(docId, docHash, uri)` (issuer-only) records a hash and metadata once.
- `getDocument(docId)` returns the stored record.
- `verifyDocument(docId, docHash)` returns `true` if the stored hash matches.

Document IDs can be any unique string hashed off-chain (for example `sha256(filename + serial)`). Document hashes come from hashing the file contents off-chain before calling the contract.

## GitHub Pages Frontend

This repository includes a multi-page static interface under `docs/` that GitHub Pages can host.

1. Deploy the smart contract (local or Sepolia) and copy the deployed address.
2. Update `docs/js/registry.js` with the deployed contract address if it changes.
3. Commit and push. In your repository settings, set GitHub Pages to serve from the `docs/` directory.
4. Open the published URL, connect an Ethereum wallet (MetaMask or equivalent), switch to Sepolia, and interact with the app.

### Available Pages

- **Home** — overview and quick links.
- **Verify a Document** — upload a file or paste a pre-computed hash to check against the on-chain fingerprint.
- **Faculty/Staff** — register new documents (hashes are computed locally; only SHA-256 digests are stored on-chain).
- **My Documents** — client-side history (stored in `localStorage`) of recently registered or verified items for quick re-checks.

All hashing happens in the browser via the Web Crypto API. No document content leaves the client; only hashes and transaction metadata interact with the blockchain.
