#!/usr/bin/env node
// ============================================================
// SYNTH Platform v1.0 Manifest Generator
// ============================================================
// Produces the machine-readable "birth certificate" for SYNTH
// Platform v1.0. The manifest captures the exact source, build,
// replay, SDK, event-model, capability-registry, and ADR baseline
// fingerprints at release time.
//
// Usage:
//   node scripts/generate-platform-manifest.js [--commit <sha>]
//
// The optional --commit argument overrides the captured git commit
// SHA. This is useful when the manifest is generated as part of a
// release commit and should point to the source commit that produced
// the build artifacts.
// ============================================================

import crypto from "crypto"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { globSync } from "fs"

const ROOT = process.cwd()
const MANIFEST_PATH = path.join(ROOT, "docs", "certifications", "synth-platform-v1-0-manifest.json")

function readText(filePath) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8")
}

function exec(cmd, options = {}) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...options }).trim()
}

function hashFiles(patterns) {
  const files = new Set()
  for (const pattern of Array.isArray(patterns) ? patterns : [patterns]) {
    for (const f of globSync(pattern, { withFileTypes: false, absolute: false })) {
      if (fs.statSync(path.join(ROOT, f)).isFile()) files.add(f)
    }
  }
  const sorted = Array.from(files).sort()
  const hash = crypto.createHash("sha256")
  for (const f of sorted) {
    hash.update(f)
    hash.update(":")
    hash.update(fs.readFileSync(path.join(ROOT, f)))
    hash.update("\n")
  }
  return {
    algorithm: "sha256",
    hash: hash.digest("hex"),
    files: sorted.length,
  }
}

function hashFile(filePath) {
  const data = fs.readFileSync(path.join(ROOT, filePath))
  return crypto.createHash("sha256").update(data).digest("hex")
}

function parseArg(flag) {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}

function runAndParse(cmd, regex) {
  const output = exec(cmd, { maxBuffer: 50 * 1024 * 1024 })
  const match = output.match(regex)
  return match ? match[1] : undefined
}

function coreTestCounts() {
  try {
    const output = exec("npm test", { maxBuffer: 50 * 1024 * 1024 })
    const match = output.match(/Results:\s*(\d+)\s*passed,\s*(\d+)\s*failed/)
    if (match) {
      return { passed: Number(match[1]), failed: Number(match[2]) }
    }
  } catch (err) {
    // Some test suites may exit non-zero on failure; still try to parse output.
    const output = String(err.stdout || err.stderr || "")
    const match = output.match(/Results:\s*(\d+)\s*passed,\s*(\d+)\s*failed/)
    if (match) {
      return { passed: Number(match[1]), failed: Number(match[2]) }
    }
  }
  return { passed: null, failed: null }
}

function replayHash() {
  return runAndParse("node scripts/verify-replay.js 2>&1", /Replay hash:\s+([a-f0-9]+)/i)
}

function buildHash() {
  const manifestPath = path.join(ROOT, "dist", "dist-manifest.json")
  if (!fs.existsSync(manifestPath)) {
    return null
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  return manifest.rootHash || null
}

function repositoryStatus() {
  try {
    const status = exec("git status --short")
    // Allow the manifest file itself to be untracked during generation.
    const lines = status
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => !l.includes("docs/certifications/synth-platform-v1-0-manifest.json"))
    return {
      clean: lines.length === 0,
      modifications: lines,
    }
  } catch {
    return { clean: false, modifications: ["git status unavailable"] }
  }
}

function main() {
  const now = new Date().toISOString()
  const gitCommitOverride = parseArg("--commit")

  // Ensure the build artifacts exist.
  if (!fs.existsSync(path.join(ROOT, "dist", "dist-manifest.json"))) {
    console.log("dist/dist-manifest.json missing; running npm run build...")
    exec("npm run build", { stdio: "inherit" })
  }

  const gitCommit = gitCommitOverride || exec("git rev-parse HEAD")
  const gitTag = exec("git describe --tags --always")
  const packageJson = JSON.parse(readText("package.json"))
  const status = repositoryStatus()

  const sdkHash = hashFiles(["src/sdk/**/*.ts"])
  const adrBaseline = hashFiles(["docs/adr/ADR-*.md"])
  const capabilityRegistryHash = hashFile("src/capability/registry.ts")
  const eventModelHash = hashFile("src/types/event.ts")

  const manifest = {
    schema: "synth-platform-manifest-v1",
    name: "SYNTH Platform",
    version: "1.0.0",
    semanticVersion: "1.0.0",
    packageVersion: packageJson.version,
    gitTag: "v1.0.0",
    gitCommitSha: gitCommit,
    gitDescribe: gitTag,
    generatedAt: now,
    releaseDate: now,
    nodeEngine: packageJson.engines?.node,
    repositoryClean: status.clean,
    repositoryModifications: status.modifications,
    governanceSchemaVersion: "2.1",
    eventModel: {
      version: eventModelHash,
      hash: eventModelHash,
      source: "src/types/event.ts",
    },
    capabilityRegistry: {
      hash: capabilityRegistryHash,
      source: "src/capability/registry.ts",
    },
    sdk: {
      version: packageJson.version,
      hash: sdkHash.hash,
      files: sdkHash.files,
      source: "src/sdk/",
    },
    adrBaseline: {
      version: adrBaseline.hash,
      hash: adrBaseline.hash,
      files: adrBaseline.files,
      source: "docs/adr/",
    },
    build: {
      hash: buildHash(),
      source: "dist/dist-manifest.json rootHash",
    },
    replay: {
      hash: replayHash(),
      source: "node scripts/verify-replay.js",
    },
    tests: {
      core: coreTestCounts(),
    },
    certifications: [
      {
        track: "A",
        title: "Reproducibility Certificate",
        script: "scripts/certify-reproducibility.js",
        artifact: "proof/certifications/reproducibility-certificate.json",
      },
      {
        track: "B",
        title: "Operator Experience Certificate",
        script: "scripts/certify-operator-experience.js",
        artifact: "proof/certifications/operator-experience-certificate.json",
      },
      {
        track: "C",
        title: "Governance Certificate",
        script: "scripts/certify-governance.js",
        artifact: "proof/certifications/governance-certificate.json",
      },
      {
        track: "D",
        title: "Architecture Baseline Certificate",
        script: "scripts/certify-architecture-baseline.js",
        artifact: "proof/certifications/architecture-baseline-certificate.json",
      },
      {
        track: "E",
        title: "Release Readiness Certificate",
        script: "scripts/certify-release-readiness.js",
        artifact: "proof/certifications/release-readiness-certificate.json",
      },
    ],
    frozenSurfaces: [
      "src/core/",
      "src/control/",
      "src/runtime/",
      "src/domain/",
      "src/sdk/",
      "src/types/event.ts",
      "src/capability/registry.ts",
      "governance lifecycle",
      "replay engine",
      "CLI contracts",
      "derived state contract",
    ],
    compatibilityGuarantees: [
      "Replay hashes produced from the same event log are deterministic across clean clones.",
      "The public SDK surface in src/sdk/ is frozen for the v1.0 lifetime; additions only via additive exports.",
      "The event model in src/types/event.ts is frozen; new event types may be added but existing types are not modified.",
      "Governance schema version 2.1 is the canonical baseline for v1.0 projects.",
      "The capability registry contract is frozen; existing capability names and semantics are stable.",
      "The CLI JSON output contract is stable and versioned for machine consumers.",
      "The derived state contract is deterministic and reproducible from canonical events.",
    ],
    notes: [
      "This manifest is the canonical machine-readable record of SYNTH Platform v1.0.",
      "Regenerate with: node scripts/generate-platform-manifest.js",
      "The gitCommitSha field records the source commit used to produce the captured hashes.",
    ],
  }

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true })
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8")

  console.log("\n═══════════════════════════════════════════════════")
  console.log("  SYNTH Platform v1.0 Manifest Generated")
  console.log("═══════════════════════════════════════════════════\n")
  console.log(`  Path:    ${path.relative(ROOT, MANIFEST_PATH)}`)
  console.log(`  Version: ${manifest.version}`)
  console.log(`  Commit:  ${manifest.gitCommitSha}`)
  console.log(`  Build:   ${manifest.build.hash}`)
  console.log(`  Replay:  ${manifest.replay.hash}`)
  console.log(`  SDK:     ${manifest.sdk.hash}`)
  console.log(`  ADRs:    ${manifest.adrBaseline.files} documents → ${manifest.adrBaseline.hash}`)
  console.log(`  Tests:   ${JSON.stringify(manifest.tests.core)}`)
  console.log(`  Clean:   ${manifest.repositoryClean ? "✅" : "⚠️ dirty"}`)
  console.log("")
}

main()
