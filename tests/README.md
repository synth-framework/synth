# `tests/` — Test Suites

This directory contains the automated test evidence for Synth v2.

## Organization

| Test | Purpose |
|---|---|
| `synth.test.js` | Core kernel behavior |
| `skr/` | Semantic Kernel Regression tests |
| `adapter-*.test.js` | Adapter capability tests |
| `mission-studio*.test.js` | Mission Studio and snapshot lineage |
| `freeze-certification.test.js` | Freeze certification evidence (EXP-PROD-005) |
| `operator-journey.test.js` | Operator journey validation (EXP-PROD-003) |
| `public-vocabulary-audit.test.js` | Public vocabulary enforcement |
| `documentation-expedition.test.js` | Documentation generation validation |

## Running

- `npm run test` — core test
- `npm run test:all` — full suite
- `npm run govern` — build, test, and generate proof
