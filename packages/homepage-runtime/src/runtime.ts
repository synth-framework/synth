// ============================================================
// HOMEPAGE RUNTIME: HomepageRuntime
// ============================================================
// In-memory implementation of MissionRuntime for the Mission Studio
// homepage. Pure functions; no filesystem; no CLI.
// ============================================================

import type {
  ArtifactProjection,
  ClarificationAnswer,
  EntryMode,
  GenesisResult,
  GenesisState,
  MissionRuntime,
  ReplayState,
  SampleEvent,
} from "./types.js"
import {
  discoverIntent,
  extractIntent,
  generateArchitecture,
  generateDomain,
  generateEvidence,
  generateExpeditions,
  generateMission,
  generateRepository,
  generateUnknowns,
} from "./intent.js"
import { buildSampleEventLog, rebuildStateFromOffset, replayStateToProjection } from "./replay.js"

export class HomepageRuntime implements MissionRuntime {
  async discover(input: string, mode: EntryMode): Promise<GenesisResult> {
    const intent = extractIntent(input, mode)
    const discovery = discoverIntent(intent)
    const unknowns = generateUnknowns(intent, discovery)
    const evidence = generateEvidence(intent, discovery)

    const state: GenesisState = {
      mode,
      input,
      intent,
      discovery,
      unknowns,
      evidence,
      answers: [],
      expeditions: [],
    }

    return { state, projection: this.projectGenesis(state, "discovery") }
  }

  async clarify(state: GenesisState, answers: ClarificationAnswer[]): Promise<GenesisResult> {
    const updated: GenesisState = {
      ...state,
      answers: [...state.answers, ...answers],
    }

    // Apply answers to reduce unknowns.
    const remainingUnknowns = updated.unknowns.items.filter((unknown) => {
      const answered = answers.some((answer) => answer.questionId.includes(unknown.field) || answer.questionId === unknown.field)
      return !answered
    })

    updated.unknowns = { kind: "unknowns", items: remainingUnknowns }

    // If runtime/language answered, enrich constraints.
    const enrichedDiscovery = { ...updated.discovery! }
    for (const answer of answers) {
      if (answer.questionId.includes("runtime") && !enrichedDiscovery.constraints.some((c) => c.startsWith("Runtime:"))) {
        enrichedDiscovery.constraints.push(`Runtime: ${answer.content}`)
      }
      if (answer.questionId.includes("language") && !enrichedDiscovery.constraints.some((c) => c.startsWith("Language:"))) {
        enrichedDiscovery.constraints.push(`Language: ${answer.content}`)
      }
    }
    updated.discovery = enrichedDiscovery

    return { state: updated, projection: this.projectGenesis(updated, remainingUnknowns.length === 0 ? "domain" : "constraints") }
  }

  async buildMission(state: GenesisState): Promise<GenesisResult> {
    if (!state.intent || !state.discovery) {
      throw new Error("Genesis state is missing intent or discovery")
    }

    const domain = generateDomain(state.intent, state.discovery)
    const mission = generateMission(state.intent, state.discovery, domain)

    const updated: GenesisState = {
      ...state,
      domain,
      mission,
    }

    return { state: updated, projection: this.projectGenesis(updated, "mission") }
  }

  async buildExpeditions(state: GenesisState): Promise<GenesisResult> {
    if (!state.intent || !state.discovery || !state.mission) {
      throw new Error("Genesis state is missing mission")
    }

    const expeditions = generateExpeditions(state.mission, state.discovery)

    const updated: GenesisState = {
      ...state,
      expeditions,
    }

    return { state: updated, projection: this.projectGenesis(updated, "expeditions") }
  }

  async buildArchitecture(state: GenesisState): Promise<GenesisResult> {
    if (!state.intent || !state.discovery || !state.mission || state.expeditions.length === 0) {
      throw new Error("Genesis state is missing expeditions")
    }

    const architecture = generateArchitecture(state.mission, state.expeditions)

    const updated: GenesisState = {
      ...state,
      architecture,
    }

    return { state: updated, projection: this.projectGenesis(updated, "architecture") }
  }

  async buildRepository(state: GenesisState): Promise<GenesisResult> {
    if (!state.intent || !state.discovery || !state.mission || state.expeditions.length === 0) {
      throw new Error("Genesis state is missing expeditions")
    }

    const repository = generateRepository(state.mission, state.expeditions)

    const updated: GenesisState = {
      ...state,
      repository,
    }

    return { state: updated, projection: this.projectGenesis(updated, "repository") }
  }

  async loadReplay(events: SampleEvent[]): Promise<ReplayState> {
    const state = rebuildStateFromOffset(events, 0)
    const projection = replayStateToProjection(state, 0, events.length)

    return {
      events,
      offset: 0,
      projection,
    }
  }

  async stepReplay(state: ReplayState, direction: "forward" | "backward" | number): Promise<ReplayState> {
    let offset = state.offset

    if (direction === "forward") {
      offset = Math.min(offset + 1, state.events.length - 1)
    } else if (direction === "backward") {
      offset = Math.max(offset - 1, 0)
    } else if (typeof direction === "number") {
      offset = Math.max(0, Math.min(direction, state.events.length - 1))
    }

    const replayState = rebuildStateFromOffset(state.events, offset)
    const projection = replayStateToProjection(replayState, offset, state.events.length)

    return {
      events: state.events,
      offset,
      projection,
    }
  }

  currentArtifacts(state: GenesisState | ReplayState): ArtifactProjection {
    if ("events" in state) {
      return state.projection
    }

    const phase: ArtifactProjection["phase"] = state.repository
      ? "repository"
      : state.architecture
        ? "architecture"
        : state.mission
          ? (state.expeditions.length > 0 ? "expeditions" : "mission")
          : state.domain
            ? "domain"
            : "discovery"

    return this.projectGenesis(state, phase)
  }

  private projectGenesis(state: GenesisState, phase: ArtifactProjection["phase"]): ArtifactProjection {
    return {
      phase,
      intent: state.intent,
      discovery: state.discovery,
      unknowns: state.unknowns,
      domain: state.domain,
      mission: state.mission,
      expeditions: state.expeditions,
      evidence: state.evidence,
      architecture: state.architecture,
      repository: state.repository,
    }
  }
}

export function createHomepageRuntime(): MissionRuntime {
  return new HomepageRuntime()
}

export function buildDemoReplay(state: GenesisState): SampleEvent[] {
  if (!state.mission || state.expeditions.length === 0) {
    return []
  }

  return buildSampleEventLog(state.input, state.mission, state.expeditions)
}
