// Proposed next slice, branch-local only. These CLI-supplied words are
// synthetic: they are not an actual operator response or approval.
import test from "node:test"
import fs from "node:fs/promises"
import path from "node:path"
import { strict as assert } from "node:assert"
import { runSynth, parseJson, withTempDir } from "./helpers/cli-harness.js"

function call(cwd, ...args) {
  const result = runSynth(["first-contact", ...args], cwd)
  assert.equal(result.status, 0, `${args.join(" ")}: ${result.stdout}\n${result.stderr}`)
  return parseJson(result.stdout)
}

await test("ambiguous reply remains open; raw words and agent mapping stay distinct across revision", async () => withTempDir("synth-response-open-", async cwd => {
  const input = "Build a small editable board; storage is undecided"
  call(cwd, "start", input)
  const proposal = supersedesOfferId => ({
    scope: "First storage slice", question: "Start with local data or remote storage?",
    ...(supersedesOfferId ? { supersedesOfferId } : {}),
    options: [
      { id: "local", label: "Local", tradeoff: "Offline but not shared", acceptanceExample: "Reopens local work", source: { kind: "operator-intent", quote: input } },
      { id: "remote", label: "Remote", tradeoff: "Shared but needs a service", acceptanceExample: "Opens on a second device", source: { kind: "operator-intent", quote: input } },
    ],
  })
  const write = async value => fs.writeFile(path.join(cwd, "offer.json"), JSON.stringify(value))
  await write(proposal())
  const first = call(cwd, "clarify", "--source-offer", "offer.json").offer
  const raw = "Maybe local, but I want to ask someone before choosing."
  const ambiguous = call(cwd, "clarify", "--source-answer", first.id, "--human-response", raw).answer
  assert.equal(ambiguous.response, raw)
  assert.equal(ambiguous.proposedSelection, undefined, "no option can be inferred from uncertain words")
  assert.equal(ambiguous.attribution, "cli-response-unverified")
  let status = call(cwd, "status")
  assert.equal(status.workingBrief.status, "unresolved-unverified")
  assert.equal(status.workingBrief.acceptanceExample, undefined, "no acceptance example inherited from a nearby option")
  assert.equal(status.workingBrief.offerId, first.id)
  assert.equal(status.sourceAnswers.length, 1)
  assert.equal(status.sourceAnswers[0].response, raw)
  assert.equal(status.choiceReviewStatus, "no-agent-choices")
  assert.notEqual(runSynth(["first-contact", "clarify", "--source-answer", first.id,
    "--selection", "local", "--human-response", "Changed story"], cwd).status, 0, "do not overwrite the original response")
  await write(proposal(first.id))
  const revised = call(cwd, "clarify", "--source-offer", "offer.json").offer
  status = call(cwd, "status")
  assert.equal(status.workingBrief.status, "awaiting-response", "earlier raw reply cannot settle a revised offer")
  assert.equal(status.sourceAnswers[0].offerId, first.id)
  const mappedWords = "Synthetic respondent: start local only, revisit later."
  const mapped = call(cwd, "clarify", "--source-answer", revised.id, "--selection", "local", "--human-response", mappedWords).answer
  assert.equal(mapped.response, mappedWords)
  assert.equal(mapped.proposedSelection, "local", "mapping is a separate agent/caller proposal")
  status = call(cwd, "status")
  assert.equal(status.workingBrief.status, "provisional-unverified")
  assert.equal(status.workingBrief.offerId, revised.id)
  assert.equal(status.workingBrief.proposedSelection, "local")
  assert.equal(status.sourceAnswers.length, 2, "revisions preserve previous words and attribution")
}))

await test("an explicit defer is not an ambiguous reply or a claimed agreement", async () => withTempDir("synth-response-defer-", async cwd => {
  const input = "Export one board; data location undecided"
  call(cwd, "start", input)
  const offer = {
    scope: "Next export", question: "Store locally or sync?", options: [
      { id: "local", label: "Local", tradeoff: "No sharing", acceptanceExample: "Offline export", source: { kind: "operator-intent", quote: input } },
      { id: "sync", label: "Sync", tradeoff: "Network service needed", acceptanceExample: "Shared export", source: { kind: "operator-intent", quote: input } },
    ],
  }
  await fs.writeFile(path.join(cwd, "offer.json"), JSON.stringify({ ...offer,
    options: [{ ...offer.options[0], id: "defer" }, offer.options[1]] }))
  assert.notEqual(runSynth(["first-contact", "clarify", "--source-offer", "offer.json"], cwd).status, 0,
    "an option cannot masquerade as the reserved explicit deferral")
  assert.equal(call(cwd, "status").sourceOffers.length, 0)
  await fs.writeFile(path.join(cwd, "offer.json"), JSON.stringify(offer))
  const id = call(cwd, "clarify", "--source-offer", "offer.json").offer.id
  assert.notEqual(runSynth(["first-contact", "clarify", "--source-answer", id, "--human-response", " "], cwd).status, 0)
  assert.equal(call(cwd, "status").sourceAnswers.length, 0, "empty supplied words cannot be stored")
  call(cwd, "clarify", "--source-answer", id, "--selection", "defer", "--human-response", "Synthetic respondent: defer storage decision")
  assert.equal(call(cwd, "status").workingBrief.status, "deferred-unverified")
}))
