
# ♻ EcoTrade — Verifiable Recycling Infrastructure for LATAM

> Every recycling session verified. Every kilogram proven on-chain.

🌐 **Live demo:** https://eco-trade-hackaton.vercel.app  
📦 **Stack:** React + TypeScript · Supabase · Solana devnet · Alchemy

---

## Demo walkthrough (for judges)

1) Open the live demo and log in with Google.
2) Create a recycling session: point → date/time → materials (kg) → upload photo evidence → confirm.
3) As operator: open the operator queue, review the session, and verify the kg.
4) Approve the session to emit the on-chain receipt.
5) Open the public verification page for that session: `/verificar/<sessionId>`.
6) Open the Solana Explorer link to see the tx (devnet).

> If devnet faucet is rate-limited/dry, you can switch to **testnet** or **mainnet-beta** (real SOL) using the same flow.

## The Problem

Recycling in Latin America runs on paper and trust.
A person drops off 30kg of plastic — an operator writes it down — and
that's it. No public proof. No way to verify the weight. No protection
against the data being changed later.

**EcoTrade fixes this.**

---

## What We Built

A recycling session app where every verified delivery generates an
**immutable on-chain receipt on Solana** — auditable by anyone in the
world, without depending on EcoTrade as a company.

### How it works
```
User logs in with Google (no wallet, no seed phrase, no crypto knowledge)
        ↓
Creates a recycling session — collection point, date, materials (kg), photo evidence
        ↓
AI Trust Score evaluates the session automatically (5 signals)
        ↓
Operator physically verifies the kg at the collection point
        ↓
System emits a Solana transaction with the verified receipt
        ↓
SHA-256 hash + proof of recycling → permanently public on Solana devnet
        ↓
Anyone can verify at /verificar/:id — no login required
```

---

## Key Features

- **Google Login** — no crypto knowledge required, wallet derived automatically
- **Trust Score (AI layer)** — detects anomalies before anything hits the chain
- **On-chain Receipt** — SHA-256 hash recorded on Solana devnet, publicly verifiable
- **Carbon Offset** — each session calculates CO₂ avoided using international factors
- **Operator Panel** — review queue, kg verification, approve/reject sessions
- **Public Verification** — share a link or QR, anyone can verify without login
- **EcoCoins** — 1 EcoCoin per 10 verified kg (floor(totalKg / 10))

---

## Carbon Impact Factors

| Material | CO₂ avoided per kg |
|---|---|
| Plástico | 1.5 kg CO₂ |
| Papel y cartón | 0.9 kg CO₂ |
| Vidrio | 0.3 kg CO₂ |
| Metal | 4.0 kg CO₂ |
| Electrónicos (RAEE) | 20.0 kg CO₂ |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| UI Design | Figma Make (editorial newsprint aesthetic) |
| Database | Supabase (PostgreSQL + RLS + Storage) |
| Auth | Supabase Auth + Google OAuth |
| Blockchain | Solana devnet — Memo Program |
| Smart Wallets | Alchemy Account Kit |
| Deploy | Vercel |

---

## Architecture (high level)

- **Frontend (Vite + React Router)**: user flow + operator panel.
- **Supabase (Postgres + RLS + Storage)**: sessions, evidence metadata, receipts.
- **Receipt emission (Vercel Serverless Function)**: `POST /api/emit-solana` writes a Memo tx to Solana.
- **Public verification**: `/verificar/:id` re-checks the stored signature against the selected cluster and links to Solana Explorer.

### What is stored on-chain?

EcoTrade uses Solana **Memo Program** to store a compact JSON payload (v1) that includes the session id/number, verified kg, evidence hash, CO₂ avoided, operator id, and an emission timestamp.

## Inspired By

**Plastic Bank** collects plastic in Philippines, Brazil and Indonesia
using IBM private blockchain. EcoTrade does the same with **public
Solana** — any auditor, carbon credit buyer or municipality can verify
every delivery without asking our permission.

---

## Running Locally
```bash
git clone https://github.com/plaanteos/Eco-Trade-Hackaton
cd "Sesión de Reciclaje EcoTrade"
npm install
# create a .env.local with your keys (see below)
npm run dev
```

### Repo structure (why there are 2 folders)

- `Sesión de Reciclaje EcoTrade/` → the actual React app (Vite).
- `EcoTradeApp/` → Vercel wrapper used for deployment + serverless API (`/api/emit-solana`).

### Environment Variables

Create `Sesión de Reciclaje EcoTrade/.env.local`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ALCHEMY_API_KEY=
VITE_SOLANA_RPC_URL=https://solana-devnet.g.alchemy.com/v2/YOUR_KEY
VITE_SOLANA_NETWORK=devnet
```

For the serverless receipt emission (`/api/emit-solana`) set these in Vercel (or your server env):
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SOLANA_OPERATOR_SEED=
SOLANA_RPC_URL=
SOLANA_NETWORK=devnet
ALCHEMY_APIKEY=
```

### Using real SOL (mainnet-beta)

If you have **real SOL** (mainnet) and want a receipt on mainnet-beta:

1) Generate a dedicated operator wallet (do NOT reuse personal wallets):
```bash
cd EcoTradeApp
node ./scripts/generate-solana-keypair.mjs
```
This prints:
- `Public address` → fund this on mainnet-beta
- `SOLANA_OPERATOR_SEED` → set this in Vercel (keep secret)

2) Fund the operator **public address** with a small amount (e.g. `0.02 SOL`) using Phantom/Solflare.

3) Set these Vercel env vars (Production) and redeploy:
```
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/<YOUR_KEY>  # recommended
SUPABASE_URL=<your supabase url>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SOLANA_OPERATOR_SEED=<base58 secret key from the generator>
```

4) Re-emit from the operator UI. Public verification will use the receipt's stored cluster.

## Troubleshooting

- **App crashes on startup**: make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (the client throws if missing).
- **Receipt link shows “not found / missing”**: only *completed + verified* sessions have a Solana receipt.
- **Tx not visible on Explorer / emission fails**: the operator wallet must have SOL on devnet; serverless environments can be rate-limited for airdrops, so fund it manually if needed.

---

## Hackathon

Built at **Aleph Hackathon 2026** 🇦🇷  
Tracks: Best Projects (PL_Genesis) · Crypto Consumer Apps · AI/Emerging Tech

## Pre-existing work disclosure
The UI design was created in Figma Make before the hackathon.
All backend logic — Supabase schema, Solana receipt emission, 
Trust Score, Auth flow, and API layer — was built during the hackathon 
from scratch.

**Team:** Jesus Copes