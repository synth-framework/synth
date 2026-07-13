---
Title: Examples Guide
Domain: operator
Audience: operators
Prerequisites: 01-getting-started.md
Knowledge Establishes: What Synth examples exist and how to run them
Depends On: 01-getting-started.md
Builds Toward: tutorials/
Version: 1.0.0
Status: stable
---

# Examples Guide

Synth examples are small, certified projects that demonstrate real usage. Every example includes a mission, an expedition, replay evidence, and generated documentation.

---

## Available Examples

| Example | Domain | Demonstrates | Status |
|---|---|---|---|
| [Todo](../../examples/todo/) | Task tracking | Mission → Expedition → Plan | ✅ Certified |
| [Blog](../../examples/blog/) | Content publishing | Documentation generation | ✅ Certified |
| [CRM](../../examples/crm/) | Business objects | Adapter integration | ✅ Certified |
| [Legacy Node](../../examples/legacy-node/) | Brownfield Node.js | Migration-style missions | ✅ Certified |
| [Polyglot](../../examples/polyglot/) | Multiple languages | Language-agnostic analysis | ✅ Certified |
| [Monolith](../../examples/monolith/) | Multi-package project | Scale behavior | ✅ Certified |

Examples are created by [EXP-REL-003 — Example Certification](../expeditions/EXP-REL-003.md).

---

## Running an Example

Each example is a standalone project. Once created, run it with the same governance pipeline as Synth itself:

```bash
cd examples/todo
npm install
npm run govern
```

A certified example must pass `npm run govern` without errors.

---

## What Each Example Contains

Every example has:

1. **Mission** — A declared strategic goal.
2. **Expedition** — A bounded piece of work.
3. **Replay evidence** — A reproducible event log.
4. **Generated documentation** — README, architecture overview, and operator guide.
5. **Expected results** — A document describing what the example proves.

---

## Using Examples to Learn

**New operators:** Start with [Todo](../../examples/todo/) to see the simplest end-to-end flow.

**Developers:** Look at [CRM](../../examples/crm/) for adapter patterns.

**Architects:** Look at [Monolith](../../examples/monolith/) for scale behavior.

---

## Contributing an Example

To propose a new example, open an expedition. The example must:

- Use only the seven public concepts in its public-facing docs.
- Pass `npm run govern`.
- Include a mission, expedition, and replay evidence.

---

## Related Documents

- [Getting Started](01-getting-started.md)
- [Mission Studio Guide](mission-studio-guide.md)
- [EXP-REL-003 — Example Certification](../expeditions/EXP-REL-003.md)
- [Tutorials](../guides/tutorials/)
