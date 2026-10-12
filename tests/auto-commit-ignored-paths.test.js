// ============================================================
// EXP-AUTO-COMMIT-001 regression — tracked-but-ignored paths
// ============================================================
// The real repository carries files that are simultaneously tracked and
// matched by .gitignore (.synth/data/drafts/, .synth/ai/, cli-errors.jsonl).
// Passing such a path *explicitly* to `git add` makes git refuse the whole
// batch ("The following paths are ignored by one of your .gitignore files"),
// so auto-commit silently failed on every lifecycle transition (audit D1/D2).
// This test recreates that condition in a temp project and asserts that a
// lifecycle transition still commits its state — and that ignored *untracked*
// files stay out of the commit.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { runSynth, parseJson } from "./helpers/cli-harness.js"
import { runGit } from "./helpers/workspace.js"
import { setupGitBackedProject, createAndApproveMission, createExecutingExpedition } from "./helpers/mission-lifecycle.js"
import { assert } from "./helpers/assert.js"

async function main() {
  const projectDir = await setupGitBackedProject("synth-auto-commit-ignored-")
  const missionId = await createAndApproveMission(projectDir, {
    subject: "Ignored-path regression mission",
    purpose: "Recreate the tracked-but-ignored condition that broke auto-commit",
  })
  const expeditionId = await createExecutingExpedition(projectDir, missionId, {
    subject: "Ignored-path regression expedition",
    goal: "Auto-commit must survive tracked-but-ignored paths",
  })

  // Recreate the regression: an ignored directory whose files are tracked.
  const gitignorePath = path.join(projectDir, ".gitignore")
  const gitignore = await fs.readFile(gitignorePath, "utf-8").catch(() => "")
  await fs.writeFile(gitignorePath, `${gitignore}\n.synth/data/drafts/\n`, "utf-8")

  const draftDir = path.join(projectDir, ".synth", "data", "drafts")
  await fs.mkdir(draftDir, { recursive: true })
  const trackedDraft = path.join(draftDir, "tracked-draft.json")
  await fs.writeFile(trackedDraft, JSON.stringify({ id: "tracked-draft", revision: 1 }), "utf-8")
  runGit(["add", "-f", ".synth/data/drafts/tracked-draft.json"], projectDir)

  // An untracked ignored file must NOT be committed by auto-commit.
  const untrackedDraft = path.join(draftDir, "untracked-draft.json")
  await fs.writeFile(untrackedDraft, JSON.stringify({ id: "untracked-draft" }), "utf-8")

  // Modify the tracked draft so staging has real work to do.
  await fs.writeFile(trackedDraft, JSON.stringify({ id: "tracked-draft", revision: 2 }), "utf-8")

  // A lifecycle transition that auto-commits derived state. Before the fix
  // this returned { committed: false, reason: "Failed to stage derived state" }.
  const refine = runSynth(["expedition", "refine", "--id", expeditionId, "--note", "regression probe"], projectDir)
  assert(refine.status === 0, `refine must exit 0:\n${refine.stderr}`)
  const output = parseJson(refine.stdout)
  assert(output.autoCommit, `refine must report autoCommit: ${refine.stdout}`)
  assert(
    output.autoCommit.committed === true,
    `auto-commit must succeed with tracked-but-ignored paths present: ${JSON.stringify(output.autoCommit)}`,
  )

  const lastCommit = runGit(["show", "--name-only", "--pretty=format:%s", "HEAD"], projectDir)
  assert(
    lastCommit.includes("tracked-draft.json"),
    `the tracked draft modification must be part of the auto-commit:\n${lastCommit}`,
  )
  assert(
    !lastCommit.includes("untracked-draft.json"),
    `the untracked ignored draft must never be committed:\n${lastCommit}`,
  )

  console.log("[PASS] auto-commit survives tracked-but-ignored paths and skips untracked ignored files")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
