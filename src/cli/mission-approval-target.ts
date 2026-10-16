import type { MissionNode, PlanningSession } from "../mission-studio/types.js"
import type { CanonicalState } from "../types/index.js"
import type { AgentAction } from "../governance/intake.js"

/** Approval intake must use the certified draft's parent, never the unrelated
 * active Mission inferred from the checkout. Caller verifies draft integrity. */
export function approvalActionForDraft(session: PlanningSession): Extract<AgentAction, { kind: "mission.approve" }> & { missionId: string } {
  const nodes = Array.from(session.worldModel.nodes.values()).filter((node): node is MissionNode => node.kind === "mission")
  if (nodes.length !== 1 || !nodes[0].id) throw new Error("A Mission approval draft must contain exactly one Mission node.")
  return { kind: "mission.approve", missionId: nodes[0].id }
}

/** --complete-first must never close an Expedition in another Mission. */
export function blockingExpeditionForMission(state: CanonicalState, missionId: string) {
  return Object.values(state.expeditions).find((e) => e.missionId === missionId && e.status === "executing")
}
