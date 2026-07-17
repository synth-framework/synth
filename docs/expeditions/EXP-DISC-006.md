# EXP-DISC-006 — Repository Identity

**Status:** Completed (pending acceptance)  
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-012 — Runtime Self-Description  
**Depends On:** EXP-PROGRAM-011  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (finding N8)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Project a deterministic Repository Identity so that any operator (human or AI) arriving at a SYNTH repository immediately knows what kind of repository it is, what phase it occupies, and what transformation it is performing. The identity is derived from replayable evidence, never hand-authored.

---

## Motivation

The TaskPRO field experiment (N8) showed an independent agent converging on the wrong attractor:

> "Incomplete React Native app"

instead of

> "Knowledge repository moving toward specification."

The repository contained enough information, but nothing stated its semantic frame. Repository Identity becomes the boundary condition that shapes every subsequent interpretation.

---

## Scope

```text
synth explain identity
        ↓
{
  kind,
  phase,
  authority,
  expectedInputs,
  expectedOutputs,
  transformationDirection,
  evidence
}
```

In scope:

- Read manifest, state, event log, drafts, snapshots, and expedition charters.
- Derive `kind`, `phase`, `authority`, `expectedInputs`, `expectedOutputs`, and `transformationDirection`.
- Expose via `synth explain identity`.
- Regression tests for root repository, fresh project, and unclassified directory.

Out of scope:

- Mutable metadata files.
- New public concepts.
- Storing the identity anywhere.

---

## Deliverables

1. **`src/cli/repository-identity.ts`** — deterministic identity projection.
2. **`synth explain identity`** CLI subcommand.
3. **`tests/repository-identity.test.js`** — regression guards wired into `test:all`.

---

## Acceptance

```text
synth explain identity
        ↓
status === "ok"
kind !== undefined
phase !== undefined
authority.length > 0
expectedInputs.length > 0
expectedOutputs.length > 0
transformationDirection !== undefined
evidence !== undefined
```

- Root repository returns a SYNTH-classified kind and a coherent phase.
- A fresh `synth init` project reports the project name as kind and a discovery/planning phase.
- An empty directory reports `Unclassified repository` with `discovery` phase.
- Full governance passes in CI (pending operator verification).

---

## Phases

### Phase 1 — Evidence model

Define which artifacts are inspected and how they are counted.

### Phase 2 — Identity heuristics

Derive kind, phase, authority, inputs, outputs, and direction from evidence counts.

### Phase 3 — CLI surface

Add `synth explain identity` as a read-only projection command.

### Phase 4 — Regression tests

Verify root repo, fresh project, and unclassified directory.

### Phase 5 — Verify

Run targeted tests and full governance.

---

## Risks

| Risk | Mitigation |
|---|---|
| Heuristic misclassification | Identity includes raw evidence counts so the operator can audit the conclusion. |
| Identity becomes stale | It is computed on every read; there is no stored value to go stale. |
| Empty repos report "Unclassified" | Correct behavior; identity requires evidence. |

---

## Definition of Done

- [x] `synth explain identity` returns a deterministic Repository Identity projection.
- [x] Identity fields include kind, phase, authority, expected inputs/outputs, and transformation direction.
- [x] Identity is derived from manifest, state, events, drafts, snapshots, and expedition charters.
- [x] Regression guards wired into `test:all`.
- [x] Neighbor CLI tests pass.
- [ ] `npm run govern` passes (via CI `proof` check).
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Define evidence model and counting functions.
2. Implement heuristics in `src/cli/repository-identity.ts`.
3. Wire `synth explain identity` into the CLI router.
4. Write regression tests.
5. Wire tests into `test:all` and verify.

---

## Completion Notes

- `src/cli/repository-identity.ts` reads `.synth/manifest.json`, `data/canonical-state.json`, `data/event-log.jsonl`, `data/drafts/`, `data/snapshots/`, and `docs/expeditions/` to compute identity.
- Heuristics classify the repository as project, source repository, example, or unclassified; phase as operational, executing, planning, specification, or discovery.
- Authority, expected inputs/outputs, and transformation direction are chosen based on the classified kind.
- `tests/repository-identity.test.js` covers the root repository, a fresh project after `synth init`, and an empty directory.
- Full governance acceptance is pending operator-run CI verification.
