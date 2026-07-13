# EXP-AX-003 — README & Narrative Alignment

**Status:** Active  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-004 — First Contact Program  
**Depends On:** EXP-AX-001, EXP-AX-002  
**Blocks:** EXP-AX-005

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

Rewrite the public narrative so a new visitor understands SYNTH in under one minute.

---

## Motivation

The current README explains what SYNTH is before showing why it matters. Installation begins with `git clone`. The first executable command is `npm run govern`. Mission Studio does not appear until the documentation section. The AI-native workflow is invisible.

The README should sell the experience first and explain the architecture second.

---

## Suggested Narrative

```text
Humans explore.
SYNTH remembers.
AI executes deterministically.

From an idea to replayable software through Missions, Expeditions and Proof.

↓

Install

↓

60-second demo

↓

How it works

↓

Examples

↓

Documentation

↓

Architecture (secondary)

↓

Community
```

---

## Deliverables

1. **Rewritten `README.md`**
   - Lead with the new tagline and value proposition.
   - Show installation with `npm install -g` or `npx`.
   - Provide a 60-second demo.
   - Introduce Mission Studio naturally during the Quick Start.
   - Keep architecture as a secondary section.
   - Add examples, documentation links, and community section.

2. **Updated Quick Start**
   - `synth init`
   - `synth mission create`
   - `synth mission approve`
   - `npm run govern`
   - `synth explain replay`

3. **Mission Studio visibility**
   - Mission Studio appears in the Quick Start, not buried in docs.

4. **Operator getting-started refresh**
   - Ensure `docs/operator/01-getting-started.md` matches the README narrative.

---

## Acceptance

A new visitor understands the value proposition in less than one minute.

Specifically:

- The first paragraph answers "What does SYNTH do for me?"
- Installation instructions are visible within the first screen.
- A runnable demo appears before the architecture explanation.
- Mission Studio is introduced as part of normal usage.
- Architecture section is below the fold.

---

## Phases

### Phase 1 — Narrative draft

Write the new README outline.

### Phase 2 — Demo script

Create a 60-second demo that can be recorded or copied.

### Phase 3 — README rewrite

Replace the existing README content.

### Phase 4 — Cross-document alignment

Update getting-started guide and website landing page to match.

### Phase 5 — Review

Have someone unfamiliar with SYNTH read the README and summarize it back.

---

## Risks

| Risk | Mitigation |
|---|---|
| README becomes marketing fluff | Anchor every claim to a command or artifact |
| Demo becomes outdated | Tie it to the CLI output tested in CI |
| Website drifts from README | Use the same copy in both places |

---

## Definition of Done

- [ ] README opens with the new tagline and value proposition.
- [ ] Installation instructions use `npm` / `npx`, not `git clone`.
- [ ] A 60-second demo is included as text or recording.
- [ ] Quick Start includes the Mission lifecycle.
- [ ] Architecture section is secondary.
- [ ] Website landing page is aligned.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Draft new README structure.
2. Record or script the 60-second demo.
3. Rewrite `README.md`.
4. Update `docs/operator/01-getting-started.md`.
5. Update `website/index.html` landing copy.
6. Run `npm run docs:check-links`.
7. Build and verify.

---

## Completion Notes

Pending.
