# TaskPRO → SYNTH: Governance Evolution Audit

**Date:** 2026-07-18  
**Author:** SYNTH operator audit  
**Scope:** Architectural decisions, governance failures, abandoned concepts, frozen decisions, operator lessons, and open issues derived from building TaskPRO under SYNTH governance.  
**Evidence sources:** `.synth/replay/*.json`, `.synth/state.json`, SYNTH CLI `CHANGELOG.md`, live migration of TaskPRO to SYNTH v2.1.0.

---

## Sources

| Source | What it provides |
| --- | --- |
| `.synth/replay/genesis-0001.json` | Initialization proof, rejected actions, verified invariants |
| `.synth/replay/governance-*.json` | Approved governance changes with justifications |
| `.synth/state.json` | Reconciliations, confidence map, invariants |
| SYNTH CLI `CHANGELOG.md` | Versioned architectural decisions and program chartering |
| Live migration to v2.1.0 | Empirical behavior of the current CLI against legacy governance |

---

## 1. Architectural decisions that changed because of TaskPRO

### 1.1 Initialization became a governance state transition, not a setup procedure

**Evidence:** `genesis-0001.json` uses `"contract_version": "synth-init-semantics v1.1 (approved)"` and produces an `InitializationProof`.

**What changed:** SYNTH abandoned the model where `init` scaffolds a project. TaskPRO forced the realization that init can only create governance around existing knowledge.

> "Initialization is the creation of SYNTH governance around existing knowledge."  
> "Every assertion it makes must trace to evidence already in the repository."

### 1.2 Evidence became registrations (pointers), not copies

**Evidence:** `genesis-0001.json` rejected action:

> `{ "action": "Copy or normalize knowledge artifacts into .synth/", "reason": "Evidence registrations are pointers and claims, never copies; two authorities must not exist." }`

**What changed:** SYNTH no longer copies knowledge into its own store. TaskPRO's `knowledge/` directory demonstrated that authored artifacts must remain the single authority.

### 1.3 Extraction was separated from initialization

**Evidence:** `genesis-0001.json` documents a separate `extraction` phase before `assertions`.

**What changed:** Without TaskPRO, extraction and initialization may have been collapsed into one step. The separation prevents interpretation leakage:

> "Extraction is a pure read. Initialization is a state transition."

### 1.4 Expedition status became replay-derived, not mutable

**Evidence:** `governance-0004.json` states:

> "Expedition lifecycle state is part of the governed Expedition primitive. Replay records remain the authoritative history; the status field is the current-state projection derived from replay."

**Later evidence:** SYNTH v2.1.0 `synth verify` reports:

> "Forbidden mutable status file `.synth/expeditions.json` exists; expedition status must be replay-derived."

**What changed:** TaskPRO began with mutable `.synth/expeditions.json`. SYNTH v2 hardened this so expedition status must be derived from events, not stored as mutable JSON.

### 1.5 Governance decisions were split from expedition-local decisions

**Evidence:** `governance-0002.json` removed D3 (test-tool-version selection) as a governance gate and moved it into `expedition_local_decisions` for E1.

**What changed:** TaskPRO exposed that implementation tool versions were being treated as governance-level concerns. The boundary between "what the repository is" and "how it is built" was sharpened.

### 1.6 Runtime data moved from repo-root `data/` to `.synth/data/`

**Evidence:** SYNTH CLI `CHANGELOG.md` 2.1.0:

> "SYNTH now stores governed project runtime data under `.synth/data/` while keeping the source repository independent of `.synth/`."  
> "Added automatic, byte-preserving migration from legacy repo-root `data/` to `.synth/data/`."

**What changed:** The v2.0.x runtime created `data/` at the repository root, polluting the workspace. TaskPRO's migration exposed this and drove the Runtime Boundary Release.

### 1.7 Mission Studio, Runtime Self-Description, and Cognitive Continuity were chartered as programs

**Evidence:** `CHANGELOG.md` 2.0.0-rc.2:

> "TaskPRO first-contact field experiment evidence annex: independent zero-shot audit (rc.1, Windows, autonomous AI agent) characterizing the trust, discoverability, and continuity gaps that Programs 011–013 answer."

**What changed:** TaskPRO's friction directly chartered:
- EXP-PROGRAM-011 — Operator Trust & CLI Integrity
- EXP-PROGRAM-012 — Runtime Self-Description
- EXP-PROGRAM-013 — Cognitive Continuity

These became protected architectural programs.

---

## 2. Major governance failures

### 2.1 Status could not determine the next action

**Evidence:** Before migration, `synth status` reported:

> `"phase": "uninitialized"`, `"nextActions": ["synth init --name ..."]"`

Even though TaskPRO had a complete `.synth/` governance state with 20 expeditions.

**Impact:** The CLI could not see existing governance and offered the wrong next action.

### 2.2 Accepted expeditions existed without prior registration

**Evidence:** `governance-0028.json` states:

> "W11–W13 were executed without prior expedition registration; retroactive registration restores provenance."

**Impact:** Implementation happened before governance recorded the expedition, breaking provenance.

### 2.3 Multiple commands interpreted state differently

**Evidence:**
- `synth status` reported "uninitialized"
- `synth verify` detected the legacy `.synth/expeditions.json` and called it forbidden
- `synth explain replay` was consistent but only for the CLI's internal genesis event

**Impact:** No single source of truth across commands.

### 2.4 Mutable expedition status conflicted with replay-derived state

**Evidence:** `synth verify` violation:

> "Forbidden mutable status file `.synth/expeditions.json` exists; expedition status must be replay-derived."

**Impact:** TaskPRO's `.synth/expeditions.json` stored status directly, while v2 expects it to be derived from events.

### 2.5 Canonical state file missing despite event log presence

**Evidence:** `synth verify` violation:

> "Canonical state file is missing despite the presence of an event log."

**Impact:** v2 expects `.synth/data/canonical-state.json` derived from events. TaskPRO had no v2 event log at all, only legacy JSON primitives.

### 2.6 Generated docs lacked provenance metadata

**Evidence:** `synth verify` reported 7 warnings:

> "Generated documentation 'README.md' lacks required provenance metadata."

**Impact:** Docs generated by `synth docs generate` were not tracked as projections with evidence.

---

## 3. Concepts that were abandoned

### 3.1 Direct mutable governance primitives as authority

**Evidence:** TaskPRO's `.synth/state.json`, `.synth/mission.json`, `.synth/expeditions.json`, `.synth/evidence.json` were the authority in v1.1. SYNTH v2.1.0 considers `.synth/expeditions.json` forbidden.

**What replaced it:** Event-log-derived state with `.synth/data/canonical-state.json`.

### 3.2 Repo-root runtime data directory

**Evidence:** `CHANGELOG.md` 2.1.0 documents migration from "legacy repo-root `data/`" to `.synth/data/`.

**What replaced it:** `.synth/data/` co-located under the governed `.synth/` directory.

### 3.3 Two-authority knowledge model

**Evidence:** `genesis-0001.json` rejected action:

> "Copy or normalize knowledge artifacts into .synth/"

**What replaced it:** Single authority in `knowledge/`; SYNTH stores relationships, not content.

### 3.4 Governance-level implementation decisions

**Evidence:** `governance-0002.json` removed D3 and made it expedition-local.

**What replaced it:** Strict boundary between governance (what the project is) and expedition-local decisions (how to build it).

### 3.5 Implicit project manifest

**Evidence:** TaskPRO had no `.synth/manifest.json`. SYNTH v2 requires one.

**What replaced it:** Explicit `.synth/manifest.json` with schema `synth-bootstrap-manifest-v1`.

---

## 4. Frozen architectural decisions

From `genesis-0001.json` invariants and `CHANGELOG.md` 2.0.0-rc.1:

| Decision | Evidence |
| --- | --- |
| Replay is canonical | `synth explain replay` consistency checks; changelog "deterministic execution kernel with replay verification" |
| Events are authoritative | `CHANGELOG.md` 2.0.0-rc.1 "Event sourcing, replay, and proof generation" |
| Public vocabulary is frozen | `CHANGELOG.md` 2.0.0-rc.1 "Seven public concepts: Mission, Expedition, Evidence, Plan, Event, State, Replay" |
| Mission Studio is protected | `CHANGELOG.md` 2.0.0-rc.2 "proposal-graph sealing in Mission Studio" |
| Architecture is frozen | `CHANGELOG.md` 2.0.0-rc.1 "ADR-001 — Synth v2 Freeze Certification" |
| Protected Assets Era | `CHANGELOG.md` 2.0.0-rc.1 "ADR-004 — Synth Eras and Protected Assets" |
| Atomic governance transactions | `genesis-0001.json`: "Atomicity: all assertions committed together; on any failure .synth/ and AGENTS.md are removed entirely." |
| Provenance totality | `genesis-0001.json`: "every assertion carries evidence_sources; empty evidence only with derivation_type UNRESOLVED." |
| Capability isolation | `genesis-0001.json`: "no codegen, scaffold, install, migrate, or compile invoked during initialization." |
| Determinism | `genesis-0001.json`: "replaying extraction over the same input_snapshot hash reproduces identical governance state." |

---

## 5. Operator experience lessons

These are derived from failures observed in TaskPRO and the design responses in SYNTH.

### 5.1 The operator should never guess the project state

**Evidence:** `synth status` before migration reported "uninitialized" despite full governance. The fix was Runtime Self-Description (PROGRAM-012).

### 5.2 The operator should receive exactly one next action

**Evidence:** `synth status` now provides a single prioritized `nextActions` array.

### 5.3 The operator should never reconcile state manually

**Evidence:** `synth verify` detects forbidden mutable files and tells the operator what to do, but does not silently fix it.

### 5.4 Commands should explain why they are blocked

**Evidence:** `synth status` blockers include `kind`, `description`, and `remediation`.

### 5.5 The CLI should be resumable by a new reasoning system

**Evidence:** `CHANGELOG.md` 2.0.0-rc.3:

> "Runtime Self-Description is complete, and the CLI can now be trusted, understood, and resumed by a new reasoning system."

### 5.6 Runtime artifacts should not pollute the workspace

**Evidence:** 2.1.0 Runtime Boundary Release moved `data/` → `.synth/data/`.

### 5.7 Initialization must not mutate authored knowledge

**Evidence:** `genesis-0001.json` rejected actions for fixing typos, renaming files, editing documents.

---

## 6. Things that still feel wrong

### 6.1 Initialization creates an empty `.synth/data/` that blocks migration

**Evidence:** `synth init` creates `.synth/data/`, then `ensureRuntimeDataDir()` sees it exists and skips migration. We had to `rm -rf .synth/data` and run `synth status` to trigger migration.

**Impact:** The automatic migration is defeated by init itself.

### 6.2 Legacy governance primitives are silently incompatible

**Evidence:** TaskPRO's `.synth/state.json`, `.synth/mission.json`, `.synth/expeditions.json`, `.synth/evidence.json` are not recognized by v2.1.0. There is no migration path documented.

**Impact:** A project with legacy governance cannot be cleanly adopted by v2 without manual conversion or archival.

### 6.3 `synth verify` reports legacy state as forbidden rather than offering migration

**Evidence:** `synth verify` says:

> "Forbidden mutable status file `.synth/expeditions.json` exists; expedition status must be replay-derived."

**Impact:** The CLI diagnoses the problem but provides no migration command.

### 6.4 The manifest is required but not enough to adopt legacy governance

**Evidence:** After `synth init`, the project is recognized but starts with an empty v2 event log. The legacy governance state is ignored.

**Impact:** Governance history is effectively lost unless manually migrated.

### 6.5 Runtime data and source repository are still entangled

**Evidence:** `.synth/data/` is inside the repository. The changelog says the goal is to keep the source repository independent of `.synth/`, yet `.synth/` itself is inside the repository.

**Impact:** Full independence is not achieved.

---

## 7. Complete mental model

Based on the evidence, SYNTH v2.1.0's actual mental model is:

```text
Repository (source + knowledge)
        │
        ▼
.synth/manifest.json          ← "this is a SYNTH project"
        │
        ▼
.synth/data/                  ← runtime authority
        │
        ├── event-log.jsonl   ← immutable events (source of truth)
        ├── canonical-state.json ← derived state
        ├── snapshots/        ← derived projections
        └── decisions.jsonl   ← decision log
        │
        ▼
Replay Engine                 ← proves state == f(events)
        │
        ▼
CLI Commands
        │
        ├── synth status      ← operator briefing
        ├── synth verify      ← invariant checks
        ├── synth explain replay ← consistency proof
        └── synth mission / expedition ← planning
```

TaskPRO's legacy model was:

```text
Repository (source + knowledge)
        │
        ▼
.synth/                       ← governance authority
        │
        ├── state.json        ← mutable state
        ├── mission.json      ← mutable mission
        ├── expeditions.json  ← mutable expedition status
        ├── evidence.json     ← evidence registry
        └── replay/           ← replay records
```

The two models cannot coexist. TaskPRO exposed that the v1.1 model was a stepping stone, and v2 replaced mutable primitives with event-log derivation.

---

## Summary

TaskPRO's most valuable contribution to SYNTH was empirical evidence that:

1. **Governance must be derived, not stored mutably.**
2. **Runtime data must be bounded and not pollute the workspace.**
3. **The CLI must describe state unambiguously and resumably.**
4. **Initialization must be a pure governance transition over existing knowledge.**
5. **Implementation decisions must not leak into governance state.**

These lessons are now frozen in SYNTH v2 as: Replay canonicality, event authority, protected vocabulary, runtime boundary, and operator self-description.
