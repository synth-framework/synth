// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { printJson, printError } from "./print.js"
import { GitSnapshotAdapter } from "../adapter/git-snapshot.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdSnapshotHelp() {
  printJson(namespaceHelp("snapshot", "Git-anchored governance state snapshots", [
    { name: "synth snapshot create [--message ...] [--tag <name>] [--include-proofs]", description: "Commit and tag governance files" },
    { name: "synth snapshot list [--limit <n>]", description: "List synth-* governance tags" },
    { name: "synth snapshot show --tag <tag-name>", description: "Show snapshot metadata for a tag" },
    { name: "synth snapshot verify --tag <tag-name>", description: "Check out tag and verify replay consistency" },
  ]))
}


export async function cmdSnapshotCreate(flags: Record<string, string | boolean>) {
  const adapter = new GitSnapshotAdapter()
  const message = typeof flags.message === "string" ? flags.message : undefined
  const tagName = typeof flags.tag === "string" ? flags.tag : undefined
  const includeProofs = flags["include-proofs"] === true || flags["include-proofs"] === "true"
  const trigger = typeof flags.trigger === "string" ? (flags.trigger as any) : "SNAPSHOT_REQUESTED"

  const result = adapter.createSnapshot({
    cwd: process.cwd(),
    trigger,
    message,
    tagName,
    includeProofs,
    actor: "synth-cli",
  })

  if (!result.ok) {
    printError(result.reason || "Snapshot failed", {
      code: "SnapshotFailed",
      category: "governance",
      snapshotId: result.snapshotId,
      reason: result.reason,
    })
  }

  printJson({
    status: "ok",
    kind: "GovernanceSnapshotCreated",
    snapshotId: result.snapshotId,
    commitHash: result.commitHash,
    tagName: result.tagName,
    eventOffset: result.eventOffset,
    stateHash: result.stateHash,
    trigger: result.trigger,
  })
}


export async function cmdSnapshotList(flags: Record<string, string | boolean>) {
  const adapter = new GitSnapshotAdapter()
  const limitRaw = typeof flags.limit === "string" ? parseInt(flags.limit, 10) : 50
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 50
  const entries = adapter.listSnapshots(process.cwd(), limit)
  printJson({
    status: "ok",
    kind: "GovernanceSnapshotList",
    count: entries.length,
    entries,
  })
}


export async function cmdSnapshotShow(flags: Record<string, string | boolean>) {
  const tagName = typeof flags.tag === "string" ? flags.tag : ""
  if (!tagName) {
    printError("Usage: synth snapshot show --tag <tag-name>")
    return
  }
  const adapter = new GitSnapshotAdapter()
  const entries = adapter.listSnapshots(process.cwd(), 1000)
  const entry = entries.find((e) => e.tagName === tagName)
  if (!entry) {
    printError(`Snapshot not found: ${tagName}`)
    return
  }
  printJson({
    status: "ok",
    kind: "GovernanceSnapshot",
    ...entry,
  })
}


export async function cmdSnapshotVerify(flags: Record<string, string | boolean>) {
  const tagName = typeof flags.tag === "string" ? flags.tag : ""
  if (!tagName) {
    printError("Usage: synth snapshot verify --tag <tag-name>")
    return
  }
  const adapter = new GitSnapshotAdapter()
  const result = adapter.verifySnapshot(process.cwd(), tagName)
  printJson({
    status: result.ok && result.consistent ? "ok" : "error",
    kind: "GovernanceSnapshotVerification",
    ...result,
  })
  if (!result.ok || !result.consistent) {
    process.exit(1)
  }
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "create") await cmdSnapshotCreate(flags)
  else if (sub === "list") await cmdSnapshotList(flags)
  else if (sub === "show") await cmdSnapshotShow(flags)
  else if (sub === "verify") await cmdSnapshotVerify(flags)
  else await cmdSnapshotHelp()
}
