> **Projection notice.** This document is a deterministic projection of the [canonical First Contact evidence archive](../../examples/first-contact/recorded-journey/evidence-archive-b/) (Archive B, hardened pipeline). Do not edit by hand; regenerate with `node scripts/generate-first-contact-projection.js`.

# First Contact — Interactive Tutorial Projection

A step-by-step guided experience derived from the canonical journey. Each step maps to one episode of the recorded Mission.

### Step 1 — The Spark

SYNTH bootstraps and begins analyzing before acting.

**Events recorded:** `SYSTEM_GENESIS`


### Step 2 — The Idea

Human intent is captured as a Mission.

**Events recorded:** `MISSION_CREATED`

**Commands:**

- `Build me a Space Mission Tracking application.` _(human)_
- `synth mission create --subject "Space Mission Tracking Application" --purpose "Track space missions, crew assignments, and launch windows with a simple, realistic implementation."` _(ai-agent)_


### Step 3 — The Plan

The Mission is decomposed into Expeditions and Objectives, then approved.

**Events recorded:** `PLAN_CREATED`, `EXPEDITION_CREATED`, `OBJECTIVE_ADDED`, `WORK_ITEM_CREATED`, `MISSION_APPROVED`

**Commands:**

- `synth expedition create --mission "Space Mission Tracking Application" --subject "Design Data Model" --goal "Design the data model for missions, crew, and launch windows."` _(ai-agent)_
- `synth expedition create --mission "Space Mission Tracking Application" --subject "Scaffold Application" --goal "Scaffold the application structure and core modules."` _(ai-agent)_
- `synth expedition create --mission "Space Mission Tracking Application" --subject "Implement Mission Views" --goal "Implement mission listing and detail views."` _(ai-agent)_
- `synth expedition create --mission "Space Mission Tracking Application" --subject "Implement Crew Workflow" --goal "Add crew assignment workflow."` _(ai-agent)_
- `synth expedition create --mission "Space Mission Tracking Application" --subject "Validate Implementation" --goal "Validate the implementation with the operator and generate documentation."` _(ai-agent)_
- `The proposed plan looks good. Approve it.` _(human)_
- `synth mission approve --draft-id <draft-id>` _(ai-agent)_


### Step 4 — The AI Works

The approved Plan is executed through the CLI surface.

**Events recorded:** `EXPEDITION_APPROVED`, `EXPEDITION_STARTED`

**Commands:**

- `npm run govern` _(ai-agent)_


### Step 5 — Nothing Was Forgotten

Every action is recorded as an immutable Event.

**Events recorded:** `OBJECTIVE_COMPLETED`, `EXPEDITION_COMPLETED`


### Step 6 — State

The final State shows all work completed.

**Events recorded:** `MISSION_COMPLETED`


### Step 7 — Replay

Replay verifies that State matches the 32-event history.

**Commands:**

- `synth explain replay` _(ai-agent)_


### Step 8 — Your Turn

The user is invited to install SYNTH and create their first Mission.

**Commands:**

- `curl -fsSL https://synth.dev/install.sh | sh` _(human)_
- `synth doctor` _(human)_
- `synth init` _(human)_
- `synth mission create --subject "Space Mission Tracker" --purpose "Track missions, crew, and launch windows."` _(human)_


## Next steps

- Read the full [Journey](journey.md) for the narrative version.
- Inspect the [Evidence](evidence.md) to see which archive artifact produced each step.
- Try the interactive versions on the website: [Replay](../../website/first-contact/replay.html) and [Tutorial](../../website/first-contact/tutorial.html).
