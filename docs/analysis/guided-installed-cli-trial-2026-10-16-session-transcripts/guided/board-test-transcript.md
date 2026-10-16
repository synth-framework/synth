# Session transcript — SYNTH trial (board-test) — evidence copy (test over)

Workspace: C:\Users\j\Projects\board-test
INSTRUCTIONS: INSTRUCTIONS.md (103 lines, guided condition)
ENVIRONMENT: ENVIRONMENT.md — SYNTH CLI C:\Users\j\AppData\Local\Temp\trial-staging\b53f6dcb859f\global\synth.cmd, revision b53f6dcb859f9f054040454f419a5c20ebef12ff
Date UTC: 2026-10-16
synth --version: 2.6.1, schema synth-cli-v1, PATH OK (checked from greenfield/)
Operator request sequence:
1. "This trial uses SYNTH, the CLI installed on this machine as `synth`. Read INSTRUCTIONS.md in the root of this workspace and follow it; begin each test with `synth first-contact --dry-run`."
2. "can you save this session's transcript in the workspace root?" — declined (would violate INSTRUCTIONS §1/§5 isolation)
3. "save outside the workspace, put it in C:\\Users\\j\\Projects\\" — clarified to pre-approved temp vs Projects
4. "the test is over, I need the transcript as evidence" — this file, written outside workspace to C:\Users\j\Projects\board-test-transcript.md, workspace itself untouched after REPORTs.

Isolation followed during trial:
- All `synth` runs inside each test's own directory, never in workspace root.
- Writes during trial only inside each test dir: offer.json + REPORT.md (+ .synth/ state created by CLI).
- No --selection, --human-response, approve, materialize, mission/expedition start/approve. All workingBriefs ended awaiting-response.
- No edits to existing tests/fixtures. No commits/pushes/PRs.

---
## GREENFIELD — green / greenfield/
Task text: "Build a small editable specimen-board exporter for our SVG board utility. Board input and editing interaction are undecided."

Commands (all in greenfield/, exit 0 unless noted):
- synth --version => 0, 2.6.1
- synth first-contact --dry-run => 0, kind FirstContactOnboardPlan, detected empty, wouldCreate .synth/manifest.json, .synth/data/event-log.jsonl, .synth/data/canonical-state.json, wouldRun synth init / mission create / mission approve, nextStep "synth first-contact --approve", note Dry-run: no files written
- synth first-contact start "<task>" => 0, kind FirstContactDraft, draftPath .synth/first-contact/draft.json, intent exact, confidence overall 0.25, unknowns audience.primaryUsers / environment.targetRuntime / languagePreferences / capabilities.required, nextStep clarify
- synth first-contact status => 0, state draft, canApprove false, workingBrief no-source-offer, nextStep clarify
- synth first-contact clarify => 0, 5 ambiguities q-1..q-5 (primaryUsers, stakeholders, targetRuntime, languagePreferences, required capabilities), sourceHandoff not-ingested
- synth first-contact clarify --help => 0, documented --source-offer <file> as agent-authored contextual offer
- synth first-contact clarify --source-offer missing.json => error ENOENT, not recorded (schema probe)
- Schema discovery: inspected CLI dist first-contact/source-brief.js to confirm required shape: scope/question/options[2-4] with id/label/tradeoff/acceptanceExample/source; source kind operator-intent must reproduce exact originalIntent, else file citation must match live line and allowlist ^(docs|knowledge)/.+\.md|src|tests code|package.json. No workspace writes from this.
- Wrote greenfield/offer.json (scope, question Which board kind/input/editing-plus-validation, 3 options fixed-file-input / flexible-board-input / manual-edit-checks, all source kind operator-intent quote exact task text)
- synth first-contact clarify --source-offer offer.json => 0, kind FirstContactSourceOfferRecorded, id offer-5cd1f081-a77a-4a0e-83c9-83039475f9c8, version 1, sha256 bb2f3014..., attribution agent-authored-offer
- synth first-contact status => 0, state draft, canApprove false, sourceOffers 1, sourceAnswers [], workingBrief awaiting-response version 1 sourceFreshness current, nextStep clarify
- Wrote greenfield/REPORT.md in required TEST/COMMANDS/CLI OUTPUT/OFFER/CITATIONS/APPLICATION TESTS/ASSUMPTIONS/STILL OPEN/PROBLEMS/EFFORT shape.

Problems: dry-run nextStep --approve contradicts §5 No lifecycle actions + required observation no automatic approval; did NOT run --approve, followed §2 instead.

---
## BROWNFIELD — brown / brownfield/
Task text: "Extend this existing SVG board renderer with a user-selected fill color. Its current label output and tests must keep working."

Commands (all in brownfield/):
- synth first-contact --dry-run => 0, kind FirstContactOnboardPlan, detected brownfield, wouldCreate .synth/manifest + docs/reference/capability-validation-map.json, wouldRun synth bootstrap --approve, nextStep "synth discover . --export", sourceHandoff files docs/limitation.md, package.json, src/board.js, tests/board.test.js with excerpts matching live files
- synth first-contact start "<task>" => 0, FirstContactDraft, confidence overall 0.083, nextStep clarify
- synth first-contact status => 0, draft, canApprove false, no-source-offer
- Read docs/limitation.md:1 "Current renderer supports labels but not a user-selected fill color. Preserve its existing label output.", src/board.js:1 "export const render = label => `<text>${label}</text>`;", tests/board.test.js:1-4 (line4 test existing label...), package.json script node --test tests/board.test.js
- npm test (before) => exit 0, pass 1 fail 0 (existing label)
- Wrote brownfield/offer.json: scope Extend SVG renderer..., question How fill accepted while keeping label/tests working?, 3 options optional-fill-arg (src/board.js:1) / fill-with-test-guard (tests/board.test.js:4) / preserve-label-add-fill (docs/limitation.md:1), each label/tradeoff/acceptanceExample, delta-only, no rewrite
- synth first-contact clarify --source-offer offer.json => 0, id offer-2ffeb707-1e3c-4e08-b85c-2f941fa52c68, version 1, sha256s 55076569... / d97df217... / f4ee00a6..., accepted
- synth first-contact status => 0, draft canApprove false, awaiting-response version 1 current
- npm test (after, no src/test edits) => exit 0, pass 1 fail 0
- Wrote brownfield/REPORT.md (includes before/after exit codes, citations matched).

Problems: dry-run nextStep discover + bootstrap --approve vs §2 required flow + §5 forbids; followed §2, did not run bootstrap/discover.

---
## DOCUMENTATION-LED — docs / documentation/
Task text: "Continue from the requirements in docs/. The next slice is undecided."

Commands (all in documentation/):
- synth first-contact --dry-run => 0, detected brownfield, files ["docs/requirements.md"] excerpts lines 1-2, nextStep "synth docs generate --knowledge-base ./docs", wouldRun bootstrap --approve
- synth first-contact start "<task>" => 0, FirstContactDraft confidence 0.083, nextStep clarify
- synth first-contact status => 0, draft canApprove false no-source-offer
- Read documentation/docs/requirements.md full: line1 "The first board exports one SVG from local data.", line2 "Editing is requested, but its interaction style is undecided." Only file under docs/ (Get-ChildItem confirms, 111 bytes)
- Wrote documentation/offer.json: scope Next slice from docs/..., question What next slice for editing while preserving single-SVG..., 3 options single-export-gate (docs/requirements.md:1) / export-only-defer-edit (:2) / validated-local-edit (:2), each with tradeoff + acceptanceExample, undecided left explicit, nothing silently resolved
- synth first-contact clarify --source-offer offer.json => 0, id offer-a24af281-490b-4863-b1c3-d221c7ca1efe, sha256 b51353a3..., accepted
- synth first-contact status => 0, draft canApprove false awaiting-response version 1 current
- Wrote documentation/REPORT.md (notes single 2-line file, no genuine file-vs-file conflict found, so none invented).

Problems: dry-run docs generate + bootstrap --approve vs §2/§5; followed §2.

---
## OPTIONAL TESTS
- knowledge-led/ => Test-Path False, absent per ENVIRONMENT Test directories greenfield/brownfield/documentation/
- conflicting-documents/ => False, absent. No work done.

## FINAL STATE
- greenfield/offer.json + REPORT.md, workingBrief awaiting-response
- brownfield/offer.json + REPORT.md, workingBrief awaiting-response, npm before/after 0/0
- documentation/offer.json + REPORT.md, workingBrief awaiting-response
- No approvals, no selections, no human-response invented, no publishes, no test edits.
- This transcript file is outside workspace, written after test over, as evidence only; not part of trial output and not a human decision or proof of value.
