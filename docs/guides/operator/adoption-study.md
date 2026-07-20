# SYNTH Adoption Study Protocol

This document defines the protocol for validating SYNTH with human operators.

## Goal

Determine whether people with no prior SYNTH knowledge can understand and operate SYNTH within 30 minutes.

## Cohorts

| Role | Experience | Count |
|---|---|---|
| Junior developer | 0–2 years | ≥ 3 |
| Senior developer | 5+ years | ≥ 3 |
| Engineering manager | People + architecture | ≥ 2 |
| Student | No professional experience | ≥ 2 |

## Environment

- Fresh clone of `synth-dev/synth-v2`.
- One supported AI coding assistant available (Claude Code, Cursor, Codex, etc.).
- Stopwatch or screen recording for time measurement.

## Tasks

Each participant completes the following tasks in order:

1. **Read the landing page** (`website/index.html` or `synth.dev`).
2. **Install SYNTH** with `npm install -g synth-v2` or `npx synth-v2`.
3. **Initialize a project** with `synth init`.
4. **Create a Mission Draft** with `synth mission create --subject ... --purpose ...`.
5. **Approve the Mission** with `synth mission approve --draft-id ...` after reviewing proposals and confidence.
6. **Run an Expedition** with `synth expedition create ...`.
7. **Observe the generated events** after approval.
7. **Run `npm run govern`** and confirm the proof passes.
8. **Explain Replay** in their own words using `synth explain replay`.
9. **Recover** from a simulated interruption by deleting `.synth/data/` and rerunning `npm run govern`.

## Measurements

For each task record:

- Completion time
- Whether the participant succeeded without help
- Number of times documentation was consulted
- Confidence rating (1–5)

## Survey

After the tasks, ask:

1. Could you explain SYNTH to a colleague in one sentence?
2. Did the vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay) feel natural?
3. Did you trust the Replay result?
4. Would you use SYNTH on a real project?
5. What was the most confusing concept?

## Success Criteria

All of the following must be true:

- 80% of participants complete all tasks.
- Median time to first Mission is under 10 minutes.
- Median vocabulary confusion score is ≤ 2.
- Median trust score is ≥ 4.

## Reporting

Results are recorded in `docs/operator/synth-validation-report.md`.
