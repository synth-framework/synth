// ============================================================
// LEDGER CEREMONY COMMITS (ADR-055 rev 2 §R2.1)
// ============================================================
// Every ceremony that mutates governance state ends in exactly one commit on
// the ledger branch, made by the Ledger Writer, with the normative message
//   chore(synth): <TRANSITION> <entity-kind> <entity-id8>
// A refusal is returned with its `LEDGER_*` code (never thrown, never silent).
// ============================================================

import { strict as assert } from "assert"
import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"
import test from "node:test"
import { CEREMONIES, ceremonyMessage, commitCeremony } from "../dist/ledger/ceremony.js"
import { readRecordedLedgerBranch, resolveLedgerBranch } from "../dist/ledger/branch.js"
import { makeTempDirSync } from "./helpers/workspace.js"

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf-8" }).trim()
}

function makeLedgerRepo(prefix = "synth-ceremony-") {
  const root = makeTempDirSync(prefix)
  fs.mkdirSync(path.join(root, ".synth", "data", "event-stream", "partition-0"), { recursive: true })
  fs.mkdirSync(path.join(root, "proof", "expeditions"), { recursive: true })
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  fs.writeFileSync(path.join(root, ".synth", "data", "canonical-state.json"), JSON.stringify({ version: 1 }) + "\n")
  fs.writeFileSync(path.join(root, "proof", "expeditions", ".gitkeep"), "")
  fs.writeFileSync(path.join(root, "src", "main.ts"), "export const main = () => 1\n")
  fs.writeFileSync(path.join(root, ".gitignore"), [".synth/anchor/", ".synth/worktrees/", "dist/"].join("\n") + "\n")
  execFileSync("git", ["init", "-b", "main", root], { stdio: "pipe" })
  git(root, ["config", "user.email", "ceremony@test"])
  git(root, ["config", "user.name", "Ceremony Test"])
  git(root, ["add", "-A"])
  git(root, ["commit", "-m", "fixture"])
  return root
}

async function withRepo(fn) {
  const root = makeLedgerRepo()
  try {
    return await fn(root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

const EXPEDITION_ID = "bda2bbd4ef6550af"

test("ledger ceremony: the transition table and message shape follow §R2.1", () => {
  assert.equal(ceremonyMessage(CEREMONIES["expedition-start"], EXPEDITION_ID), `chore(synth): EXPEDITION_STARTED expedition bda2bbd4`)
  assert.equal(ceremonyMessage(CEREMONIES["expedition-complete"], EXPEDITION_ID), "chore(synth): EXPEDITION_COMPLETED expedition bda2bbd4")
  assert.equal(ceremonyMessage(CEREMONIES["expedition-finish"], EXPEDITION_ID), "chore(synth): EXPEDITION_FINISHED expedition bda2bbd4")
  assert.equal(ceremonyMessage(CEREMONIES["evidence-attach"], EXPEDITION_ID), "chore(synth): EVIDENCE_ATTACHED expedition bda2bbd4")
  assert.equal(ceremonyMessage(CEREMONIES["expedition-refine"], EXPEDITION_ID), "chore(synth): EXPEDITION_REFINED expedition bda2bbd4")
  assert.equal(
    ceremonyMessage(CEREMONIES["convergence-certification"], EXPEDITION_ID),
    "chore(synth): CONVERGENCE_CERTIFIED expedition bda2bbd4",
  )
  // A ceremony missing from the table still produces a well-formed message.
  assert.equal(ceremonyMessage({ transition: "MISSION_APPROVED", entityKind: "mission" }, "a57585f0aec4b2d8"), "chore(synth): MISSION_APPROVED mission a57585f0")
})

test("ledger ceremony: commitCeremony lands one commit on the ledger branch and leaves the tree clean", async () => {
  await withRepo(async (root) => {
    const before = git(root, ["rev-parse", "main"])
    fs.writeFileSync(path.join(root, ".synth", "data", "canonical-state.json"), JSON.stringify({ version: 2 }) + "\n")

    const ceremony = await commitCeremony(root, "expedition-start", EXPEDITION_ID)

    assert.equal(ceremony.committed, true, JSON.stringify(ceremony))
    assert.equal(ceremony.message, "chore(synth): EXPEDITION_STARTED expedition bda2bbd4")
    assert.deepEqual(ceremony.files, [".synth/data/canonical-state.json", ".synth/data/ledger.json"])
    assert.equal(git(root, ["rev-parse", "main"]), ceremony.commitHash)
    assert.notEqual(ceremony.commitHash, before)
    assert.equal(git(root, ["log", "-1", "--format=%s"]), ceremony.message)
    assert.equal(git(root, ["status", "--porcelain"]), "", "the ceremony leaves the ledger clean")

    // The first ceremony names the ledger branch: the inference happens once.
    assert.deepEqual(ceremony.ledgerBranch, { branch: "main", source: "inferred" })
    assert.equal(ceremony.branchRecorded, ".synth/data/ledger.json")
    assert.match(ceremony.warning, /inferred/i)
    assert.equal(readRecordedLedgerBranch(root).branch, "main")
    assert.equal(resolveLedgerBranch(root).source, "recorded", "the next resolution does not guess")
  })
})

test("ledger ceremony: config names the ledger branch and wins over the record", () => {
  const root = makeLedgerRepo()
  try {
    // Nothing named: inferred from the checkout.
    assert.equal(resolveLedgerBranch(root).source, "inferred")

    // Recorded at bootstrap: used without a config entry.
    fs.mkdirSync(path.join(root, ".synth", "data"), { recursive: true })
    fs.writeFileSync(
      path.join(root, ".synth", "data", "ledger.json"),
      JSON.stringify({ branch: "main", recordedAt: "2026-10-12T00:00:00.000Z" }) + "\n",
    )
    assert.deepEqual(
      { branch: resolveLedgerBranch(root).branch, source: resolveLedgerBranch(root).source },
      { branch: "main", source: "recorded" },
    )

    // Config wins over the record.
    fs.writeFileSync(path.join(root, ".synth", "config.yaml"), "git:\n  ledgerBranch: trunk-ledger\n")
    assert.deepEqual(
      { branch: resolveLedgerBranch(root).branch, source: resolveLedgerBranch(root).source },
      { branch: "trunk-ledger", source: "config" },
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("ledger ceremony: a ceremony run outside the ledger branch commits to it through the anchor", async () => {
  await withRepo(async (root) => {
    // Name the ledger branch the way a governed repository would.
    fs.writeFileSync(path.join(root, ".synth", "config.yaml"), "git:\n  ledgerBranch: main\n")
    git(root, ["add", "-A"])
    git(root, ["commit", "-m", "name the ledger branch"])

    // The operator is on a work branch; the ceremony mutates ledger files there.
    git(root, ["checkout", "-b", "feature/work"])
    const featureHead = git(root, ["rev-parse", "HEAD"])
    const mainHead = git(root, ["rev-parse", "main"])
    fs.writeFileSync(path.join(root, ".synth", "data", "canonical-state.json"), JSON.stringify({ version: 2 }) + "\n")

    const ceremony = await commitCeremony(root, "expedition-start", EXPEDITION_ID)

    assert.equal(ceremony.committed, true, JSON.stringify(ceremony))
    assert.deepEqual(ceremony.ledgerBranch, { branch: "main", source: "config" })
    assert.equal(git(root, ["rev-parse", "main"]), ceremony.commitHash, "the ledger branch advanced")
    assert.notEqual(ceremony.commitHash, mainHead)
    assert.equal(git(root, ["rev-parse", "HEAD"]), featureHead, "the work branch did not move")
    assert.equal(git(root, ["rev-parse", "--abbrev-ref", "HEAD"]), "feature/work", "and the checkout stayed put")
    assert.equal(git(root, ["show", "main:.synth/data/canonical-state.json"]), JSON.stringify({ version: 2 }), "the ledger landed on main")
    assert.equal(ceremony.checkoutDirty, true, "the checkout still holds the ceremony edits; that is reported, not hidden")
    assert.ok(fs.existsSync(path.join(root, ".synth", "anchor")), "the commit went through the anchor")
  })
})

test("ledger ceremony: a clean ledger reports no changes without a code", async () => {
  await withRepo(async (root) => {
    // The first ceremony has nothing to commit but the branch record.
    const first = await commitCeremony(root, "expedition-complete", EXPEDITION_ID)
    assert.equal(first.committed, true, JSON.stringify(first))
    assert.deepEqual(first.files, [".synth/data/ledger.json"], "only the record is committed")

    // From then on a ceremony with no ledger changes reports exactly that.
    const head = git(root, ["rev-parse", "HEAD"])
    const ceremony = await commitCeremony(root, "expedition-complete", EXPEDITION_ID)

    assert.equal(ceremony.committed, false)
    assert.equal(ceremony.code, undefined, "no changes is not a writer refusal")
    assert.match(ceremony.reason, /no ledger changes/)
    assert.equal(git(root, ["rev-parse", "HEAD"]), head, "nothing is committed")
    assert.deepEqual(ceremony.ledgerBranch, { branch: "main", source: "recorded" })
  })
})

test("ledger ceremony: a detached HEAD is a loud LEDGER_UNAVAILABLE refusal", async () => {
  await withRepo(async (root) => {
    git(root, ["checkout", "--detach"])
    fs.writeFileSync(path.join(root, ".synth", "data", "canonical-state.json"), JSON.stringify({ version: 3 }) + "\n")

    const ceremony = await commitCeremony(root, "expedition-refine", EXPEDITION_ID)

    assert.equal(ceremony.committed, false)
    assert.equal(ceremony.code, "LEDGER_UNAVAILABLE")
    assert.match(ceremony.reason, /Detached HEAD/)
    assert.ok(ceremony.nextStep, "a refusal must carry a next step")
  })
})
