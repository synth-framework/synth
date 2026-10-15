// Tooling only: derive module graphs from built JavaScript, not source mentions.
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

export function edgesOf(file, source, root) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  if (parsed.parseDiagnostics.length) throw new Error(`Cannot parse built module: ${file}`)
  const edges = { static: new Set(), dynamic: new Set() }
  function add(kind, specifier) {
    if (!specifier || !ts.isStringLiteralLike(specifier)) return
    const spec = specifier.text
    if (!spec.startsWith(".") || !spec.endsWith(".js")) return
    edges[kind].add(path.relative(root, path.resolve(path.dirname(file), spec)).split(path.sep).join("/"))
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add("static", node.moduleSpecifier)
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) add("dynamic", node.arguments[0])
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  return { static: [...edges.static].sort(), dynamic: [...edges.dynamic].sort() }
}

export function readModuleGraph(root) {
  const sources = new Map()
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(file)
      else if (entry.name.endsWith(".js")) sources.set(path.relative(root, file).split(path.sep).join("/"), fs.readFileSync(file, "utf8"))
    }
  }
  walk(path.join(root, "dist"))
  const graph = new Map([...sources].map(([file, source]) => [file, edgesOf(path.join(root, file), source, root)]))
  for (const [file, edges] of graph) {
    for (const target of [...edges.static, ...edges.dynamic]) {
      if (!graph.has(target)) throw new Error(`Unresolved built import: ${file} -> ${target}`)
    }
  }
  return { sources, graph }
}

export function closure(roots, graph, kinds = ["static"]) {
  const found = new Set(), pending = [...roots]
  while (pending.length) {
    const file = pending.pop()
    if (found.has(file)) continue
    if (!graph.has(file)) throw new Error(`Module graph root/edge is missing: ${file}`)
    found.add(file)
    for (const kind of kinds) pending.push(...graph.get(file)[kind])
  }
  return found
}

export function measureModules(files, sources) {
  const sorted = [...new Set(files)].sort()
  let bytes = 0
  for (const file of sorted) {
    if (!sources.has(file)) throw new Error(`Measured module is absent from the build: ${file}`)
    bytes += Buffer.byteLength(sources.get(file), "utf8")
  }
  return { modules: sorted.length, bytes, files: sorted }
}
