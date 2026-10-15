// Lazy CLI routing shared by the shipped entry point and the compatibility CLI.
// No handler module is imported until its route is selected.
import { parseExplainFlags } from "./explain-flags.js"
import { printJson } from "./print.js"

export type VerbFlags = Record<string, string | boolean>
type VerbHandler = (flags: VerbFlags) => Promise<void> | void
type ExplainRoute = { load: () => Promise<VerbHandler>; light?: boolean }

const EXPLAIN_ROUTES: Record<string, ExplainRoute> = {
  replay: { light: true, load: async () => (await import("./explain-replay-light.js")).runExplainReplay },
  identity: { light: true, load: async () => (await import("./repository-identity.js")).cmdExplainIdentity },
  resume: { light: true, load: async () => (await import("./resume-briefing.js")).cmdExplainResume },
  governance: { light: true, load: async () => (await import("./explain-governance.js")).cmdExplainGovernance },
  agents: { load: async () => (await import("./agent-guide.js")).cmdExplainAgents },
}
for (const sub of ["lineage", "proposals", "snapshots", "graph", "diagnostics", "status", "all"]) {
  EXPLAIN_ROUTES[sub] = {
    load: async () => {
      const { cmdExplainObservability } = await import("./explain-observability.js")
      return (flags) => cmdExplainObservability(sub, flags)
    },
  }
}
export const EXPLAIN_SUBS = Object.keys(EXPLAIN_ROUTES)
// Preserve the existing output contract; it predates identity/resume/governance/agents.
export const EXPLAIN_USAGE = "Usage: synth explain <replay|lineage|proposals|snapshots|graph|diagnostics|status|all>"

export function isExplainSub(sub: string | undefined): sub is string {
  return typeof sub === "string" && Object.hasOwn(EXPLAIN_ROUTES, sub)
}

export function resolveLightExplain(sub: string | undefined): string | undefined {
  // Preserve the shipped CLI's bare-explain alias; the compatibility CLI reports usage.
  const wanted = sub || "replay"
  return isExplainSub(wanted) && EXPLAIN_ROUTES[wanted].light ? wanted : undefined
}

export async function runExplainFromArgv(sub: string, argv: string[]): Promise<void> {
  if (sub === "replay") {
    const { parseReplayFlags } = await import("./explain-replay-light.js")
    await callExplainHandler(sub, parseReplayFlags(argv))
  } else {
    await callExplainHandler(sub, parseExplainFlags(argv))
  }
}

export async function callExplainHandler(sub: string, flags: VerbFlags): Promise<void> {
  if (!isExplainSub(sub)) throw new Error("VERB_REGISTRY_UNKNOWN_SUB: no route for explain " + sub)
  await (await EXPLAIN_ROUTES[sub].load())(flags)
}

export type NamespaceModule = { run(positional: string[], flags: VerbFlags): Promise<void> }
type NamespaceLoader = () => Promise<NamespaceModule>
type NamespaceRoute = { load: NamespaceLoader; help?: () => Promise<void>; approveHelp?: () => Promise<void> }

const NAMESPACE_ROUTES: Record<string, NamespaceRoute> = {
  "help": {
    load: () => import("./commands-help.js"),
  },
  "version": {
    load: () => import("./commands-version.js"),
  },
  "doctor": {
    load: () => import("./commands-doctor.js"),
    help: async () => { await (await import("./commands-doctor.js")).cmdDoctorHelp() },
  },
  "checkpoint": {
    load: () => import("./commands-checkpoint.js"),
    help: async () => { await (await import("./commands-checkpoint.js")).cmdCheckpointHelp() },
  },
  "init": {
    load: () => import("./commands-init.js"),
  },
  "bootstrap": {
    load: () => import("./commands-bootstrap.js"),
    help: async () => { await (await import("./commands-bootstrap.js")).cmdBootstrapHelp() },
  },
  "discover": {
    load: () => import("./commands-discover.js"),
    help: async () => { await (await import("./commands-discover.js")).cmdDiscoverHelp() },
  },
  "govern": {
    load: () => import("./commands-govern.js"),
  },
  "validate": {
    load: () => import("./commands-validate.js"),
    help: async () => { await (await import("./commands-validate.js")).cmdValidateHelp() },
  },
  "task": {
    load: () => import("./commands-task.js"),
    help: async () => { await (await import("./task.js")).cmdTaskHelp() },
  },
  "verify": {
    load: () => import("./commands-verify.js"),
    help: async () => { await (await import("./commands-verify.js")).cmdVerifyHelp() },
  },
  "approval": {
    load: () => import("./commands-approval.js"),
    help: async () => { await (await import("./commands-approval.js")).cmdApprovalHelp() },
  },
  "status": {
    load: () => import("./commands-status.js"),
  },
  "report": {
    load: () => import("./commands-report.js"),
  },
  "mission": {
    load: () => import("./commands-mission.js"),
    help: async () => { await (await import("./commands-mission.js")).cmdMissionHelp() },
    approveHelp: async () => { await (await import("./commands-mission.js")).cmdMissionApproveHelp() },
  },
  "program": {
    load: () => import("./commands-program.js"),
    help: async () => { await (await import("./commands-program.js")).cmdProgramHelp() },
  },
  "intent": {
    load: () => import("./commands-intent.js"),
    help: async () => { await (await import("./commands-intent.js")).cmdIntentHelp() },
  },
  "alignment": {
    load: () => import("./commands-alignment.js"),
    help: async () => { await (await import("./commands-alignment.js")).cmdAlignmentHelp() },
  },
  "expedition": {
    load: () => import("./commands-expedition.js"),
    help: async () => { await (await import("./commands-expedition.js")).cmdExpeditionHelp() },
    approveHelp: async () => { await (await import("./commands-expedition.js")).cmdExpeditionApproveHelp() },
  },
  "docs": {
    load: () => import("./commands-docs.js"),
    help: async () => { await (await import("./commands-docs.js")).cmdDocsGenerateHelp() },
  },
  "explain": {
    load: () => import("./commands-explain.js"),
    help: async () => { await (await import("./commands-explain.js")).cmdExplainHelp() },
  },
  "repair": {
    load: () => import("./commands-repair.js"),
    help: async () => { await (await import("./commands-repair.js")).cmdRepairHelp() },
  },
  "release": {
    load: () => import("./commands-release.js"),
  },
  "certify": {
    load: () => import("./commands-certify.js"),
    help: async () => { await (await import("./commands-certify.js")).cmdCertifyHelp() },
  },
  "capabilities": {
    load: () => import("./commands-capabilities.js"),
    help: async () => { await (await import("./commands-capabilities.js")).cmdCapabilitiesHelp() },
  },
  "project": {
    load: () => import("./commands-project.js"),
    help: async () => { await (await import("./commands-project.js")).cmdProjectHelp() },
  },
  "log": {
    load: () => import("./commands-log.js"),
    help: async () => { await (await import("./commands-log.js")).cmdLogHelp() },
  },
  "ai": {
    load: () => import("./commands-ai.js"),
    help: async () => { await (await import("./commands-ai.js")).cmdAiHelp() },
  },
  "repo": {
    load: () => import("./commands-repo.js"),
    help: async () => printJson((await import("./repo.js")).namespaceHelp()),
  },
  "adapter": {
    load: () => import("./commands-adapter.js"),
    help: async () => { await (await import("./commands-adapter.js")).cmdAdapterHelp() },
  },
  "snapshot": {
    load: () => import("./commands-snapshot.js"),
    help: async () => { await (await import("./commands-snapshot.js")).cmdSnapshotHelp() },
  },
  "migrate": {
    load: () => import("./commands-migrate.js"),
    help: async () => printJson((await import("./migrate.js")).namespaceHelp()),
  },
  "first-contact": {
    load: () => import("./commands-first-contact.js"),
    help: async () => { await (await import("./first-contact.js")).cmdFirstContactHelp() },
  },
  "genesis": {
    load: () => import("./commands-first-contact.js"),
    help: async () => { await (await import("./first-contact.js")).cmdFirstContactHelp() },
  },
}

/** Reject inherited object keys as commands as well as unknown names. */
export function getNamespaceLoader(command: string): NamespaceLoader | undefined {
  return Object.hasOwn(NAMESPACE_ROUTES, command) ? NAMESPACE_ROUTES[command].load : undefined
}

/** Namespace help precedes generic help, exactly as in the original dispatcher. */
export function getNamespaceHelp(rawArgs: string[]): (() => Promise<void>) | undefined {
  if (rawArgs.length < 2 || (!rawArgs.includes("--help") && !rawArgs.includes("-h"))) return undefined
  const namespace = rawArgs[0]
  if (!Object.hasOwn(NAMESPACE_ROUTES, namespace)) return undefined
  const route = NAMESPACE_ROUTES[namespace]
  const subcommand = rawArgs.filter((arg) => arg !== "--help" && arg !== "-h")[1]
  return subcommand === "approve" && route.approveHelp ? route.approveHelp : route.help
}
