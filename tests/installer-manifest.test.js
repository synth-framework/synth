// ============================================================
// Synth Installer Manifest Tests
// ============================================================
// Verifies manifest generation and schema validation.
// ============================================================

import fs from "fs"
import http from "http"
import os from "os"
import path from "path"
import { spawn, spawnSync } from "child_process"

const GENERATOR_PATH = path.resolve(process.cwd(), "scripts", "generate-installer-manifest.js")
const VALIDATOR_PATH = path.resolve(process.cwd(), "scripts", "verify-installer-manifest.js")
const PACKAGE_JSON_PATH = path.resolve(process.cwd(), "package.json")

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "synth-installer-manifest-"))
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function runNode(scriptPath, args = [], env = {}) {
  const result = spawnSync("node", [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf-8",
    env: { ...process.env, ...env },
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

async function testGeneratesValidManifest() {
  const tmpDir = makeTempDir()
  const outputPath = path.join(tmpDir, "installer-manifest.json")
  const result = runNode(GENERATOR_PATH, [outputPath])
  assert(result.status === 0, `Generator must exit 0, got: ${result.stderr}`)
  assert(fs.existsSync(outputPath), "Manifest file must be created")

  const manifest = JSON.parse(fs.readFileSync(outputPath, "utf-8"))
  assert(manifest.schema === 1, "Manifest schema must be 1")
  assert(typeof manifest.generatedAt === "string", "Manifest must have generatedAt")
  assert(manifest.channels.latest, "Manifest must have latest channel")
  assert(manifest.channels.stable, "Manifest must have stable channel")
  assert(typeof manifest.channels.latest.version === "string", "Latest channel must have version")
  assert(manifest.channels.latest.npm === "@synth-framework/synth", "Latest npm package must be @synth-framework/synth")

  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"))
  assert(manifest.channels.latest.version === pkg.version, `Manifest version must match package.json: ${pkg.version}`)
}

async function testValidatorAcceptsValidManifest() {
  const tmpDir = makeTempDir()
  const outputPath = path.join(tmpDir, "installer-manifest.json")
  const generateResult = runNode(GENERATOR_PATH, [outputPath])
  assert(generateResult.status === 0, "Generator must succeed")

  const validateResult = runNode(VALIDATOR_PATH, [outputPath])
  assert(validateResult.status === 0, `Validator must accept valid manifest: ${validateResult.stderr}`)
  assert(validateResult.stdout.includes("✅ Installer manifest is valid"), "Validator must report success")
}

async function testValidatorRejectsMissingChannel() {
  const tmpDir = makeTempDir()
  const outputPath = path.join(tmpDir, "installer-manifest.json")

  const invalidManifest = {
    schema: 1,
    generatedAt: new Date().toISOString(),
    channels: {
      latest: {
        version: "2.0.0",
        npm: "@synth-framework/synth",
      },
    },
  }

  fs.writeFileSync(outputPath, JSON.stringify(invalidManifest), "utf-8")
  const validateResult = runNode(VALIDATOR_PATH, [outputPath])
  assert(validateResult.status !== 0, "Validator must reject missing stable channel")
  assert(validateResult.stderr.includes("stable") || validateResult.stdout.includes("stable"), "Validator must mention missing stable channel")
}

async function testValidatorRejectsBadSchema() {
  const tmpDir = makeTempDir()
  const outputPath = path.join(tmpDir, "installer-manifest.json")

  const invalidManifest = {
    schema: 99,
    generatedAt: new Date().toISOString(),
    channels: {
      latest: { version: "2.0.0", npm: "@synth-framework/synth" },
      stable: { version: "2.0.0", npm: "@synth-framework/synth" },
    },
  }

  fs.writeFileSync(outputPath, JSON.stringify(invalidManifest), "utf-8")
  const validateResult = runNode(VALIDATOR_PATH, [outputPath])
  assert(validateResult.status !== 0, "Validator must reject unsupported schema")
}

async function testInstallerReadsManifest() {
  const manifestVersion = "99.99.99-test"

  const manifest = {
    schema: 1,
    generatedAt: new Date().toISOString(),
    channels: {
      latest: {
        version: manifestVersion,
        npm: "@synth-framework/synth",
      },
      stable: {
        version: manifestVersion,
        npm: "@synth-framework/synth",
      },
    },
  }

  const serverScript = `
    const http = require("http");
    const manifest = ${JSON.stringify(manifest)};
    const server = http.createServer((req, res) => {
      if (req.url === "/installer-manifest.json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(manifest));
        return;
      }
      res.writeHead(404);
      res.end("Not found");
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      console.log("PORT:" + port);
    });
  `

  const serverProcess = spawn("node", ["-e", serverScript], {
    cwd: process.cwd(),
    encoding: "utf-8",
  })

  let port = ""
  let serverOutput = ""

  serverProcess.stdout.on("data", (data) => {
    serverOutput += data.toString()
    const match = serverOutput.match(/PORT:(\d+)/)
    if (match && !port) {
      port = match[1]
    }
  })

  await new Promise((resolve) => {
    const interval = setInterval(() => {
      if (port) {
        clearInterval(interval)
        resolve()
      }
    }, 50)
  })

  const baseUrl = `http://127.0.0.1:${port}`

  try {
    const result = spawnSync("bash", [path.resolve(process.cwd(), "scripts", "install.sh"), "--dry-run"], {
      cwd: process.cwd(),
      encoding: "utf-8",
      env: {
        ...process.env,
        SYNTH_INSTALLER_BASE_URL: baseUrl,
      },
      timeout: 30000,
    })

    assert(result.status === 0, `Installer dry-run must succeed: ${result.stderr}`)
    assert(result.stdout.includes(manifestVersion), "Installer must resolve version from manifest")
  } finally {
    serverProcess.kill()
  }
}

async function main() {
  console.log("Running installer manifest tests...")

  await testGeneratesValidManifest()
  console.log("✓ Manifest generator produces a valid manifest")

  await testValidatorAcceptsValidManifest()
  console.log("✓ Manifest validator accepts a valid manifest")

  await testValidatorRejectsMissingChannel()
  console.log("✓ Manifest validator rejects missing required channel")

  await testValidatorRejectsBadSchema()
  console.log("✓ Manifest validator rejects unsupported schema")

  await testInstallerReadsManifest()
  console.log("✓ Installer resolves version from published manifest")

  console.log("\nAll installer manifest tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
