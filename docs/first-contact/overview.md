> **Projection notice.** This document is a deterministic projection of the [canonical First Contact evidence archive](../../examples/first-contact/recorded-journey/evidence-archive-b/) (Archive B, hardened pipeline). Do not edit by hand; regenerate with `node scripts/generate-first-contact-projection.js`.

# First Contact — Overview

This is the canonical First Contact journey: one complete SYNTH execution, recorded end to end.

- **Mission:** Space Mission Tracking Application
- **Events recorded:** 32 immutable events
- **Replay:** consistent (chain valid)
- **Proof:** passed

## The journey in six documents

| Document | Content |
|---|---|
| [Journey](journey.md) | The eight episodes of the canonical journey, with the commands as executed |
| [Architecture](architecture.md) | The architecture the journey exercises, in the order a newcomer meets it |
| [Evidence](evidence.md) | The evidence archive: what each artifact proves |
| [Replay](replay.md) | The replay verification of the 32-event history |
| [Lessons](lessons.md) | What the journey validates — and what it does not yet prove |

## Experience projections

The same canonical evidence also drives the remaining public surfaces defined by EXP-FIRSTCONTACT-008:

| Projection | Purpose |
|---|---|
| [Interactive tutorial](tutorial.md) and [website tutorial](../../website/first-contact/tutorial.html) | Step through the journey episode by episode |
| [Slides](slides.md) | Talk-ready deck outline |
| [Video storyboard](storyboard.md) | Scene-by-scene visual and audio plan |
| [Conference demo](conference-demo.md) | Scripted live-demo narrative |
| [AI onboarding](ai-onboarding.md) | How an AI agent should introduce SYNTH |
| [Installer walkthrough](installer-walkthrough.md) and [website installer page](../../website/first-contact/installer.html) | First-contact copy after installation |

## Validation

Comprehension of the First Contact experience is measured by the [Comprehension Validation Protocol](comprehension-validation-protocol.md) (EXP-FIRSTCONTACT-006).

## Evidence source

Every statement in these documents derives from the canonical evidence archive at `examples/first-contact/recorded-journey/evidence-archive-b/` (Archive B, hardened pipeline). The archive contains the immutable event log (`events.jsonl`), the journey timeline, the executed commands, the proof artifact, the replay report, and the signed snapshot artifacts. The [Evidence](evidence.md) page also carries the derived comparison against Archive A, the preserved pre-hardening recording.
