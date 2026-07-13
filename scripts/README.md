# `scripts/` — Automation Scripts

This directory contains standalone Node.js scripts used for verification, auditing, and proof generation.

## Scripts

| Script | Purpose |
|---|---|
| `audit-adversarial.js` | Adversarial replay audit |
| `audit-bypass-map.js` | Bypass map integrity check |
| `generate-proof.js` | Generate a Synth proof artifact |
| `install-hooks.sh` | Install Git hooks |
| `verify-determinism.js` | Determinism verification |
| `verify-proof.js` | Proof artifact verification |
| `verify-replay.js` | Replay consistency check |

## Usage

Most scripts are invoked through `npm run` commands defined in `package.json`.
