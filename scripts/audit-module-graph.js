#!/usr/bin/env node
// ============================================================
// audit-module-graph — which compiled modules can anything reach?
// ============================================================
// Two questions, both answered from dist/ as built (never from src/, so the
// answer matches what actually ships):
//
//   1. EAGER GRAPH per entry point — the transitive closure of STATIC imports
//      only. This is what a process pays for before it can answer anything,
//      and it is the number EXP-CLI-003's budget is written against
//      (dispatcher <= 25 modules / <= 150 KB).
//   2. UNREACHABLE modules — everything in dist/ no root can reach, following
//      static AND dynamic import() edges. These are CANDIDATES for
//      EXP-CLEAN-001, never verdicts: a module can be loaded through a
//      computed specifier, imported directly by a test, or shipped as a
//      distribution artifact not listed in bin.
//
// Roots default to package.json `bin` + `main`. dist/cli/synth.js is added as
// a compatibility root: the shared CLI harness now uses the shipped entry.js,
// but the task adapter shim and some direct consumers still use synth.js.
// --no-harness-root is retained as a compatibility spelling for excluding it.
//
// SELF-CHECK: this resolver has already been wrong twice in one session — once
// by counting a mention in docs/*.md as a reference, once by matching module
// stems so that "adapter" appeared referenced by 23 test files when the real
// matches were adapter-catalog and adapter-registry. A third bug made every
// edge target absolute while the keys stayed relative, which reported 3 of 348
// modules reachable and looked like a catastrophic dead-code finding. So the
// script fails loudly rather than reporting a suspiciously small graph.
//
// Deliberately NOT chained into test:all — this reports reality, and today's
// reality includes dead code. EXP-CLEAN-001 decides what becomes a gate.
//
// Usage:
//   node scripts/audit-module-graph.js [--json] [--no-harness-root]
//                                      [--root <dist/path.js>]...
// ============================================================

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { readModuleGraph, closure } from "./lib/module-graph.js"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const HARNESS_ROOT = "dist/cli/synth.js"

function lines(source) {
  return source.split("\n").length
}

function main() {
  const argv = process.argv.slice(2)
  asJson = argv.includes("--json")
  const includeHarness = !argv.includes("--no-harness-root")
  const extraRoots = argv.filter((a, i) => argv[i - 1] === "--root")

  const distDir = path.join(ROOT, "dist")
  if (!fs.existsSync(distDir)) {
    console.error("dist/ does not exist — run `npm run build` first.")
    process.exit(2)
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))
  const declared = [...Object.values(pkg.bin || {}), pkg.main].filter(Boolean)
  const roots = [...new Set([...declared, ...(includeHarness ? [HARNESS_ROOT] : []), ...extraRoots])]
    .map((r) => r.replace(/^\.\//, ""))


  const { sources, graph } = readModuleGraph(ROOT)

  // --- self-check -------------------------------------------------------
  // The bug signature is a graph that is technically consistent and almost
  // empty. Any real entry point reaches a large fraction of dist/, so a
  // closure below half the module count means the resolver, not the codebase.
  const all = closure(roots, graph, ["static", "dynamic"])
  if (roots.length === 0) {
    console.error("no roots resolved — check package.json bin/main and dist/")
    process.exit(2)
  }
  if (all.size < sources.size * 0.5) {
    console.error(
      `SELF-CHECK FAILED: only ${all.size} of ${sources.size} modules are reachable from ` +
        `${roots.length} root(s). That is the signature of a broken resolver ` +
        `(absolute-vs-relative keys, or a parser that matches no edge), not of dead code. ` +
        `Refusing to report.`,
    )
    process.exit(2)
  }

  // --- eager graph per root (static edges only) -------------------------
  const eager = roots.map((r) => {
    const set = closure([r], graph, ["static"])
    let bytes = 0
    for (const f of set) bytes += Buffer.byteLength(sources.get(f) || "", "utf8")
    return { root: r, modules: set.size, kb: Math.round(bytes / 1024) }
  })

  // --- unreachable, both views -----------------------------------------
  const shippedRoots = roots.filter((r) => r !== HARNESS_ROOT)
  const shipped = closure(shippedRoots, graph, ["static", "dynamic"])
  const views = [
    { label: `shipped only (${shippedRoots.join(", ")})`, reachable: shipped },
    { label: `shipped + compatibility (${HARNESS_ROOT})`, reachable: all },
  ]
  const report = views.map((v) => {
    const dead = [...sources.keys()].filter((f) => !v.reachable.has(f))
    const byDir = new Map()
    for (const f of dead) {
      const d = path.posix.dirname(f)
      byDir.set(d, (byDir.get(d) || 0) + lines(sources.get(f)))
    }
    return {
      view: v.label,
      totalModules: sources.size,
      reachable: v.reachable.size,
      unreachable: dead.length,
      unreachableLines: dead.reduce((n, f) => n + lines(sources.get(f)), 0),
      byDirectory: [...byDir.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
      largest: dead
        .map((f) => ({ file: f, lines: lines(sources.get(f)) }))
        .sort((a, b) => b.lines - a.lines)
        .slice(0, 12),
    }
  })

  if (asJson) {
    console.log(JSON.stringify({ kind: "ModuleGraphAudit", eager, unreachable: report }, null, 2))
    return
  }
  console.log("EAGER GRAPH (transitive closure of static imports)")
  for (const e of eager) console.log(`  ${String(e.modules).padStart(4)} modules  ${String(e.kb).padStart(5)} KB  ${e.root}`)
  for (const r of report) {
    console.log(`\nUNREACHABLE — ${r.view}`)
    console.log(`  ${r.unreachable} of ${r.totalModules} modules, ${r.unreachableLines} compiled lines`)
    console.log("  by directory:")
    for (const [d, n] of r.byDirectory) console.log(`    ${String(n).padStart(6)}  ${d}`)
    console.log("  largest:")
    for (const x of r.largest) console.log(`    ${String(x.lines).padStart(6)}  ${x.file}`)
  }
  console.log(
    "\nCANDIDATES, NOT VERDICTS. Before deleting any module above, prove it is not\n" +
      "  (a) loaded through a computed specifier, (b) imported directly by a test,\n" +
      "  (c) a distribution entry point absent from package.json bin,\n" +
      "  (d) reachable only from dist/cli/synth.js, which compatibility consumers still spawn.\n" +
      "Spot-check the resolver against one module known alive and one known dead.",
  )
}

let asJson = false
main()
