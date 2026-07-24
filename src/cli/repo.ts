// ============================================================
// CLI: Repository Governance Commands
// ============================================================
// Public operator interface for repository and release governance.
// All commands emit events through the ExecutionGate so that every
// repository state change is replayable and governed.
//
// Shell command construction follows ADR-037: multiline bodies are
// always written to temporary files before being passed to tools.
// ============================================================

import fs from "fs/promises"
import path from "path"
import crypto from "crypto"
import { bootstrap } from "../core/bootstrap.js"
import {
  generateBranchName,
  validateBranchName,
  type BranchType,
  createForgeAdapter,
  listForgeProviders,
  inferVersionBump,
  nextSemanticVersion,
  validatePromotion,
} from "../repository/index.js"

const BRANCH_TYPES: BranchType[] = ["main", "release", "mission", "expedition", "hotfix"]

import { printJson, printError } from "./print.js"

async function bootstrapWithCapabilities() {
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  for (const name of ctx.capabilityRegistry.list()) {
    const cap = ctx.capabilityRegistry.resolve(name)
    if (cap) {
      ctx.runtime.registerCapability(cap)
    }
  }
  return ctx
}

export function namespaceHelp() {
  return {
    status: "ok",
    name: "synth",
    namespace: "repo",
    description: "Repository and release governance operations",
    usage: "synth repo <subcommand> [options]",
    subcommands: [
      { name: "synth repo init --forge-provider <p> --version-strategy <s>", description: "Initialize repository governance state", args: "--forge-provider <p> --version-strategy <s> [--default-branch <b>]" },
      { name: "synth repo branch create --name <n> --type <t>", description: "Record a governed branch", args: "--name <n> --type <t> [--base <b>] [--mission-id <id>] [--expedition-id <id>]" },
      { name: "synth repo pr open --head <h> --base <b> --title <t> --body-file <f>", description: "Open a promotion pull request", args: "--head <h> --base <b> --title <t> --body-file <f> [--mission-id <id>] [--expedition-id <id>]" },
      { name: "synth repo pr approve --id <id>", description: "Approve a proposed promotion", args: "--id <id> [--approver <name>]" },
      { name: "synth repo pr merge --id <id> --commit <sha>", description: "Merge an approved pull request", args: "--id <id> --commit <sha> [--strategy merge|squash|rebase]" },
      { name: "synth repo release create --tag <t> --commit <sha>", description: "Create a governed release", args: "--tag <t> --commit <sha> [--evidence <path>]" },
      { name: "synth repo status", description: "Report repository governance state" },
    ],
    note: "Run 'synth repo <subcommand> --help' for subcommand details when available.",
  }
}

async function readBodyFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(path.resolve(filePath), "utf-8")
  } catch {
    printError(`Body file not found: ${filePath}`)
  }
}

export async function cmdRepoInit(flags: Record<string, string | boolean>) {
  const forgeProvider = typeof flags["forge-provider"] === "string" ? flags["forge-provider"] : ""
  const versionStrategy = typeof flags["version-strategy"] === "string" ? flags["version-strategy"] : ""
  const defaultBranch = typeof flags["default-branch"] === "string" ? flags["default-branch"] : "main"

  if (!forgeProvider) printError("--forge-provider is required")
  if (!versionStrategy) printError("--version-strategy is required")

  const providers = listForgeProviders()
  if (!providers.includes(forgeProvider)) {
    printError(`Unknown forge provider "${forgeProvider}". Available: ${providers.join(", ")}`)
  }

  const ctx = await bootstrapWithCapabilities()
  const state = await ctx.runtime.getState()
  if (state.repository) {
    printJson({ status: "ok", message: "Repository governance already initialized", repository: state.repository })
    return
  }

  const repositoryId = crypto.randomUUID()
  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "InitializeRepository",
    payload: { repositoryId, defaultBranch, forgeProvider, versionStrategy },
  })

  if (result.status !== "ok") {
    printError(`Failed to initialize repository governance: ${result.error || JSON.stringify(result)}`)
  }

  printJson({
    status: "ok",
    kind: "RepositoryInitialized",
    repositoryId,
    defaultBranch,
    forgeProvider,
    versionStrategy,
    nextStep: `synth repo branch create --type expedition --mission-id <id> --expedition-id <id>`,
  })
}

export async function cmdRepoBranchCreate(flags: Record<string, string | boolean>) {
  const branchName = typeof flags.name === "string" ? flags.name : ""
  const branchType = typeof flags.type === "string" ? (flags.type as BranchType) : undefined
  const baseBranch = typeof flags.base === "string" ? flags.base : undefined
  const missionId = typeof flags["mission-id"] === "string" ? flags["mission-id"] : undefined
  const expeditionId = typeof flags["expedition-id"] === "string" ? flags["expedition-id"] : undefined

  if (!branchType) printError("--type is required")
  if (!BRANCH_TYPES.includes(branchType)) {
    printError(`Unknown branch type "${branchType}". Valid: ${BRANCH_TYPES.join(", ")}`)
  }

  const finalBranchName = branchName || generateBranchName(branchType, { missionId, expeditionId })
  const validation = validateBranchName(finalBranchName, { missionId, expeditionId })
  if (!validation.valid) {
    printError(`Invalid branch name: ${validation.errors.join("; ")}`)
  }

  const ctx = await bootstrapWithCapabilities()
  const state = await ctx.runtime.getState()
  if (!state.repository) {
    printError("Repository governance is not initialized. Run 'synth repo init' first.")
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateBranch",
    payload: { branchName: finalBranchName, branchType, baseBranch, missionId, expeditionId },
  })

  if (result.status !== "ok") {
    printError(`Failed to create branch record: ${result.error || JSON.stringify(result)}`)
  }

  printJson({
    status: "ok",
    kind: "BranchCreated",
    branchName: finalBranchName,
    branchType,
    baseBranch,
    missionId,
    expeditionId,
  })
}

export async function cmdRepoPrOpen(flags: Record<string, string | boolean>) {
  const headBranch = typeof flags.head === "string" ? flags.head : ""
  const baseBranch = typeof flags.base === "string" ? flags.base : ""
  const title = typeof flags.title === "string" ? flags.title : ""
  const bodyFile = typeof flags["body-file"] === "string" ? flags["body-file"] : ""
  const missionId = typeof flags["mission-id"] === "string" ? flags["mission-id"] : undefined
  const expeditionId = typeof flags["expedition-id"] === "string" ? flags["expedition-id"] : undefined

  if (!headBranch) printError("--head is required")
  if (!baseBranch) printError("--base is required")
  if (!title) printError("--title is required")
  if (!bodyFile) printError("--body-file is required")

  const body = await readBodyFile(bodyFile)

  const ctx = await bootstrapWithCapabilities()
  const state = await ctx.runtime.getState()
  if (!state.repository) {
    printError("Repository governance is not initialized. Run 'synth repo init' first.")
  }

  const pullRequestId = crypto.randomUUID()
  const forge = createForgeAdapter(state.repository.forgeProvider, {})

  let pr
  try {
    pr = await forge.openPullRequest({
      title,
      body,
      headBranch,
      baseBranch,
      missionId,
      expeditionId,
    })
  } catch (err) {
    printError(`Forge adapter failed to open pull request: ${err instanceof Error ? err.message : String(err)}`)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "OpenPullRequest",
    payload: {
      pullRequestId,
      forgeId: pr.id,
      url: pr.url,
      number: pr.number,
      headBranch,
      baseBranch,
      title,
      missionId,
      expeditionId,
    },
  })

  if (result.status !== "ok") {
    printError(`Failed to record pull request: ${result.error || JSON.stringify(result)}`)
  }

  printJson({
    status: "ok",
    kind: "PullRequestOpened",
    pullRequestId,
    forgeId: pr.id,
    url: pr.url,
    number: pr.number,
    headBranch,
    baseBranch,
    title,
    missionId,
    expeditionId,
    nextStep: `synth repo pr approve --id ${pullRequestId}`,
  })
}

export async function cmdRepoPrApprove(flags: Record<string, string | boolean>) {
  const promotionId = typeof flags.id === "string" ? flags.id : ""
  const approver = typeof flags.approver === "string" ? flags.approver : "operator"

  if (!promotionId) printError("--id is required")

  const ctx = await bootstrapWithCapabilities()
  const state = await ctx.runtime.getState()
  if (!state.repository) {
    printError("Repository governance is not initialized. Run 'synth repo init' first.")
  }

  const validation = validatePromotion(state, state.repository.lifecycle, "promotion-approved")
  if (!validation.valid) {
    printError(`Promotion cannot be approved: ${validation.errors.join("; ")}`)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ApprovePromotion",
    payload: { promotionId, approver },
  })

  if (result.status !== "ok") {
    printError(`Failed to approve promotion: ${result.error || JSON.stringify(result)}`)
  }

  printJson({
    status: "ok",
    kind: "PromotionApproved",
    promotionId,
    approver,
    nextStep: `synth repo pr merge --id ${promotionId} --commit <sha>`,
  })
}

export async function cmdRepoPrMerge(flags: Record<string, string | boolean>) {
  const pullRequestId = typeof flags.id === "string" ? flags.id : ""
  const commit = typeof flags.commit === "string" ? flags.commit : ""
  const strategy = typeof flags.strategy === "string" ? flags.strategy : "merge"

  if (!pullRequestId) printError("--id is required")
  if (!commit) printError("--commit is required")
  if (!["merge", "squash", "rebase"].includes(strategy)) {
    printError(`Unknown merge strategy "${strategy}". Valid: merge, squash, rebase`)
  }

  const ctx = await bootstrapWithCapabilities()
  const state = await ctx.runtime.getState()
  if (!state.repository) {
    printError("Repository governance is not initialized. Run 'synth repo init' first.")
  }

  const pr = state.repository.pullRequests[pullRequestId]
  if (!pr) {
    printError(`Pull request "${pullRequestId}" not found`)
  }

  const forge = createForgeAdapter(state.repository.forgeProvider, {})
  let mergeResult: { success: boolean; commit?: string; error?: string }
  try {
    mergeResult = await forge.mergePullRequest(pullRequestId, strategy as "merge" | "squash" | "rebase")
  } catch (err) {
    mergeResult = { success: false, error: err instanceof Error ? err.message : String(err) }
  }

  if (!mergeResult.success) {
    printError(`Forge adapter failed to merge pull request: ${mergeResult.error || "unknown error"}`)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "MergePullRequest",
    payload: { pullRequestId, commit, strategy },
  })

  if (result.status !== "ok") {
    printError(`Failed to record merge: ${result.error || JSON.stringify(result)}`)
  }

  printJson({
    status: "ok",
    kind: "PullRequestMerged",
    pullRequestId,
    commit,
    strategy,
    nextStep: `synth repo release create --tag <tag> --commit ${commit}`,
  })
}

export async function cmdRepoReleaseCreate(flags: Record<string, string | boolean>) {
  const tag = typeof flags.tag === "string" ? flags.tag : ""
  const commit = typeof flags.commit === "string" ? flags.commit : ""
  const evidenceReference = typeof flags.evidence === "string" ? flags.evidence : undefined

  if (!tag) printError("--tag is required")
  if (!commit) printError("--commit is required")

  const ctx = await bootstrapWithCapabilities()
  const state = await ctx.runtime.getState()
  if (!state.repository) {
    printError("Repository governance is not initialized. Run 'synth repo init' first.")
  }

  const bump = inferVersionBump(state)
  const currentVersion = "2.3.0" // Placeholder: derive from package or latest release in future work.
  const inferredTag = bump ? `v${nextSemanticVersion(currentVersion, bump)}` : tag

  const releaseId = crypto.randomUUID()
  const forge = createForgeAdapter(state.repository.forgeProvider, {})
  let release
  try {
    release = await forge.createRelease({
      tag: inferredTag,
      name: inferredTag,
      body: "Release generated by SYNTH repository governance.",
      targetCommit: commit,
    })
  } catch (err) {
    printError(`Forge adapter failed to create release: ${err instanceof Error ? err.message : String(err)}`)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateRelease",
    payload: { releaseId, tag: inferredTag, targetCommit: commit, evidenceReference },
  })

  if (result.status !== "ok") {
    printError(`Failed to record release: ${result.error || JSON.stringify(result)}`)
  }

  printJson({
    status: "ok",
    kind: "ReleaseCreated",
    releaseId,
    tag: inferredTag,
    targetCommit: commit,
    evidenceReference,
    forgeUrl: release.url,
  })
}

export async function cmdRepoStatus() {
  const ctx = await bootstrapWithCapabilities()
  const state = await ctx.runtime.getState()

  printJson({
    status: "ok",
    kind: "RepositoryStatus",
    initialized: state.repository !== undefined,
    lifecycle: state.repository?.lifecycle || "uninitialized",
    forgeProvider: state.repository?.forgeProvider,
    versionStrategy: state.repository?.versionStrategy,
    defaultBranch: state.repository?.defaultBranch,
    branchCount: state.repository ? Object.keys(state.repository.branches).length : 0,
    pullRequestCount: state.repository ? Object.keys(state.repository.pullRequests).length : 0,
    releaseCount: state.repository ? Object.keys(state.repository.releases).length : 0,
    inferredVersionBump: state.repository ? inferVersionBump(state) : undefined,
  })
}
