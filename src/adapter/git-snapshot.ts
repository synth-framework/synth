// ============================================================
// ADAPTER: Git Snapshot — Governance State Anchoring
// ============================================================
// Creates read-only git anchors (commits/tags) that reference
// SYNTH governance state without mutating the event log.
// ============================================================

import { execFileSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"
import { load as loadYaml } from "js-yaml"
import { rebuildState } from "../runtime/replay.js"

export type SnapshotPolicy = "disabled" | "tag-only" | "commit-and-tag"

export type SnapshotConfig = {
  snapshotPolicy: SnapshotPolicy
  autoTagOnComplete: boolean
  autoCommitOnStateChange: boolean
  autoTagMerkleRoot: boolean
  includeProofs: boolean
}

export type SnapshotOptions = {
  cwd: string
  trigger: "EXPEDITION_COMPLETED" | "SNAPSHOT_REQUESTED" | "GOVERNANCE_STATE_CHANGED" | "MERKLE_ROOT_PUBLISHED" | "post-commit"
  expeditionId?: string
  message?: string
  tagName?: string
  includeProofs?: boolean
  actor?: string
  sessionId?: string
  stateHash?: string
  eventOffset?: number
}

export type SnapshotResult = {
  ok: boolean
  snapshotId: string
  commitHash?: string
  tagName?: string
  eventOffset: number
  stateHash: string
  trigger: string
  reason?: string
}

export type SnapshotEntry = {
  tagName: string
  commitHash: string
  snapshotId?: string
  trigger?: string
  eventOffset?: number
  stateHash?: string
  createdAt?: string
}

export type VerifyResult = {
  ok: boolean
  tagName: string
  commitHash: string
  consistent: boolean
  eventCount: number
  replayHash: string
  reason?: string
}

export type CanSnapshotResult = {
  ok: boolean
  reason?: string
  gitStatus?: string[]
  suggestedCommit?: string
}

const SNAPSHOT_FILES = [
  ".synth/data/event-log.jsonl",
  ".synth/data/canonical-state.json",
  ".synth/manifest.json",
  ".synth/keys/*.pub",
  ".synth/policy/*.yaml",
]

const OPTIONAL_SNAPSHOT_FILES = [
  "data/event-log.jsonl",
  "AGENTS.md",
]

const PROOF_GLOBS = ["proof/*.json", "proof/*.jsonl"]

function git(cwd: string, args: string[]): string {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] } as any).trim()
  } catch (err: any) {
    const stderr = err.stderr?.toString().trim() || err.message
    throw new Error(`GIT_ERROR: git ${args.join(" ")} failed: ${stderr}`)
  }
}

function gitSilent(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] } as any).trim()
  } catch {
    return null
  }
}

/** Raw git status for parsing; must preserve leading whitespace in --porcelain output. */
function gitStatusRaw(cwd: string): string {
  try {
    return execFileSync("git", ["status", "--porcelain"], { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] } as any)
  } catch (err: any) {
    const stderr = err.stderr?.toString().trim() || err.message
    throw new Error(`GIT_ERROR: git status --porcelain failed: ${stderr}`)
  }
}

function isGitRepo(cwd: string): boolean {
  return fs.existsSync(path.join(cwd, ".git"))
}

function hasUncommittedChanges(cwd: string): boolean {
  if (!isGitRepo(cwd)) return false
  const status = gitStatusRaw(cwd)
  return status.trim().length > 0
}

function resolveFiles(cwd: string, includeProofs: boolean): string[] {
  const files: string[] = []
  for (const pattern of SNAPSHOT_FILES) {
    if (pattern.includes("*")) {
      const dir = path.dirname(pattern)
      const fullDir = path.join(cwd, dir)
      if (fs.existsSync(fullDir)) {
        const ext = path.extname(pattern)
        const entries = fs.readdirSync(fullDir)
        for (const entry of entries) {
          if (entry.endsWith(ext)) {
            files.push(path.join(dir, entry))
          }
        }
      }
    } else if (fs.existsSync(path.join(cwd, pattern))) {
      files.push(pattern)
    }
  }
  for (const pattern of OPTIONAL_SNAPSHOT_FILES) {
    if (fs.existsSync(path.join(cwd, pattern))) {
      files.push(pattern)
    }
  }
  if (includeProofs) {
    for (const pattern of PROOF_GLOBS) {
      const dir = path.dirname(pattern)
      const fullDir = path.join(cwd, dir)
      if (fs.existsSync(fullDir)) {
        const ext = path.extname(pattern)
        const entries = fs.readdirSync(fullDir)
        for (const entry of entries) {
          if (entry.endsWith(ext)) {
            files.push(path.join(dir, entry))
          }
        }
      }
    }
  }
  return [...new Set(files)]
}

function isGovernanceFile(cwd: string, relPath: string): boolean {
  const core = SNAPSHOT_FILES.some((p) => {
    if (p.includes("*")) {
      const dir = path.dirname(p)
      const ext = path.extname(p)
      return relPath.startsWith(dir + "/") && relPath.endsWith(ext)
    }
    return relPath === p
  })
  if (core) return true
  // Optional files are part of the snapshot set when present, so uncommitted
  // changes to them do not count as source changes outside the snapshot set.
  for (const p of OPTIONAL_SNAPSHOT_FILES) {
    if (relPath === p && fs.existsSync(path.join(cwd, p))) return true
  }
  // Untracked directories that correspond to a snapshot glob directory (e.g.
  // `?? .synth/policy/`) are part of the governance snapshot set.
  for (const p of SNAPSHOT_FILES) {
    if (p.includes("*")) {
      const dir = path.dirname(p)
      if (relPath === dir || relPath.startsWith(dir + "/")) return true
    }
  }
  // Proof artifacts are derived from governance state and are included in
  // snapshots when includeProofs is enabled; treat them as governance files
  // so evidence attachment does not block expedition completion.
  for (const p of PROOF_GLOBS) {
    if (p.includes("*")) {
      const dir = path.dirname(p)
      if (relPath === dir || relPath.startsWith(dir + "/")) return true
    }
    if (relPath === p) return true
  }
  // All runtime state under .synth/data/ (including decisions, drafts,
  // snapshots, and checkpoints) is derived governance state.
  if (relPath.startsWith(".synth/data/")) return true
  return false
}

function getStateHash(cwd: string): string {
  try {
    const statePath = path.join(cwd, ".synth", "data", "canonical-state.json")
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, "utf-8"))
      return state.stateHash || "0"
    }
  } catch {
    // fall through
  }
  return "0"
}

function getEventOffset(cwd: string): number {
  try {
    const logPath = path.join(cwd, ".synth", "data", "event-log.jsonl")
    if (fs.existsSync(logPath)) {
      const lines = fs.readFileSync(logPath, "utf-8").split("\n").filter(Boolean)
      return lines.length
    }
  } catch {
    // fall through
  }
  return 0
}

function uniqueSnapshotId(trigger: string, expeditionId?: string): string {
  const iso = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -1)
  if (trigger === "EXPEDITION_COMPLETED" && expeditionId) {
    return `${expeditionId}-${iso}`
  }
  return `${trigger.toLowerCase()}-${iso}`
}

function makeTagName(trigger: string, snapshotId: string, expeditionId?: string): string {
  if (trigger === "EXPEDITION_COMPLETED" && expeditionId) {
    return `synth-expedition/${expeditionId}`
  }
  const iso = new Date().toISOString().replace(/[:.]/g, "").slice(0, -4) + "Z"
  return `synth-snapshot/${iso}`
}

function resolveTagCollision(cwd: string, tagName: string): string {
  const existing = gitSilent(cwd, ["rev-parse", "--verify", tagName])
  if (!existing) return tagName
  let counter = 1
  let candidate = `${tagName}-${counter}`
  while (gitSilent(cwd, ["rev-parse", "--verify", candidate])) {
    counter++
    candidate = `${tagName}-${counter}`
  }
  return candidate
}

function buildCommitMessage(options: SnapshotOptions, snapshotId: string): string {
  const offset = options.eventOffset ?? getEventOffset(options.cwd)
  const stateHash = options.stateHash ?? getStateHash(options.cwd)
  const lines = [
    `[synth] snapshot ${snapshotId}`,
    "",
    `- Event log offset: ${offset}`,
    `- State hash: ${stateHash}`,
    `- Trigger: ${options.trigger}`,
  ]
  if (options.expeditionId) lines.push(`- Expedition: ${options.expeditionId}`)
  if (options.actor) lines.push(`- Agent: ${options.actor}`)
  if (options.sessionId) lines.push(`- Session: ${options.sessionId}`)
  return lines.join("\n")
}

export function defaultSnapshotConfig(): SnapshotConfig {
  return {
    snapshotPolicy: "tag-only",
    autoTagOnComplete: true,
    autoCommitOnStateChange: false,
    autoTagMerkleRoot: false,
    includeProofs: false,
  }
}

export function loadSnapshotConfig(cwd: string): SnapshotConfig {
  const configPath = path.join(cwd, ".synth", "config.yaml")
  let parsed: Record<string, unknown> = {}
  if (fs.existsSync(configPath)) {
    try {
      parsed = loadYaml(fs.readFileSync(configPath, "utf-8")) as Record<string, unknown>
    } catch {
      parsed = {}
    }
  }
  const gitConfig = (parsed.git as Record<string, unknown>) || {}
  const config = defaultSnapshotConfig()
  if (gitConfig.snapshotPolicy === "disabled" || gitConfig.snapshotPolicy === "tag-only" || gitConfig.snapshotPolicy === "commit-and-tag") {
    config.snapshotPolicy = gitConfig.snapshotPolicy as SnapshotPolicy
  }
  if (typeof gitConfig.autoTagOnComplete === "boolean") config.autoTagOnComplete = gitConfig.autoTagOnComplete
  if (typeof gitConfig.autoCommitOnStateChange === "boolean") config.autoCommitOnStateChange = gitConfig.autoCommitOnStateChange
  if (typeof gitConfig.autoTagMerkleRoot === "boolean") config.autoTagMerkleRoot = gitConfig.autoTagMerkleRoot
  if (typeof gitConfig.includeProofs === "boolean") config.includeProofs = gitConfig.includeProofs
  return config
}

export class GitSnapshotAdapter {
  readonly metadata = {
    name: "git-snapshot",
    version: "1.0.0",
    kind: "snapshot",
    category: "integration",
    description: "Git anchoring for SYNTH governance state snapshots",
  }

  canSnapshot(cwd: string): CanSnapshotResult {
    if (!isGitRepo(cwd)) {
      return { ok: false, reason: "No git repository detected" }
    }
    const config = loadSnapshotConfig(cwd)
    if (config.snapshotPolicy === "disabled") {
      return { ok: false, reason: "git.snapshotPolicy is disabled" }
    }
    const status = gitStatusRaw(cwd)
    if (status.trim().length > 0) {
      const lines = status.split("\n").filter((line) => line.length >= 3)
      const sourceChanges = lines.filter((line) => {
        const relPath = line.slice(3)
        return !isGovernanceFile(cwd, relPath)
      })
      if (sourceChanges.length > 0) {
        const filePaths = sourceChanges.map((line) => line.slice(3).trim())
        const message = "chore(synth): commit source changes before expedition completion"
        const suggestedCommit = `git add ${filePaths.map((p) => JSON.stringify(p)).join(" ")} && git commit -m ${JSON.stringify(message)}`
        return {
          ok: false,
          reason: `Working tree has uncommitted source changes outside the snapshot set (${sourceChanges.length} file(s))`,
          gitStatus: sourceChanges,
          suggestedCommit,
        }
      }
    }
    return { ok: true }
  }

  createSnapshot(options: SnapshotOptions): SnapshotResult {
    const cwd = options.cwd
    const can = this.canSnapshot(cwd)
    if (!can.ok) {
      return {
        ok: false,
        snapshotId: uniqueSnapshotId(options.trigger, options.expeditionId),
        eventOffset: options.eventOffset ?? getEventOffset(cwd),
        stateHash: options.stateHash ?? getStateHash(cwd),
        trigger: options.trigger,
        reason: can.reason,
      }
    }

    const config = loadSnapshotConfig(cwd)
    const includeProofs = options.includeProofs ?? config.includeProofs
    const files = resolveFiles(cwd, includeProofs)
    if (files.length === 0) {
      return {
        ok: false,
        snapshotId: uniqueSnapshotId(options.trigger, options.expeditionId),
        eventOffset: options.eventOffset ?? getEventOffset(cwd),
        stateHash: options.stateHash ?? getStateHash(cwd),
        trigger: options.trigger,
        reason: "No governance files found to snapshot",
      }
    }

    const eventOffset = options.eventOffset ?? getEventOffset(cwd)
    const stateHash = options.stateHash ?? getStateHash(cwd)
    const snapshotId = uniqueSnapshotId(options.trigger, options.expeditionId)

    const doCommit = config.snapshotPolicy === "commit-and-tag" ||
      options.trigger === "SNAPSHOT_REQUESTED" ||
      options.trigger === "GOVERNANCE_STATE_CHANGED" ||
      options.trigger === "post-commit"

    let commitHash: string | undefined
    if (doCommit) {
      git(cwd, ["add", "--", ...files])
      const diff = gitSilent(cwd, ["diff", "--cached", "--stat"])
      if (!diff) {
        // Nothing changed in the snapshot set; fall back to tag-only.
      } else {
        const message = options.message || buildCommitMessage(options, snapshotId)
        git(cwd, ["commit", "-m", message, "--", ...files])
        commitHash = git(cwd, ["rev-parse", "HEAD"])
      }
    }

    let tagName: string | undefined
    if (options.tagName) {
      tagName = resolveTagCollision(cwd, options.tagName)
    } else {
      const baseTag = makeTagName(options.trigger, snapshotId, options.expeditionId)
      tagName = resolveTagCollision(cwd, baseTag)
    }

    // Only create a tag when policy allows tagging.
    if (config.snapshotPolicy !== "disabled") {
      if (commitHash) {
        git(cwd, ["tag", tagName, commitHash])
      } else {
        git(cwd, ["tag", tagName])
      }
    }

    return {
      ok: true,
      snapshotId,
      commitHash,
      tagName,
      eventOffset,
      stateHash,
      trigger: options.trigger,
    }
  }

  listSnapshots(cwd: string, limit = 50): SnapshotEntry[] {
    if (!isGitRepo(cwd)) return []
    const tagNames = gitSilent(cwd, ["tag", "--list", "synth-*"])
    if (!tagNames) return []
    const entries: SnapshotEntry[] = []
    for (const tagName of tagNames.split("\n").filter(Boolean).slice(0, limit)) {
      const commitHash = gitSilent(cwd, ["rev-parse", "--verify", `${tagName}^{commit}`]) || ""
      const createdAt = gitSilent(cwd, ["log", "-1", "--format=%ai", tagName]) || undefined
      const subject = gitSilent(cwd, ["log", "-1", "--format=%s", tagName]) || undefined
      const snapshotId = tagName.split("/").slice(1).join("/")
      entries.push({
        tagName,
        commitHash,
        snapshotId,
        createdAt,
        trigger: subject?.startsWith("[synth]") ? "SNAPSHOT_REQUESTED" : undefined,
      })
    }
    return entries
  }

  verifySnapshot(cwd: string, tagName: string): VerifyResult {
    if (!isGitRepo(cwd)) {
      return { ok: false, tagName, commitHash: "", consistent: false, eventCount: 0, replayHash: "", reason: "No git repository detected" }
    }
    const commitHash = gitSilent(cwd, ["rev-parse", "--verify", `${tagName}^{commit}`])
    if (!commitHash) {
      return { ok: false, tagName, commitHash: "", consistent: false, eventCount: 0, replayHash: "", reason: `Tag not found: ${tagName}` }
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "synth-snapshot-"))
    try {
      git(cwd, ["worktree", "add", "--detach", tmpDir, tagName])
      const logPath = path.join(tmpDir, ".synth", "data", "event-log.jsonl")
      const statePath = path.join(tmpDir, ".synth", "data", "canonical-state.json")
      if (!fs.existsSync(logPath)) {
        return { ok: false, tagName, commitHash, consistent: false, eventCount: 0, replayHash: "", reason: "Event log missing at tagged state" }
      }
      const raw = fs.readFileSync(logPath, "utf-8")
      const lines = raw.split("\n").filter(Boolean)
      const events = lines.map((line) => JSON.parse(line))
      const replayedState = rebuildState(events)
      const replayHash = replayedState.stateHash
      const expectedHash = fs.existsSync(statePath)
        ? JSON.parse(fs.readFileSync(statePath, "utf-8")).stateHash || null
        : null
      const consistent = expectedHash === null || expectedHash === replayHash
      return {
        ok: true,
        tagName,
        commitHash,
        consistent,
        eventCount: events.length,
        replayHash,
        reason: consistent ? undefined : `State hash mismatch: expected ${expectedHash}, replayed ${replayHash}`,
      }
    } catch (err: any) {
      return {
        ok: false,
        tagName,
        commitHash,
        consistent: false,
        eventCount: 0,
        replayHash: "",
        reason: err instanceof Error ? err.message : String(err),
      }
    } finally {
      try {
        git(cwd, ["worktree", "remove", "--force", tmpDir])
      } catch {
        // ignore cleanup failure
      }
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      } catch {
        // ignore cleanup failure
      }
    }
  }
}

export function createGitSnapshotAdapter(): GitSnapshotAdapter {
  return new GitSnapshotAdapter()
}
