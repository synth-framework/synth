#!/usr/bin/env node
// ============================================================
// audit-dead-declarations — dead code tsc can PROVE, not guess
// ============================================================
// STRONGEST EVIDENCE CLASS of the four audits. tsconfig.json ships without
// `noUnusedLocals` and `noUnusedParameters`, so `npm run build` is green while
// the tree holds 212 dead declarations across 100 files. This script runs tsc
// with both flags turned on, without writing to tsconfig.json or emitting
// anything, and reports what the compiler itself proves:
//
//   TS6133  'x' is declared but its value is never read   (dead locals/imports)
//   TS6196  type declared but never used
//   TS6138  property declared but never read
//   TS6192  all imports in this line are unused
//
// THE GATE. By default this reports and exits 0, because today's reality does
// not pass. `--max N` turns it into a gate that fails above N declarations:
//
//   node scripts/audit-dead-declarations.js --max 212   # ratchet: never grow
//   node scripts/audit-dead-declarations.js --max 0     # the finished state
//
// EXP-CLEAN-001's acceptance is `--max 0` plus both flags permanently present
// in tsconfig.json, at which point this script becomes redundant for src/ and
// should be chained as a guard against the flags being removed again. Until
// then it is deliberately NOT in test:all — a report is not a gate, and a gate
// that fails on the day it is added teaches people to ignore gates.
//
// Usage: node scripts/audit-dead-declarations.js [--json] [--max N] [--top N]
// ============================================================

import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const FLAGS = ["--noEmit", "--noUnusedLocals", "--noUnusedParameters", "-p", "tsconfig.json"]

const LEGEND = {
  TS6133: "declared but its value is never read",
  TS6196: "type declared but never used",
  TS6138: "property declared but never read",
  TS6192: "all imports in this line are unused",
}

function findTsc() {
  const local = path.join(ROOT, "node_modules", "typescript", "bin", "tsc")
  if (fs.existsSync(local)) return local
  return null
}

function main() {
  const argv = process.argv.slice(2)
  const asJson = argv.includes("--json")
  const maxIdx = argv.indexOf("--max")
  const max = maxIdx >= 0 ? Number(argv[maxIdx + 1]) : null
  const topIdx = argv.indexOf("--top")
  const top = topIdx >= 0 ? Number(argv[topIdx + 1]) || 10 : 10

  const tsc = findTsc()
  if (!tsc) {
    console.error("typescript is not installed — run `npm ci` first.")
    process.exit(2)
  }
  const r = spawnSync(process.execPath, [tsc, ...FLAGS], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  const out = `${r.stdout || ""}${r.stderr || ""}`

  // tsc exits non-zero precisely because the flags found things; a crash is
  // distinguishable by producing no parseable diagnostics at all.
  const diag = []
  for (const m of out.matchAll(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm)) {
    diag.push({ file: m[1].split(path.sep).join("/"), line: Number(m[2]), code: m[4], message: m[5] })
  }
  if (diag.length === 0 && r.status !== 0 && !/error TS\d+/.test(out)) {
    console.error(`tsc failed without producing diagnostics (exit ${r.status}):\n${out.slice(0, 600)}`)
    process.exit(2)
  }

  const byCode = new Map()
  const byFile = new Map()
  for (const d of diag) {
    byCode.set(d.code, (byCode.get(d.code) || 0) + 1)
    byFile.set(d.file, (byFile.get(d.file) || 0) + 1)
  }
  const worst = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)
  const exceeded = max !== null && diag.length > max

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          kind: "DeadDeclarationAudit",
          evidenceClass: "compiler-verified",
          flags: FLAGS,
          total: diag.length,
          filesAffected: byFile.size,
          byCode: Object.fromEntries([...byCode.entries()].sort((a, b) => b[1] - a[1])),
          worstFiles: worst,
          ...(max !== null ? { max, exceeded } : {}),
        },
        null,
        2,
      ),
    )
    process.exit(exceeded ? 1 : 0)
  }

  console.log("DEAD DECLARATIONS — compiler-verified (tsc --noUnusedLocals --noUnusedParameters)")
  console.log(`  total:            ${diag.length}`)
  console.log(`  files affected:   ${byFile.size}`)
  console.log("  by diagnostic:")
  for (const [code, n] of [...byCode.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(4)}  ${code}  ${LEGEND[code] || ""}`)
  }
  console.log("  worst files:")
  for (const [f, n] of worst) console.log(`    ${String(n).padStart(4)}  ${f}`)
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf8").replace(/\/\/.*$/gm, ""))
  const co = cfg.compilerOptions || {}
  console.log(
    `\n  tsconfig.json today: noUnusedLocals=${co.noUnusedLocals ?? "(absent)"} ` +
      `noUnusedParameters=${co.noUnusedParameters ?? "(absent)"} — which is why \`npm run build\` is green.`,
  )
  if (max !== null) {
    console.log(exceeded ? `  GATE FAILED: ${diag.length} > --max ${max}` : `  gate ok: ${diag.length} <= --max ${max}`)
  } else {
    console.log("  no gate applied (report only). Use --max N to ratchet; EXP-CLEAN-001's acceptance is --max 0.")
  }
  process.exit(exceeded ? 1 : 0)
}

main()
