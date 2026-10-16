// Synthetic documentation-led trace, not a real operator decision or pilot.
import fs from "node:fs/promises"
import path from "node:path"
import { assert } from "./helpers/assert.js"
import { parseJson, runSynth, withTempDir } from "./helpers/cli-harness.js"

const call = (args, cwd) => {
  const r = runSynth(["first-contact", ...args], cwd)
  assert(r.status === 0, `${args.join(" ")} failed: ${r.stdout}\n${r.stderr}`)
  return parseJson(r.stdout)
}

await withTempDir("synth-source-brief-", async (cwd) => {
  await fs.mkdir(path.join(cwd, "docs"))
  await fs.mkdir(path.join(cwd, "knowledge"))
  const local = path.join(cwd, "docs", "requirements.md")
  const sync = path.join(cwd, "knowledge", "collaboration.md")
  await fs.writeFile(local, "# Product\nBoards must remain local-only.\n")
  await fs.writeFile(sync, "# Collaboration\nBoards must support cloud sync.\n")
  const proposal = (localQuote, supersedesOfferId) => ({
    scope: "Next export slice",
    question: "Should board exports stay local, or sync between devices?",
    ...(supersedesOfferId ? { supersedesOfferId } : {}),
    options: [
      { id: "local", label: "Local-only export", tradeoff: "Works offline; no sharing", acceptanceExample: "An offline export can be opened locally", source: { path: "docs/requirements.md", line: 2, quote: localQuote } },
      { id: "sync", label: "Cloud sync", tradeoff: "Enables sharing; adds service and data risk", acceptanceExample: "An export appears on a second device", source: { path: "knowledge/collaboration.md", line: 2, quote: "Boards must support cloud sync." } },
    ],
  })
  const offerPath = path.join(cwd, "offer.json")
  await fs.writeFile(offerPath, JSON.stringify(proposal("Boards must remain local-only.")))
  call(["start", "Make editable specimen boards"], cwd)
  const before = call(["clarify"], cwd)
  assert(before.sourceHandoff.selectionRequired && before.sourceReviewStatus === "unreviewed", "conflicting roots remain open")
  await fs.writeFile(offerPath, JSON.stringify(proposal("A fabricated quote")))
  assert(runSynth(["first-contact", "clarify", "--source-offer", "offer.json"], cwd).status !== 0 &&
    call(["status"], cwd).sourceOffers.length === 0, "a misquoted source cannot enter the offer history")
  await fs.writeFile(offerPath, JSON.stringify(proposal("Boards must remain local-only.")))
  if (process.platform !== "win32") {
    await fs.symlink("requirements.md", path.join(cwd, "docs", "alias.md"))
    const throughLink = proposal("Boards must remain local-only.")
    throughLink.options[0].source.path = "docs/alias.md"
    await fs.writeFile(offerPath, JSON.stringify(throughLink))
    assert(runSynth(["first-contact", "clarify", "--source-offer", "offer.json"], cwd).status !== 0,
      "symlinked source cannot be promoted into a cited offer")
    await fs.writeFile(offerPath, JSON.stringify(proposal("Boards must remain local-only.")))
  }
  const offered = call(["clarify", "--source-offer", "offer.json"], cwd)
  assert(offered.offer.question === proposal().question && offered.offer.options.length === 2, "store the offered question and exact options")
  await fs.writeFile(offerPath, JSON.stringify({ ...proposal("Boards must remain local-only."), question: "A later edited question" }))
  assert(call(["status"], cwd).sourceOffers[0].question === offered.offer.question, "editing the input file cannot rewrite the original offer")
  assert(offered.offer.options[0].source.sha256.length === 64, "pin quoted source file identity")
  assert(call(["status"], cwd).workingBrief.status === "awaiting-response", "offer is not an answer")
  const bad = runSynth(["first-contact", "clarify", "--source-answer", offered.offer.id, "--selection", "made-up", "--human-response", "Synthetic answer"], cwd)
  assert(bad.status !== 0 && call(["status"], cwd).sourceAnswers.length === 0, "invalid selection must not write")
  const answered = call(["clarify", "--source-answer", offered.offer.id, "--selection", "local", "--human-response", "Synthetic respondent: start local-only; revisit sharing later"], cwd)
  assert(answered.answer.attribution === "cli-response-unverified" && answered.answer.response.includes("revisit sharing"), "preserve exact supplied words without authenticating a human")
  let brief = call(["status"], cwd).workingBrief
  assert(brief.status === "provisional-unverified" && brief.proposedSelection === "local" && brief.acceptanceExample.includes("offline export"), "brief is scoped, not a frozen spec or approved plan")
  assert(brief.sourceFreshness === "current" && brief.offerId === offered.offer.id && brief.version === 1, "tie projection to stored offer and source evidence")
  await fs.writeFile(path.join(cwd, "docs", "unrelated.md"), "New note\n")
  assert(call(["status"], cwd).workingBrief.sourceFreshness === "current", "unrelated changes do not stale cited lines")
  await fs.writeFile(local, "# Product\nBoards may be exported locally, but can later sync.\n")
  assert(call(["status"], cwd).workingBrief.sourceFreshness === "stale", "edited cited source must not be called current")
  const oldOffers = call(["status"], cwd).sourceOffers
  await fs.writeFile(offerPath, JSON.stringify(proposal("Boards may be exported locally, but can later sync.", offered.offer.id)))
  const revised = call(["clarify", "--source-offer", "offer.json"], cwd)
  assert(revised.offer.supersedesOfferId === offered.offer.id && revised.offer.version === 2, "revision links back without rewriting offer")
  const pending = call(["status"], cwd)
  assert(pending.workingBrief.status === "awaiting-response" && pending.sourceAnswers.length === 1, "new offer does not inherit old answer")
  await fs.writeFile(sync, "# Collaboration\nCloud sharing is optional.\n")
  const staleAnswer = runSynth(["first-contact", "clarify", "--source-answer", revised.offer.id, "--selection", "defer", "--human-response", "Synthetic respondent: defer"], cwd)
  assert(staleAnswer.status !== 0 && call(["status"], cwd).sourceAnswers.length === 1, "stale evidence cannot silently receive a new answer")
  await fs.writeFile(sync, "# Collaboration\nBoards must support cloud sync.\n")
  call(["clarify", "--source-answer", revised.offer.id, "--selection", "defer", "--human-response", "Synthetic respondent: defer delivery mode until next slice"], cwd)
  brief = call(["status"], cwd).workingBrief
  assert(brief.status === "deferred-unverified" && brief.version === 2 && brief.sourceFreshness === "current", "defer stays provisional in revision")
  assert(call(["status"], cwd).sourceOffers[0].id === oldOffers[0].id, "earlier offer and answer remain accessible")
  assert(call(["status"], cwd).choiceReviewStatus === "no-agent-choices", "source response does not settle independent agent choices")
  call(["start", "A separate documentation idea"], cwd)
  const nextIdea = call(["status"], cwd)
  assert(nextIdea.workingBrief.status === "no-source-offer" && nextIdea.sourceOffers.length === 2,
    "preserve history without promoting an earlier idea's answer to a new working brief")
})
console.log("[PASS] synthetic documentation evidence to versioned provisional working brief")
