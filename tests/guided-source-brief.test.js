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
  assert(offered.workingBrief?.status === "awaiting-response" && offered.workingBrief.offerId === offered.offer.id,
    "source-offer command emits awaiting-response workingBrief directly")
  const storedAfterOffer = JSON.parse(await fs.readFile(path.join(cwd, ".synth", "first-contact", "draft.json"), "utf8"))
  assert(storedAfterOffer.workingBrief?.status === "awaiting-response" && storedAfterOffer.workingBrief.offerId === offered.offer.id,
    "draft.json persists awaiting-response workingBrief where it can be read rather than derived")
  await fs.writeFile(offerPath, JSON.stringify({ ...proposal("Boards must remain local-only."), question: "A later edited question" }))
  assert(call(["status"], cwd).sourceOffers[0].question === offered.offer.question, "editing the input file cannot rewrite the original offer")
  assert(offered.offer.options[0].source.sha256.length === 64, "pin quoted source file identity")
  assert(call(["status"], cwd).workingBrief.status === "awaiting-response", "offer is not an answer")
  const bad = runSynth(["first-contact", "clarify", "--source-answer", offered.offer.id, "--selection", "made-up", "--human-response", "Synthetic answer"], cwd)
  assert(bad.status !== 0 && call(["status"], cwd).sourceAnswers.length === 0, "invalid selection must not write")
  const answered = call(["clarify", "--source-answer", offered.offer.id, "--selection", "local", "--human-response", "Synthetic respondent: start local-only; revisit sharing later"], cwd)
  assert(answered.answer.attribution === "cli-response-unverified" && answered.answer.response.includes("revisit sharing"), "preserve exact supplied words without authenticating a human")
  const storedAfterAnswer = JSON.parse(await fs.readFile(path.join(cwd, ".synth", "first-contact", "draft.json"), "utf8"))
  assert(storedAfterAnswer.workingBrief?.status === "provisional-unverified" && storedAfterAnswer.workingBrief.answerId === answered.answer.id,
    "draft.json persists answered workingBrief state directly")
  let brief = call(["status"], cwd).workingBrief
  assert(brief.status === "provisional-unverified" && brief.proposedSelection === "local" && brief.acceptanceExample.includes("offline export"), "brief is scoped, not a frozen spec or approved plan")
  assert(brief.sourceFreshness === "current" && brief.offerId === offered.offer.id && brief.version === 1, "tie projection to stored offer and source evidence")
  assert(Array.isArray(brief.commitments) && brief.commitments.length === 1 &&
    brief.commitments[0].scope === "Next export slice" &&
    brief.commitments[0].question === offered.offer.question &&
    brief.commitments[0].option?.id === "local", "commitment is recorded as scope + question + option")
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
  assert(Array.isArray(brief.revisions) && brief.revisions.length === 2 &&
    brief.revisions[0].offerId === offered.offer.id && brief.revisions[0].superseded === true &&
    brief.revisions[0].supersededByOfferId === revised.offer.id && brief.revisions[0].sourceFreshness === "stale" &&
    brief.revisions[1].offerId === revised.offer.id && brief.revisions[1].superseded === false &&
    brief.revisions[1].sourceFreshness === "current", "revisions preserve full history and isolate stale sourceFreshness to the affected revision")
  assert(call(["status"], cwd).sourceOffers[0].id === oldOffers[0].id, "earlier offer and answer remain accessible")
  assert(call(["status"], cwd).choiceReviewStatus === "no-agent-choices", "source response does not settle independent agent choices")
  call(["start", "A separate documentation idea"], cwd)
  const nextIdea = call(["status"], cwd)
  assert(nextIdea.workingBrief.status === "no-source-offer" && nextIdea.sourceOffers.length === 2,
    "preserve history without promoting an earlier idea's answer to a new working brief")
})

await withTempDir("synth-source-brief-multi-scope-", async (cwd) => {
  await fs.mkdir(path.join(cwd, "docs"))
  await fs.mkdir(path.join(cwd, "src"))
  const exportDoc = path.join(cwd, "docs", "export.md")
  const boardSrc = path.join(cwd, "src", "board.js")
  await fs.writeFile(exportDoc, "# Export\nExport boards to local SVG files.\nExport boards to JSON bundles.\n")
  await fs.writeFile(boardSrc, "export const render = (label, fill = 'none') => `<text fill=\"${fill}\">${label}</text>`\n")
  const offerPath = path.join(cwd, "offer.json")
  call(["start", "Build an SVG specimen board with export and fill controls"], cwd)

  const exportProposal = (line2Quote, supersedesOfferId) => ({
    scope: "Export format",
    question: "Which export format should ship in the first slice?",
    ...(supersedesOfferId ? { supersedesOfferId } : {}),
    options: [
      { id: "svg", label: "Local SVG file", tradeoff: "Direct vector output; no metadata bundle", acceptanceExample: "Exports a .svg file", source: { path: "docs/export.md", line: 2, quote: line2Quote } },
      { id: "json", label: "JSON bundle", tradeoff: "Structured metadata; requires viewer", acceptanceExample: "Exports a .json file", source: { path: "docs/export.md", line: 3, quote: "Export boards to JSON bundles." } },
    ],
  })
  const fillProposal = (supersedesOfferId) => ({
    scope: "Primitive fill",
    question: "How should primitive fill defaults behave?",
    ...(supersedesOfferId ? { supersedesOfferId } : {}),
    options: [
      { id: "none-default", label: "Default fill none", tradeoff: "Preserves existing output", acceptanceExample: "render('A') uses fill=\"none\"", source: { path: "src/board.js", line: 1, quote: "export const render = (label, fill = 'none') => `<text fill=\"${fill}\">${label}</text>`" } },
      { id: "intent-fill", label: "Explicit fill control", tradeoff: "Requires caller argument", acceptanceExample: "render('A', 'red') sets fill", source: { kind: "operator-intent", quote: "Build an SVG specimen board with export and fill controls" } },
    ],
  })

  await fs.writeFile(offerPath, JSON.stringify(exportProposal("Export boards to local SVG files.")))
  const exportOffer1 = call(["clarify", "--source-offer", "offer.json"], cwd).offer

  // A new scope must not set supersedesOfferId.
  await fs.writeFile(offerPath, JSON.stringify(fillProposal(exportOffer1.id)))
  assert(runSynth(["first-contact", "clarify", "--source-offer", "offer.json"], cwd).status !== 0,
    "new scope must reject supersedesOfferId pointing to another scope")

  await fs.writeFile(offerPath, JSON.stringify(fillProposal()))
  const fillOffer = call(["clarify", "--source-offer", "offer.json"], cwd).offer
  // Even after a second scope is offered, the first scope's latest offer remains answerable.
  call(["clarify", "--source-answer", exportOffer1.id, "--selection", "svg", "--human-response", "Synthetic respondent: start with SVG export"], cwd)
  const duringSecondOffer = call(["status"], cwd).workingBrief
  assert(duringSecondOffer.status === "awaiting-response" && duringSecondOffer.commitments.length === 1 &&
    duringSecondOffer.commitments[0].scope === "Export format" && duringSecondOffer.commitments[0].option.id === "svg",
    "offering a second scope preserves the first scope's active commitment")

  call(["clarify", "--source-answer", fillOffer.id, "--selection", "none-default", "--human-response", "Synthetic respondent: keep default fill none"], cwd)
  let brief = call(["status"], cwd).workingBrief
  assert(brief.commitments.length === 2, "both scoped commitments are active")
  assert(brief.commitments[0].scope === "Export format" && brief.commitments[0].option.id === "svg" && brief.commitments[0].sourceFreshness === "current",
    "first commitment intact and current")
  assert(brief.commitments[1].scope === "Primitive fill" && brief.commitments[1].option.id === "none-default" && brief.commitments[1].sourceFreshness === "current",
    "second commitment intact and current")

  // Editing docs/export.md stales only the Export format revision/commitment, not Primitive fill.
  await fs.writeFile(exportDoc, "# Export\nExport boards to standalone SVG files.\nExport boards to JSON bundles.\n")
  brief = call(["status"], cwd).workingBrief
  const exportCommitment = brief.commitments.find((c) => c.scope === "Export format")
  const fillCommitment = brief.commitments.find((c) => c.scope === "Primitive fill")
  assert(exportCommitment?.sourceFreshness === "stale" && fillCommitment?.sourceFreshness === "current",
    "stale sourceFreshness is isolated to the affected commitment")
  assert(brief.revisions[0].sourceFreshness === "stale" && brief.revisions[1].sourceFreshness === "current",
    "stale sourceFreshness is isolated to the affected revision")

  // Revising Export format must supersede exportOffer1.id (latest for Export format), not fillOffer.id.
  await fs.writeFile(offerPath, JSON.stringify(exportProposal("Export boards to standalone SVG files.", fillOffer.id)))
  assert(runSynth(["first-contact", "clarify", "--source-offer", "offer.json"], cwd).status !== 0,
    "revising a scope cannot supersede an offer from a different scope")
  await fs.writeFile(offerPath, JSON.stringify(exportProposal("Export boards to standalone SVG files.")))
  assert(runSynth(["first-contact", "clarify", "--source-offer", "offer.json"], cwd).status !== 0,
    "revising an existing scope requires supersedesOfferId")

  await fs.writeFile(offerPath, JSON.stringify(exportProposal("Export boards to standalone SVG files.", exportOffer1.id)))
  const exportOffer2 = call(["clarify", "--source-offer", "offer.json"], cwd).offer
  brief = call(["status"], cwd).workingBrief
  assert(brief.commitments.length === 1 && brief.commitments[0].scope === "Primitive fill" && brief.commitments[0].option.id === "none-default",
    "revising Export format leaves Primitive fill commitment untouched while Export format awaits a new answer")

  call(["clarify", "--source-answer", exportOffer2.id, "--selection", "json", "--human-response", "Synthetic respondent: switch export slice to JSON bundle"], cwd)
  brief = call(["status"], cwd).workingBrief
  assert(brief.revisions.length === 3 && brief.revisions[0].superseded === true && brief.revisions[0].supersededByOfferId === exportOffer2.id &&
    brief.revisions[1].superseded === false && brief.revisions[2].superseded === false && brief.revisions[2].supersedesOfferId === exportOffer1.id,
    "revision history records superseded and active offers across scopes")
  assert(brief.commitments.length === 2 &&
    brief.commitments.some((c) => c.scope === "Primitive fill" && c.option.id === "none-default" && c.sourceFreshness === "current") &&
    brief.commitments.some((c) => c.scope === "Export format" && c.option.id === "json" && c.sourceFreshness === "current"),
    "revised scope updates its commitment while preserving unaffected commitments")
})
console.log("[PASS] synthetic documentation evidence to versioned provisional working brief")
