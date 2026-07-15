# EXP-FIRSTCONTACT-003 — Canonical Recorded Journey

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-009 — Canonical First Contact Experience  
**Depends On:** EXP-FIRSTCONTACT-002  
**Blocks:** EXP-FIRSTCONTACT-004, EXP-FIRSTCONTACT-005

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

Execute the canonical Mission while recording every interaction between Human, AI Agent, and SYNTH, producing the authoritative behavioral evidence from which every first-contact projection is derived.

---

## Motivation

A journey specification is only useful if it can be grounded in real execution. Recording the complete interaction—human prompts, AI reasoning, SYNTH CLI invocations, events, and Replay—creates the canonical evidence that makes the first-contact story reproducible and verifiable.

---

## Deliverables

1. **Canonical Mission execution**
   - Execute the Mission: *Build me a Space Mission Tracking Application.*

2. **Human prompts**
   - Exact natural-language prompts given to the AI agent.

3. **AI reasoning**
   - Key reasoning steps the AI agent produces during planning.

4. **SYNTH CLI invocations**
   - Commands the AI agent executes through the CLI.

5. **Events**
   - Event log produced by Genesis during execution.

6. **Replay**
   - Replay artifact that reconstructs the execution.

7. **Proof**
   - Proof artifact certifying successful execution.

8. **Timeline**
   - Human-readable timeline mapping each interaction to a journey episode.

---

## Acceptance

The recorded journey can be replayed, inspected, and projected into any first-contact surface without requiring additional explanation.

---

## Phases

### Phase 1 — Prepare the Mission

Translate the EXP-FIRSTCONTACT-002 journey specification into a concrete Mission.

### Phase 2 — Execute with an AI agent

Run the Mission through SYNTH while capturing all interaction evidence.

### Phase 3 — Produce Replay and Proof

Generate Replay and Proof artifacts using `npm run govern`.

### Phase 4 — Build the timeline

Map recorded events to the journey episodes defined in EXP-FIRSTCONTACT-002.

### Phase 5 — Publish the canonical record

Store the recorded journey as the authoritative evidence artifact.

---

## Risks

| Risk | Mitigation |
|---|---|
| Execution fails or is non-deterministic | Re-run until a clean, reproducible record is produced |
| Recorded journey is too complex | Scope the Mission to fit the five-minute comprehension target |
| AI reasoning is not captured | Use SYNTH's event and replay system as the source of truth |

---

## Definition of Done

- [ ] Canonical Mission executed successfully.
- [ ] Human prompts captured.
- [ ] AI reasoning captured.
- [ ] CLI invocations captured.
- [ ] Events captured.
- [ ] Replay artifact produced.
- [ ] Proof artifact produced.
- [ ] Timeline mapped to journey episodes.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Finalize Mission scope with EXP-FIRSTCONTACT-002.
2. Execute the Mission through SYNTH.
3. Collect events, replay, and proof.
4. Build the human-readable timeline.
5. Store the canonical recorded journey.

---

## Completion Notes

Pending.
