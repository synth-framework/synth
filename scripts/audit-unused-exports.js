#!/usr/bin/env node
// ============================================================
// audit-unused-exports — exported symbols nothing in this repo uses
// ============================================================
// WEAKEST EVIDENCE CLASS of the four audits. Everything it reports is a
// CANDIDATE. A symbol can be consumed in ways a name search cannot see:
//
//   * through a barrel (`export * from "./x.js"`) by a package consumer, so it
//     is public API of the published module and not dead at all;
//   * as `namespace.symbol` after `import * as sdk from "../sdk/index.js"` —
//     a word-boundary search does match `sdk.symbol`, but a computed access
//     like `sdk[name]` does not;
//   * by a test that builds the name dynamically.
//
// So each candidate is labelled with whether its file is a barrel target, and
// EXP-CLEAN-001 must follow the barrel chain per symbol before deleting.
// Contrast scripts/audit-dead-declarations.js, which reports only what tsc
// itself proves.
//
// SELF-CHECK: three symbols that are definitely used are asserted absent from
// the candidate list. If any appears, the resolver is broken and the script
// exits 2 instead of publishing a plausible-looking number. (A previous
// version of this measurement counted a mention in docs/*.md as a reference
// and reported zero dead modules across 348 files — an answer that was wrong
// in the comfortable direction and would have hidden the whole finding.)
//
// Deliberately NOT chained into test:all.
//
// Usage: node scripts/audit-unused-exports.js [--json] [--top N]
// ============================================================

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const KNOWN_USED = ["locateEventLog", "printJson", "isCommittableArtifact"]

const DECL_RE =
  /^export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|class|type|interface|enum)\s+([A-Za-z0-9_$]+)/gm
const LIST_RE = /^export\s*\{([^}]*)\}/gm
const BARREL_RE = /export\s*\*\s*from\s*["'](\.[^"']+)["']/g

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, filter, out)
    else if (filter(full)) out.push(full)
  }
  return out
}

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join("/")

function exportedNames(source) {
  const names = new Set()
  for (const m of source.matchAll(DECL_RE)) names.add(m[1])
  for (const m of source.matchAll(LIST_RE)) {
    for (const part of m[1].split(",")) {
      const trimmed = part.trim()
      if (!trimmed || trimmed.startsWith("//")) continue
      const as = trimmed.split(/\s+as\s+/)
      const name = (as[1] || as[0]).trim()
      if (/^[A-Za-z0-9_$]+$/.test(name)) names.add(name)
    }
  }
  return [...names]
}

function main() {
  const argv = process.argv.slice(2)
  const asJson = argv.includes("--json")
  const topIdx = argv.indexOf("--top")
  const top = topIdx >= 0 ? Number(argv[topIdx + 1]) || 10 : 10

  const srcFiles = walk(path.join(ROOT, "src"), (f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
  const consumerFiles = [
    ...walk(path.join(ROOT, "src"), (f) => f.endsWith(".ts") && !f.endsWith(".d.ts")),
    ...walk(path.join(ROOT, "tests"), (f) => f.endsWith(".js")),
    ...walk(path.join(ROOT, "scripts"), (f) => f.endsWith(".js")),
  ]
  const sources = new Map()
  for (const f of srcFiles) sources.set(rel(f), fs.readFileSync(f, "utf8"))
  const consumerText = new Map()
  for (const f of consumerFiles) {
    const r = rel(f)
    consumerText.set(r, (consumerText.get(r) || "") + fs.readFileSync(f, "utf8"))
  }

  // Which files are re-exported wholesale by some barrel?
  const barrelTargets = new Set()
  for (const [file, text] of consumerText) {
    for (const m of text.matchAll(BARREL_RE)) {
      const spec = m[1]
      if (!spec.endsWith(".js")) continue
      const target = rel(path.resolve(path.join(ROOT, path.dirname(file)), spec)).replace(/\.js$/, ".ts")
      barrelTargets.add(target)
    }
  }

  const candidates = []
  for (const [file, text] of sources) {
    for (const name of exportedNames(text)) {
      const re = new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`)
      let used = false
      for (const [other, otext] of consumerText) {
        if (other === file) continue
        if (re.test(otext)) {
          used = true
          break
        }
      }
      if (!used) candidates.push({ file, name, barrel: barrelTargets.has(file) })
    }
  }

  // --- self-check -------------------------------------------------------
  const leaked = KNOWN_USED.filter((n) => candidates.some((c) => c.name === n))
  if (leaked.length > 0) {
    console.error(
      `SELF-CHECK FAILED: ${leaked.join(", ")} are used but were reported unused. ` +
        `The reference resolver is broken; refusing to publish these numbers.`,
    )
    process.exit(2)
  }

  const byFile = new Map()
  for (const c of candidates) byFile.set(c.file, (byFile.get(c.file) || 0) + 1)
  const worst = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          kind: "UnusedExportAudit",
          evidenceClass: "heuristic",
          scannedFiles: sources.size,
          candidates: candidates.length,
          barrelExposed: candidates.filter((c) => c.barrel).length,
          worstFiles: worst,
          list: candidates,
        },
        null,
        2,
      ),
    )
    return
  }
  console.log("UNUSED EXPORTS — heuristic candidates, each needs per-symbol proof")
  console.log(`  src files scanned:            ${sources.size}`)
  console.log(`  candidate unused exports:     ${candidates.length}`)
  console.log(`  of those, barrel-exposed:     ${candidates.filter((c) => c.barrel).length}  (may be public API — check before deleting)`)
  console.log("  worst files:")
  for (const [f, n] of worst) console.log(`    ${String(n).padStart(4)}  ${f}`)
  console.log(
    "\nA candidate is a name that appears in no other src file, no test and no\n" +
      "script. That is not proof of death: follow barrel chains and check for\n" +
      "computed access before deleting anything on this list.",
  )
}

main()
