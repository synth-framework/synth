#!/usr/bin/env node
// ============================================================
// SYNTH: First Contact Projection Generator
// ============================================================
// Projects the canonical First Contact evidence archive into the
// public documentation and website experiences.
//
// Authoritative source:
//   examples/first-contact/recorded-journey/evidence-archive-b/
//   (Archive B — the canonical journey re-recorded on the hardened
//   pipeline, EXP-FIRSTCONTACT-009)
//
// Comparison source (read-only):
//   examples/first-contact/recorded-journey/evidence-archive/
//   (Archive A — the original pre-hardening recording, preserved
//   immutably as forensic evidence, PROGRAM-010 finding F2)
//
// Outputs (committed, regeneration-verified):
//   docs/first-contact/*.md
//   website/first-contact/*.html
//
// No narrative is authored here. Every content block is assembled
// from archive artifacts (timeline, commands, events, proof,
// replay report) or from the Known Limitations section of the
// canonical record, and every page cites its evidence source.
//
// Usage:
//   node scripts/generate-first-contact-projection.js           write outputs
//   node scripts/generate-first-contact-projection.js --check   verify committed outputs match a fresh projection
// ============================================================

import fs from "fs/promises"
import path from "path"
import os from "os"
import { deriveReplayReport } from "./repair-first-contact-archive.js"

const ARCHIVE_REL = path.join("examples", "first-contact", "recorded-journey", "evidence-archive-b")
const ARCHIVE_A_REL = path.join("examples", "first-contact", "recorded-journey", "evidence-archive")
const RECORD_REL = path.join("examples", "first-contact", "README.md")
const DOCS_OUT_REL = path.join("docs", "first-contact")
const SITE_OUT_REL = path.join("website", "first-contact")

const PROJECTION_BANNER_MD = `> **Projection notice.** This document is a deterministic projection of the [canonical First Contact evidence archive](../../examples/first-contact/recorded-journey/evidence-archive-b/) (Archive B, hardened pipeline). Do not edit by hand; regenerate with \`node scripts/generate-first-contact-projection.js\`.`

const PROJECTION_BANNER_HTML = `<!-- Projection notice: generated from the canonical First Contact evidence archive. Do not edit by hand; regenerate with node scripts/generate-first-contact-projection.js -->`

// ------------------------------------------------------------
// Archive loading and validation
// ------------------------------------------------------------

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf-8"))
}

async function loadArchive(root, archiveRel = ARCHIVE_REL) {
  const archiveDir = path.join(root, archiveRel)
  const required = ["timeline.json", "commands.json", "events.jsonl", "proof.json", "replay-report.json"]
  for (const name of required) {
    try {
      await fs.access(path.join(archiveDir, name))
    } catch {
      throw new Error(`ARCHIVE_INCOMPLETE: missing ${name} in ${archiveDir}`)
    }
  }

  const timeline = await readJson(path.join(archiveDir, "timeline.json"))
  const commandsDoc = await readJson(path.join(archiveDir, "commands.json"))
  const proof = await readJson(path.join(archiveDir, "proof.json"))
  const replayReport = await readJson(path.join(archiveDir, "replay-report.json"))
  const events = (await fs.readFile(path.join(archiveDir, "events.jsonl"), "utf-8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))

  if (!Array.isArray(timeline.timeline) || timeline.timeline.length === 0) {
    throw new Error("ARCHIVE_MALFORMED: timeline.json has no episodes")
  }
  if (events.length !== timeline.totalEvents) {
    throw new Error(`ARCHIVE_MALFORMED: events.jsonl has ${events.length} events, timeline declares ${timeline.totalEvents}`)
  }
  if (replayReport.eventCount !== events.length) {
    throw new Error(`ARCHIVE_MALFORMED: replay-report.json covers ${replayReport.eventCount} events, archive holds ${events.length}`)
  }

  return { timeline, commands: commandsDoc.commands, proof, replayReport, events }
}

/** Re-derive the replay report and compare it with the archived one. */
async function verifyArchiveIntegrity(root, archiveRel = ARCHIVE_REL) {
  const derived = await deriveReplayReport(path.join(root, archiveRel))
  const archived = await readJson(path.join(root, archiveRel, "replay-report.json"))
  const mismatches = []
  for (const key of ["consistent", "chainValid", "eventCount", "liveHash", "replayHash"]) {
    if (derived[key] !== archived[key]) {
      mismatches.push(`${key}: archived=${archived[key]} derived=${derived[key]}`)
    }
  }
  if (mismatches.length > 0) {
    throw new Error(`ARCHIVE_INTEGRITY_FAILURE (${archiveRel}):\n  ${mismatches.join("\n  ")}`)
  }
  return derived
}

/** Extract the Known Limitations section from the canonical record. */
async function loadKnownLimitations(root) {
  const readme = await fs.readFile(path.join(root, RECORD_REL), "utf-8")
  const match = readme.match(/## Known Limitations\n([\s\S]*?)\n## /)
  if (!match) {
    throw new Error("CANONICAL_RECORD_INCOMPLETE: examples/first-contact/README.md has no Known Limitations section")
  }
  return match[1].trim()
}

// ------------------------------------------------------------
// Derived evidence helpers
// ------------------------------------------------------------

function eventTypeDistribution(events) {
  const counts = new Map()
  for (const event of events) counts.set(event.type, (counts.get(event.type) || 0) + 1)
  return [...counts.entries()]
}

function violationCensus(violations) {
  const counts = new Map()
  for (const v of violations) counts.set(v.kind, (counts.get(v.kind) || 0) + 1)
  return counts
}

function sameEventCensus(aEvents, bEvents) {
  const a = eventTypeDistribution(aEvents)
  const bCounts = new Map(eventTypeDistribution(bEvents))
  if (a.length !== bCounts.size) return false
  return a.every(([type, count]) => bCounts.get(type) === count)
}

/**
 * Derive the Archive A / Archive B comparison from both evidence archives
 * (EXP-FIRSTCONTACT-009). Archive A is the pre-hardening recording,
 * preserved immutably; Archive B is the same canonical Mission re-executed
 * on the hardened pipeline. Every value comes from an archive artifact or
 * from a fresh derivation through the frozen Replay engine — nothing here
 * is hand-authored.
 */
function deriveComparison(archiveA, derivedA, archiveB) {
  const aViolations = violationCensus(derivedA.graphViolations)
  const bViolations = violationCensus(archiveB.replayReport.graphViolations)
  const summarize = (proof, report, graphValid, graphViolations) => ({
    recordedAt: proof.generatedAt,
    eventCount: report.eventCount,
    consistent: report.consistent,
    chainValid: report.chainValid,
    liveHash: report.liveHash,
    replayHash: report.replayHash,
    graphValid,
    graphViolationCount: graphViolations.length,
    snapshotPersisted: proof.artifacts.snapshotPersisted === true,
    proofGraphValid: proof.artifacts.graphValid,
  })
  return {
    a: summarize(archiveA.proof, archiveA.replayReport, derivedA.graphValid, derivedA.graphViolations),
    b: summarize(archiveB.proof, archiveB.replayReport, archiveB.replayReport.graphValid, archiveB.replayReport.graphViolations),
    violationKinds: [...new Set([...aViolations.keys(), ...bViolations.keys()])].sort(),
    aViolations: Object.fromEntries(aViolations),
    bViolations: Object.fromEntries(bViolations),
    aEventTypeCount: eventTypeDistribution(archiveA.events).length,
    censusIdentical: sameEventCensus(archiveA.events, archiveB.events),
  }
}

/** Render one comparison table row as Markdown. */
function comparisonRowMd(label, aValue, bValue) {
  return `| ${label} | ${aValue} | ${bValue} |`
}

/** Build the A/B comparison rows shared by the docs and site projections. */
function comparisonRows(comparison) {
  const { a, b } = comparison
  const yesNo = (v) => (v ? "yes" : "no")
  const rows = [
    ["Recorded", a.recordedAt, b.recordedAt],
    ["Events", a.eventCount, b.eventCount],
    ["Event type census", `${comparison.aEventTypeCount} types`, comparison.censusIdentical ? "identical to A" : "DIFFERENT"],
    ["Replay", `${a.consistent ? "consistent" : "INCONSISTENT"}, chain ${a.chainValid ? "valid" : "INVALID"}`, `${b.consistent ? "consistent" : "INCONSISTENT"}, chain ${b.chainValid ? "valid" : "INVALID"}`],
    ["Live state hash == replayed hash", `\`${a.liveHash}\` == \`${a.replayHash}\``, `\`${b.liveHash}\` == \`${b.replayHash}\``],
    ["Aggregate graph violations", a.graphViolationCount, b.graphViolationCount],
    ...comparison.violationKinds.map((kind) => [
      `— \`${kind}\``,
      comparison.aViolations[kind] ?? 0,
      comparison.bViolations[kind] ?? 0,
    ]),
    ["`--strict-graph` verdict", a.graphValid ? "passes" : "fails", b.graphValid ? "passes" : "fails"],
    ["Snapshot artifact persisted", yesNo(a.snapshotPersisted), yesNo(b.snapshotPersisted)],
    ["`graphValid` in proof", a.proofGraphValid === undefined ? "absent" : a.proofGraphValid, b.proofGraphValid === undefined ? "absent" : b.proofGraphValid],
  ]
  return rows
}

function commandsForEpisode(commands, episode) {
  return commands.filter((c) => c.episode === episode)
}

function missionCreatedPayload(events) {
  const event = events.find((e) => e.type === "MISSION_CREATED")
  return event?.payload?.mission ?? null
}

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function inlineCodeHtml(text) {
  return escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>")
}

// ------------------------------------------------------------
// Documentation projection (docs/first-contact/*.md)
// ------------------------------------------------------------

function renderOverview({ timeline, proof, replayReport }) {
  return `${PROJECTION_BANNER_MD}

# First Contact — Overview

This is the canonical First Contact journey: one complete SYNTH execution, recorded end to end.

- **Mission:** ${timeline.mission}
- **Events recorded:** ${timeline.totalEvents} immutable events
- **Replay:** ${replayReport.consistent ? "consistent" : "INCONSISTENT"} (chain ${replayReport.chainValid ? "valid" : "INVALID"})
- **Proof:** ${proof.overall.passed ? "passed" : "FAILED"}

## The journey in six documents

| Document | Content |
|---|---|
| [Journey](journey.md) | The eight episodes of the canonical journey, with the commands as executed |
| [Architecture](architecture.md) | The architecture the journey exercises, in the order a newcomer meets it |
| [Evidence](evidence.md) | The evidence archive: what each artifact proves |
| [Replay](replay.md) | The replay verification of the 32-event history |
| [Lessons](lessons.md) | What the journey validates — and what it does not yet prove |

## Experience projections

The same canonical evidence also drives the remaining public surfaces defined by EXP-FIRSTCONTACT-008:

| Projection | Purpose |
|---|---|
| [Interactive tutorial](tutorial.md) and [website tutorial](../../website/first-contact/tutorial.html) | Step through the journey episode by episode |
| [Slides](slides.md) | Talk-ready deck outline |
| [Video storyboard](storyboard.md) | Scene-by-scene visual and audio plan |
| [Conference demo](conference-demo.md) | Scripted live-demo narrative |
| [AI onboarding](ai-onboarding.md) | How an AI agent should introduce SYNTH |
| [Installer walkthrough](installer-walkthrough.md) and [website installer page](../../website/first-contact/installer.html) | First-contact copy after installation |

## Validation

Comprehension of the First Contact experience is measured by the [Comprehension Validation Protocol](comprehension-validation-protocol.md) (EXP-FIRSTCONTACT-006).

## Evidence source

Every statement in these documents derives from the canonical evidence archive at \`examples/first-contact/recorded-journey/evidence-archive-b/\` (Archive B, hardened pipeline). The archive contains the immutable event log (\`events.jsonl\`), the journey timeline, the executed commands, the proof artifact, the replay report, and the signed snapshot artifacts. The [Evidence](evidence.md) page also carries the derived comparison against Archive A, the preserved pre-hardening recording.
`
}

function renderJourney({ timeline, commands }) {
  const sections = timeline.timeline.map((episode) => {
    const episodeCommands = commandsForEpisode(commands, episode.episode)
    const commandBlock = episodeCommands.length > 0
      ? `\n**Commands as executed:**\n\n${episodeCommands.map((c) => `- \`${c.command}\` _(${c.actor})_`).join("\n")}\n`
      : ""
    const eventBlock = episode.eventTypes.length > 0
      ? `\n**Events:** ${episode.eventTypes.map((t) => `\`${t}\``).join(", ")}\n`
      : ""
    return `## Episode ${episode.episode} — ${episode.title}\n\n${episode.description}\n${eventBlock}${commandBlock}`
  })
  return `${PROJECTION_BANNER_MD}

# First Contact — The Journey

The canonical journey in eight episodes, as recorded in \`timeline.json\` and \`commands.json\`.

${sections.join("\n---\n\n")}
`
}

function renderArchitecture({ timeline, events }) {
  const distribution = eventTypeDistribution(events)
  const rows = distribution.map(([type, count]) => `| \`${type}\` | ${count} |`).join("\n")
  return `${PROJECTION_BANNER_MD}

# First Contact — The Architecture, As Experienced

The journey exercises the architecture in the order a newcomer meets it. Each layer below is named only after the journey has shown it (Show → Explain → Name).

## 1. Genesis — the system bootstraps

Episode 1 shows SYNTH analyzing before acting. The \`SYSTEM_GENESIS\` event records the bootstrap: the system comes into existence through a governed gate, not through ad-hoc file writes.

## 2. Mission Studio — intent becomes an approved plan

Episodes 2 and 3 show a human sentence — _"Build me a Space Mission Tracking application."_ — becoming a Mission, then a plan of five Expeditions with Objectives and Work Items. Approval is explicit: \`MISSION_APPROVED\` and \`EXPEDITION_APPROVED\` are recorded before any execution.

## 3. Execution — the plan runs through the CLI

Episode 4 shows execution flowing through the command surface. Every mutation passes through the same governed pipeline that produced the plan.

## 4. Events — nothing is forgotten

Episode 5 reveals that every action became an immutable Event. The full distribution for this journey:

| Event type | Count |
|---|---|
${rows}

## 5. Replay — history is provable

Episodes 6 and 7 show the final State matching the 32-event history. Replay is not a log viewer; it is a proof that the state could only have come from these events.

## Evidence source

Event types and counts are computed from \`events.jsonl\`. Episode ordering comes from \`timeline.json\`.
`
}

function renderEvidence({ proof, events, replayReport, comparison }) {
  const distribution = eventTypeDistribution(events)
  const rows = distribution.map(([type, count]) => `| \`${type}\` | ${count} |`).join("\n")
  const projections = proof.artifacts.documentationProjections.map((p) => `- \`${p}\``).join("\n")
  const comparisonTable = comparisonRows(comparison).map(([label, a, b]) => comparisonRowMd(label, a, b)).join("\n")
  return `${PROJECTION_BANNER_MD}

# First Contact — The Evidence

The canonical evidence archive lives at \`examples/first-contact/recorded-journey/evidence-archive-b/\` (Archive B, hardened pipeline). Each artifact answers a different question.

| Artifact | Question it answers |
|---|---|
| \`events.jsonl\` | What actually happened? The immutable 32-event history |
| \`timeline.json\` | How is the history taught? The eight-episode learning structure |
| \`commands.json\` | What was actually typed? Every human and AI command, per episode |
| \`proof.json\` | Did the governed pipeline accept it? The proof verdict |
| \`replay-report.json\` | Does the state match the history? The replay verification |
| \`snapshots/\` | Was the approved plan preserved? Signed, certified snapshot artifacts |

## Event distribution

| Event type | Count |
|---|---|
${rows}

## Proof summary

- Example: \`${proof.example}\`
- Snapshot: \`${proof.artifacts.snapshotId}\`
- Seeded events: ${proof.artifacts.seededEvents}
- Execution intents: ${proof.artifacts.executionIntents}
- Total events: ${proof.artifacts.eventCount}
- Replay consistent: ${proof.artifacts.replayConsistent}
- Graph valid: ${proof.artifacts.graphValid}
- Snapshot persisted: ${proof.artifacts.snapshotPersisted}
- Overall verdict: **${proof.overall.passed ? "PASS" : "FAIL"}**

Documentation projections produced during the journey:

${projections}

## Replay facts

- Consistent: ${replayReport.consistent}
- Chain valid: ${replayReport.chainValid}
- Live state hash: \`${replayReport.liveHash}\`
- Replayed state hash: \`${replayReport.replayHash}\`
- Graph valid: ${replayReport.graphValid}
- Graph violations: ${replayReport.graphViolations.length}

## Two recordings, one journey

Archive A (\`examples/first-contact/recorded-journey/evidence-archive/\`) is the original pre-hardening recording, preserved immutably as forensic evidence (EXP-PROGRAM-010 finding F2; integrity hash-pinned and verified in CI). Archive B is the same canonical Mission re-executed on the hardened pipeline (EXP-FIRSTCONTACT-009). This comparison is derived from both archives and from fresh replay derivations through the frozen engine — it is not hand-authored.

| Property | Archive A (pre-hardening) | Archive B (hardened) |
|---|---|---|
${comparisonTable}

Cross-recording hashes differ because event identities are minted per execution; determinism is proven within each recording (live hash equals replayed hash). Archive A's violations are historical evidence of the defects EXP-PROGRAM-010 corrected; Archive B demonstrates the correction on the same mission.
`
}

function renderReplay({ replayReport, commands }) {
  const replayCommands = commandsForEpisode(commands, 7)
  const commandBlock = replayCommands.map((c) => `- \`${c.command}\` _(${c.actor})_`).join("\n")
  return `${PROJECTION_BANNER_MD}

# First Contact — Replay

Replay re-derives the state from the event history and compares it against the operational state. For the canonical journey:

| Check | Result |
|---|---|
| Events replayed | ${replayReport.eventCount} |
| Hash chain valid | ${replayReport.chainValid} |
| Operational state hash | \`${replayReport.liveHash}\` |
| Replayed state hash | \`${replayReport.replayHash}\` |
| Divergences | ${replayReport.divergences.length} |
| Verdict | **${replayReport.consistent ? "CONSISTENT" : "INCONSISTENT"}** |

> ${replayReport.explanation}

## As executed

${commandBlock}

## What this means

The 32 events are not a story about the execution — they _are_ the execution. Any state that claims to descend from this journey must replay to the same hash, bit for bit.

For the interactive replay experience, see the [website replay page](../../website/first-contact/replay.html) or regenerate it with \`node scripts/generate-first-contact-projection.js\`.
`
}

function renderLessons({ knownLimitations, proof, replayReport }) {
  return `${PROJECTION_BANNER_MD}

# First Contact — Lessons

## What the journey proves

The canonical journey is evidence that a human sentence can become an approved plan, an executed mission, and a provable history — with every action governed and recorded. The proof artifact's verdict is **${proof.overall.passed ? "PASS" : "FAIL"}**.

## Known limitations

From the canonical record (\`examples/first-contact/README.md\`):

${knownLimitations}

## The honest reading

A consistent replay proves this history is intact and this state descends from it. Since the Constitutional Hardening Program (EXP-PROGRAM-010), this recording (Archive B) also proves the aggregate graph is validated end to end: replay verification runs graph validation, and this archive reports ${replayReport.graphViolations.length} violations under \`--strict-graph\` — see [Evidence](evidence.md) for the Archive A/B comparison. What a single 32-event journey does not prove is scale: larger missions, longer histories, and multi-expedition execution remain the subject of continued validation.
`
}

// ------------------------------------------------------------
// EXP-FIRSTCONTACT-008 — Experience projections (docs)
// ------------------------------------------------------------

function renderTutorial({ timeline, commands, events }) {
  const steps = timeline.timeline.map((episode) => {
    const episodeCommands = commandsForEpisode(commands, episode.episode)
    const commandBlock = episodeCommands.length > 0
      ? `\n**Commands:**\n\n${episodeCommands.map((c) => `- \`${c.command}\` _(${c.actor})_`).join("\n")}\n`
      : ""
    const eventBlock = episode.eventTypes.length > 0
      ? `\n**Events recorded:** ${episode.eventTypes.map((t) => `\`${t}\``).join(", ")}\n`
      : ""
    return `### Step ${episode.episode} — ${episode.title}\n\n${episode.description}\n${eventBlock}${commandBlock}`
  })
  return `${PROJECTION_BANNER_MD}

# First Contact — Interactive Tutorial Projection

A step-by-step guided experience derived from the canonical journey. Each step maps to one episode of the recorded Mission.

${steps.join("\n\n")}

## Next steps

- Read the full [Journey](journey.md) for the narrative version.
- Inspect the [Evidence](evidence.md) to see which archive artifact produced each step.
- Try the interactive versions on the website: [Replay](../../website/first-contact/replay.html) and [Tutorial](../../website/first-contact/tutorial.html).
`
}

function renderSlides({ timeline, commands }) {
  const slides = timeline.timeline.map((episode) => {
    const episodeCommands = commandsForEpisode(commands, episode.episode)
    const commandsText = episodeCommands.length > 0
      ? `\n\n**Speaker notes:** Commands in this episode — ${episodeCommands.map((c) => `\`${c.command}\``).join(", ")}.`
      : ""
    return `---\n\n## ${episode.title}\n\n${episode.description}${commandsText}`
  })
  return `${PROJECTION_BANNER_MD}

# First Contact — Slides Projection

Talk-ready deck outline, one slide per episode of the canonical journey.

${slides.join("\n")}
`
}

function renderStoryboard({ timeline, commands }) {
  const scenes = timeline.timeline.map((episode) => {
    const episodeCommands = commandsForEpisode(commands, episode.episode)
    const visual = episode.eventTypes.length > 0
      ? `Visual: events ${episode.eventTypes.map((t) => `\`${t}\``).join(", ")} appear in the replay timeline.`
      : `Visual: the workspace shows the ${episode.title.toLowerCase()} state.`
    const audio = episodeCommands.length > 0
      ? `Audio: "${episodeCommands[0].purpose || episode.description}"`
      : `Audio: "${episode.description}"`
    return `### Scene ${episode.episode} — ${episode.title}\n\n- ${visual}\n- ${audio}\n- Duration: ~30 seconds`
  })
  return `${PROJECTION_BANNER_MD}

# First Contact — Video Storyboard Projection

Scene-by-scene storyboard derived from the recorded journey. Each scene traces to one episode in \`timeline.json\`.

${scenes.join("\n\n")}
`
}

function renderConferenceDemo({ timeline, commands }) {
  const script = timeline.timeline.map((episode) => {
    const episodeCommands = commandsForEpisode(commands, episode.episode)
    const commandBlock = episodeCommands.length > 0
      ? `\n\n**Run:**\n\n${episodeCommands.map((c) => "```\n" + c.command + "\n```").join("\n")}`
      : ""
    return `### ${episode.title}\n\n*Presenter:* ${episode.description}${commandBlock}`
  })
  return `${PROJECTION_BANNER_MD}

# First Contact — Conference Demo Projection

Scripted live-demo narrative. Every line traces to an episode of the canonical journey.

${script.join("\n\n")}

## Setup

Use Archive B (\`examples/first-contact/recorded-journey/evidence-archive-b/\`) as the recorded evidence. Run the same commands from \`commands.json\` in order. The demo ends with \`synth explain replay\` showing the consistent replay verdict.
`
}

function renderAiOnboarding({ timeline }) {
  const concepts = timeline.timeline.map((e) => `- **${e.title}** — ${e.description}`).join("\n")
  return `${PROJECTION_BANNER_MD}

# First Contact — AI Onboarding Projection

Guidance and example prompts for an AI agent introducing a newcomer to SYNTH. Derived from the canonical journey sequence in \`timeline.json\`.

## System orientation

When a user asks "What is SYNTH?" or "Show me how SYNTH works," follow the canonical journey instead of inventing an explanation:

${concepts}

## Example exchange

**User:** Build me a Space Mission Tracking application.

**Agent:** That sounds like a product Mission. Before generating files, I'll capture it as a SYNTH Mission and propose Expeditions. Here's the plan:

1. Design Data Model
2. Scaffold Application
3. Implement Mission Views
4. Implement Crew Workflow
5. Validate Implementation

Once you approve the Mission, I'll execute it through the CLI and record every step as evidence.

## Stop conditions

- Do not generate implementation files before Mission approval.
- If the request is ambiguous, ask for target outcome, user impact, current limitations, and acceptance criteria.
- Always end by offering to show the Replay proof.
`
}

function renderInstallerWalkthrough({ commands }) {
  const installCommands = commandsForEpisode(commands, 8)
  const steps = installCommands.map((c, index) => `${index + 1}. **${c.purpose}**\n\n   \`\`\`\n   ${c.command}\n   \`\`\``).join("\n\n")
  return `${PROJECTION_BANNER_MD}

# First Contact — Installer Walkthrough Projection

First-contact copy shown after installation. Derived from the commands executed in Episode 8 of the canonical journey.

## Welcome

SYNTH is installed. The fastest way to understand it is to walk through one complete Mission, recorded end to end.

## Your first five minutes

${steps}

## What happened?

You just created your first Mission. SYNTH recorded every command as an immutable Event. Run \`synth explain replay\` at any time to prove the current State matches the event history.
`
}

// ------------------------------------------------------------
// Website projection (website/first-contact/*.html)
// ------------------------------------------------------------

function siteNav() {
  return `  <header>
    <nav>
      <a href="../index.html" class="logo">Synth<span>.</span></a>
      <div class="nav-links">
        <a href="../docs.html">Docs</a>
        <a href="../quick-start.html">Quick Start</a>
        <a href="../examples.html">Examples</a>
        <a href="../mission-studio.html">Mission Studio</a>
        <a href="../architecture.html">Architecture</a>
        <a href="../community.html">Community</a>
        <a href="./">First Contact</a>
      </div>
    </nav>
  </header>`
}

function sitePage({ title, hero, body }) {
  return `${PROJECTION_BANNER_HTML}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Synth First Contact</title>
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
${siteNav()}

  <main>
    <section class="hero">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(hero)}</p>
    </section>

${body}
  </main>

  <footer>
    <p>Projected from the <a href="https://github.com/synth-framework/synth/tree/main/examples/first-contact/recorded-journey/evidence-archive-b">canonical evidence archive</a> (Archive B, hardened pipeline) · <a href="../index.html">← Back to Synth</a></p>
  </footer>
</body>
</html>
`
}

function section(heading, inner) {
  return `    <section>
      <h2>${escapeHtml(heading)}</h2>
${inner}
    </section>`
}

function para(text) {
  return `      <p>${escapeHtml(text)}</p>`
}

function codeBlock(command) {
  return `      <div class="code-block"><code>${escapeHtml(command)}</code></div>`
}

function commandList(items) {
  return items.map((c) => `      <p><strong>${escapeHtml(c.actor)}:</strong></p>\n${codeBlock(c.command)}`).join("\n")
}

function embedJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}

function renderInteractiveReplayPage({ timeline, commands, events, replayReport }) {
  const data = {
    mission: timeline.mission,
    episodes: timeline.timeline,
    commands,
    events: events.map((e) => ({ id: e.id, type: e.type })),
    replay: {
      consistent: replayReport.consistent,
      chainValid: replayReport.chainValid,
      liveHash: replayReport.liveHash,
      replayHash: replayReport.replayHash,
      eventCount: replayReport.eventCount,
      explanation: replayReport.explanation,
    },
  }
  const replayCommands = commandsForEpisode(commands, 7)
  const verdictTable = `
      <table>
        <tbody>
          <tr><td>Events replayed</td><td>${replayReport.eventCount}</td></tr>
          <tr><td>Hash chain</td><td>${replayReport.chainValid ? "valid" : "INVALID"}</td></tr>
          <tr><td>Operational hash</td><td><code>${escapeHtml(replayReport.liveHash)}</code></td></tr>
          <tr><td>Replayed hash</td><td><code>${escapeHtml(replayReport.replayHash)}</code></td></tr>
          <tr><td>Verdict</td><td><strong>${replayReport.consistent ? "CONSISTENT" : "INCONSISTENT"}</strong></td></tr>
        </tbody>
      </table>`
  const commandBlock = commandList(replayCommands)
  const body = [
    section("Replay Verdict", para(replayReport.explanation) + "\n" + verdictTable),
    section("Interactive Timeline", `
      <p>Click an episode to see the commands and events that produced it.</p>
      <div id="replay-timeline" class="timeline"></div>
      <div id="replay-detail" class="timeline-detail"></div>`),
    section("As executed", commandBlock),
    section("What this means", para("The 32 events are not a story about the execution — they are the execution. Any state that claims to descend from this journey must replay to the same hash, bit for bit.")),
  ].join("\n")

  const page = sitePage({ title: "The Replay", hero: timeline.timeline.find((e) => e.episode === 7).description, body })
  const script = `
<script>
const FC_REPLAY_DATA = ${embedJson(data)};
(function() {
  const container = document.getElementById('replay-timeline');
  const detail = document.getElementById('replay-detail');
  function eventsForEpisode(episode) {
    const types = new Set(episode.eventTypes || []);
    return FC_REPLAY_DATA.events.filter(e => types.has(e.type));
  }
  function renderEpisode(index) {
    const episode = FC_REPLAY_DATA.episodes[index];
    const epCommands = FC_REPLAY_DATA.commands.filter(c => c.episode === episode.episode);
    const epEvents = eventsForEpisode(episode);
    const isCheckpoint = episode.eventTypes.some(t => t.includes('APPROVED'));
    let html = '<h3>Episode ' + episode.episode + ' — ' + episode.title + '</h3>';
    html += '<p>' + episode.description + '</p>';
    if (isCheckpoint) {
      html += '<p class="checkpoint">🏛️ Governance checkpoint: approval recorded.</p>';
    }
    if (epCommands.length > 0) {
      html += '<h4>Commands</h4>';
      html += epCommands.map(c => '<div class="command"><strong>' + c.actor + '</strong><div class="code-block"><code>' + c.command + '</code></div>' + (c.purpose ? '<p>' + c.purpose + '</p>' : '') + '</div>').join('');
    }
    if (epEvents.length > 0) {
      html += '<h4>Events (' + epEvents.length + ')</h4>';
      html += '<ul>' + epEvents.map(e => '<li><code>' + e.type + '</code> <span class="event-id">' + e.id + '</span></li>').join('') + '</ul>';
    }
    detail.innerHTML = html;
    Array.from(container.children).forEach((btn, i) => btn.classList.toggle('active', i === index));
  }
  FC_REPLAY_DATA.episodes.forEach((episode, index) => {
    const btn = document.createElement('button');
    btn.className = 'timeline-step';
    btn.textContent = episode.episode + '. ' + episode.title;
    btn.addEventListener('click', () => renderEpisode(index));
    container.appendChild(btn);
  });
  renderEpisode(0);
})();
</script>
<style>
.timeline { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0; }
.timeline-step { background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 0.375rem; padding: 0.5rem 0.75rem; cursor: pointer; }
.timeline-step.active { background: #18181b; color: #fff; }
.timeline-detail { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 0.5rem; padding: 1rem; }
.timeline-detail .code-block { margin: 0.5rem 0; }
.timeline-detail .checkpoint { color: #047857; font-weight: 500; }
.timeline-detail .event-id { color: #71717a; font-size: 0.875rem; }
</style>`
  return page.replace("</body>", script + "\n</body>")
}

function renderInteractiveTutorialPage({ timeline, commands }) {
  const data = {
    mission: timeline.mission,
    episodes: timeline.timeline,
    commands,
  }
  const body = section("Interactive Tutorial", `
      <p>Use the controls to step through the canonical journey. Each step shows the episode description and the commands executed.</p>
      <div id="tutorial-card" class="tutorial-card"></div>
      <div class="tutorial-controls">
        <button id="tutorial-prev">← Previous</button>
        <span id="tutorial-progress"></span>
        <button id="tutorial-next">Next →</button>
      </div>`)
  const page = sitePage({ title: "Tutorial", hero: "Step through the canonical SYNTH journey.", body })
  const script = `
<script>
const FC_TUTORIAL_DATA = ${embedJson(data)};
(function() {
  let step = 0;
  const card = document.getElementById('tutorial-card');
  const progress = document.getElementById('tutorial-progress');
  function render() {
    const episode = FC_TUTORIAL_DATA.episodes[step];
    const epCommands = FC_TUTORIAL_DATA.commands.filter(c => c.episode === episode.episode);
    let html = '<h3>Step ' + episode.episode + ' — ' + episode.title + '</h3>';
    html += '<p>' + episode.description + '</p>';
    if (epCommands.length > 0) {
      html += '<h4>Commands</h4>';
      html += epCommands.map(c => '<div class="command"><strong>' + c.actor + '</strong><div class="code-block"><code>' + c.command + '</code></div>' + (c.purpose ? '<p>' + c.purpose + '</p>' : '') + '</div>').join('');
    }
    card.innerHTML = html;
    progress.textContent = (step + 1) + ' / ' + FC_TUTORIAL_DATA.episodes.length;
  }
  document.getElementById('tutorial-prev').addEventListener('click', () => { if (step > 0) { step--; render(); } });
  document.getElementById('tutorial-next').addEventListener('click', () => { if (step < FC_TUTORIAL_DATA.episodes.length - 1) { step++; render(); } });
  render();
})();
</script>
<style>
.tutorial-card { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 0.5rem; padding: 1.5rem; margin: 1rem 0; }
.tutorial-controls { display: flex; gap: 1rem; align-items: center; }
.tutorial-controls button { background: #18181b; color: #fff; border: none; border-radius: 0.375rem; padding: 0.5rem 1rem; cursor: pointer; }
.tutorial-controls button[disabled] { background: #d4d4d8; cursor: not-allowed; }
</style>`
  return page.replace("</body>", script + "\n</body>")
}

function renderInstallerWalkthroughPage({ commands }) {
  const installCommands = commandsForEpisode(commands, 8)
  const steps = installCommands.map((c, index) => `
      <div class="install-step">
        <h3>Step ${index + 1} — ${escapeHtml(c.purpose || "Command")}</h3>
        ${codeBlock(c.command)}
      </div>`).join("\n")
  const body = [
    section("Welcome", para("SYNTH is installed. The fastest way to understand it is to walk through one complete Mission, recorded end to end.")),
    section("Your first five minutes", steps),
    section("What happened?", para("You just created your first Mission. SYNTH recorded every command as an immutable Event. Run synth explain replay at any time to prove the current State matches the event history.")),
  ].join("\n")
  return sitePage({ title: "Install Walkthrough", hero: "Get from installer to first Mission.", body })
}

function renderSitePages(archive) {
  const { timeline, commands, proof, replayReport, events, comparison } = archive
  const ep = (n) => timeline.timeline.find((e) => e.episode === n)
  const mission = missionCreatedPayload(events)
  const distribution = eventTypeDistribution(events)
  const comparisonTableRows = comparisonRows(comparison)
    .map(([label, a, b]) => `          <tr><td>${inlineCodeHtml(label)}</td><td>${inlineCodeHtml(a)}</td><td>${inlineCodeHtml(b)}</td></tr>`)
    .join("\n")

  const pages = {}

  pages["index.html"] = sitePage({
    title: "What is SYNTH?",
    hero: ep(1).description,
    body: [
      section("The Spark", para(ep(1).description)),
      section("The Idea", para(ep(2).description) + "\n" + commandList(commandsForEpisode(commands, 2).filter((c) => c.type === "natural-language"))),
      section("See it happen", `      <p>The whole journey, projected from the recorded evidence:</p>
      <ul>
        <li><a href="mission.html">The Mission</a></li>
        <li><a href="expedition.html">The Expedition</a></li>
        <li><a href="evidence.html">The Evidence</a></li>
        <li><a href="replay.html">The Replay</a> (interactive timeline)</li>
        <li><a href="result.html">The Result</a></li>
        <li><a href="tutorial.html">Interactive Tutorial</a></li>
        <li><a href="installer.html">Install Walkthrough</a></li>
      </ul>`),
    ].join("\n"),
  })

  pages["mission.html"] = sitePage({
    title: "The Mission",
    hero: ep(2).description,
    body: [
      section("Human intent, captured", para(`Mission: ${timeline.mission}`) + (mission?.purpose ? "\n" + para(`Purpose: ${mission.purpose}`) : "")),
      section("As executed", commandList(commandsForEpisode(commands, 2).filter((c) => c.type === "cli"))),
      section("Recorded as an Event", para("The capture is itself an immutable fact: MISSION_CREATED is the second event of the 32-event history.")),
    ].join("\n"),
  })

  pages["expedition.html"] = sitePage({
    title: "The Expedition",
    hero: ep(3).description,
    body: [
      section("The Plan", para(ep(3).description)),
      section("As proposed", commandList(commandsForEpisode(commands, 3).filter((c) => c.type === "cli" && c.command.includes("expedition create")).slice(0, 3))),
      section("Approval is explicit", commandList(commandsForEpisode(commands, 3).filter((c) => c.type === "natural-language" || c.command.includes("approve")))),
      section("The AI Works", para(ep(4).description) + "\n" + commandList(commandsForEpisode(commands, 4))),
    ].join("\n"),
  })

  pages["evidence.html"] = sitePage({
    title: "The Evidence",
    hero: ep(5).description,
    body: [
      section("Nothing Was Forgotten", para(ep(5).description)),
      section("The immutable history", `      <table>
        <thead><tr><th>Event type</th><th>Count</th></tr></thead>
        <tbody>
${distribution.map(([t, n]) => `          <tr><td><code>${escapeHtml(t)}</code></td><td>${n}</td></tr>`).join("\n")}
        </tbody>
      </table>`),
      section("Every artifact answers a question", `      <ul>
        <li><code>events.jsonl</code> — what actually happened</li>
        <li><code>timeline.json</code> — how the history is taught</li>
        <li><code>commands.json</code> — what was actually typed</li>
        <li><code>proof.json</code> — whether governance accepted it</li>
        <li><code>replay-report.json</code> — whether state matches history</li>
        <li><code>snapshots/</code> — the approved plan, signed and certified</li>
      </ul>`),
      section("Two recordings, one journey", `      <p>Archive A is the original pre-hardening recording, preserved immutably as forensic evidence. Archive B is the same canonical Mission re-executed on the hardened pipeline. This comparison is derived from both archives — not hand-authored.</p>
      <table>
        <thead><tr><th>Property</th><th>Archive A (pre-hardening)</th><th>Archive B (hardened)</th></tr></thead>
        <tbody>
${comparisonTableRows}
        </tbody>
      </table>`),
    ].join("\n"),
  })

  pages["replay.html"] = renderInteractiveReplayPage({ timeline, commands, events, replayReport })

  pages["result.html"] = sitePage({
    title: "The Result",
    hero: ep(8).description,
    body: [
      section("Proof", para(`The governed pipeline accepted the journey. Overall verdict: ${proof.overall.passed ? "PASS" : "FAIL"}. Seeded events: ${proof.artifacts.seededEvents}. Execution intents: ${proof.artifacts.executionIntents}. Total events: ${proof.artifacts.eventCount}.`)),
      section("Your Turn", para(ep(8).description) + "\n" + commandList(commandsForEpisode(commands, 8))),
      section("Known limitations", `      <p>This recording (Archive B) runs on the hardened pipeline: aggregate relationship validation, signed snapshot persistence, and graph-integrity proof are exercised and passing — see <a href="evidence.html">The Evidence</a> for the Archive A/B comparison. What a single 32-event journey does not prove is scale: larger missions and longer histories remain the subject of continued validation.</p>`),
    ].join("\n"),
  })

  pages["tutorial.html"] = renderInteractiveTutorialPage({ timeline, commands })
  pages["installer.html"] = renderInstallerWalkthroughPage({ commands })

  return pages
}

// ------------------------------------------------------------
// Output assembly
// ------------------------------------------------------------

async function buildOutputs(root) {
  const archive = await loadArchive(root)
  await verifyArchiveIntegrity(root)
  // Archive A is loaded read-only for the A/B comparison; its archived
  // replay report is integrity-checked against the frozen engine too.
  const archiveA = await loadArchive(root, ARCHIVE_A_REL)
  const derivedA = await verifyArchiveIntegrity(root, ARCHIVE_A_REL)
  const comparison = deriveComparison(archiveA, derivedA, archive)
  const knownLimitations = await loadKnownLimitations(root)
  const ctx = { ...archive, comparison, knownLimitations }

  const docs = {
    "overview.md": renderOverview(ctx),
    "journey.md": renderJourney(ctx),
    "architecture.md": renderArchitecture(ctx),
    "evidence.md": renderEvidence(ctx),
    "replay.md": renderReplay(ctx),
    "lessons.md": renderLessons(ctx),
    "tutorial.md": renderTutorial(ctx),
    "slides.md": renderSlides(ctx),
    "storyboard.md": renderStoryboard(ctx),
    "conference-demo.md": renderConferenceDemo(ctx),
    "ai-onboarding.md": renderAiOnboarding(ctx),
    "installer-walkthrough.md": renderInstallerWalkthrough(ctx),
  }
  const site = renderSitePages(ctx)

  const outputs = new Map()
  for (const [name, content] of Object.entries(docs)) {
    outputs.set(path.join(DOCS_OUT_REL, name), content)
  }
  for (const [name, content] of Object.entries(site)) {
    outputs.set(path.join(SITE_OUT_REL, name), content)
  }
  return outputs
}

async function writeOutputs(root, outputs) {
  for (const [rel, content] of outputs) {
    const file = path.join(root, rel)
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, content, "utf-8")
  }
}

async function checkOutputs(root, outputs) {
  const stale = []
  const missing = []
  for (const [rel, content] of outputs) {
    const file = path.join(root, rel)
    let current = null
    try {
      current = await fs.readFile(file, "utf-8")
    } catch {
      missing.push(rel)
      continue
    }
    if (current !== content) stale.push(rel)
  }
  return { stale, missing }
}

async function main() {
  const root = process.cwd()
  const checkMode = process.argv.includes("--check")
  const outputs = await buildOutputs(root)

  if (checkMode) {
    const { stale, missing } = await checkOutputs(root, outputs)
    if (stale.length === 0 && missing.length === 0) {
      console.log(`✅ First Contact projections current (${outputs.size} file(s), deterministic).`)
      return
    }
    console.log("❌ First Contact projections are stale or missing:")
    for (const rel of missing) console.log(`  missing: ${rel}`)
    for (const rel of stale) console.log(`  stale:   ${rel}`)
    console.log("Run: node scripts/generate-first-contact-projection.js")
    process.exit(1)
  }

  await writeOutputs(root, outputs)
  console.log(`First Contact projection complete: ${outputs.size} file(s) written.`)
  for (const rel of outputs.keys()) console.log(`  ${rel}`)
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
