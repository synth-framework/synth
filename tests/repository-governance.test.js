// ============================================================
// Repository Governance Tests
// ============================================================
// EXP-PROGRAM-028
// ============================================================

import { createEmptyState, applyEvent, rebuildState } from "../dist/runtime/replay.js"
import {
  classifyBranch,
  validateBranchName,
  generateBranchName,
  BRANCH_TYPES,
} from "../dist/repository/branch-taxonomy.js"
import {
  getRepositoryLifecycle,
  inferVersionBump,
  nextSemanticVersion,
  validatePromotion,
  formatReleaseNotes,
} from "../dist/repository/governance.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function makeEvent(type, payload) {
  return {
    id: `evt-${type}`,
    type,
    timestamp: Date.now(),
    transactionId: "tx-1",
    capability: "RepositoryGovernance",
    actor: "test",
    payload,
    eventHash: "hash",
    previousHash: "genesis",
  }
}

function testCreateEmptyStateHasNoRepository() {
  const state = createEmptyState()
  assert(state.repository === undefined, "empty state should have no repository")
  console.log("[PASS] empty state has no repository")
}

function testRepositoryInitializedEvent() {
  let state = createEmptyState()
  state = applyEvent(
    state,
    makeEvent("REPOSITORY_INITIALIZED", {
      repositoryId: "repo-1",
      defaultBranch: "main",
      forgeProvider: "github",
      versionStrategy: "semver",
    }),
  )
  assert(state.repository !== undefined, "repository should exist after initialization")
  assert(state.repository.defaultBranch === "main", "default branch should be main")
  assert(state.repository.forgeProvider === "github", "forge provider should be github")
  assert(state.repository.lifecycle === "initialized", "lifecycle should be initialized")
  assert(state.repository.versionStrategy === "semver", "version strategy should be semver")
  console.log("[PASS] REPOSITORY_INITIALIZED creates repository state")
}

function testBranchCreatedEvent() {
  let state = createEmptyState()
  state = applyEvent(
    state,
    makeEvent("REPOSITORY_INITIALIZED", {
      repositoryId: "repo-1",
      defaultBranch: "main",
      forgeProvider: "github",
      versionStrategy: "semver",
    }),
  )
  state = applyEvent(
    state,
    makeEvent("BRANCH_CREATED", {
      branchName: "expedition/mission-1/expedition-1",
      branchType: "expedition",
      baseBranch: "main",
      missionId: "mission-1",
      expeditionId: "expedition-1",
    }),
  )
  const branch = state.repository.branches["expedition/mission-1/expedition-1"]
  assert(branch !== undefined, "branch should exist")
  assert(branch.type === "expedition", "branch type should be expedition")
  assert(branch.missionId === "mission-1", "branch should reference mission")
  assert(state.repository.lifecycle === "branch-created", "lifecycle should advance")
  console.log("[PASS] BRANCH_CREATED records branch and advances lifecycle")
}

function testPullRequestOpenedEvent() {
  let state = createEmptyState()
  state = applyEvent(
    state,
    makeEvent("REPOSITORY_INITIALIZED", {
      repositoryId: "repo-1",
      defaultBranch: "main",
      forgeProvider: "github",
      versionStrategy: "semver",
    }),
  )
  state = applyEvent(
    state,
    makeEvent("BRANCH_CREATED", {
      branchName: "expedition/mission-1/expedition-1",
      branchType: "expedition",
      baseBranch: "main",
      missionId: "mission-1",
      expeditionId: "expedition-1",
    }),
  )
  state = applyEvent(
    state,
    makeEvent("PULL_REQUEST_OPENED", {
      pullRequestId: "pr-1",
      forgeId: "gh-123",
      url: "https://github.com/synth-framework/synth/pull/1",
      number: 1,
      headBranch: "expedition/mission-1/expedition-1",
      baseBranch: "main",
      missionId: "mission-1",
      expeditionId: "expedition-1",
    }),
  )
  const pr = state.repository.pullRequests["pr-1"]
  assert(pr !== undefined, "pull request should exist")
  assert(pr.state === "open", "pull request should be open")
  assert(state.repository.lifecycle === "promotion-proposed", "lifecycle should advance to promotion-proposed")
  console.log("[PASS] PULL_REQUEST_OPENED records PR and advances lifecycle")
}

function testPromotionApprovedAndMergedEvents() {
  let state = createEmptyState()
  state = applyEvent(
    state,
    makeEvent("REPOSITORY_INITIALIZED", {
      repositoryId: "repo-1",
      defaultBranch: "main",
      forgeProvider: "github",
      versionStrategy: "semver",
    }),
  )
  state = applyEvent(
    state,
    makeEvent("PULL_REQUEST_OPENED", {
      pullRequestId: "pr-1",
      forgeId: "gh-123",
      url: "https://github.com/synth-framework/synth/pull/1",
      number: 1,
      headBranch: "feature",
      baseBranch: "main",
    }),
  )
  state = applyEvent(state, makeEvent("PROMOTION_APPROVED", { promotionId: "promo-1", approver: "operator" }))
  assert(state.repository.lifecycle === "promotion-approved", "lifecycle should be promotion-approved")

  state = applyEvent(state, makeEvent("PULL_REQUEST_MERGED", { pullRequestId: "pr-1", commit: "abc123", strategy: "merge" }))
  assert(state.repository.pullRequests["pr-1"].state === "merged", "PR should be merged")
  assert(state.repository.lifecycle === "merged", "lifecycle should be merged")
  console.log("[PASS] PROMOTION_APPROVED and PULL_REQUEST_MERGED advance lifecycle")
}

function testReleaseCreatedEvent() {
  let state = createEmptyState()
  state = applyEvent(
    state,
    makeEvent("REPOSITORY_INITIALIZED", {
      repositoryId: "repo-1",
      defaultBranch: "main",
      forgeProvider: "github",
      versionStrategy: "semver",
    }),
  )
  state = applyEvent(
    state,
    makeEvent("PULL_REQUEST_MERGED", { pullRequestId: "pr-1", commit: "abc123", strategy: "merge" }),
  )
  state = applyEvent(
    state,
    makeEvent("RELEASE_CREATED", {
      releaseId: "rel-1",
      tag: "v2.4.0",
      targetCommit: "abc123",
      evidenceReference: "proof/rel-1.json",
    }),
  )
  const release = state.repository.releases["rel-1"]
  assert(release !== undefined, "release should exist")
  assert(release.tag === "v2.4.0", "release tag should be v2.4.0")
  assert(state.repository.lifecycle === "released", "lifecycle should be released")
  console.log("[PASS] RELEASE_CREATED records release and advances lifecycle")
}

function testBranchClassification() {
  assert(classifyBranch("main") === "main", "main should classify as main")
  assert(classifyBranch("release/2.4") === "release", "release/* should classify as release")
  assert(classifyBranch("mission/mission-1") === "mission", "mission/* should classify as mission")
  assert(classifyBranch("expedition/mission-1/expedition-1") === "expedition", "expedition/* should classify as expedition")
  assert(classifyBranch("hotfix/critical") === "hotfix", "hotfix/* should classify as hotfix")
  assert(classifyBranch("feature/foo") === undefined, "feature/* should not classify")
  console.log("[PASS] branch classification works for canonical types")
}

function testBranchValidation() {
  const valid = validateBranchName("expedition/mission-1/expedition-1", {
    missionId: "mission-1",
    expeditionId: "expedition-1",
  })
  assert(valid.valid, `valid branch should pass: ${valid.errors.join(", ")}`)

  const invalid = validateBranchName("expedition/mission-1/expedition-1", {})
  assert(!invalid.valid, "expedition branch without ids should fail")
  assert(invalid.errors.length === 2, "should report mission and expedition missing")
  console.log("[PASS] branch validation enforces required ids")
}

function testBranchGeneration() {
  const name = generateBranchName("expedition", {
    missionId: "mission-1",
    expeditionId: "expedition-1",
  })
  assert(name === "expedition/mission-1/expedition-1", `expected expedition/mission-1/expedition-1, got ${name}`)
  console.log("[PASS] branch generation produces canonical names")
}

function testVersionInference() {
  let state = createEmptyState()
  state = applyEvent(
    state,
    makeEvent("REPOSITORY_INITIALIZED", {
      repositoryId: "repo-1",
      defaultBranch: "main",
      forgeProvider: "github",
      versionStrategy: "semver",
    }),
  )

  assert(inferVersionBump(state) === undefined, "no completed expeditions means no bump")

  state = applyEvent(
    state,
    makeEvent("EXPEDITION_CREATED", {
      expedition: {
        id: "expedition-1",
        missionId: "mission-1",
        name: "Fix bug",
        goal: "Fix bug",
        status: "draft",
        objectives: [],
        discoveries: [],
        decisions: [],
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }),
  )
  state = applyEvent(
    state,
    makeEvent("EXPEDITION_COMPLETED", { id: "expedition-1" }),
  )
  assert(inferVersionBump(state) === "patch", "completed expedition should infer patch")

  state = applyEvent(
    state,
    makeEvent("DECISION_ACCEPTED", {
      decision: {
        id: "decision-1",
        expeditionId: "expedition-1",
        title: "Breaking change to public API",
        alternatives: ["keep", "break"],
        chosenAlternative: 1,
        status: "accepted",
        consequences: { positive: [], negative: [] },
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }),
  )
  assert(inferVersionBump(state) === "major", "breaking change decision should infer major")
  console.log("[PASS] version inference derives bump from evidence")
}

function testNextSemanticVersion() {
  assert(nextSemanticVersion("2.3.0", "major") === "3.0.0", "major bump")
  assert(nextSemanticVersion("2.3.0", "minor") === "2.4.0", "minor bump")
  assert(nextSemanticVersion("2.3.0", "patch") === "2.3.1", "patch bump")
  assert(nextSemanticVersion("v2.3.0", "minor") === "2.4.0", "v-prefix handled")
  console.log("[PASS] semantic version bumping works")
}

function testPromotionValidation() {
  let state = createEmptyState()
  const uninitialized = validatePromotion(state, "initialized", "branch-created")
  assert(!uninitialized.valid, "uninitialized repo cannot promote")

  state = applyEvent(
    state,
    makeEvent("REPOSITORY_INITIALIZED", {
      repositoryId: "repo-1",
      defaultBranch: "main",
      forgeProvider: "github",
      versionStrategy: "semver",
    }),
  )

  const noPr = validatePromotion(state, "initialized", "promotion-approved")
  assert(!noPr.valid, "promotion without PR should fail")

  state = applyEvent(
    state,
    makeEvent("PULL_REQUEST_OPENED", {
      pullRequestId: "pr-1",
      forgeId: "gh-123",
      url: "https://github.com/synth-framework/synth/pull/1",
      number: 1,
      headBranch: "feature",
      baseBranch: "main",
    }),
  )

  const valid = validatePromotion(state, "promotion-proposed", "promotion-approved")
  assert(valid.valid, `valid promotion should pass: ${valid.errors.join(", ")}`)
  console.log("[PASS] promotion validation enforces lifecycle and PR requirements")
}

function testReleaseNotes() {
  let state = createEmptyState()
  state = applyEvent(
    state,
    makeEvent("MISSION_CREATED", {
      mission: {
        id: "mission-1",
        name: "Modernize CLI",
        purpose: "Improve operator experience",
        status: "active",
        expeditions: [],
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }),
  )
  state = applyEvent(
    state,
    makeEvent("EXPEDITION_COMPLETED", { expeditionId: "expedition-1" }),
  )
  state = applyEvent(
    state,
    makeEvent("EXPEDITION_CREATED", {
      expedition: {
        id: "expedition-1",
        missionId: "mission-1",
        name: "Refactor status command",
        goal: "Make status output deterministic",
        status: "completed",
        objectives: [],
        discoveries: [],
        decisions: [],
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }),
  )
  const notes = formatReleaseNotes(state)
  assert(notes.includes("Modernize CLI"), "release notes should include mission")
  assert(notes.includes("Refactor status command"), "release notes should include expedition")
  console.log("[PASS] release notes format from canonical state")
}

async function main() {
  testCreateEmptyStateHasNoRepository()
  testRepositoryInitializedEvent()
  testBranchCreatedEvent()
  testPullRequestOpenedEvent()
  testPromotionApprovedAndMergedEvents()
  testReleaseCreatedEvent()
  testBranchClassification()
  testBranchValidation()
  testBranchGeneration()
  testVersionInference()
  testNextSemanticVersion()
  testPromotionValidation()
  testReleaseNotes()
  console.log("\nAll repository governance tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
