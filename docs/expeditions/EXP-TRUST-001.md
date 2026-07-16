# EXP-TRUST-001 — Govern Recursion Guard

**Status:** Completed (pending acceptance)  
**Kind:** Implementation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-011 — Operator Trust & CLI Integrity  
**Depends On:** EXP-PROGRAM-010  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (finding N1)

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

Make governance delegation cycle-proof. Any path that can lead `npm run govern` back into `synth` (or into itself) must be detected and fail **prescriptively** — in seconds, naming the cycle and the safe fix — never discovered after a 102-second hang that ends with the operator making governance vacuous to escape it.

---

## Motivation

The TaskPRO field experiment detonated this exact bomb (annex §3, steps 4, 8, 9):

1. `synth bootstrap --approve` reported `"No package.json found; govern skipped."` — an unpaved road. The agent rationally created a `package.json` with `"govern": "synth govern"` to enable governance.
2. The next `synth bootstrap --approve` found the script and ran it (`src/cli/bootstrap-apply.ts:253-254`) → `synth govern` delegates to `npm run govern` (`src/cli/synth.ts:273-283`) → the project's govern script invokes `synth govern` again → **infinite recursion**, ~102 s, seven killed background tasks.
3. The agent escaped by setting `govern: "npm run test"` with a stub test — **governance rendered vacuous while appearing to pass.**

Two details make this expedition's direction unambiguous:

- The agent *guessed the fix*: it tried a `SYNTH_GOVERN` environment guard and reported "none exists." The ecosystem already expects this guard; we are implementing the expected invariant.
- The failure converted a trust feature (the govern gate) into its opposite (a vacuous pass) — the most damaging outcome a governance system can produce.

---

## Scope

```text
Govern delegation paths
        │
        ├──► synth govern / synth validate --full  →  npm run govern  (delegation point)
        │
        ├──► synth bootstrap --approve  →  project's govern script  (intake point)
        │
        └──► project package.json "govern" script  →  anything, including synth (cycle surface)
```

In scope: cycle detection, prescriptive failure, safe bootstrap scaffolding, regression guards.

Out of scope: changing what `npm run govern` means inside the SYNTH repo itself; the validation planner's plan semantics; the public vocabulary.

---

## Deliverables

1. **Delegation cycle guard** — a delegation marker (env-scoped, e.g. `SYNTH_GOVERN_*`) set before spawning `npm run govern`; on entry, if the marker is already present, fail immediately with a prescriptive error that names the cycle and the safe remediation. Covers both direct loops (govern → itself) and transitive loops (govern → synth → govern).

2. **Static cycle pre-flight** — before delegating, inspect the target `package.json`'s `govern` script; if it resolves (directly or via `synth …`) back into a synth delegation command, refuse before spawning, with the same prescriptive message. The guard must work even when the marker was stripped (fresh shell, CI wrappers).

3. **Safe bootstrap scaffolding** — replace `"No package.json found; govern skipped."` with a paved road: bootstrap either scaffolds a minimal *safe* govern script for the project or prints the exact script to add — and in both cases explicitly warns against pointing `govern` at `synth govern`, with the reason. Rejection → remediation, per the program principle *every rejection needs a paved road*.

4. **Regression guards** — permanent tests in `test:all`: env-marker loop detected, static pre-flight refusal, bootstrap message/scaffold content, and an end-to-end Loop-A fixture (project whose govern script is `synth govern`) failing prescriptively in seconds.

---

## Acceptance

```text
project govern script = "synth govern"
        ↓
synth bootstrap --approve  (or synth validate --full)
        ↓
FAIL in seconds, prescriptively:
  - name the cycle
  - name the offending script
  - give the safe alternative
never: hang, never: vacuous pass
```

- Loop A from the TaskPRO chronology dies prescriptively in under 10 seconds.
- No path exists where delegation recursion can run unbounded.
- Bootstrap never again induces creation of the triggering file.
- All new guards are wired into `test:all`; `npm run govern` passes in CI.

---

## Phases

### Phase 1 — Map and fixture

Reproduce Loop A in a disposable fixture project; codify it as a failing test.

### Phase 2 — Delegation guard

Implement the env-scoped marker and entry check at every delegation point.

### Phase 3 — Static pre-flight

Implement `package.json` govern-script inspection and refusal.

### Phase 4 — Bootstrap paved road

Replace the skip message; scaffold or prescribe the safe govern script with the explicit anti-cycle warning.

### Phase 5 — Verify

Regression guards wired into `test:all`; fixture suite green; full validation via CI.

---

## Risks

| Risk | Mitigation |
|---|---|
| Guard breaks legitimate nested invocations (repo scripts that call `synth validate` from within govern) | Marker carries depth, not just presence; static pre-flight distinguishes delegation cycles from ordinary synth commands; fixture matrix includes legitimate nesting |
| Marker stripped by clean environments (CI, `env -i`) | Static pre-flight does not depend on the marker; the two layers are independent |
| Message change breaks docs/tests asserting the old skip text | Sweep for the string; update assertions and docs in the same expedition |
| Over-prescriptive error text leaks implementation vocabulary | Message uses public vocabulary only (Plan, Evidence, governance); vocabulary audit gate applies |

---

## Definition of Done

- [x] Loop A fixture fails prescriptively in under 10 seconds (was: ~102 s hang → vacuous governance).
- [x] Delegation guard active at every `npm run govern` spawn point.
- [x] Static pre-flight refuses cyclic govern scripts before spawning.
- [x] Bootstrap prints/scaffolds a paved road; anti-cycle warning present.
- [x] Regression guards wired into `test:all`.
- [x] Documentation integrity checks pass.
- [x] `npm run govern` passes (via CI `proof` check).
- [x] Expedition is accepted.

---

## Implementation Plan

1. Reproduce and fixture Loop A.
2. Implement the delegation marker + entry checks.
3. Implement static govern-script pre-flight.
4. Replace the bootstrap skip message with the paved road + warning.
5. Wire regression guards; request acceptance.

---

## Completion Notes

Implemented exactly as scoped, with two independent guard layers in a new module, `src/cli/govern-delegation.ts`:

- **Marker layer** — every guarded delegation stamps `SYNTH_GOVERN_DEPTH` into the child environment (`depth + 1`); a delegation attempt at depth ≥ 1, or with a malformed marker, is refused before spawning.
- **Static layer** — before delegating, the target project's `package.json` `govern` script is inspected and refused when it matches `npm run govern`, `synth[.js] govern`, or `synth[.js] validate` (the adaptive validator can also delegate, so all `synth validate` forms are refused). The refusal quotes the offending script and prescribes the safe alternative.

Both layers are wired at all four `npm run govern` spawn points: `synth govern` (`cmdGovern`), `synth validate --full` (`runGovernAndExit`), the adaptive validator's govern step (`executeValidationPlan`), and `synth bootstrap --approve` intake (`runGovern` in `bootstrap-apply.ts`). CLI refusals surface through the standard JSON error path (`printError` / rejected command); bootstrap records the refusal in `governOutput` and reports `status: "error"`.

The bootstrap skip message is now a paved road: it prescribes a safe govern script (`"govern": "npm test"`) and explicitly warns against pointing `govern` at `synth govern`, `synth validate`, or `npm run govern`, with the reason.

Regression guards live in `tests/govern-recursion-guard.test.js` (wired into `test:all` as `test:govern-recursion-guard`, 23 assertions): Loop A verbatim (`"govern": "synth govern"`), the `npm run govern` self-loop, the transitive loop (`synth validate --full`), legitimate-script pass-through with guard silence, marker-layer isolation (`SYNTH_GOVERN_DEPTH=1` refuses a safe script without executing it), and the bootstrap intake path. Fixtures are self-limiting (counter-bounded shims) so even an unguarded regression terminates instead of hanging, and the delegation marker is scrubbed from the fixture environment so the suite is deterministic whether the pipeline was entered via `npm run govern` or `synth govern`. Observed: cyclic fixtures die in ~1 s with zero delegation hops (was ~102 s hang).

Repo self-check: the repository's own `govern` script (`npm run build && npm run test:all && npm run proof`) matches no cyclic pattern, so the guard stays silent for SYNTH itself.

Evidence: CI `proof` check on the implementing PR (full `npm run govern`).
