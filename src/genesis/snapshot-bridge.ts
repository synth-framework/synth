// ============================================================
// GENESIS: Approved Mission Model Snapshot Bridge
// ============================================================
// Translates an immutable ApprovedMissionModelSnapshot into the
// seed data Genesis needs to initialize canonical state.
//
// This bridge keeps Genesis adapter-agnostic: Genesis still only
// understands primitive seed data and canonical events. Mission
// Studio remains the sole source of approved planning artifacts.
// ============================================================

import type {
  ApprovedMissionModelSnapshot,
  MissionProposal,
  ExpeditionProposal,
  ObjectiveProposal,
} from "../mission-studio/types.js"
import type { GenesisInput } from "./intake.js"
import type { SynthEvent } from "../types/index.js"
import type { Mission, Expedition, Objective, Project, Plan, WorkItem } from "../types/index.js"

/**
 * Convert an approved Mission Model Snapshot into a GenesisInput.
 *
 * Mapping:
 *   - projectName  → first actor/component node name, or fallback.
 *   - systemId     → snapshot id.
 *   - initialProjects → first actor/component node as a project.
 *   - initialPlans    → expedition proposals as plans.
 *   - initialWorkItems → objective proposals as work items.
 *   - seedEvents      → mission/expedition/objective events plus any
 *                       artifacts that do not fit the simple shapes above.
 */
export function snapshotToGenesisInput(snapshot: ApprovedMissionModelSnapshot): GenesisInput {
  const nodes = Array.from(snapshot.worldModel.nodes.values())

  const candidateProjectNodes = nodes.filter((n) => n.kind === "actor" || n.kind === "component")
  const projectNode = candidateProjectNodes[0]
  const projectName = projectNode?.name || "Mission Model Seed"

  const initialProjects: GenesisInput["initialProjects"] = candidateProjectNodes.slice(0, 1).map((n) => ({
    id: n.id,
    name: n.name,
    goal: n.description || `${n.kind} derived from approved mission model`,
  }))

  const expeditionProposals = snapshot.proposals.filter(
    (p): p is ExpeditionProposal => p.kind === "expedition",
  )
  const initialPlans: GenesisInput["initialPlans"] = expeditionProposals.map((p) => ({
    id: p.id,
    name: p.name,
  }))

  const objectiveProposals = snapshot.proposals.filter(
    (p): p is ObjectiveProposal => p.kind === "objective",
  )
  const initialWorkItems: GenesisInput["initialWorkItems"] = objectiveProposals.map((p) => ({
    id: p.id,
    name: p.title || p.name,
    status: "idle",
  }))

  const seedEvents = snapshotToSeedEvents(snapshot)

  return {
    projectName,
    systemId: snapshot.id,
    initialProjects,
    initialPlans,
    initialWorkItems,
    seedEvents,
    partitions: 4,
  }
}

/**
 * Convert an approved snapshot directly into canonical seed events.
 *
 * These events use the same payload shapes the domain expects, so they
 * replay cleanly through RuntimeEngine/ReplayVerifier.
 */
export function snapshotToSeedEvents(snapshot: ApprovedMissionModelSnapshot): Array<{
  type: string
  payload: Record<string, unknown>
}> {
  const nodes = Array.from(snapshot.worldModel.nodes.values())
  const seedEvents: Array<{ type: string; payload: Record<string, unknown> }> = []
  const timestamp = snapshot.timestamp

  // Projects from actor/component nodes.
  const projectNodes = nodes.filter((n) => n.kind === "actor" || n.kind === "component")
  for (const node of projectNodes) {
    const project: Project = {
      id: node.id,
      name: node.name,
      goal: node.description || `${node.kind} derived from approved mission model`,
      plans: [],
      status: "active",
    }
    seedEvents.push({ type: "PROJECT_CREATED", payload: { project } })
  }

  // Missions.
  const missionProposals = snapshot.proposals.filter(
    (p): p is MissionProposal => p.kind === "mission",
  )
  for (const proposal of missionProposals) {
    const mission: Mission = {
      id: proposal.id,
      name: proposal.name,
      purpose: proposal.purpose || proposal.description || "",
      status: "draft",
      expeditions: [],
      metadata: { source: "ApprovedMissionModelSnapshot" },
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    seedEvents.push({ type: "MISSION_CREATED", payload: { mission } })
  }

  // Expeditions as plans AND as expeditions.
  const expeditionProposals = snapshot.proposals.filter(
    (p): p is ExpeditionProposal => p.kind === "expedition",
  )
  for (const proposal of expeditionProposals) {
    const plan: Plan = {
      id: proposal.id,
      name: proposal.name,
      status: "draft",
      milestones: [],
      dependencies: [],
      metadata: { source: "ApprovedMissionModelSnapshot" },
    }
    seedEvents.push({ type: "PLAN_CREATED", payload: { plan } })

    const expedition: Expedition = {
      id: proposal.id,
      missionId: proposal.missionId,
      name: proposal.name,
      goal: proposal.goal || proposal.description || "",
      status: "draft",
      objectives: [],
      discoveries: [],
      decisions: [],
      metadata: { source: "ApprovedMissionModelSnapshot" },
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    seedEvents.push({ type: "EXPEDITION_CREATED", payload: { expedition } })
  }

  // Objectives as work items AND as objectives.
  const objectiveProposals = snapshot.proposals.filter(
    (p): p is ObjectiveProposal => p.kind === "objective",
  )
  for (const proposal of objectiveProposals) {
    const workItem: WorkItem = {
      id: proposal.id,
      status: "idle",
      dependencies: [],
      metadata: { name: proposal.title || proposal.name, source: "ApprovedMissionModelSnapshot" },
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    seedEvents.push({ type: "WORK_ITEM_CREATED", payload: { workItem } })

    const objective: Objective = {
      id: proposal.id,
      expeditionId: proposal.expeditionId,
      title: proposal.title || proposal.name,
      purpose: proposal.description || "",
      status: "draft",
      metadata: { source: "ApprovedMissionModelSnapshot" },
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    seedEvents.push({ type: "OBJECTIVE_ADDED", payload: { objective } })
  }

  return seedEvents
}
