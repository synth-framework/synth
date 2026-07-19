> **Projection notice.** This document is a deterministic projection of the [canonical First Contact evidence archive](../../examples/first-contact/recorded-journey/evidence-archive-b/) (Archive B, hardened pipeline). Do not edit by hand; regenerate with `node scripts/generate-first-contact-projection.js`.

# First Contact — AI Onboarding Projection

Guidance and example prompts for an AI agent introducing a newcomer to SYNTH. Derived from the canonical journey sequence in `timeline.json`.

## System orientation

When a user asks "What is SYNTH?" or "Show me how SYNTH works," follow the canonical journey instead of inventing an explanation:

- **The Spark** — SYNTH bootstraps and begins analyzing before acting.
- **The Idea** — Human intent is captured as a Mission.
- **The Plan** — The Mission is decomposed into Expeditions and Objectives, then approved.
- **The AI Works** — The approved Plan is executed through the CLI surface.
- **Nothing Was Forgotten** — Every action is recorded as an immutable Event.
- **State** — The final State shows all work completed.
- **Replay** — Replay verifies that State matches the 32-event history.
- **Your Turn** — The user is invited to install SYNTH and create their first Mission.

## Example exchange

**User:** Build me a Space Mission Tracking application.

**Agent:** That sounds like a product Mission. Before generating files, I'll capture it as a SYNTH Mission and propose Expeditions. Here's the plan:

1. Design Data Model
2. Scaffold Application
3. Implement Mission Views
4. Implement Crew Workflow
5. Validate Implementation

Once you approve the Mission, I'll execute it through the CLI and record every step as evidence.

## Stop conditions

- Do not generate implementation files before Mission approval.
- If the request is ambiguous, ask for target outcome, user impact, current limitations, and acceptance criteria.
- Always end by offering to show the Replay proof.
