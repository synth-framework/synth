// ============================================================
// ADR-056 — `--branch` / `--no-create` git mechanics
// ============================================================
// Covers src/repository/branch-declaration.ts (the git- and state-facing half
// of the declaration):
//   - a pre-existing branch is checked out, never recreated,
//   - --no-create refuses a branch that exists nowhere (DECLARED_BRANCH_MISSING),
//   - without --no-create a missing branch is created from HEAD,
//   - a branch that only exists on origin is materialized as a tracking branch,
//   - a branch owned by another live entity is refused (DECLARED_BRANCH_IN_USE),
//   - invalid refs are refused before any git side effect.
// ============================================================

import { strict as assert } from "assert"
import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"
import { resolveDeclaredBranch } from "../dist/repository/branch-declaration.js"
import { makeTempDirSync, gitInitWithCommit } from "./helpers/workspace.js"

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf-8" }).trim()
}

function currentBranch(root) {
  return git(root, ["rev-parse", "--abbrev-ref", "HEAD"])
}

function localBranches(root) {
  return git(root, ["branch", "--list", "--format=%(refname:short)"]).split("\n").filter(Boolean).sort()
}

function testExistingBranchIsCheckedOutNotRecreated() {
  const root = makeTempDirSync("synth-declare-git-")
  gitInitWithCommit(root, "main")
  git(root, ["branch", "arena/existing"])
  const before = localBranches(root)

  const result = resolveDeclaredBranch({
    root,
    role: "expedition",
    entityId: "e-1",
    branch: "arena/existing",
    noCreate: true,
  })
  assert.equal(result.ok, true, result.error)
  assert.equal(result.created, false, "a pre-existing branch is never reported as created")
  assert.equal(currentBranch(root), "arena/existing", "the declared branch is checked out")
  assert.deepEqual(localBranches(root), before, "no branch was added")

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] --no-create checks out a pre-existing branch without recreating it")
}

function testNoCreateRefusesMissingBranch() {
  const root = makeTempDirSync("synth-declare-git-")
  gitInitWithCommit(root, "main")
  const before = localBranches(root)

  const result = resolveDeclaredBranch({
    root,
    role: "expedition",
    entityId: "e-1",
    branch: "arena/never-created",
    noCreate: true,
  })
  assert.equal(result.ok, false)
  assert.equal(result.code, "DECLARED_BRANCH_MISSING")
  assert.match(result.suggestion, /git branch arena\/never-created/)
  assert.equal(currentBranch(root), "main", "a refused declaration never moves HEAD")
  assert.deepEqual(localBranches(root), before, "a refused declaration never creates a branch")

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] --no-create refuses a branch that exists nowhere and reports the git next step")
}

function testMissingBranchIsCreatedWithoutNoCreate() {
  const root = makeTempDirSync("synth-declare-git-")
  gitInitWithCommit(root, "main")
  const base = git(root, ["rev-parse", "HEAD"])

  const result = resolveDeclaredBranch({
    root,
    role: "expedition",
    entityId: "e-1",
    branch: "arena/created-here",
  })
  assert.equal(result.ok, true, result.error)
  assert.equal(result.created, true, "a branch created by this call is reported as created")
  assert.equal(currentBranch(root), "arena/created-here")
  assert.equal(git(root, ["rev-parse", "arena/created-here"]), base, "the branch starts at HEAD")

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] without --no-create a missing branch is created from HEAD")
}

function testRemoteOnlyBranchIsMaterialized() {
  const root = makeTempDirSync("synth-declare-git-")
  gitInitWithCommit(root, "main")
  const origin = makeTempDirSync("synth-declare-origin-")
  execFileSync("git", ["init", "--bare", "-b", "main", origin], { stdio: "pipe" })
  git(root, ["remote", "add", "origin", origin])
  git(root, ["push", "origin", "main:arena/remote-only"])
  git(root, ["fetch", "origin"])

  const result = resolveDeclaredBranch({
    root,
    role: "expedition",
    entityId: "e-1",
    branch: "arena/remote-only",
    noCreate: true,
  })
  assert.equal(result.ok, true, result.error)
  assert.equal(result.created, false, "a branch that pre-exists on origin is not created")
  assert.equal(currentBranch(root), "arena/remote-only")
  assert.match(git(root, ["rev-parse", "--abbrev-ref", "arena/remote-only@{upstream}"]), /origin\/arena\/remote-only/)

  fs.rmSync(root, { recursive: true, force: true })
  fs.rmSync(origin, { recursive: true, force: true })
  console.log("[PASS] a remote-only branch is materialized as a tracking branch under --no-create")
}

function testLiveOwnerBlocksTheDeclaration() {
  const root = makeTempDirSync("synth-declare-git-")
  gitInitWithCommit(root, "main")
  git(root, ["branch", "arena/owned"])

  const result = resolveDeclaredBranch({
    root,
    role: "expedition",
    entityId: "e-2",
    branch: "arena/owned",
    state: {
      missions: {},
      expeditions: {
        "e-1": { name: "Executing One", status: "executing", missionId: "m-1", executionBranch: "arena/owned" },
      },
    },
  })
  assert.equal(result.ok, false)
  assert.equal(result.code, "DECLARED_BRANCH_IN_USE")
  assert.match(result.error, /expedition e-1/)
  assert.equal(currentBranch(root), "main", "a refused declaration never moves HEAD")

  // The owner itself may re-declare the same branch (idempotent re-runs).
  const same = resolveDeclaredBranch({
    root,
    role: "expedition",
    entityId: "e-1",
    branch: "arena/owned",
    state: {
      expeditions: { "e-1": { status: "executing", executionBranch: "arena/owned" } },
    },
  })
  assert.equal(same.ok, true, same.error)

  // A completed owner releases the branch.
  const released = resolveDeclaredBranch({
    root,
    role: "expedition",
    entityId: "e-2",
    branch: "arena/owned",
    state: { expeditions: { "e-1": { status: "completed", executionBranch: "arena/owned" } } },
  })
  assert.equal(released.ok, true, released.error)

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] a branch owned by another live expedition is refused; completion releases it")
}

function testInvalidNameIsRefusedBeforeAnySideEffect() {
  const root = makeTempDirSync("synth-declare-git-")
  gitInitWithCommit(root, "main")

  for (const branch of ["has space", "bad..name", ""]) {
    const result = resolveDeclaredBranch({ root, role: "mission", entityId: "m-1", branch, noCreate: true })
    assert.equal(result.ok, false, branch)
    assert.equal(result.code, "INVALID_BRANCH_NAME", branch)
  }
  assert.equal(currentBranch(root), "main")
  assert.deepEqual(localBranches(root), ["main"])

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] invalid branch names are refused before any git side effect")
}

function main() {
  testExistingBranchIsCheckedOutNotRecreated()
  testNoCreateRefusesMissingBranch()
  testMissingBranchIsCreatedWithoutNoCreate()
  testRemoteOnlyBranchIsMaterialized()
  testLiveOwnerBlocksTheDeclaration()
  testInvalidNameIsRefusedBeforeAnySideEffect()
  console.log("\nAll declared-branch git tests passed.")
}

main()
