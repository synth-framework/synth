> **Projection notice.** This document is a deterministic projection of the [canonical First Contact evidence archive](../../examples/first-contact/recorded-journey/evidence-archive-b/) (Archive B, hardened pipeline). Do not edit by hand; regenerate with `node scripts/generate-first-contact-projection.js`.

# First Contact — Conference Demo Projection

Scripted live-demo narrative. Every line traces to an episode of the canonical journey.

### The Spark

*Presenter:* SYNTH bootstraps and begins analyzing before acting.

### The Idea

*Presenter:* Human intent is captured as a Mission.

**Run:**

```
Build me a Space Mission Tracking application.
```
```
synth mission create --subject "Space Mission Tracking Application" --purpose "Track space missions, crew assignments, and launch windows with a simple, realistic implementation."
```

### The Plan

*Presenter:* The Mission is decomposed into Expeditions and Objectives, then approved.

**Run:**

```
synth expedition create --mission "Space Mission Tracking Application" --subject "Design Data Model" --goal "Design the data model for missions, crew, and launch windows."
```
```
synth expedition create --mission "Space Mission Tracking Application" --subject "Scaffold Application" --goal "Scaffold the application structure and core modules."
```
```
synth expedition create --mission "Space Mission Tracking Application" --subject "Implement Mission Views" --goal "Implement mission listing and detail views."
```
```
synth expedition create --mission "Space Mission Tracking Application" --subject "Implement Crew Workflow" --goal "Add crew assignment workflow."
```
```
synth expedition create --mission "Space Mission Tracking Application" --subject "Validate Implementation" --goal "Validate the implementation with the operator and generate documentation."
```
```
The proposed plan looks good. Approve it.
```
```
synth mission approve --draft-id <draft-id>
```

### The AI Works

*Presenter:* The approved Plan is executed through the CLI surface.

**Run:**

```
npm run govern
```

### Nothing Was Forgotten

*Presenter:* Every action is recorded as an immutable Event.

### State

*Presenter:* The final State shows all work completed.

### Replay

*Presenter:* Replay verifies that State matches the 32-event history.

**Run:**

```
synth explain replay
```

### Your Turn

*Presenter:* The user is invited to install SYNTH and create their first Mission.

**Run:**

```
curl -fsSL https://synth.dev/install.sh | sh
```
```
synth doctor
```
```
synth init
```
```
synth mission create --subject "Space Mission Tracker" --purpose "Track missions, crew, and launch windows."
```

## Setup

Use Archive B (`examples/first-contact/recorded-journey/evidence-archive-b/`) as the recorded evidence. Run the same commands from `commands.json` in order. The demo ends with `synth explain replay` showing the consistent replay verdict.
