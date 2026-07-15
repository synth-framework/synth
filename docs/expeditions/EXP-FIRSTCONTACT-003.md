# EXP-FIRSTCONTACT-003 — Canonical Recorded Journey

**Status:** Accepted  
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

2. **Artifact 1 — Raw Recording**
   - Complete narrative transcript including human prompts, AI reasoning, CLI invocations, and actual SYNTH output.

3. **Artifact 2 — Educational Projection**
   - Episode-length mapping of the raw recording onto the First Contact Specification for website, video, and demo use.

4. **Artifact 3 — Evidence Archive**
   - Raw assets: commands, events, replay report, proof, and timeline.

5. **Human prompts**
   - Exact natural-language prompts given to the AI agent.

6. **AI reasoning**
   - Key reasoning steps the AI agent produces during planning.

7. **SYNTH CLI invocations**
   - Commands the AI agent executes through the CLI.

8. **Events**
   - Event log produced by Genesis during execution.

9. **Replay**
   - Replay artifact that reconstructs the execution.

10. **Proof**
    - Proof artifact certifying successful execution.

11. **Timeline**
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

- [x] Canonical Mission executed successfully.
- [x] Human prompts captured.
- [x] AI reasoning captured.
- [x] CLI invocations captured.
- [x] Events captured.
- [x] Replay artifact produced.
- [x] Proof artifact produced.
- [x] Timeline mapped to journey episodes.
- [x] Raw recording artifact produced.
- [x] Educational projection artifact produced.
- [x] Evidence archive artifact produced.
- [x] `npm run govern` passes on final PR.
- [x] Expedition is accepted.

---

## Implementation Plan

1. Finalize Mission scope with EXP-FIRSTCONTACT-002.
2. Execute the Mission through SYNTH.
3. Collect events, replay, and proof.
4. Build the human-readable timeline.
5. Store the canonical recorded journey.

---

## Completion Notes

- Created `examples/first-contact/` as the canonical recorded journey workspace.
- Executed the canonical Mission *Build me a Space Mission Tracking Application* through the shared example runner.
- Produced 32 immutable events, a replay-consistent state, and a passing proof artifact.
- Replay verification output: `consistent: true`, `eventCount: 32`, `chainValid: true`.
- Produced three recorded-journey artifacts in `examples/first-contact/recorded-journey/`:
  1. `raw-recording.md` — complete narrative transcript.
  2. `educational-projection.md` — episode-length mapping for public surfaces.
  3. `evidence-archive/` — commands, events, replay report, proof, and timeline.
- The example can be reproduced by running `npm run govern` in `examples/first-contact/`.

## Acceptance Note

This expedition successfully validates the First Contact operator journey and establishes it as the canonical recorded experience. Architectural correctness was demonstrated through governance, replay, and proof generation. Several implementation defects were identified during post-expedition forensic analysis. These findings are intentionally deferred to the Constitutional Hardening Program (EXP-PROGRAM-010) and do not affect acceptance of this expedition.
