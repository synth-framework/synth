// ============================================================
// EXECUTION: Intent Synthesizer
// ============================================================
// Maps GeneratedWorkItem instances into ExecutionIntent graphs.
// The synthesizer is planning-side: it decides HOW a work item
// should be realized, but it performs no mutation.
// ============================================================

import type {
  ExecutionIntent,
  ExecutionIntentGraph,
  ExecutionVerification,
  GeneratedWorkItem,
  Expedition,
  Objective,
} from "../types/index.js"

/** Input to the intent synthesizer */
export type SynthesisInput = {
  expedition: Expedition
  objective: Objective
  workItem: GeneratedWorkItem
  baseBranch: string
  sequenceStart?: number
}

/** Result of synthesizing a single work item */
export type SynthesisResult = {
  intents: ExecutionIntent[]
  nextSequence: number
}

const DEFAULT_VERIFICATION: ExecutionVerification = { kind: "none", target: "" }

/**
 * Synthesize executable intents from a GeneratedWorkItem.
 *
 * The synthesizer reads work-item metadata to determine the intended
 * operation. Unknown operations produce a single no-op intent that
 * records the ambiguity rather than failing silently.
 */
export function synthesizeIntents(input: SynthesisInput): SynthesisResult {
  const { expedition, objective, workItem, baseBranch, sequenceStart = 0 } = input
  const metadata = (workItem.metadata ?? {}) as Record<string, unknown>
  const operation = String(metadata.operation ?? "unknown")

  const baseIntent: Omit<ExecutionIntent, "id" | "sequence" | "operation" | "capability" | "target" | "payload" | "verification"> = {
    expeditionId: expedition.id,
    objectiveId: objective.id,
    workItemId: workItem.id,
    dependencies: [],
    rollback: undefined,
  }

  switch (operation) {
    case "writeFile": {
      const target = String(metadata.target ?? "")
      const content = String(metadata.content ?? "")
      const intent: ExecutionIntent = {
        ...baseIntent,
        id: `${expedition.id}/${workItem.id}/write`,
        sequence: sequenceStart,
        capability: "filesystem",
        operation: "writeFile",
        target,
        payload: { path: target, content },
        verification: { kind: "path_exists", target },
      }
      return { intents: [intent], nextSequence: sequenceStart + 1 }
    }

    case "ensureDirectory": {
      const target = String(metadata.target ?? "")
      const intent: ExecutionIntent = {
        ...baseIntent,
        id: `${expedition.id}/${workItem.id}/mkdir`,
        sequence: sequenceStart,
        capability: "filesystem",
        operation: "ensureDirectory",
        target,
        payload: { path: target },
        verification: { kind: "path_exists", target },
      }
      return { intents: [intent], nextSequence: sequenceStart + 1 }
    }

    case "runCommand": {
      const command = String(metadata.command ?? "")
      const args = Array.isArray(metadata.args) ? metadata.args.map(String) : []
      const cwd = metadata.cwd ? String(metadata.cwd) : "."
      const intent: ExecutionIntent = {
        ...baseIntent,
        id: `${expedition.id}/${workItem.id}/run`,
        sequence: sequenceStart,
        capability: "process",
        operation: "run",
        target: command,
        payload: { command, args, cwd },
        verification: { kind: "command_exit", target: command, expectation: 0 },
      }
      return { intents: [intent], nextSequence: sequenceStart + 1 }
    }

    case "createRevision": {
      const message = String(metadata.message ?? `Expedition ${expedition.id}`)
      const intent: ExecutionIntent = {
        ...baseIntent,
        id: `${expedition.id}/${workItem.id}/commit`,
        sequence: sequenceStart,
        capability: "versioning",
        operation: "createRevision",
        target: baseBranch,
        payload: { message, includeUntracked: true },
        verification: { kind: "revision_exists", target: baseBranch },
      }
      return { intents: [intent], nextSequence: sequenceStart + 1 }
    }

    default: {
      const intent: ExecutionIntent = {
        ...baseIntent,
        id: `${expedition.id}/${workItem.id}/unknown`,
        sequence: sequenceStart,
        capability: "unknown",
        operation,
        target: "",
        payload: { metadata },
        verification: DEFAULT_VERIFICATION,
      }
      return { intents: [intent], nextSequence: sequenceStart + 1 }
    }
  }
}

/** Derive a deterministic, isolated branch name for an expedition. */
export function deriveExpeditionBranch(expeditionId: string): string {
  return `exp/${expeditionId}`
}

/** Build an ExecutionIntentGraph from a sequence of synthesized intent lists. */
export function buildIntentGraph(
  expeditionId: string,
  branch: string,
  intentLists: ExecutionIntent[][]
): ExecutionIntentGraph {
  const intents = intentLists.flat()
  const edges: [string, string][] = []

  // Sequential dependency: each intent depends on the previous one.
  for (let i = 1; i < intents.length; i++) {
    const prev = intents[i - 1]
    const curr = intents[i]
    edges.push([prev.id, curr.id])
    curr.dependencies.push(prev.id)
  }

  // Stable topological order (sequence already implies order).
  const ordered = intents.map((i) => i.id)

  return {
    expeditionId,
    branch,
    intents,
    edges,
    ordered,
  }
}
