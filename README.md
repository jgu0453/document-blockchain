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

- **Request** - students submit off-chain requests for documents via Supabase.
- **Admin** - admins approve/deny and issue documents; issuing hashes the file locally, calls egisterDocument, uploads to Supabase Storage, and updates request status.

All hashing happens in the browser via the Web Crypto API. No document content leaves the client; only hashes and transaction metadata interact with the blockchain.

## Supabase Integration (Requests + Admin Issuance)

The static app now uses Supabase (free tier) for off-chain requests and storage. Do this once:

1. Create a Supabase project; copy the Project URL and anon/public key into docs/supabase-config.js (placeholders are in the file).
2. Enable Email/Password auth (Auth → Sign In/Providers). Create users (Auth → Users). Set roles in aw_user_meta_data: {"role":"admin"} for admins, {"role":"student"} for students. If the UI won’t edit metadata, run SQL:
   `
   update auth.users
   set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role','admin')
   where id = '<USER_UID>';
   `
3. Create the equests table and RLS policies (run in SQL editor):
   `
   create extension if not exists pgcrypto;
   create table if not exists requests (
     id uuid primary key default gen_random_uuid(),
     student_id uuid not null,
     doc_type text not null,
     status text not null default 'pending',
     file_url text,
     tx_hash text,
     doc_id text,
     doc_hash text,
     notes jsonb,
     created_at timestamptz default now(),
     issued_at timestamptz,
     issuer_id uuid
   );
   alter table requests enable row level security;

   create policy student_insert on requests
     for insert with check (student_id = auth.uid());

   create policy student_select_own on requests
     for select using (student_id = auth.uid());

   create policy admin_select_all on requests
     for select using (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

   create policy admin_update_all on requests
     for update using (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
     with check (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');
   `
4. Storage: create a bucket documents (public for the current code) and allow uploads.
5. Hard-refresh the site. Student flow: equest.html to submit requests and view “My Requests.” Admin flow: dmin.html to approve/deny or issue (upload file → hash → on-chain register → store file/tx in Supabase).

Admin issuance still requires a connected wallet with Sepolia test ETH. Verification remains public and on-chain.
