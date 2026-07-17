#!/usr/bin/env node
// ============================================================
// SYNTH: Dist Manifest Generator
// ============================================================
// Computes a cryptographic manifest of the built `dist/` tree so that
// `synth doctor` can verify installed artifact integrity at runtime.
// Run automatically after `tsc` as part of `npm run build`.
//
// Output: dist/dist-manifest.json
// {
//   "schema": "synth-dist-manifest-v1",
//   "generatedAt": "...",
//   "algorithm": "sha256",
//   "rootHash": "...",
//   "files": { "relative/path.js": "sha256hex", ... }
// }
// ============================================================

import crypto from "crypto"
import fs from "fs/promises"
import path from "path"

const DIST_DIR = path.resolve(process.cwd(), "dist")
const MANIFEST_PATH = path.join(DIST_DIR, "dist-manifest.json")

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full)
    } else if (entry.isFile()) {
      yield full
    }
  }
}

async function hashFile(filePath) {
  const content = await fs.readFile(filePath)
  return crypto.createHash("sha256").update(content).digest("hex")
}

async function main() {
  let distExists = false
  try {
    await fs.access(DIST_DIR)
    distExists = true
  } catch {
    // ignore
  }

  if (!distExists) {
    console.error(`dist/ directory not found at ${DIST_DIR}; run 'npm run build' first.`)
    process.exit(1)
  }

  const files = {}
  for await (const file of walk(DIST_DIR)) {
    if (file === MANIFEST_PATH) continue
    const rel = path.relative(DIST_DIR, file).replace(/\\/g, "/")
    files[rel] = await hashFile(file)
  }

  // Deterministic aggregate hash: sort entries and hash the concatenation
  // of "path:hash\n" records.
  const sorted = Object.keys(files).sort()
  const aggregate = sorted.map((rel) => `${rel}:${files[rel]}\n`).join("")
  const rootHash = crypto.createHash("sha256").update(aggregate).digest("hex")

  const manifest = {
    schema: "synth-dist-manifest-v1",
    generatedAt: new Date().toISOString(),
    algorithm: "sha256",
    rootHash,
    files,
  }

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf-8")
  console.log(`dist manifest written: ${MANIFEST_PATH} (${sorted.length} file(s), rootHash ${rootHash.slice(0, 16)}...)`)
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
