> **Governed protocol.** This document defines the procedure for validating that the SYNTH First Contact experience communicates the platform correctly to newcomers. It is authored, not generated, and it is the artifact produced by EXP-FIRSTCONTACT-006.

# First Contact — Comprehension Validation Protocol

## Purpose

Validate that the First Contact experience consistently communicates SYNTH to newcomers without coaching.

## Status

- Protocol: **complete**
- External participant validation: **pending** (cannot be fabricated; must be conducted with real developers who have not used SYNTH)

## Scope

This protocol applies to every public projection of the canonical First Contact journey:

- Website First Contact pages (`website/first-contact/`)
- Documentation projections (`docs/first-contact/`)
- Interactive experiences (Replay, Tutorial)
- AI onboarding and quick-start projections

It does **not** validate architectural correctness, implementation quality, or governance internals. It measures only whether a newcomer understands what SYNTH is and why it matters after exposure to the First Contact experience.

---

## Participant criteria

Target participants:

- Experienced software developers (5+ years of professional development)
- Have not used SYNTH, read the SYNTH documentation, or watched a SYNTH demo
- Are comfortable with Git, the command line, and AI-assisted tools
- Are not employed by or financially tied to the SYNTH project

Recruit at least **three** participants. Five is preferred if resources allow.

### Screening questions

Ask each candidate:

1. Have you used SYNTH before?
2. Have you read any SYNTH documentation or watched a SYNTH demo?
3. Are you familiar with deterministic execution systems or event-sourcing frameworks?

A valid participant answers **no** to the first two questions. The third question is informational only and does not disqualify a candidate.

---

## Evaluation procedure

Each session follows the same sequence:

1. **Briefing (2 minutes)**
   - Explain that the participant will be shown a new tool and asked questions afterward.
   - Do not mention SYNTH by name.
   - Do not explain concepts in advance.

2. **Exposure (5 minutes)**
   - Show the participant the canonical First Contact website entry point (`website/first-contact/index.html`) or the documentation overview (`docs/first-contact/overview.md`).
   - Allow them to navigate freely within the First Contact surfaces.
   - Do not answer questions during this phase; record any questions asked.

3. **Questioning (5 minutes)**
   - Remove the material.
   - Ask the questions below in order.
   - Record answers verbatim or as summaries.

4. **Debrief (3 minutes)**
   - Ask what felt confusing, what felt clear, and what was missing.
   - Record observations.

---

## Question set

Ask every participant the following questions from memory, without the material visible:

1. What is SYNTH?
2. What problem does it solve?
3. How is SYNTH different from Git, CI/CD, or AI coding assistants?
4. What role does the AI agent play?
5. What role does the CLI play?
6. Why do Missions exist?
7. Why does Replay matter?

These map directly to the Program 009 success criteria and the [public narrative](../reference/public-narrative.md).

---

## Scoring rubric

For each question, score the response on a 3-point scale:

| Score | Meaning |
|---|---|
| 0 | No understanding or fundamentally wrong interpretation |
| 1 | Partial understanding; conflates SYNTH with a familiar tool |
| 2 | Correct conceptual understanding expressed in the participant's own words |

### Passing criteria

A participant **passes** if they score at least **1** on every question and at least **2** on questions 1, 2, 6, and 7.

The First Contact experience **passes validation** when at least **three out of three** participants pass.

### Failure modes

If a participant fails, classify the failure:

- **Vocabulary confusion:** a public term (Mission, Expedition, Replay) was misunderstood.
- **Sequencing confusion:** the participant understood the concepts but in the wrong order.
- **Missing motivation:** the participant did not grasp why SYNTH exists.
- **Implementation focus:** the participant assumed SYNTH is a code generator.

Each failure mode maps to a specific First Contact artifact that may need adjustment:

| Failure mode | Candidate fix |
|---|---|
| Vocabulary confusion | Adjust [First Contact Specification](../reference/first-contact-specification.md) or generated pages |
| Sequencing confusion | Reorder episodes in `timeline.json` or website narrative |
| Missing motivation | Strengthen problem statement in [public narrative](../reference/public-narrative.md) |
| Implementation focus | Emphasize Show → Explain → Name; de-emphasize code output |

---

## Test artifacts

Each session produces:

- `comprehension-session-NNN-transcript.md` — question responses and debrief notes
- `comprehension-session-NNN-scores.json` — per-question scores and failure-mode tags
- `comprehension-session-NNN-observations.md` — notes on navigation, questions asked, and emotional reactions

Store artifacts in `first-contact/sessions/` alongside other First Contact evidence.

---

## Validation report

After all sessions, publish a validation report containing:

- Participant summary (anonymous profiles)
- Per-participant scores
- Aggregate scores per question
- Failure-mode frequency
- Recommended adjustments to First Contact artifacts
- Decision: accept, adjust-and-retest, or reject

The report becomes evidence for the Program 009 acceptance review.

---

## Governance

- This protocol is a governed artifact. Changes require an update to EXP-FIRSTCONTACT-006.
- Validation must be rerun whenever the canonical journey, public narrative, or First Contact projections change materially.
- A material change is one that affects episode ordering, concept introduction, or the SYNTH promise.

---

## Related artifacts

- [First Contact overview](overview.md)
- [First Contact Specification](../reference/first-contact-specification.md)
- [Public Narrative](../reference/public-narrative.md)
- [EXP-FIRSTCONTACT-006](../expeditions/EXP-FIRSTCONTACT-006.md)
