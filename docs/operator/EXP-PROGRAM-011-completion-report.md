# EXP-PROGRAM-011 — Completion Report

**Program:** EXP-PROGRAM-011 — Operator Trust & CLI Integrity
**Status:** Completed — pending acceptance
**Era:** II — Adoption

---

## Verdict

EXP-PROGRAM-011 is the program where the operator surface became as trustworthy as the kernel.

EXP-PROGRAM-010 proved the architecture can be trusted internally; this program made that trust *experienced*. The four trust failures the TaskPRO field experiment exposed at the operator surface — govern recursion (N1), approval-gate forgery (N2), the unsatisfiable rejection path (N3), and decision amnesia (N9) — are each closed with a permanent regression guard, and the TaskPRO chronology can no longer be repeated.

The constitutional invariant held end to end:

> **No artifact that influences interpretation may be manually authoritative.**

Confidence, approval state, and draft integrity are now computed and certified, never read from editable fields. Every gate rejection names an executable remediation. Every trust-relevant decision is durable and tamper-evident. The freeze was never relaxed; no Protected Asset was modified; the seven-concept public vocabulary is unchanged.

---

## What the program proved

1. **Every rejection is a design surface.** A gate without a legitimate path through it manufactures illegitimate behavior — the program both closed the illegitimate paths (recursion, forgery) and opened the legitimate ones (paved-road guidance, `synth mission evidence add`).
2. **Trust-relevant values are computed, never read.** Approval recomputes confidence from the draft's own evidence; approval state derives from the decision record; stored fields are never authoritative.
3. **Planning-layer integrity is a first-class mechanism.** Immutable, hash-chained, certified-at-read records — integrity records, decision records — give planning artifacts the same tamper-evidence discipline snapshots already had, without touching the ExecutionGate / Event Model boundary.

---

## Expedition outcomes

| Expedition | Result | PRs |
|---|---|---|
| EXP-TRUST-001 — Govern Recursion Guard | Two-layer delegation guard (env marker + static pre-flight) at all four `npm run govern` spawn points; Loop A dies prescriptively in ~1 s; bootstrap skip message is now a paved road | #89 (charter), #90 |
| EXP-TRUST-002 — Draft Integrity & Computed Confidence | Immutable chained draft integrity records; approval recomputes confidence from evidence via the pure `computeConfidence`; tampering rejects prescriptively | #91 (charter), #92 (anchor amendment), #93 |
| EXP-TRUST-003 — Evidence Path | `synth mission evidence add` creates certified successor drafts; every gate rejection names its executable remediation | #94 (charter), #95 |
| EXP-TRUST-004 — Decision Events | Append-only hash-chained `data/decisions.jsonl`; every approval outcome persisted with computed confidence; approval state derives from the record; `synth mission decisions` read surface | #96 (charter), #97 |

All implementation PRs merged with the CI `proof` check green. **70 new regression assertions** across four suites (`govern-recursion-guard` 23, `draft-integrity` 17, `evidence-path` 13, `decision-events` 17), all wired into `test:all`.

---

## Key implementation evidence

- `src/cli/govern-delegation.ts` — `SYNTH_GOVERN_DEPTH` marker layer + static `package.json` govern-script inspection; wired into `cmdGovern`, `runGovernAndExit`, `executeValidationPlan`, and bootstrap intake.
- `src/mission-studio/draft-integrity.ts` — canonical-content fingerprints, write-once chained integrity records, certification at approval.
- `src/mission-studio/engine.ts` — `approve()` recomputes confidence and returns the certified session on every path; `src/api/index.ts` and `src/cli/synth.ts` report computed values only.
- `src/cli/synth.ts` — `synth mission evidence add` (successor-draft semantics), `synth mission decisions`, rejection sweep naming executable remediations.
- `src/mission-studio/decision-log.ts` — append-only chained decision record; chain verified before every append and at every read.
- `src/mission-studio/canonical-json.ts` — one canonicalization semantics behind both chains.

---

## The TaskPRO chronology, re-run against rc.2 + Program 011

| Chronology step | rc.1 outcome | Now |
|---|---|---|
| Bootstrap reports no package.json | "govern skipped", no guidance | Paved road: prescribes a safe `govern` script and warns against the cyclic ones |
| Agent writes `"govern": "synth govern"` | ~102 s recursion, seven killed tasks | Prescriptive refusal in ~1 s, zero delegation hops, naming the cycle and the safe fix |
| Agent edits draft confidence 0.67 → 0.85 | Approval accepts the forgery | "Draft integrity violation" rejection; the engine recomputes anyway |
| Confidence gate says "add more evidence" | No such command exists | `synth mission evidence add` — named in the rejection, produces a certified successor draft |
| Approval rejection | Exists only in scrollback | Persisted in `data/decisions.jsonl` with reason and computed confidence; `synth mission decisions` |
| Governance escape hatch (`govern: "npm run test"` stub) | Vacuous pass | Unattractive: the legitimate path is now the minimum-energy path |

---

## Constitutional Provenance Matrix

| Program Invariant | Expedition | Evidence |
|---|---|---|
| Every rejection needs a paved road | TRUST-001, TRUST-003 | Bootstrap paved road; evidence command; rejection sweep; fixtures assert the named command |
| No artifact that influences interpretation may be manually authoritative | TRUST-002 | Integrity records + recomputed confidence; forgery fixtures |
| Confidence is recomputed from evidence at approval time | TRUST-002 | `engine.approve()`; API/CLI report computed only; determinism round-trip fixture |
| Every gate rejection names an executable remediation | TRUST-001, TRUST-003 | Messages quote the offending script / name `mission evidence add` / name `mission create` |
| Every trust-relevant decision is recorded as an Event | TRUST-004 | `data/decisions.jsonl`, chained and certified; planning-layer reading per the TRUST-002 amendment |
| Every fix becomes a permanent regression guard | All | Four suites, 70 assertions, in `test:all` |

---

## Findings register and dispositions

### N1 — Govern recursion

**Disposition: resolved.** Two independent layers (marker, static pre-flight); the recursion cannot run unbounded on any delegation path; regression fixtures reproduce Loop A verbatim.

### N2 — Approval-gate forgery

**Disposition: resolved.** Forging the score fails two ways (fingerprint mismatch at the CLI, recomputation at the engine); editing inputs (e.g. deleting blocking unknowns) fails at the fingerprint; the honest residual — a determined adversary recomputing keyless hashes and rewriting the whole chain — requires deliberate, multi-step circumvention that leaves evidence, which is the structural guarantee the invariant asks for.

### N3 — Unsatisfiable rejection path

**Disposition: resolved.** The legitimate path through the gate exists and is named by the rejection itself. Fixture-observed honesty check: one high-confidence observation moves confidence 0.67 → 0.69 — levels are inputs, recompute still gates.

### N9 — Decision amnesia

**Disposition: resolved.** Decisions are durable, tamper-evident, and inspectable; re-approval is idempotent.

### Residual notes (not defects)

- Drafts created before TRUST-002 have no integrity record: approval rejects prescriptively with the paved road (create a new draft). By design.
- Expedition-level decisions are not covered by the decision record (Mission drafts were the N9 surface). Candidate for a future expedition if the need is observed.
- Surfacing decisions in `synth explain` belongs to EXP-PROGRAM-012 (discoverability), as chartered.

---

## Program evolution

| Program | Contribution |
|---|---|
| EXP-PROGRAM-007 | Environmental independence |
| EXP-PROGRAM-008 | Documentation and projection synchronization |
| EXP-PROGRAM-009 | Canonical end-to-end experience that exercised the platform |
| EXP-PROGRAM-010 | Hardened the implementation — the architecture can be trusted internally |
| EXP-PROGRAM-011 | Extended that trust to the operator surface — trust is now experienced |

The next adoption layer is discoverability (EXP-PROGRAM-012) and continuity (EXP-PROGRAM-013), both unblocked by this program's trustworthy answers.

---

## Acceptance record

- ✅ All four EXP-TRUST expeditions completed and merged (implementation PRs #90, #93, #95, #97 — CI `proof` green).
- ✅ Every expedition chartered before implementation; one charter (#91) amended post-merge (#92) when the implementation seam revealed an Event Model conflict — the process worked as designed.
- ✅ TaskPRO findings N1, N2, N3, N9 resolved with permanent regression guards.
- ⬜ Program accepted. *(pending — the operator's act)*
