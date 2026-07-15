> **Canonical Recorded Journey — Educational Projection**
>
> This document maps the raw recorded journey onto the First Contact Specification episodes. It is the source from which website walkthroughs, video clips, tutorials, and conference demos are projected.
>
> Each episode contains a suggested clip length, the key events to show, and the narrative focus.

# Educational Projection: First Contact

## Episode 1 — The Spark (15 seconds)

**Focus:** Curiosity. The AI pauses before coding.

**Clip content:**

- Human: "Build me a Space Mission Tracking application."
- AI: "Absolutely. Before I write any code, I'm going to inspect your project, understand its architecture, and propose a plan for your approval."
- Terminal begins scrolling: `Analyzing repository... Reading package.json... Inspecting architecture...`

**Key message:**

> Most AI tools jump directly into generating code. SYNTH first gathers evidence so every change can be explained later.

**Evidence reference:**

- Bootstrap logs from `../data/event-log.jsonl`

---

## Episode 2 — The Idea (15 seconds)

**Focus:** Intent becomes a Mission.

**Clip content:**

- Show the `synth mission create` command.
- Show the resulting `MISSION_CREATED` event.
- Highlight the Mission name and purpose.

**Key message:**

> A Mission is a strategic objective — what we want to achieve, not how to achieve it.

**Evidence reference:**

- Event: `MISSION_CREATED` (Space Mission Tracking Application)

---

## Episode 3 — The Plan (30 seconds)

**Focus:** AI plans before executing, and plans require approval.

**Clip content:**

- Show the five `synth expedition create` commands.
- Show the resulting `PLAN_CREATED` and `EXPEDITION_CREATED` events.
- Show human approval via `synth mission approve`.
- Show the `MISSION_APPROVED` event.

**Key message:**

> A Mission is broken into Expeditions. Each Expedition produces Evidence and becomes part of an approved Plan before execution.

**Evidence reference:**

- Events: `PLAN_CREATED`, `EXPEDITION_CREATED`, `MISSION_APPROVED`

---

## Episode 4 — The AI Works (20 seconds)

**Focus:** The CLI is the execution surface for the AI agent.

**Clip content:**

- Show `npm run govern` running.
- Show execution intents: ApproveMission, ApproveExpedition, StartExpedition, CompleteObjective, CompleteExpedition, CompleteMission.
- Show progress indicators.

**Key message:**

> The human approved the Plan; the AI agent executes it through SYNTH's CLI surface.

**Evidence reference:**

- Proof artifact: `evidence-archive/proof.json`

---

## Episode 5 — Nothing Was Forgotten (20 seconds)

**Focus:** Every action becomes an immutable Event.

**Clip content:**

- Reveal the event log.
- Scroll through event types.
- Pause on `MISSION_CREATED`, `EXPEDITION_CREATED`, `MISSION_COMPLETED`.

**Key message:**

> Every one of those actions became an immutable Event. Once recorded, it cannot be changed.

**Evidence reference:**

- File: `../data/event-log.jsonl` (32 events)

---

## Episode 6 — State (15 seconds)

**Focus:** The current picture is derived from Events.

**Clip content:**

- Show the final State summary.
- Highlight: 1 Mission completed, 5 Expeditions completed, 7 Objectives completed.

**Key message:**

> State is not edited directly. It is rebuilt by applying Events.

**Evidence reference:**

- Final state derived from Replay.

---

## Episode 7 — Replay (25 seconds)

**Focus:** Replay proves history.

**Clip content:**

- Show `synth explain replay`.
- Show the output: `consistent: true`, `eventCount: 32`, `chainValid: true`.
- Animate stepping backward through events.

**Key message:**

> Replay proves that the current State matches the event history.

**Evidence reference:**

- Replay report: `evidence-archive/replay-report.json`

---

## Episode 8 — Your Turn (15 seconds)

**Focus:** Possibility. The emotional conclusion.

**Clip content:**

- Show the install and init commands.
- Show the user creating their first Mission.
- End with a clear call to action.

**Key message:**

> You've seen SYNTH. Now build your own Mission.

**Evidence reference:**

- CLI commands from `raw-recording.md` Episode 8.

---

## Continue Exploring (optional, 20 seconds)

**Focus:** Architecture for the curious.

**Clip content:**

- Show the architecture diagram.
- Mention Protected Assets.
- Link to deeper documentation.

**Key message:**

> Curious how it works? Explore the architecture.

---

## Total runtime

Approximately **2 minutes 35 seconds** for the core journey, excluding optional architecture segment.

## Projection targets

| Surface | How to use this projection |
|---|---|
| Website | One page per episode, auto-advance or scroll |
| Video | Cut clips to suggested lengths, add voiceover |
| Conference demo | Live `npm run govern` in `examples/first-contact/` |
| Tutorial | Expand each episode into a written section |
| AI onboarding | Use episode order in agent prompts |
