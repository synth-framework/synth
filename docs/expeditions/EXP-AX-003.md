# EXP-AX-003 — README & Narrative Alignment

**Status:** Completed  
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
   - Reference `AGENTS.md` so AI operators know the root contract.
   - Mention `synth validate` as the local iteration command.
   - Keep architecture as a secondary section.
   - Add examples, documentation links, and community section.

2. **Updated Quick Start**
   - `synth init`
   - `synth mission create`
   - `synth mission approve`
   - `synth validate`
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
- `synth validate` is introduced as the local iteration command.
- `AGENTS.md` is referenced for AI operators.
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

- [x] README opens with the new tagline and value proposition.
- [x] Installation instructions use `npm` / `npx`, not `git clone`.
- [x] A 60-second demo is included as text.
- [x] Quick Start includes the Mission lifecycle and `synth validate`.
- [x] README references `AGENTS.md` for AI operators.
- [x] Architecture section is secondary.
- [x] `docs/getting-started/README.md` and `docs/operator/01-getting-started.md` match the README narrative.
- [x] Website landing page is aligned.
- [x] Expedition is accepted.

---

## Implementation Plan

1. Draft new README structure. ✅
2. Script the 60-second demo. ✅
3. Rewrite `README.md`. ✅
4. Rewrite `docs/getting-started/README.md`. ✅
5. Rewrite `docs/operator/01-getting-started.md`. ✅
6. Update `website/index.html` landing copy. ✅
7. Run `npm run docs:check-links`. ✅
8. Build and verify. ✅

---

## Completion Notes

Public narrative rewritten and cross-document alignment completed:

- `README.md` now leads with the tagline and value proposition, shows the npm install command, includes a 60-second CLI demo, references `AGENTS.md`, and keeps architecture secondary.
- `docs/getting-started/README.md` rewritten as a CLI-first Quick Start covering install, Mission Draft creation, approval, `synth validate`, `npm run govern`, and `synth explain replay`.
- `docs/operator/01-getting-started.md` rewritten to teach the public concepts through the CLI instead of the internal API.
- `website/index.html` aligned with the new narrative, including the install command, AGENTS.md reference, and updated public flow.

**Acceptance:** Expedition accepted as part of EXP-PROGRAM-004 closure.
