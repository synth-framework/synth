# EXP-TRUST-003 — Evidence Path

**Status:** Completed (pending acceptance)  
**Kind:** Implementation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-011 — Operator Trust & CLI Integrity  
**Depends On:** EXP-TRUST-002  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (finding N3)

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

Give the confidence gate a legitimate path through it. When Mission Studio rejects a draft for insufficient confidence, the operator — human or AI — must be able to act on the rejection with a documented command: add evidence to the Mission's draft and re-attempt approval. Every gate rejection must reference the exact command that resolves it.

---

## Motivation

The TaskPRO field experiment hit the unsatisfiable rejection (annex, finding N3):

1. The agent created a Mission Draft; confidence computed below the approval threshold.
2. Approval correctly rejected with "add more evidence."
3. **No command existed to add evidence.** The rejection named an action the platform could not perform.
4. The agent rationally searched for another path — and found one: editing the draft's confidence field (N2).

A gate without a legitimate path through it manufactures illegitimate behavior. EXP-TRUST-002 closed the illegitimate path; this expedition opens the legitimate one. The two are one change of posture: *every rejection needs a paved road.*

The design follows from the immutability model EXP-TRUST-002 established. Drafts are certified artifacts; their content never changes after creation. Therefore "adding evidence to a draft" cannot mean editing it — it means **creating a successor draft** from the combined evidence, certified by its own chained integrity record.

---

## Scope

```text
synth mission approve --draft-id …
        ↓
REJECT: confidence below threshold
        ↓ paved road (named in the rejection)
synth mission evidence add --draft-id … --subject … [--purpose …] [--confidence …]
        ↓
certify the source draft (EXP-TRUST-002)
        ↓
rebuild the Mission Studio session from
existing observations + new evidence
        ↓
new Mission Draft (new id, recomputed confidence)
+ its own chained integrity record
        ↓
synth mission approve --draft-id <new-id>
```

In scope: the `synth mission evidence add` command, successor-draft semantics with integrity certification, the rejection-message sweep so every gate names its executable remediation, regression guards.

Out of scope: confidence thresholds; the rejection-as-Event persistence (EXP-TRUST-004); evidence ingestion from files or external sources (a later expedition may add `--from-file`; this one establishes the command and the successor-draft model); batch evidence addition.

---

## Deliverables

1. **`synth mission evidence add`** — accepts `--draft-id`, `--subject`, optional `--purpose`, `--confidence`, and payload fields; certifies the source draft (a tampered or uncertifiable draft cannot be extended — the same prescriptive rejections as EXP-TRUST-002); rebuilds the Mission Studio session from the draft's observations plus the new evidence; writes the successor draft with its own chained integrity record; prints the new `draftId`, the recomputed confidence, the `supersedes` reference, and the exact approval command.

2. **Rejection sweep** — the below-threshold approval rejection names the evidence path precisely: `synth mission evidence add --draft-id <id> --subject <subject> …` followed by approval of the successor draft. Tamper rejections continue to name `synth mission create` (a tampered draft cannot be extended). No rejection is left without an executable remediation.

3. **Regression guards** — permanent tests in `test:all`: evidence add produces a certified successor draft with recomputed confidence; the successor's approval path works end-to-end; a tampered source draft is rejected; the below-threshold rejection message names the command.

---

## Acceptance

```text
draft confidence below threshold        (TaskPRO chronology)
        ↓
synth mission approve --draft-id …
        ↓
REJECT prescriptively, naming:
  synth mission evidence add --draft-id … --subject …
        ↓
run the named command → successor draft certified
        ↓
synth mission approve --draft-id <new-id>
        ↓
decision on recomputed confidence — legitimate path complete
```

- The TaskPRO dead-end cannot recur: the rejection's remediation is executable as printed.
- Successor drafts are fully certified drafts: new id, recomputed confidence, chained integrity record.
- A tampered or uncertifiable source draft cannot be extended; the rejection is the EXP-TRUST-002 one.
- All new guards are wired into `test:all`; `npm run govern` passes in CI.

---

## Phases

### Phase 1 — Failing fixtures

Codify the TaskPRO dead-end: below-threshold rejection without an executable remediation; evidence-add happy path; tampered-source rejection.

### Phase 2 — Evidence command

Implement `synth mission evidence add` with source certification and session rebuild.

### Phase 3 — Rejection sweep

Update gate messages to name the executable remediation.

### Phase 4 — Verify

Regression guards wired into `test:all`; fixture suite green; full validation via CI.

---

## Risks

| Risk | Mitigation |
|---|---|
| Re-normalizing the draft's observations is not idempotent (session rebuild diverges) | Fixture asserts the rebuilt session's recomputed confidence equals a from-scratch session over the same observation set; normalization is applied to raw observations only |
| Successor-draft semantics confuse operators (which draft do I approve?) | Output prints exactly one `nextStep` — approval of the new `draftId`; the old draft remains valid history, never edited |
| Evidence flags become a confidence hose (operators spam `certain`) | Confidence levels are inputs, not decisions: recompute still gates, blocking unknowns still block, and low-quality evidence moves the score honestly; thresholds unchanged |
| New message text leaks implementation vocabulary | Public vocabulary only; vocabulary audit gate applies |

---

## Definition of Done

- [x] `synth mission evidence add` produces a certified successor draft with recomputed confidence.
- [x] Successor draft approves end-to-end through the normal path.
- [x] Tampered or uncertifiable source draft is rejected prescriptively.
- [x] Below-threshold rejection names the executable evidence command.
- [x] Regression guards wired into `test:all`.
- [x] Documentation integrity checks pass.
- [x] `npm run govern` passes (via CI `proof` check).
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Codify the dead-end and happy-path fixtures as failing tests.
2. Implement the evidence command with source certification and session rebuild.
3. Sweep rejection messages to name executable remediations.
4. Wire regression guards; request acceptance.

---

## Completion Notes

Implemented as chartered: the legitimate path through the confidence gate, built on the immutability model from EXP-TRUST-002.

- **`synth mission evidence add --draft-id … --subject … [--purpose …] [--confidence …]`** (`cmdMissionEvidenceAdd` in `src/cli/synth.ts`) — certifies the source draft first (a tampered or uncertifiable draft cannot be extended; the rejection is the EXP-TRUST-002 one); refuses duplicate evidence prescriptively (the observation's dedup key already present → "already present in draft"); validates the confidence flag against the five levels; then rebuilds the Mission Studio session from the draft's observations plus the new evidence and writes the successor draft with its own chained integrity record. `MissionIntake.normalize` is idempotent and evidence fingerprints derive from stored observation timestamps, so the rebuild is deterministic.
- **Successor-draft semantics** — drafts are immutable; the output prints the new `draftId`, `supersedes`, recomputed `confidence`, and exactly one next step (approval of the new draft). Observed in fixtures: confidence moves honestly (0.67 → 0.69 for one high-confidence observation) — levels are inputs, recompute still gates.
- **Rejection sweep** — the below-threshold (and blocking-unknowns) approval rejection now names the executable remediation: `synth mission evidence add --draft-id <id> --subject <subject> …` followed by approval of the successor. Tamper rejections keep naming `synth mission create`. "Draft not found" names the create command. Usage text documents the new subcommand.

Regression guards: `tests/evidence-path.test.js` (13 assertions, wired into `test:all` as `test:evidence-path`) — the N3 dead-end verbatim (rejection names the command and the operator's draft), successor creation with recomputed confidence, chained successors keeping the integrity chain certifiable, tampered-source rejection, duplicate-evidence refusal, and invalid-confidence refusal. Neighbor suites re-run green: synth-cli, draft-integrity, mission-studio. Core boundary audit clean.

Evidence: CI `proof` check on the implementing PR (full `npm run govern`).
