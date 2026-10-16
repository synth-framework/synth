// Pure regression: a guided Mission's approval intake cannot inherit a
// different active Mission's executing Expedition, or force-close it.
import { strict as assert } from "node:assert"
import { approvalActionForDraft, blockingExpeditionForMission } from "../dist/cli/mission-approval-target.js"
import { validateAgentAction } from "../dist/governance/intake.js"

const guided = { id: "guided", kind: "mission", name: "Guided Journey" }
const session = { worldModel: { nodes: new Map([[guided.id, guided]]) } }
const state = {
  missions: { framework: { id: "framework", status: "active" } },
  expeditions: { cli003: { id: "cli003", missionId: "framework", name: "CLI-003", status: "executing" } },
}
assert.equal(validateAgentAction({ kind: "mission.approve" }, state).decision, "BLOCK", "the old context-inferred intake is blocked by the unrelated active mission")
const action = approvalActionForDraft(session)
assert.deepEqual(action, { kind: "mission.approve", missionId: "guided" })
assert.equal(validateAgentAction(action, state).decision, "ALLOW", "an unrelated executing Expedition does not block the draft's Mission")
assert.equal(blockingExpeditionForMission(state, action.missionId), undefined, "complete-first must not select unrelated CLI-003")
state.expeditions.guidedWork = { id: "guidedWork", missionId: "guided", name: "Guided Work", status: "executing" }
assert.equal(validateAgentAction(action, state).decision, "BLOCK", "an executing Expedition under the actual target still blocks")
assert.equal(blockingExpeditionForMission(state, action.missionId)?.id, "guidedWork")
assert.throws(() => approvalActionForDraft({ worldModel: { nodes: new Map() } }), /exactly one/)
assert.throws(() => approvalActionForDraft({ worldModel: { nodes: new Map([[guided.id, guided], ["other", { id: "other", kind: "mission" }]]) } }), /exactly one/)
console.log("[PASS] Mission approval targets the certified draft, not an unrelated active Mission")
