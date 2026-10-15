// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import { checkGovernDelegation } from "./govern-delegation.js"
import { printJson, printError } from "./print.js"
import { cmdFirstContactStart, cmdFirstContactOnboardDetect } from "./first-contact.js"
import * as sdk from "../sdk/index.js"
import { runInternalGovernance, runNpmScript } from "./command-governance.js"


import { cmdStatus } from "./command-status.js"


export async function cmdGovern(flags: Record<string, string | boolean>) {
  const pipelineMode =
    flags.pipeline === true ||
    flags.pipeline === "true" ||
    flags.explain === true ||
    flags.explain === "true" ||
    typeof flags.profile === "string" ||
    flags.full === true ||
    flags.full === "true"

  // EXP-TRUST-001: refuse cyclic/marker govern delegations at the command
  // boundary, before any routing, so a project whose "govern" script
  // re-enters the SYNTH pipeline fails prescriptively instead of recursing
  // or silently routing away.
  const boundaryVerdict = checkGovernDelegation(process.cwd())
  if (!boundaryVerdict.allowed) {
    if (boundaryVerdict.condition === "cyclic-script" || boundaryVerdict.condition === "depth-marker") {
      return printError(boundaryVerdict.message)
    }
  }

  if (pipelineMode) {
    const verdict = checkGovernDelegation(process.cwd())
    if (!verdict.allowed) {
      if (verdict.condition === "missing-package-json" || verdict.condition === "missing-govern-script") {
        return runInternalGovernance(verdict.condition)
      }
      return printError(verdict.message)
    }
    const args = ["run", "govern"]
    if (flags.explain === true || flags.explain === "true") args.push("--explain")
    if (typeof flags.profile === "string") args.push("--profile", flags.profile)
    if (flags.full === true || flags.full === "true") args.push("--full")
    const result = await runNpmScript(args, verdict.childEnv, process.cwd())
    printJson({
      status: result.status === 0 ? "ok" : "error",
      kind: "GovernResult",
      delegated: true,
      condition: "delegated",
      exitCode: result.status,
      output: result.stdout,
      errors: result.stderr,
    })
    if (result.status !== 0) {
      process.exit(result.status)
    }
    return
  }

  // A legitimate "govern" script exists (the guard allowed delegation to it).
  // Run it regardless of project initialization state so project validation
  // output is preserved and the delegation marker propagates (EXP-TRUST-001).
  if (boundaryVerdict.allowed && boundaryVerdict.condition === "delegated") {
    const result = await runNpmScript(["run", "govern"], boundaryVerdict.childEnv, process.cwd())
    printJson({
      status: result.status === 0 ? "ok" : "error",
      kind: "GovernResult",
      delegated: true,
      condition: "delegated",
      exitCode: result.status,
      output: result.stdout,
      errors: result.stderr,
    })
    process.exit(result.status)
  }

  // Unified onboarding invocation: detect project state and route to the
  // appropriate SYNTH entry point without requiring the user to choose commands.
  const rootDir = process.cwd()
  const hasManifest = sdk.paths.hasManifest(rootDir)
  const intent = typeof flags.intent === "string" ? flags.intent : ""

  if (!hasManifest) {
    // Uninitialized project: greenfield or intent-driven onboarding.
    if (intent) {
      printJson({
        status: "ok",
        kind: "GovernRouted",
        reason: "uninitialized_project_with_intent",
        route: "first-contact start",
        intent,
      })
      return cmdFirstContactStart([intent], flags)
    }
    printJson({
      status: "ok",
      kind: "GovernRouted",
      reason: "uninitialized_project",
      route: "first-contact onboard:detect",
    })
    return cmdFirstContactOnboardDetect([], flags)
  }

  const statePath = sdk.paths.stateFile(rootDir)
  let hasGovernanceState = false
  try {
    await fs.access(statePath)
    hasGovernanceState = true
  } catch {
    hasGovernanceState = false
  }

  if (!hasGovernanceState) {
    // Initialized but not yet governed: bootstrap an existing repository.
    printJson({
      status: "ok",
      kind: "GovernRouted",
      reason: "initialized_not_governed",
      route: "bootstrap --approve",
    })
    return (await import("./command-bootstrap.js")).cmdBootstrap([rootDir], { ...flags, approve: true })
  }

  // Already governed.
  if (intent) {
    printJson({
      status: "ok",
      kind: "GovernRouted",
      reason: "governed_project_with_intent",
      route: "mission create",
      intent,
    })
    return (await import("./command-mission-create.js")).cmdMissionCreate({ ...flags, subject: intent, purpose: `Governed intent captured via synth govern: ${intent}` })
  }

  printJson({
    status: "ok",
    kind: "GovernRouted",
    reason: "governed_project_no_intent",
    route: "status",
  })
  return cmdStatus()
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  if (!flags.intent && positional[1]) {
    flags.intent = positional[1]
  }
  await cmdGovern(flags)
}
