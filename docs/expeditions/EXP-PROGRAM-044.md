# EXP-PROGRAM-044 — Operational Readiness & Self-Hosting

**Status:** Active  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Close the remaining real-world friction gaps that prevent a competent engineer from picking up SYNTH cold and unblocking themselves  
**Era:** IV — Ecosystem & Adoption  
**Architecture Impact:** Low  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** Medium

---

## Mission

> **Make SYNTH trustworthy for day-to-day use by ensuring its own capability reports, CLI observability, derived artifacts, and dogfood state tell the truth.**
>
> The core governance model, event model, and replay layer are mature. What remains is the operational veneer: the CLI must accurately advertise what it can do, let operators inspect individual entities, produce clean derived artifacts, and run its own framework on itself.

---

## Purpose

This program continues the operator-experience thread from EXP-PROGRAM-043. It targets the small, sharp gaps that still cause an experienced engineer to fall out of the "happy path":

1. **Capability registry accuracy** — `synth capabilities` currently reports features as unavailable even though the commands exist.
2. **Entity inspection** — operators can list programs and expeditions, but cannot show a single one from the CLI.
3. **Derived artifact hygiene** — generated documentation does not yet carry the provenance metadata `synth verify` expects.
4. **Self-hosting** — the SYNTH framework repository is not itself a SYNTH project.
5. **Safe recovery** — replay divergences require hand-editing state; there is no governed repair path.

Each charter is small, independently shippable, and safe under the current architecture freeze.

---

## Core Abstraction — Truth at the Operator Surface

```text
┌─────────────────────────────────────────────────────────────┐
│                    Operator Surface                         │
│  synth capabilities  →  reports truth                       │
│  synth program show  →  inspect one program                 │
│  synth expedition show → inspect one expedition             │
│  synth docs generate →  produces provenance-clean docs      │
│  synth status        →  works inside synth-v2 itself        │
│  synth repair        →  offers safe recovery                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Existing Kernel                          │
│  Event model, replay, ExecutionGate, governance lifecycle   │
└─────────────────────────────────────────────────────────────┘
```

---

## Program Composition

```text
EXP-PROGRAM-044
Operational Readiness & Self-Hosting
│
├── EXP-CAPTRANS-003  Capability Registry Accuracy
│       Fix `synth capabilities` so command-surface capabilities
│       (docs generate, log query) are reported as available.
│
├── EXP-CLI-005       Governance Entity Show Commands
│       Add `synth program show <id>` and `synth expedition show <id>`.
│
├── EXP-DOC-008       Generated Documentation Provenance (Completed)
│       Ensure `synth docs generate` emits provenance metadata that
│       satisfies `synth verify` (continues EXP-DOC-007).
│
├── EXP-BOOTSTRAP-002 Framework Self-Hosting
│       Initialize the synth-v2 repository as a SYNTH project.
│
└── EXP-GOV-025       Safe State Repair & Divergence Recovery
        Provide a governed, replay-safe path to recover from
        canonical-state divergences without hand-editing JSON.
```

---

## Protected Assets

The following assets SHALL NOT be modified by any Expedition in this Program:

- Event model semantics
- Replay semantics
- ExecutionGate mutation authority
- Public vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)
- Constitutional Baseline

Any change to these assets requires an Architecture Expedition and a new ADR.

---

## Allowed Work

| Allowed | Forbidden |
|---|---|
| Fixing stale capability reports | Adding new runtime concepts without an ADR |
| Adding read-only inspection commands | Mutating governance lifecycle semantics |
| Cleaning up derived-artifact provenance | Hand-editing `.synth/data/canonical-state.json` as a fix |
| Bootstrapping the framework repo on itself | Requiring every user to bootstrap before using help commands |
| Providing safe recovery tooling | Silently auto-repairing divergences without evidence |

---

## Out of Scope

- New governance lifecycle phases.
- Changes to Mission/Expedition semantics.
- Major CLI redesign.
- Public launch or marketing activities.
- Changes to the adapter ecosystem beyond capability reporting.

---

## Success Criteria

Program 044 is complete when:

1. `synth capabilities` reports every implemented command surface accurately.
2. `synth program show <id>` and `synth expedition show <id>` return the full charter metadata.
3. `synth docs generate` produces files that pass `synth verify` provenance checks.
4. The `synth-v2` repository itself passes `synth doctor` and `synth status`.
5. A replay divergence can be diagnosed and repaired through the CLI, not by hand-editing state.
6. Every charter is accepted or explicitly waived.

---

## Relationship to Other Work

- **EXP-PROGRAM-043 — Agent Onboarding & Operator Experience** established the CLI consistency, human output, and list commands that this program extends.
- **EXP-PROGRAM-008 — Documentation & Projections** owns the documentation projection system; EXP-DOC-008 continues its deferred provenance work.
- **EXP-PROGRAM-038 — Audit Remediation** provided the brownfield migration fixes (EXP-GOV-024) that inform safe recovery in EXP-GOV-025.
- **EXP-CAPTRANS-001/002** defined capability transparency commands consumed by EXP-CAPTRANS-003.
- **EXP-CLI-003/004** defined list and rank commands consumed by EXP-CLI-005.

---

## Current Recommendation

**Start now.** The first two expeditions (CAPTRANS-003 and CLI-005) are read-only, low-blast-radius, and immediately improve operator trust. They can ship in a single PR. After that, proceed through DOC-008, BOOTSTRAP-002, and GOV-025 in order.

---

## Long-Term Vision

SYNTH's operator surface becomes as deterministic and trustworthy as its kernel. An engineer encountering SYNTH for the first time can run `synth capabilities`, `synth status`, `synth program show`, and `synth expedition show` and receive accurate, actionable information without reading source code or hand-editing state.
