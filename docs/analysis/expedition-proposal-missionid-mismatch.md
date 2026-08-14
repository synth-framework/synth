# Root Cause Analysis: Expedition Proposal `missionId` Differs From the Target Mission

## Symptom

Every time `synth expedition create --mission <existing-mission>` is run against an
existing mission, the JSON response's `proposals[].missionId` shows a 16-hex id that
**differs from** the mission the operator asked for. Example (observed repeatedly):

```json
{
  "missionSubject": "Full adapter lifecycle unification (2644f4a2c0ad2ad7)",
  "proposals": [
    {
      "kind": "expedition",
      "name": "Enforce expedition branch workflow at start",
      "missionId": "139690e6645350c6"
    }
  ]
}
```

The operator requested mission `2644f4a2c0ad2ad7` but the proposal reports
`139690e6645350c6`. This looks like the expedition is being attached to the wrong
mission and has been flagged repeatedly by operators.

## Evidence

- Draft `ee4874cdcadaf218` (Enforce expedition branch workflow at start) — target
  mission `2644f4a2c0ad2ad7`, proposal `missionId` `139690e6645350c6`.
- Draft `fcc4db23e2a46752` / `7e58243e06568ee6` (Duplicate-aware mission creation)
  — same pattern; proposal `missionId` unrelated to the requested mission.

In every case the **final runtime binding is correct**:
`state.expeditions[<id>].missionId === 2644f4a2c0ad2ad7`.

## Root Cause

The `proposal.missionId` field is **not** the mission's runtime id. It is a
Mission Studio **proposal-scoped hash** derived from the world-model mission node id.

Two independent id namespaces exist:

1. **Runtime mission id** — the canonical mission id in `canonical-state.json`
   (e.g. `2644f4a2c0ad2ad7`).
2. **Planning proposal id** — a deterministic 16-hex hash computed by Mission Studio
   so proposal graphs are self-contained and referentially stable.

### Derivation chain (`src/mission-studio/engine.ts`)

1. The CLI builds the mission observation with the **runtime** id
   (`src/cli/synth.ts`): `makeObservation("mission", name, ts, { id: resolvedMissionId })`.
2. Mission Studio assigns the world-model node a **session-scoped id**
   (`engine.ts:841`):

   ```ts
   private nodeId(kind, obs) {
     return this.hash(`${kind}-${obs.id}-${obs.sourceAdapter}-${obs.timestamp}`)
   }
   ```

3. `proposeExpeditions` re-hashes that node id into a **proposal id**
   (`engine.ts:395` + `846`):

   ```ts
   missionId: this.missionProposalId(nodeId)   // hash(`proposal-mission-${nodeId}`)
   ```

4. The CLI surfaces this proposal id verbatim in the response as `proposals[].missionId`
   (`src/cli/synth.ts:5225`).

Because the mission node id is a function of `obs.timestamp`, the value also varies
run-to-run — making it look random rather than a stable "other mission" id.

### Why the final binding is still correct

The proposal id is display-only. The runtime expedition is bound from
`resolvedMissionId` (the CLI-resolved existing mission), independent of Mission
Studio proposal ids (`src/cli/synth.ts:5141`, `5204`):

```ts
const resolvedMissionId = existingMission ? existingMission.id : missionSubject
// ...
payload: { id: expeditionId, missionId: resolvedMissionId, ... }
```

## Why It Repeats

Every `expedition create` against an existing mission goes through the same
proposal-graph path, so the mismatch appears on every such call. Nothing masks it.

## Impact

- **Functionally:** none. Expedition runtime entities are attached to the correct
  mission; replay and governance checks pass.
- **Operationally:** confusing. Operators and agents misread `proposal.missionId` as
  the expedition's parent mission and suspect misbinding.

## Resolution Options (not yet implemented)

1. **Rename the field** in the CLI response to `proposalMissionId` (or `proposalId`)
   and keep the true mission binding explicit, e.g. emit a top-level
   `missionId: resolvedMissionId` alongside `missionSubject`.
2. **Resolve the proposal id to the runtime id** before printing, so
   `proposals[].missionId` always equals the requested mission's runtime id.
3. **Document only** (this note): treat `proposal.missionId` as an opaque planning
   hash and rely on `missionSubject` / final runtime state for the true binding.

## Verification

Replay consistency and `npm run govern` are unaffected by the display mismatch; the
underlying state binds correctly (verified for drafts listed under Evidence).
