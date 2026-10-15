// ============================================================
// CLI: gates
// ============================================================
// Extracted from src/cli/synth.ts by EXP-CLI-003 item 3.
//
// The goal names this as one of the four helper clusters that must be extracted
// ONCE into a module of its own, so that when the 97 cmd* handlers move out of
// the 9120-line dispatcher into a verb -> loader registry they import these from
// one home instead of duplicating them. Duplication is exactly how entry.ts and
// synth.ts drifted apart in the first place.
//
// Behaviour is unchanged: the same code, the same module-scope state, moved.
// Anything that was module-private in synth.ts and is only used here stays
// private here; anything a caller in synth.ts still needs is exported.
// ============================================================

import { setAgentTelemetry, printJson, printError, setHumanMode, setQuietMode, setSummaryMode } from "./print.js"
import { validateAgentAction, type AgentAction } from "../governance/intake.js"
import { buildDerivedState } from "../state/derived/index.js"

export async function gateDecision(action: AgentAction, state: import("../types/index.js").CanonicalState, runtime?: import("../runtime/engine.js").RuntimeEngine) {
  let derived: import("../types/index.js").DerivedState | undefined
  if (runtime) {
    const events = await runtime.loadEvents()
    derived = buildDerivedState(events)
  }
  return validateAgentAction(action, state, derived)
}

export function printGateBlock(result: Extract<ReturnType<typeof validateAgentAction>, { decision: "BLOCK" }>): never {
  printError(
    result.reason,
    {
      code: "LifecycleBlocked",
      category: "governance",
      suggestion: result.requiredAction,
      requiredAction: result.requiredAction,
    },
  )
}

