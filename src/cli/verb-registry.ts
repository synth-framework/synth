// ============================================================
// CLI: verb -> loader registry
// ============================================================
// EXP-CLI-003 item 3. ONE authority for how a verb is reached.
//
// Both dispatchers routed the `explain` subcommands with their own hand-written
// if-chains, and the chains had already drifted: entry.ts served four
// subcommands, synth.ts twelve, and each kept its own copy of the valid list.
// Duplication of the routing rules is exactly how entry.ts and synth.ts drifted
// apart in the first place, so the rules live here now and both dispatchers ask.
//
// Each route carries a dynamic import thunk. That is the point of the registry:
// a verb's module is loaded when the verb RUNS, not when the dispatcher is
// imported. Before this, synth.ts statically imported five explain handler
// modules (repository-identity, resume-briefing, explain-governance,
// agent-guide, explain-observability) and entry.ts statically imported
// explain-replay-light — 45 of the light dispatcher's 60 eager modules — so
// every invocation of every verb paid for all of them.
// ============================================================

import { parseExplainFlags } from "./explain-flags.js"

export type VerbFlags = Record<string, string | boolean>
export type VerbHandler = (flags: VerbFlags) => Promise<void> | void
/** explain-observability is the one handler that needs the subcommand itself. */
export type SubHandler = (sub: string, flags: VerbFlags) => Promise<void> | void

/** Every `explain` subcommand the CLI accepts. Was duplicated as a local `valid`
 *  array in synth.ts and as an implicit set of if-branches in entry.ts. */
export const EXPLAIN_SUBS = [
  "replay",
  "lineage",
  "proposals",
  "snapshots",
  "graph",
  "diagnostics",
  "status",
  "all",
  "identity",
  "resume",
  "governance",
  "agents",
] as const

/** Verbatim from synth.ts, and deliberately NOT completed here.
 *
 *  It names 8 of the 12 valid subcommands: identity, resume, governance and
 *  agents are accepted but absent from the usage text, and
 *  src/cli/explain-observability.ts:1104 carries a second, longer copy of the
 *  same sentence. tests/explain-observability.test.js:562 pins this exact
 *  string, so completing the list changes operator-visible output and must be a
 *  deliberate decision with that test updated — not a side effect of a
 *  structural refactor. Recorded here so the drift has one home. */
export const EXPLAIN_USAGE =
  "Usage: synth explain <replay|lineage|proposals|snapshots|graph|diagnostics|status|all>"

type Route = {
  /** dynamic import thunk: the handler's module loads when the verb runs */
  load: () => Promise<VerbHandler | SubHandler>
  /** true when this handler takes (sub, flags) rather than (flags) */
  takesSub?: boolean
  /** true when the light dispatcher can serve this without the heavy graph */
  light?: boolean
  /** which argv parser produces this verb's flags */
  parse: "explain" | "replay"
}

const OBSERVABILITY_SUBS = ["lineage", "proposals", "snapshots", "graph", "diagnostics", "status", "all"]

const ROUTES: Record<string, Route> = {
  replay: {
    parse: "replay",
    light: true,
    // The parser lives in this module too, so it is imported dynamically with
    // the handler: a static import here would put all 45 of explain-replay-light's
    // modules back into the dispatcher's eager graph.
    load: async () => (await import("./explain-replay-light.js")).runExplainReplay,
  },
  identity: {
    parse: "explain",
    light: true,
    load: async () => (await import("./repository-identity.js")).cmdExplainIdentity,
  },
  resume: {
    parse: "explain",
    light: true,
    load: async () => (await import("./resume-briefing.js")).cmdExplainResume,
  },
  governance: {
    parse: "explain",
    light: true,
    load: async () => (await import("./explain-governance.js")).cmdExplainGovernance,
  },
  agents: {
    parse: "explain",
    load: async () => (await import("./agent-guide.js")).cmdExplainAgents,
  },
}
for (const sub of OBSERVABILITY_SUBS) {
  ROUTES[sub] = {
    parse: "explain",
    takesSub: true,
    load: async () => (await import("./explain-observability.js")).cmdExplainObservability,
  }
}

/** Is `sub` an accepted `explain` subcommand? Covers the undefined case that
 *  synth.ts used to spell as `!sub || !valid.includes(sub)`. */
export function isExplainSub(sub: string | undefined): sub is string {
  return typeof sub === "string" && (EXPLAIN_SUBS as readonly string[]).includes(sub)
}

/** Which subcommand the LIGHT dispatcher should serve, or undefined to fall
 *  through to the heavy graph.
 *
 *  A bare `synth explain` resolves to "replay" here because that is what
 *  entry.ts does today, while synth.ts prints EXPLAIN_USAGE for the same
 *  invocation. That divergence is real and is preserved deliberately: this
 *  registry is a structural change, and unifying the two behaviours changes
 *  operator-visible output, which belongs in its own commit with its own
 *  evidence. Recorded here so it has one home too. */
export function resolveLightExplain(sub: string | undefined): string | undefined {
  const wanted = sub === undefined ? "replay" : sub
  const route = ROUTES[wanted]
  return route?.light ? wanted : undefined
}

/** Parse argv and run an `explain` subcommand. Used by the light dispatcher,
 *  which has raw argv and no parsed flags. */
export async function runExplainFromArgv(sub: string, argv: string[]): Promise<void> {
  const route = ROUTES[sub]
  if (!route) throw new Error(`VERB_REGISTRY_UNKNOWN_SUB: no route for explain ${sub}`)
  if (route.parse === "replay") {
    const m = await import("./explain-replay-light.js")
    await (m.runExplainReplay as VerbHandler)(m.parseReplayFlags(argv))
    return
  }
  await callExplainHandler(sub, parseExplainFlags(argv))
}

/** Run an `explain` subcommand with flags the caller has already parsed. Used by
 *  the heavy dispatcher, whose main() parses argv once for every verb. */
export async function callExplainHandler(sub: string, flags: VerbFlags): Promise<void> {
  const route = ROUTES[sub]
  if (!route) throw new Error(`VERB_REGISTRY_UNKNOWN_SUB: no route for explain ${sub}`)
  const handler = await route.load()
  if (route.takesSub) await (handler as SubHandler)(sub, flags)
  else await (handler as VerbHandler)(flags)
}
