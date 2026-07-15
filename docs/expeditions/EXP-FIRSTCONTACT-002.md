# EXP-FIRSTCONTACT-002 — Canonical Journey Specification

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-009 — Canonical First Contact Experience  
**Depends On:** EXP-FIRSTCONTACT-001  
**Blocks:** EXP-FIRSTCONTACT-003, EXP-FIRSTCONTACT-004, EXP-FIRSTCONTACT-005, EXP-FIRSTCONTACT-006

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

Design the authoritative learning journey that every newcomer experiences, regardless of medium.

---

## Motivation

The public narrative defines what SYNTH is. The canonical journey defines how a newcomer learns it. Without a governed journey, every surface invents its own sequencing, causing inconsistent understanding despite a shared narrative.

---

## Deliverables

1. **Journey structure**
   - Episodes or stages that a newcomer progresses through.

2. **Episode sequence**
   - Ordered list of experiences that follow Show → Explain → Name.

3. **Learning objectives**
   - What the newcomer should understand at each stage.

4. **Story progression**
   - Narrative arc for the canonical Mission: *Build me a Space Mission Tracking Application.*

5. **Concept introduction order**
   - When each public concept (Mission, AI agent, CLI, Replay, Governance, Evidence) is first experienced, then explained, then named.

6. **Success metrics**
   - Observable signals that a newcomer has understood each stage.

---

## Acceptance

Any SYNTH contributor can read the First Contact Specification and produce a website page, documentation chapter, tutorial, video script, or AI prompt that follows the same journey.

---

## Phases

### Phase 1 — Audit current surfaces

Map how the website, documentation, installer, CLI help, and examples currently introduce SYNTH.

### Phase 2 — Define the canonical Mission

Select and specify *Build me a Space Mission Tracking Application* as the reference Mission.

### Phase 3 — Design the journey arc

Define episodes from initial encounter to "I understand Replay."

### Phase 4 — Specify concept timing

For each public concept, decide where it is first experienced, explained, and named.

### Phase 5 — Define success metrics

Specify how comprehension is measured at each stage.

---

## Risks

| Risk | Mitigation |
|---|---|
| Journey becomes too long | Optimize for five-minute comprehension |
| Journey conflicts with narrative ladder | Align every episode with a Narrative Ladder level |
| Journey assumes prior SYNTH knowledge | Validate with external newcomers |

---

## Definition of Done

- [ ] Journey structure documented.
- [ ] Episode sequence defined.
- [ ] Learning objectives specified per episode.
- [ ] Story progression for the canonical Mission documented.
- [ ] Concept introduction order defined.
- [ ] Success metrics specified.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Gather current first-contact surfaces.
2. Draft the canonical journey.
3. Align with EXP-FIRSTCONTACT-001 narrative ladder.
4. Store the First Contact Specification as the authoritative source.
5. Hand off to EXP-FIRSTCONTACT-003 for execution and recording.

---

## Completion Notes

Pending.
