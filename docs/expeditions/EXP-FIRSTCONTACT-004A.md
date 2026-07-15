# EXP-FIRSTCONTACT-004A — Canonical Journey Documentation Projection

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-009 — Canonical First Contact Experience  
**Depends On:** EXP-FIRSTCONTACT-002, EXP-FIRSTCONTACT-003  
**Blocks:** EXP-FIRSTCONTACT-004B, EXP-FIRSTCONTACT-005, EXP-FIRSTCONTACT-006

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

Generate the website and documentation First Contact experiences as deterministic projections of the canonical evidence archive — no manually recreated narrative.

---

## Motivation

The canonical recorded journey (EXP-FIRSTCONTACT-003) produced a complete evidence archive: `timeline.json`, `commands.json`, `events.jsonl`, and `proof.json`. Today that evidence is invisible to newcomers. The website and the documentation should present the journey by projecting directly from this archive, so the public story can never drift from the recorded execution.

This expedition is the first half of the superseded EXP-FIRSTCONTACT-004, split to keep the work reviewable: website and documentation projections are low-risk, produce external value, and help validate the public vocabulary. The remaining projection targets live in EXP-FIRSTCONTACT-004B behind the EXP-PROGRAM-010 hardening boundary.

---

## Scope

```text
examples/first-contact/recorded-journey/evidence-archive/
        │
        ├──► website projection
        ├──► documentation projection
        ├──► architecture narrative
        └──► evidence references
```

---

## Deliverables

1. **Projection generator**
   - A script that reads the canonical evidence archive (`timeline.json`, `commands.json`, `events.jsonl`, `proof.json`) and emits the website and documentation projections.
   - Deterministic: identical archive produces identical output.
   - Fails if a required evidence artifact is missing or malformed.

2. **Evidence archive repair**
   - `replay-report.json` in the archive is corrupt (2 bytes since PR #51). Regenerate it deterministically from `events.jsonl` so the archive is complete.
   - Record the example-runner generation bug as evidence for EXP-PROGRAM-010.

3. **Website projection** — a First Contact section with pages:

   ```text
   First Contact
   ├── What is SYNTH?
   ├── The Mission
   ├── The Expedition
   ├── The Evidence
   ├── The Replay
   └── The Result
   ```

4. **Documentation projection** — `docs/first-contact/`:

   ```text
   docs/first-contact/
   ├── overview.md
   ├── journey.md
   ├── architecture.md
   ├── evidence.md
   ├── replay.md
   └── lessons.md
   ```

5. **Projection verification**
   - A check proving the website and documentation outputs derive from the canonical evidence archive (regenerate and compare).

---

## Acceptance

```text
Website projection
        │
        derives from
        │
Canonical evidence archive
```

- The projection generator runs deterministically and is wired into validation.
- Every generated page cites the evidence it was projected from.
- `npm run docs:check-links` and `npm run docs:verify-website-sync` pass.
- No narrative is authored by hand: deleting the generated outputs and re-running the generator restores them byte-identically.

---

## Phases

### Phase 1 — Repair the archive

Regenerate `replay-report.json` from `events.jsonl`; record the runner bug for EXP-PROGRAM-010.

### Phase 2 — Projection generator

Implement the generator consuming the evidence archive.

### Phase 3 — Documentation projection

Generate `docs/first-contact/`.

### Phase 4 — Website projection

Generate the First Contact website section and link it from site navigation.

### Phase 5 — Verify

Determinism check, link checks, sync checks, full validation.

---

## Risks

| Risk | Mitigation |
|---|---|
| Generated pages read as raw JSON dumps | Project through the episode structure of the First Contact Specification (Show → Explain → Name) |
| Archive schema drifts | Generator validates required artifacts and fails loudly |
| Website styling inconsistent | Reuse the existing `styles.css` and page structure |
| Hand edits creep into generated pages | Verification regenerates and compares; generated files carry a projection banner |

---

## Definition of Done

- [ ] `replay-report.json` regenerated and archive complete.
- [ ] Projection generator implemented and deterministic.
- [ ] `docs/first-contact/` generated (6 documents).
- [ ] Website First Contact section generated (6 pages).
- [ ] Projection verification wired into validation.
- [ ] Documentation integrity checks pass.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Regenerate the replay report; record the runner bug.
2. Implement the projection generator.
3. Generate and review the documentation projection.
4. Generate and review the website projection.
5. Wire verification into validation.
6. Request acceptance.

---

## Completion Notes

Pending.
