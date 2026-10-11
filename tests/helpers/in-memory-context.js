// ============================================================
// TEST HELPERS — In-memory discovery context
// ============================================================
// Shared hand-rolled filesystem/env context for discovery tests
// (environment-capability-report, environment-discovery-evidence).
// Single home for the identical makeInMemoryContext blocks
// (expedition 7a79e79b, round 15/150).
//
// Usage:
//   import { makeInMemoryContext } from "./helpers/in-memory-context.js"
// ============================================================

import { createDiscoveryOrchestrator, createReferenceProviders } from "../../dist/environment/index.js"

/** Build an in-memory discovery context over file/dir/env maps. */
export function makeInMemoryContext(files = {}, dirs = {}, env = {}, cwd = "/test") {
  const fileMap = { ...files }
  const directoryMap = { ...dirs }
  function resolve(path) {
    if (path.startsWith("/")) return path
    return `${cwd}/${path}`
  }
  return {
    readFile: async (path) => fileMap[resolve(path)],
    listDirectory: async (path) => directoryMap[resolve(path)] || [],
    pathExists: async (path) => resolve(path) in fileMap || resolve(path) in directoryMap,
    readEnv: (name) => env[name],
    execTool: async (command, args) => env[`${command} ${args.join(" ")}`],
    cwd,
  }
}

/** Run the reference discovery orchestrator over in-memory maps. */
export async function discoverEvidence(files = {}, dirs = {}, env = {}, cwd = "/test") {
  const ctx = makeInMemoryContext(files, dirs, env, cwd)
  const orchestrator = createDiscoveryOrchestrator({ providers: createReferenceProviders() })
  const result = await orchestrator.discover(ctx)
  return result.evidence
}
