> **Projection notice.** This document is a deterministic projection of the [canonical First Contact evidence archive](../../examples/first-contact/recorded-journey/evidence-archive-b/) (Archive B, hardened pipeline). Do not edit by hand; regenerate with `node scripts/generate-first-contact-projection.js`.

# First Contact — Slides Projection

Talk-ready deck outline, one slide per episode of the canonical journey.

---

## The Spark

SYNTH bootstraps and begins analyzing before acting.
---

## The Idea

Human intent is captured as a Mission.

**Speaker notes:** Commands in this episode — `Build me a Space Mission Tracking application.`, `synth mission create --subject "Space Mission Tracking Application" --purpose "Track space missions, crew assignments, and launch windows with a simple, realistic implementation."`.
---

## The Plan

The Mission is decomposed into Expeditions and Objectives, then approved.

**Speaker notes:** Commands in this episode — `synth expedition create --mission "Space Mission Tracking Application" --subject "Design Data Model" --goal "Design the data model for missions, crew, and launch windows."`, `synth expedition create --mission "Space Mission Tracking Application" --subject "Scaffold Application" --goal "Scaffold the application structure and core modules."`, `synth expedition create --mission "Space Mission Tracking Application" --subject "Implement Mission Views" --goal "Implement mission listing and detail views."`, `synth expedition create --mission "Space Mission Tracking Application" --subject "Implement Crew Workflow" --goal "Add crew assignment workflow."`, `synth expedition create --mission "Space Mission Tracking Application" --subject "Validate Implementation" --goal "Validate the implementation with the operator and generate documentation."`, `The proposed plan looks good. Approve it.`, `synth mission approve --draft-id <draft-id>`.
---

## The AI Works

The approved Plan is executed through the CLI surface.

**Speaker notes:** Commands in this episode — `npm run govern`.
---

## Nothing Was Forgotten

Every action is recorded as an immutable Event.
---

## State

The final State shows all work completed.
---

## Replay

Replay verifies that State matches the 32-event history.

**Speaker notes:** Commands in this episode — `synth explain replay`.
---

## Your Turn

The user is invited to install SYNTH and create their first Mission.

**Speaker notes:** Commands in this episode — `curl -fsSL https://synth.dev/install.sh | sh`, `synth doctor`, `synth init`, `synth mission create --subject "Space Mission Tracker" --purpose "Track missions, crew, and launch windows."`.
