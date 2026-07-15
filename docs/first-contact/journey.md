> **Projection notice.** This document is a deterministic projection of the [canonical First Contact evidence archive](../../examples/first-contact/recorded-journey/evidence-archive/). Do not edit by hand; regenerate with `node scripts/generate-first-contact-projection.js`.

# First Contact — The Journey

The canonical journey in eight episodes, as recorded in `timeline.json` and `commands.json`.

## Episode 1 — The Spark

SYNTH bootstraps and begins analyzing before acting.

**Events:** `SYSTEM_GENESIS`

---

## Episode 2 — The Idea

Human intent is captured as a Mission.

**Events:** `MISSION_CREATED`

**Commands as executed:**

- `Build me a Space Mission Tracking application.` _(human)_
- `synth mission create --subject "Space Mission Tracking Application" --purpose "Track space missions, crew assignments, and launch windows with a simple, realistic implementation."` _(ai-agent)_

---

## Episode 3 — The Plan

The Mission is decomposed into Expeditions and Objectives, then approved.

**Events:** `PLAN_CREATED`, `EXPEDITION_CREATED`, `OBJECTIVE_ADDED`, `WORK_ITEM_CREATED`, `MISSION_APPROVED`

**Commands as executed:**

- `synth expedition create --mission "Space Mission Tracking Application" --subject "Design Data Model" --goal "Design the data model for missions, crew, and launch windows."` _(ai-agent)_
- `synth expedition create --mission "Space Mission Tracking Application" --subject "Scaffold Application" --goal "Scaffold the application structure and core modules."` _(ai-agent)_
- `synth expedition create --mission "Space Mission Tracking Application" --subject "Implement Mission Views" --goal "Implement mission listing and detail views."` _(ai-agent)_
- `synth expedition create --mission "Space Mission Tracking Application" --subject "Implement Crew Workflow" --goal "Add crew assignment workflow."` _(ai-agent)_
- `synth expedition create --mission "Space Mission Tracking Application" --subject "Validate Implementation" --goal "Validate the implementation with the operator and generate documentation."` _(ai-agent)_
- `The proposed plan looks good. Approve it.` _(human)_
- `synth mission approve --draft-id <draft-id>` _(ai-agent)_

---

## Episode 4 — The AI Works

The approved Plan is executed through the CLI surface.

**Events:** `EXPEDITION_APPROVED`, `EXPEDITION_STARTED`

**Commands as executed:**

- `npm run govern` _(ai-agent)_

---

## Episode 5 — Nothing Was Forgotten

Every action is recorded as an immutable Event.

**Events:** `OBJECTIVE_COMPLETED`, `EXPEDITION_COMPLETED`

---

## Episode 6 — State

The final State shows all work completed.

**Events:** `MISSION_COMPLETED`

---

## Episode 7 — Replay

Replay verifies that State matches the 32-event history.

**Commands as executed:**

- `synth explain replay` _(ai-agent)_

---

## Episode 8 — Your Turn

The user is invited to install SYNTH and create their first Mission.

**Commands as executed:**

- `curl -fsSL https://synth.dev/install.sh | sh` _(human)_
- `synth doctor` _(human)_
- `synth init` _(human)_
- `synth mission create --subject "Space Mission Tracker" --purpose "Track missions, crew, and launch windows."` _(human)_

