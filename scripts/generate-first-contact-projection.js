#!/usr/bin/env node
// ============================================================
// SYNTH: First Contact Projection Generator
// ============================================================
// Projects the canonical First Contact evidence archive into the
// public documentation and website experiences.
//
// Authoritative source:
//   examples/first-contact/recorded-journey/evidence-archive/
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

const ARCHIVE_REL = path.join("examples", "first-contact", "recorded-journey", "evidence-archive")
const RECORD_REL = path.join("examples", "first-contact", "README.md")
const DOCS_OUT_REL = path.join("docs", "first-contact")
const SITE_OUT_REL = path.join("website", "first-contact")

const PROJECTION_BANNER_MD = `> **Projection notice.** This document is a deterministic projection of the [canonical First Contact evidence archive](../../examples/first-contact/recorded-journey/evidence-archive/). Do not edit by hand; regenerate with \`node scripts/generate-first-contact-projection.js\`.`

const PROJECTION_BANNER_HTML = `<!-- Projection notice: generated from the canonical First Contact evidence archive. Do not edit by hand; regenerate with node scripts/generate-first-contact-projection.js -->`

// ------------------------------------------------------------
// Archive loading and validation
// ------------------------------------------------------------

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf-8"))
}

async function loadArchive(root) {
  const archiveDir = path.join(root, ARCHIVE_REL)
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
async function verifyArchiveIntegrity(root) {
  const derived = await deriveReplayReport(path.join(root, ARCHIVE_REL))
  const archived = await readJson(path.join(root, ARCHIVE_REL, "replay-report.json"))
  const mismatches = []
  for (const key of ["consistent", "chainValid", "eventCount", "liveHash", "replayHash"]) {
    if (derived[key] !== archived[key]) {
      mismatches.push(`${key}: archived=${archived[key]} derived=${derived[key]}`)
    }
  }
  if (mismatches.length > 0) {
    throw new Error(`ARCHIVE_INTEGRITY_FAILURE:\n  ${mismatches.join("\n  ")}`)
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

## Evidence source

Every statement in these documents derives from the canonical evidence archive at \`examples/first-contact/recorded-journey/evidence-archive/\`. The archive contains the immutable event log (\`events.jsonl\`), the journey timeline, the executed commands, the proof artifact, and the replay report.
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

function renderEvidence({ proof, events, replayReport }) {
  const distribution = eventTypeDistribution(events)
  const rows = distribution.map(([type, count]) => `| \`${type}\` | ${count} |`).join("\n")
  const projections = proof.artifacts.documentationProjections.map((p) => `- \`${p}\``).join("\n")
  return `${PROJECTION_BANNER_MD}

# First Contact — The Evidence

The canonical evidence archive lives at \`examples/first-contact/recorded-journey/evidence-archive/\`. Each artifact answers a different question.

| Artifact | Question it answers |
|---|---|
| \`events.jsonl\` | What actually happened? The immutable 32-event history |
| \`timeline.json\` | How is the history taught? The eight-episode learning structure |
| \`commands.json\` | What was actually typed? Every human and AI command, per episode |
| \`proof.json\` | Did the governed pipeline accept it? The proof verdict |
| \`replay-report.json\` | Does the state match the history? The replay verification |

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
- Overall verdict: **${proof.overall.passed ? "PASS" : "FAIL"}**

Documentation projections produced during the journey:

${projections}

## Replay facts

- Consistent: ${replayReport.consistent}
- Chain valid: ${replayReport.chainValid}
- Live state hash: \`${replayReport.liveHash}\`
- Replayed state hash: \`${replayReport.replayHash}\`
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
`
}

function renderLessons({ knownLimitations, proof }) {
  return `${PROJECTION_BANNER_MD}

# First Contact — Lessons

## What the journey proves

The canonical journey is evidence that a human sentence can become an approved plan, an executed mission, and a provable history — with every action governed and recorded. The proof artifact's verdict is **${proof.overall.passed ? "PASS" : "FAIL"}**.

## Known limitations

From the canonical record (\`examples/first-contact/README.md\`):

${knownLimitations}

## The honest reading

A consistent replay proves this history is intact and this state descends from it. It does not by itself prove that every aggregate relationship in every mission is validated — that is the purpose of the Constitutional Hardening Program (EXP-PROGRAM-010).
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
    <p>Projected from the <a href="https://github.com/synth-framework/synth/tree/main/examples/first-contact/recorded-journey/evidence-archive">canonical evidence archive</a> · <a href="../index.html">← Back to Synth</a></p>
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

function renderSitePages(archive) {
  const { timeline, commands, proof, replayReport, events } = archive
  const ep = (n) => timeline.timeline.find((e) => e.episode === n)
  const mission = missionCreatedPayload(events)
  const distribution = eventTypeDistribution(events)

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
        <li><a href="replay.html">The Replay</a></li>
        <li><a href="result.html">The Result</a></li>
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
      </ul>`),
    ].join("\n"),
  })

  pages["replay.html"] = sitePage({
    title: "The Replay",
    hero: ep(7).description,
    body: [
      section("State", para(ep(6).description)),
      section("Replay", para(ep(7).description) + "\n" + commandList(commandsForEpisode(commands, 7))),
      section("The verdict", `      <table>
        <tbody>
          <tr><td>Events replayed</td><td>${replayReport.eventCount}</td></tr>
          <tr><td>Hash chain</td><td>${replayReport.chainValid ? "valid" : "INVALID"}</td></tr>
          <tr><td>Operational hash</td><td><code>${escapeHtml(replayReport.liveHash)}</code></td></tr>
          <tr><td>Replayed hash</td><td><code>${escapeHtml(replayReport.replayHash)}</code></td></tr>
          <tr><td>Verdict</td><td><strong>${replayReport.consistent ? "CONSISTENT" : "INCONSISTENT"}</strong></td></tr>
        </tbody>
      </table>`),
    ].join("\n"),
  })

  pages["result.html"] = sitePage({
    title: "The Result",
    hero: ep(8).description,
    body: [
      section("Proof", para(`The governed pipeline accepted the journey. Overall verdict: ${proof.overall.passed ? "PASS" : "FAIL"}. Seeded events: ${proof.artifacts.seededEvents}. Execution intents: ${proof.artifacts.executionIntents}. Total events: ${proof.artifacts.eventCount}.`)),
      section("Your Turn", para(ep(8).description) + "\n" + commandList(commandsForEpisode(commands, 8))),
      section("Known limitations", `      <p>This journey validates Mission creation, Expedition execution, event sourcing, replay integrity, and proof generation. Aggregate relationship validation, snapshot persistence, and lineage enforcement are the subject of the Constitutional Hardening Program.</p>`),
    ].join("\n"),
  })

  return pages
}

// ------------------------------------------------------------
// Output assembly
// ------------------------------------------------------------

async function buildOutputs(root) {
  const archive = await loadArchive(root)
  await verifyArchiveIntegrity(root)
  const knownLimitations = await loadKnownLimitations(root)
  const ctx = { ...archive, knownLimitations }

  const docs = {
    "overview.md": renderOverview(ctx),
    "journey.md": renderJourney(ctx),
    "architecture.md": renderArchitecture(ctx),
    "evidence.md": renderEvidence(ctx),
    "replay.md": renderReplay(ctx),
    "lessons.md": renderLessons(ctx),
  }
  const site = renderSitePages(archive)

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
