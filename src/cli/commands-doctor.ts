// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import path from "path"
import { sha256 } from "../sdk/hashing/index.js"
import { locateEventLog } from "../infra/event-store.js"
import { printJson } from "./print.js"
import { checkLedger, repairLedger } from "../ledger/doctor.js"
import * as sdk from "../sdk/index.js"
import { DoctorCheckResult, verifyReplayHealth } from "./command-replay-health.js"
import { __dirname } from "./command-location.js"
import { getVersion, namespaceHelp } from "./command-help.js"


export async function verifyDistIntegrity(): Promise<DoctorCheckResult> {
  const manifestPath = path.resolve(__dirname, "..", "dist-manifest.json")
  try {
    await fs.access(manifestPath)
  } catch {
    return {
      ok: false,
      detail: "No dist manifest found",
      nextStep: "Run 'npm run build' to regenerate the dist manifest and compiled artifacts.",
    }
  }

  let manifest: any
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"))
  } catch {
    return {
      ok: false,
      detail: "dist manifest is not valid JSON",
      nextStep: "Run 'npm run build' to regenerate the dist manifest.",
    }
  }

  if (manifest.schema !== "synth-dist-manifest-v1") {
    return {
      ok: false,
      detail: `Unknown dist manifest schema: ${manifest.schema}`,
      nextStep: "Run 'npm run build' to regenerate the dist manifest with the supported schema.",
    }
  }

  const distDir = path.resolve(__dirname, "..")
  const expectedFiles = Object.entries<string>(manifest.files ?? {})
  let mismatches = 0
  let missing = 0
  for (const [rel, expectedHash] of expectedFiles) {
    const filePath = path.join(distDir, rel)
    let actualHash: string
    try {
      actualHash = sha256(await fs.readFile(filePath))
    } catch {
      missing++
      continue
    }
    if (actualHash !== expectedHash) {
      mismatches++
    }
  }

  if (missing > 0 || mismatches > 0) {
    return {
      ok: false,
      detail: `${missing} missing file(s), ${mismatches} modified file(s) in dist/`,
      nextStep: "Run 'npm run build' to rebuild dist/ from source.",
    }
  }

  return { ok: true, detail: `${expectedFiles.length} dist file(s) verified` }
}


export async function verifyEventChain(): Promise<DoctorCheckResult> {
  try {
    const root = sdk.workspace.root()
    await sdk.paths.ensureDataDir(root)
    const located = locateEventLog(root)
    if (!located.present) {
      return { ok: true, detail: "No event log present; chain skipped" }
    }
    // sdk.events.readEvents reads the chunked store. A project that still holds
    // only the legacy monolithic file would come back empty, which is the same
    // lie as the guard above, so read that layout directly - as a pure read, no
    // migration write from a health check.
    const events = located.layout === "legacy-file"
      ? (await fs.readFile(located.legacyPath, "utf-8"))
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .map((line) => JSON.parse(line) as { previousHash: string; eventHash: string })
      : await sdk.events.readEvents(root)
    if (events.length === 0) {
      return {
        ok: true,
        detail: `Event log is empty (${located.layout} layout, ${located.paths.length} file(s) present)`,
      }
    }
    let previousHash = "genesis"
    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      if (event.previousHash !== previousHash) {
        return {
          ok: false,
          detail: `Event chain broken at offset ${i}: expected previousHash ${previousHash}, got ${event.previousHash}`,
          nextStep: "Run 'synth explain replay' to inspect the chain, or restore the event log from a known-good backup.",
        }
      }
      previousHash = event.eventHash
    }
    return { ok: true, detail: `${events.length} event(s) chained (${located.layout} layout)` }
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      nextStep: "Ensure the event log is valid JSON and readable.",
    }
  }
}


export async function verifyDiscoveryBaseline(): Promise<DoctorCheckResult> {
  const discoveryDir = sdk.paths.discoveryDir(sdk.workspace.root())
  try {
    const entries = await fs.readdir(discoveryDir)
    const hasBaseline = entries.some((entry) => entry.endsWith(".json") || entry.endsWith(".jsonl"))
    return {
      ok: true,
      detail: hasBaseline
        ? "Discovery baseline present"
        : "No discovery baseline present (optional for greenfield projects; run 'synth discover --export' to create one)",
    }
  } catch {
    // Greenfield projects initialized with `synth init` do not run discovery and
    // therefore have no baseline. Treat a missing discovery directory as
    // informational rather than unhealthy so `synth doctor` remains healthy.
    return {
      ok: true,
      detail: "No discovery baseline present (optional for greenfield projects; run 'synth discover --export' to create one)",
    }
  }
}


export async function cmdDoctor(flags: Record<string, string | boolean> = {}) {
  const REQUIRED_NODE_MAJOR = 20
  const version = await getVersion()

  // Runtime Health — environment and installation signals
  const nodeVersion = process.version
  const nodeMajor = Number(nodeVersion.replace("v", "").split(".")[0])
  const runtimeHealth: Record<string, DoctorCheckResult> = {
    binary: {
      ok: true,
      detail: process.argv[1] || "unknown",
    },
    version: {
      ok: version !== "unknown",
      detail: version,
      ...(version === "unknown" ? { nextStep: "Reinstall the SYNTH CLI from a published package or build from source." } : {}),
    },
    node: {
      ok: nodeMajor >= REQUIRED_NODE_MAJOR,
      detail: `Node.js ${nodeVersion} (required >= ${REQUIRED_NODE_MAJOR})`,
      ...(nodeMajor < REQUIRED_NODE_MAJOR ? { nextStep: `Upgrade Node.js to version ${REQUIRED_NODE_MAJOR} or later.` } : {}),
    },
    distIntegrity: await verifyDistIntegrity(),
  }

  // Project Health — repository and governance signals
  const manifestPath = sdk.paths.manifestPath(sdk.workspace.root())
  let hasManifest = false
  try {
    await fs.access(manifestPath)
    hasManifest = true
  } catch {
    hasManifest = false
  }

  const projectHealth: Record<string, DoctorCheckResult> = {
    manifest: {
      ok: hasManifest,
      detail: hasManifest ? manifestPath : "No SYNTH project manifest found in current directory",
      ...(hasManifest ? {} : { nextStep: "Run 'synth init --name \"Project Name\"' to initialize a SYNTH project." }),
    },
    replay: await verifyReplayHealth(),
    eventChain: await verifyEventChain(),
    discoveryBaseline: await verifyDiscoveryBaseline(),
  }

  // Ledger Health — ADR-055 AC6/AC13: the four silent-failure classes of the
  // ceremony ledger. --fix repairs the anchor and commits a stalled ceremony.
  const fixRequested = flags.fix === true || flags.fix === "true"
  let repair: Awaited<ReturnType<typeof repairLedger>> | undefined
  if (fixRequested) {
    repair = await repairLedger(process.cwd())
  }
  const ledger = await checkLedger(process.cwd())
  const ledgerHealth: Record<string, DoctorCheckResult> = {
    ledgerBranch: ledger.repo
      ? {
          ok: Boolean(ledger.branch),
          detail: ledger.branch
            ? `Ledger branch: ${ledger.branch}${ledger.branchSource ? ` (${ledger.branchSource})` : ""}`
            : "Detached HEAD with no recorded ledger branch — ceremonies cannot commit",
          ...(ledger.branch
            ? ledger.branchSource === "inferred"
              ? { nextStep: "Name the ledger branch: set git.ledgerBranch in .synth/config.yaml (the next ceremony records it otherwise)." }
              : {}
            : { nextStep: "Check out the ledger branch before running ceremonies." }),
        }
      : { ok: true, detail: "Not a git repository" },
    ledgerAnchor: { ...ledger.anchor },
    ledgerCeremony: { ...ledger.ceremony },
    ledgerSync: { ...ledger.sync },
  }

  const runtimeOk = Object.values(runtimeHealth).every((c) => c.ok)
  const projectOk = Object.values(projectHealth).every((c) => c.ok)
  const ledgerOk = Object.values(ledgerHealth).every((c) => c.ok)
  const allOk = runtimeOk && projectOk && ledgerOk

  const runtimeNextSteps = Object.values(runtimeHealth)
    .filter((c) => !c.ok && c.nextStep)
    .map((c) => c.nextStep as string)
  const projectNextSteps = Object.values(projectHealth)
    .filter((c) => !c.ok && c.nextStep)
    .map((c) => c.nextStep as string)

  const ledgerNextSteps = Object.values(ledgerHealth)
    .filter((c) => !c.ok && c.nextStep)
    .map((c) => c.nextStep as string)

  const nextSteps: string[] = []
  if (runtimeNextSteps.length > 0) {
    nextSteps.push("[Runtime Health]")
    nextSteps.push(...runtimeNextSteps)
  }
  if (projectNextSteps.length > 0) {
    nextSteps.push("[Project Health]")
    nextSteps.push(...projectNextSteps)
  }
  if (ledgerNextSteps.length > 0) {
    nextSteps.push("[Ledger Health]")
    nextSteps.push(...ledgerNextSteps)
  }
  if (nextSteps.length === 0) {
    if (hasManifest) {
      nextSteps.push("synth status", "synth mission create --subject '...' --purpose '...'")
    } else {
      nextSteps.push("synth init --name 'Project Name'")
    }
  }

  // Maintain a backward-compatible `checks` view that flattens runtime and
  // project health signals. Some consumers (e.g. TaskPRO regression) read
  // individual checks from this top-level map.
  const checks: Record<string, DoctorCheckResult> = { ...runtimeHealth, ...projectHealth, ...ledgerHealth }

  printJson({
    status: allOk ? "ok" : "warning",
    name: "synth",
    version,
    healthy: allOk,
    runtimeHealth,
    projectHealth,
    ledgerHealth,
    ...(repair ? { ledgerRepair: repair } : {}),
    checks,
    nextSteps,
  })
}


export async function cmdDoctorHelp() {
  printJson(namespaceHelp("doctor", "Verify installation and project health", [
    { name: "synth doctor", description: "Report Runtime, Project and Ledger health sections" },
    { name: "synth doctor --fix", description: "Repair the ledger: recreate a stale anchor, commit a stalled ceremony" },
  ]))
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  await cmdDoctor(flags)
}
