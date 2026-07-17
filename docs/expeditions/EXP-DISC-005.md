# EXP-DISC-005 — Runtime Integrity

**Status:** Completed (pending acceptance)  
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-012 — Runtime Self-Description  
**Depends On:** EXP-PROGRAM-011  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (finding N6)

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

Make `synth doctor` verify that the installed `dist/` tree matches the build that was published. This closes the trust gap between "the package says it is version X" and "the files on disk actually are version X."

---

## Motivation

The TaskPRO field experiment (N6) showed the agent reading runtime source files to verify behavior. If the runtime cannot attest to its own integrity, an operator has no deterministic way to know whether the installed artifacts have been modified, partially copied, or built from a different source revision.

---

## Scope

```text
npm run build
        ↓
dist/dist-manifest.json  (build-time artifact)
        ↓
synth doctor
        ↓
checks.distIntegrity: ok | fail
```

In scope:

- Generate a SHA-256 manifest of every file in `dist/` during `npm run build`.
- Store the manifest at `dist/dist-manifest.json` so it is included in the published package.
- Extend `synth doctor` to compare installed `dist/` files against the manifest.
- Report missing or modified files as a non-fatal warning with prescriptive next steps.
- Regression tests for integrity OK and tamper detection.

Out of scope:

- Signature verification with a separate signing key.
- Verification of source files outside `dist/`.
- Enforcement that blocks execution.

---

## Deliverables

1. **`scripts/generate-dist-manifest.js`** — build-time manifest generator.
2. **`npm run build` now emits `dist/dist-manifest.json`.**
3. **`synth doctor` includes a `distIntegrity` check.**
4. **`tests/runtime-integrity.test.js`** — regression guards wired into `test:all`.

---

## Acceptance

```text
synth doctor
        ↓
checks.distIntegrity.ok === true
checks.distIntegrity.detail === "<N> dist file(s) verified"
```

```text
// modify any dist file
synth doctor
        ↓
status === "warning"
checks.distIntegrity.ok === false
checks.distIntegrity.detail.includes("modified")
```

- `npm run build` produces `dist/dist-manifest.json` deterministically.
- All existing tests continue to pass.
- `npm run govern` passes in CI (pending operator verification).

---

## Phases

### Phase 1 — Manifest generator

Write `scripts/generate-dist-manifest.js` to walk `dist/`, hash each file, and write `dist/dist-manifest.json`.

### Phase 2 — Build integration

Append manifest generation to the `build` npm script.

### Phase 3 — Doctor verification

Add `verifyDistIntegrity()` to the CLI and surface it in `synth doctor` output.

### Phase 4 — Regression tests

Verify integrity OK and tamper detection.

### Phase 5 — Verify

Run targeted tests, neighbor CLI tests, and full governance.

---

## Risks

| Risk | Mitigation |
|---|---|
| Manifest makes the build non-deterministic due to timestamps | Only `generatedAt` varies; rootHash is content-based and deterministic for the same source tree. |
| Doctor fails on a legitimately patched installation | The check is advisory (`status: "warning"`), not a hard failure. |
| Missing manifest on fresh clone | Prescriptive next step tells the operator to run `npm run build`. |

---

## Definition of Done

- [x] `dist/dist-manifest.json` is generated during `npm run build`.
- [x] `synth doctor` verifies installed `dist/` files against the manifest.
- [x] Missing or modified files produce a warning with prescriptive next steps.
- [x] Regression guards wired into `test:all`.
- [x] Neighbor CLI tests pass.
- [ ] `npm run govern` passes (via CI `proof` check).
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Add manifest generator script.
2. Integrate it into `npm run build`.
3. Extend `cmdDoctor` with dist integrity verification.
4. Write regression tests.
5. Wire tests into `test:all` and verify.

---

## Completion Notes

- `scripts/generate-dist-manifest.js` walks `dist/`, computes per-file SHA-256 hashes, and writes a deterministic aggregate `rootHash`.
- `npm run build` now runs `tsc && node scripts/generate-dist-manifest.js`.
- `synth doctor` returns `checks.distIntegrity` with `ok`/`detail` and includes the check in the overall health verdict.
- `tests/runtime-integrity.test.js` verifies both a passing integrity check and detection of a modified dist file.
- Full governance acceptance is pending operator-run CI verification.
