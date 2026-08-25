// scripts/system-graph.mjs
//
// Dependency-free build-time system graph for SYNTH.
//   1. Module graph: scans src/**/*.ts for relative imports, resolves targets,
//      and keeps the transitive closure reachable from src/cli/entry.ts.
//   2. Intent graph: SYNTH routes everything through
//      handleIntent({ capability }) in ExecutionGate, so scanning for
//      `capability: "<Name>"` yields command-context -> capability edges.
// Emits .synth/ai/graph/{system-graph.json, modules.dot} (gitignored).
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs"
import { join, dirname, relative, sep } from "node:path"

const REPO = process.cwd()
const SRC = join(REPO, "src")
const OUT_DIR = join(REPO, ".synth/ai/graph")
const ROOT = "src/cli/entry.ts"

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (p.endsWith(".ts")) acc.push(p)
  }
  return acc
}

function toId(absPath) {
  return relative(REPO, absPath).split(sep).join("/")
}

function resolveTarget(fromFile, spec) {
  if (!spec.startsWith(".")) return null
  const base = spec.replace(/\.(m?c?)js$/, ".$1ts")
  const p = join(dirname(fromFile), base)
  const tries = [
    p,
    p + ".ts",
    p + ".tsx",
    p + ".mjs",
    p + ".js",
    join(p, "index.ts"),
    join(p, "index.tsx"),
  ]
  for (const c of tries) {
    try {
      if (statSync(c).isFile()) return c
    } catch {}
  }
  return null
}

const importRe = [
  /import\s+(?:[\w*\s{},]*?\s+from\s+)?["'`]([^"'`]+)["'`]/g,
  /export\s+[^;]*?\s+from\s+["'`]([^"'`]+)["'`]/g,
  /import\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
]

const files = walk(SRC)
const edges = []
const capRe = /capability\s*:\s*["'`]([\w]+)["'`]/g
const fnRe = /(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/
const perContext = {}
const perCapability = {}

for (const file of files) {
  const src = readFileSync(file, "utf8")
  const id = toId(file)
  for (const re of importRe) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(src))) {
      const target = resolveTarget(file, m[1])
      if (target) edges.push([id, toId(target)])
    }
  }
  const lines = src.split("\n")
  let curFn = null
  for (const line of lines) {
    const fm = line.match(fnRe)
    if (fm) curFn = fm[1]
    let c
    capRe.lastIndex = 0
    while ((c = capRe.exec(line))) {
      const cap = c[1]
      const key = curFn || id
      ;(perContext[key] ||= new Set()).add(cap)
      ;(perCapability[cap] ||= new Set()).add(key)
    }
  }
}

// Transitive closure reachable from the CLI entry.
const adj = new Map()
for (const [from, to] of edges) {
  if (!adj.has(from)) adj.set(from, new Set())
  adj.get(from).add(to)
}
const reachable = new Set([ROOT])
const queue = [ROOT]
while (queue.length) {
  const cur = queue.shift()
  for (const next of adj.get(cur) || []) {
    if (!reachable.has(next)) {
      reachable.add(next)
      queue.push(next)
    }
  }
}
const moduleEdges = edges.filter(([f, t]) => reachable.has(f) && reachable.has(t))
const moduleNodes = [...reachable].sort()

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(
  join(OUT_DIR, "system-graph.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      roots: [ROOT],
      modules: { count: moduleNodes.length, nodes: moduleNodes, edges: moduleEdges },
      intents: {
        commands: Object.fromEntries(
          Object.entries(perContext).map(([k, v]) => [k, [...v].sort()]),
        ),
        capabilities: Object.fromEntries(
          Object.entries(perCapability).map(([k, v]) => [k, [...v].sort()]),
        ),
      },
    },
    null,
    2,
  ),
)

// DOT graph (module closure).
const dot = [
  "digraph modules {",
  "  rankdir=LR;",
  "  node [shape=box, fontsize=10];",
  ...moduleEdges.map(([f, t]) => `  "${f}" -> "${t}";`),
  "}",
].join("\n")
writeFileSync(join(OUT_DIR, "modules.dot"), dot)

const ser = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [...v].sort()]))
console.log(
  `[system-graph] files: ${files.length}; module closure: ${moduleNodes.length} nodes / ${moduleEdges.length} edges (from ${ROOT})`,
)
console.log(
  `[system-graph] intents: ${Object.keys(perCapability).length} capabilities across ${Object.keys(perContext).length} command contexts`,
)
console.log(`[system-graph] wrote ${join(OUT_DIR, "system-graph.json")} and modules.dot`)
