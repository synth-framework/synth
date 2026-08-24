# Finding: `mission.approve` gate checks the wrong mission

Date: 2026-08-24
Severity: governance gate defect (multi-mission workflows)
Location: `src/governance/intake.ts` ~line 85 (`case "mission.approve"`)

## Symptom

Approving a *new* mission `59b6483e92794ebb` was blocked:

> Mission approval is blocked: expedition e5fdf75656be46bb (Decouple synth.js)
> is executing in the same mission.

But `59b6483e` is a fresh draft with **zero** executing expeditions. The blocker
was an executing expedition (`e5fdf756`, Decouple synth.js) living in the
**active** mission `4ab7e9d2`.

## Root cause

```ts
const missionId = action.missionId || activeMission?.id
if (missionId) {
  const executingInMission = findExecutingExpeditionInMission(state, missionId)
  if (executingInMission) return BLOCK ...
}
```

`cmdMissionApprove` calls `gateDecision({ kind: "mission.approve" }, state, ...)`
with **no `missionId`**, so the gate falls back to `activeMission?.id`
(`4ab7e9d2`) and inspects *that* mission's executing expeditions — regardless of
which mission the draft actually approves.

## Correct behavior

The gate should resolve the **target mission** being approved (from the draft /
approved snapshot) and check *that* mission for executing expeditions. Approving
a mission with no executing expeditions must be allowed even when another mission
has a live expedition. The current logic only suits a single-active-mission world.

## Why not force past it

The only built-in escape is `--complete-first`, which would force-close
`e5fdf756` (Decouple synth.js) — a live executing expedition unrelated to the
mission being approved. Closing real work just to satisfy a mis-scoped gate is
exactly the kind of over-reach to avoid; fix the gate instead.
