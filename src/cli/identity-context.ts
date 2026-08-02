// ============================================================
// CLI: Identity Context
// ============================================================
// Shared CLI identity state. Captured once in the synth.ts entry point
// and injected into every API handleIntent call via context.identity.
// ============================================================

import type { SynthAPI } from "../api/index.js"
import type { IntentRequest } from "../types/index.js"
import { captureIdentity, identityEnvVars, type AgentIdentity } from "../identity/index.js"

let cliIdentity: AgentIdentity | undefined

/**
 * Capture identity once at process startup. The optional override lets
 * callers such as the synth.ts entry point adjust fields (e.g. approvalMode
 * for commands invoked with --approve) without re-reading the environment.
 */
export function initCliIdentity(override?: Partial<AgentIdentity>): AgentIdentity {
  cliIdentity = { ...captureIdentity(), ...override }
  return cliIdentity
}

export { identityEnvVars }

/** Return the CLI identity, capturing lazily if initCliIdentity was not called. */
export function getCliIdentity(): AgentIdentity {
  if (!cliIdentity) {
    cliIdentity = captureIdentity()
  }
  return cliIdentity
}

/**
 * Wrap a SynthAPI instance so every handleIntent call receives
 * context.identity automatically.
 */
export function injectIdentityContext(api: SynthAPI): SynthAPI {
  const identity = getCliIdentity()
  const original = api.handleIntent.bind(api)
  api.handleIntent = async (req: IntentRequest) => {
    return original({
      ...req,
      context: { ...req.context, identity },
    })
  }
  return api
}
