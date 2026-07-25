// ============================================================
// Track A — Reproducibility Certification
// ============================================================
// Certifies that SYNTH Platform v1.0 can be built, tested, and
// replayed deterministically from a clean clone.
//
// Usage:
//   node scripts/certify-reproducibility.js [--output <path>] [--full]
//
// --full  Run the complete `npm run govern` pipeline in the clone.
//         Without --full, the script runs a representative subset
//         (build + core tests + first-operator-experience + replay
//         determinism) that is fast enough for iterative validation.
// ============================================================

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..")

function run(command, args, cwd, env = {}) {
  const start = Date.now()
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 600000,
    maxBuffer: 50 * 1024 * 1024,
  })
  const durationMs = Date.now() - start
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    durationMs,
    timedOut: Boolean(result.error && result.error.code === "ETIMEDOUT"),
  }
}

function log(message) {
  console.log(message)
}

function fail(stage, detail) {
  return {
    certified: false,
    stage,
    detail,
  }
}

function runDeterminismCheck(cloneDir) {
  return run("npm", ["run", "test:determinism"], cloneDir)
}

async function main() {
  const args = process.argv.slice(2)
  const outputFlag = args.indexOf("--output")
  const outputPath = outputFlag >= 0 ? args[outputFlag + 1] : path.join(REPO_ROOT, "proof", "certifications", "reproducibility-certificate.json")
  const fullMode = args.includes("--full")

  const certificate = {
    schema: "synth-reproducibility-certificate-v1",
    program: "EXP-PROGRAM-042",
    track: "A",
    title: "Reproducibility Certificate",
    certified: false,
    generatedAt: new Date().toISOString(),
    fullMode,
    stages: [],
    clone: {},
    determinism: {},
  }

  const cloneParent = fs.mkdtempSync(path.join(os.tmpdir(), "synth-reproducibility-"))
  const cloneDir = path.join(cloneParent, "synth")

  try {
    // Stage 1 — Clean clone
    log("[Track A] Cloning repository...")
    const cloneResult = run("git", ["clone", "--depth", "1", `file://${REPO_ROOT}`, cloneDir], REPO_ROOT)
    certificate.stages.push({
      stage: "clone",
      status: cloneResult.status === 0 ? "passed" : "failed",
      durationMs: cloneResult.durationMs,
    })
    if (cloneResult.status !== 0) {
      certificate.stages[certificate.stages.length - 1].stderr = cloneResult.stderr.slice(0, 2000)
      throw fail("clone", cloneResult.stderr)
    }
    log("  ✓ clean clone")

    certificate.clone = {
      source: REPO_ROOT,
      destination: cloneDir,
      commit: run("git", ["rev-parse", "HEAD"], cloneDir).stdout.trim(),
    }

    // Stage 2 — npm install
    log("[Track A] Installing dependencies...")
    const installResult = run("npm", ["install"], cloneDir)
    certificate.stages.push({
      stage: "install",
      status: installResult.status === 0 ? "passed" : "failed",
      durationMs: installResult.durationMs,
    })
    if (installResult.status !== 0) {
      certificate.stages[certificate.stages.length - 1].stderr = installResult.stderr.slice(0, 2000)
      throw fail("install", installResult.stderr)
    }
    log("  ✓ npm install")

    // Stage 3 — npm run build
    log("[Track A] Building...")
    const buildResult = run("npm", ["run", "build"], cloneDir)
    certificate.stages.push({
      stage: "build",
      status: buildResult.status === 0 ? "passed" : "failed",
      durationMs: buildResult.durationMs,
    })
    if (buildResult.status !== 0) {
      certificate.stages[certificate.stages.length - 1].stderr = buildResult.stderr.slice(0, 2000)
      throw fail("build", buildResult.stderr)
    }
    log("  ✓ npm run build")

    // Stage 4 — governance pipeline
    log(`[Track A] Running governance pipeline (${fullMode ? "full" : "representative"})...`)
    const pipelineCommand = fullMode ? ["run", "govern"] : ["test"]
    const pipelineResult = run("npm", pipelineCommand, cloneDir)
    certificate.stages.push({
      stage: "governance-pipeline",
      status: pipelineResult.status === 0 ? "passed" : "failed",
      durationMs: pipelineResult.durationMs,
      mode: fullMode ? "full" : "representative",
    })
    if (pipelineResult.status !== 0) {
      certificate.stages[certificate.stages.length - 1].stderr = pipelineResult.stderr.slice(0, 2000)
      throw fail("governance-pipeline", pipelineResult.stderr)
    }
    log(`  ✓ governance pipeline (${fullMode ? "full" : "representative"})`)

    // Stage 5 — First operator experience (operator-facing determinism)
    if (!fullMode) {
      log("[Track A] Running first operator experience certification...")
      const foeResult = run("npm", ["run", "test:first-operator-experience"], cloneDir)
      certificate.stages.push({
        stage: "first-operator-experience",
        status: foeResult.status === 0 ? "passed" : "failed",
        durationMs: foeResult.durationMs,
      })
      if (foeResult.status !== 0) {
        certificate.stages[certificate.stages.length - 1].stderr = foeResult.stderr.slice(0, 2000)
        throw fail("first-operator-experience", foeResult.stderr)
      }
      log("  ✓ first operator experience")
    }

    // Stage 6 — Determinism: run the representative pipeline a second time
    log("[Track A] Verifying determinism with second pass...")
    const pass2Parent = fs.mkdtempSync(path.join(os.tmpdir(), "synth-reproducibility-pass2-"))
    const pass2Dir = path.join(pass2Parent, "synth")

    const clone2Result = run("git", ["clone", "--depth", "1", `file://${REPO_ROOT}`, pass2Dir], REPO_ROOT)
    if (clone2Result.status !== 0) throw fail("clone-pass2", clone2Result.stderr)

    const install2Result = run("npm", ["install"], pass2Dir)
    if (install2Result.status !== 0) throw fail("install-pass2", install2Result.stderr)

    const build2Result = run("npm", ["run", "build"], pass2Dir)
    if (build2Result.status !== 0) throw fail("build-pass2", build2Result.stderr)

    const pipeline2Result = run("npm", pipelineCommand, pass2Dir)
    if (pipeline2Result.status !== 0) throw fail("governance-pipeline-pass2", pipeline2Result.stderr)

    if (!fullMode) {
      const foe2Result = run("npm", ["run", "test:first-operator-experience"], pass2Dir)
      if (foe2Result.status !== 0) throw fail("first-operator-experience-pass2", foe2Result.stderr)
    }

    log("[Track A] Running determinism check in first clone...")
    const det1 = runDeterminismCheck(cloneDir)
    log("[Track A] Running determinism check in second clone...")
    const det2 = runDeterminismCheck(pass2Dir)

    certificate.determinism = {
      pass1: { status: det1.status === 0 ? "passed" : "failed", path: cloneDir },
      pass2: { status: det2.status === 0 ? "passed" : "failed", path: pass2Dir },
      bothPassed: det1.status === 0 && det2.status === 0,
    }

    certificate.stages.push({
      stage: "determinism",
      status: certificate.determinism.bothPassed ? "passed" : "failed",
      durationMs: det1.durationMs + det2.durationMs,
    })

    if (!certificate.determinism.bothPassed) {
      const detail = [det1, det2]
        .map((r, i) => (r.status !== 0 ? `Pass ${i + 1} stderr: ${r.stderr.slice(0, 500)}` : ""))
        .filter(Boolean)
        .join("; ")
      throw fail("determinism", detail || "Determinism check failed in at least one clean clone")
    }
    log("  ✓ determinism verified")

    certificate.certified = true

    // Cleanup pass2
    fs.rmSync(pass2Parent, { recursive: true, force: true })
  } catch (err) {
    certificate.certified = false
    certificate.failure = {
      stage: err.stage || "unknown",
      detail: err.detail || err.message,
    }
  } finally {
    fs.rmSync(cloneParent, { recursive: true, force: true })
  }

  await fsp.mkdir(path.dirname(outputPath), { recursive: true })
  await fsp.writeFile(outputPath, JSON.stringify(certificate, null, 2), "utf8")

  log("")
  log(`Reproducibility Certificate: ${outputPath}`)
  log(`Certified: ${certificate.certified}`)
  if (!certificate.certified) {
    log(`Failure stage: ${certificate.failure?.stage}`)
    log(`Failure detail: ${certificate.failure?.detail?.slice(0, 500)}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
