// Synthetic acceptance: an agent may choose provisionally, but its choice and
// reason must remain open/recoverable until ordinary review before Git merge.
// This test does not simulate a human approval or a real PR.
import fs from "node:fs/promises"
import path from "node:path"
import { assert } from "./helpers/assert.js"
import { parseJson, runSynth, withTempDir } from "./helpers/cli-harness.js"

const call = (args, cwd) => {
  const result = runSynth(["first-contact", ...args], cwd)
  assert(result.status === 0, `${args.join(" ")} failed: ${result.stdout}\n${result.stderr}`)
  return parseJson(result.stdout)
}

await withTempDir("synth-guided-choice-", async (cwd) => {
  call(["start", "Build a space mission tracker in TypeScript for the web"], cwd)
  const invalid = runSynth(["first-contact", "clarify", "--agent-choice", "Wrap long labels", "--scope", "board labels"], cwd)
  assert(invalid.status !== 0, "a provisional choice without a reason must be refused")
  const first = call(["clarify", "--agent-choice", "Wrap long labels", "--reason", "Otherwise long labels clip their cards", "--scope", "board labels", "--alternative", "Truncate labels"], cwd)
  assert(first.kind === "FirstContactAgentChoiceRecorded", "choice should be recorded through the existing clarification surface")
  assert(first.choice.status === "open" && first.choice.actor === "agent", "choice must not masquerade as human-approved")
  assert(first.choice.reason.includes("clip") && first.choice.scope === "board labels", "rationale and affected scope must survive")
  assert(first.choice.alternatives.includes("Truncate labels"), "preserve the alternative considered")
  assert(typeof first.choice.id === "string" && first.choice.id.length > 0, "give a choice a stable reference")
  const transcript = (await fs.readFile(path.join(cwd, ".synth", "first-contact", "transcript.jsonl"), "utf8"))
    .trim().split("\n").map(JSON.parse)
  assert(transcript.some((entry) => entry.actor === "agent" && entry.agentChoice?.id === first.choice.id && entry.agentChoice.reason === first.choice.reason), "persist the exact agent choice and rationale, not a human answer")

  const shown = call(["clarify"], cwd)
  assert(shown.openAgentChoices.some((c) => c.id === first.choice.id), "fresh CLI process should recover the open choice")
  assert(shown.openAgentChoices[0].reason === first.choice.reason, "do not summarize away the reason")
  const question = shown.questions.find((q) => q.field === "audience.primaryUsers")
  assert(question, "generic questions can still be asked")
  call(["clarify", "--field", question.field, "--answer", "mission controllers"], cwd)
  const status = call(["status"], cwd)
  assert(status.openAgentChoices.some((c) => c.id === first.choice.id), "answering another question must not silently settle an agent choice")

  // A fresh idea is not a reason to erase unfinished decisions. Old scope is
  // retained on the choice itself; it is not automatically relevant/approved.
  call(["start", "Build a documentation utility instead"], cwd)
  const changed = call(["status"], cwd)
  assert(changed.openAgentChoices.some((c) => c.id === first.choice.id && c.originIntent.includes("space mission tracker")), "new draft must not silently discard an open previous-scope choice")
  assert(changed.openAgentChoices.every((c) => c.status === "open" && c.actor === "agent"), "new request cannot promote old choices")
})

await withTempDir("synth-guided-choice-approval-", async (cwd) => {
  call(["start", "Build a space mission tracker in TypeScript for the web"], cwd)
  const recorded = call(["clarify", "--agent-choice", "Use local JSON files", "--reason", "Simplest reversible prototype", "--scope", "prototype persistence"], cwd)
  call(["clarify", "--field", "audience.primaryUsers", "--answer", "mission controllers"], cwd)
  call(["clarify", "--field", "audience.stakeholders", "--answer", "mission controllers"], cwd)
  const approved = call(["approve"], cwd)
  assert(approved.openAgentChoices?.some((c) => c.id === recorded.choice.id), "structured-field approval must still surface open product choices")
  assert(approved.choiceReviewStatus === "unreviewed", "approval of structured fields is not human confirmation of an agent choice")
  call(["clarify", "--agent-choice", "Add a local cache", "--reason", "Prototype response time", "--scope", "prototype performance"], cwd)
  assert(call(["status"], cwd).state === "draft", "a choice added after approval must not inherit stale approval")
  assert(runSynth(["first-contact", "materialize", "--dry-run"], cwd).status !== 0, "old approval cannot materialize a revised draft")
  const revised = call(["approve"], cwd)
  assert(revised.openAgentChoices.length === 2 && revised.choiceReviewStatus === "unreviewed", "reapproval of structured fields must not settle either choice")
})

await withTempDir("synth-guided-revision-", async (cwd) => {
  call(["start", "Build a space mission tracker in TypeScript for the web"], cwd)
  call(["clarify", "--field", "audience.primaryUsers", "--answer", "mission controllers"], cwd)
  call(["clarify", "--field", "audience.stakeholders", "--answer", "mission controllers"], cwd)
  call(["approve"], cwd)
  call(["start", "Build a different documentation utility"], cwd)
  const status = call(["status"], cwd)
  assert(status.state === "draft" && status.intent.includes("documentation utility"), "new request must not inherit the old draft's approval")
  const stale = runSynth(["first-contact", "materialize", "--dry-run"], cwd)
  assert(stale.status !== 0, "materialize must not project from approval for a superseded request")
})

console.log("[PASS] provisional agent choice stays open and attributed; superseded approvals cannot be reused")
