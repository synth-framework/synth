// ============================================================
// SYNTH MCP Server Tests (EXP-DIST-003)
// ============================================================
// Verifies that the MCP server responds to the JSON-RPC lifecycle,
// advertises tools derived from the canonical model, and executes
// read-only synth commands correctly.
// ============================================================

import { spawn } from "child_process"
import path from "path"
import fs from "fs/promises"
import os from "os"

const PROJECT_ROOT = process.cwd()
const SERVER_PATH = path.resolve(PROJECT_ROOT, "dist", "distribution", "mcp-server.js")
const MODEL_PATH = path.resolve(PROJECT_ROOT, "src", "distribution", "ai-capability-model.json")

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function readModel() {
  const content = await fs.readFile(MODEL_PATH, "utf-8")
  return JSON.parse(content)
}

function startServer(projectDir) {
  const args = [SERVER_PATH]
  if (projectDir) args.push("--project", projectDir)
  const child = spawn("node", args, {
    cwd: PROJECT_ROOT,
    stdio: ["pipe", "pipe", "pipe"],
  })

  let buffer = ""
  const pending = new Map()
  let idCounter = 1

  child.stdout.on("data", (data) => {
    buffer += data
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const message = JSON.parse(line)
        if (message.id !== undefined && pending.has(message.id)) {
          const { resolve, reject } = pending.get(message.id)
          pending.delete(message.id)
          if (message.error) {
            reject(new Error(message.error.message))
          } else {
            resolve(message.result)
          }
        }
      } catch {
        // Ignore non-JSON lines.
      }
    }
  })

  function send(method, params) {
    const id = idCounter++
    const message = { jsonrpc: "2.0", id, method, params }
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      child.stdin.write(JSON.stringify(message) + "\n")
    })
  }

  function notify(method, params) {
    const message = { jsonrpc: "2.0", method, params }
    child.stdin.write(JSON.stringify(message) + "\n")
  }

  function stop() {
    child.stdin.end()
    return new Promise((resolve) => {
      child.on("close", resolve)
    })
  }

  return { send, notify, stop, stderr: child.stderr }
}

async function testInitialize() {
  const server = startServer()
  try {
    const result = await server.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    })
    assert(result.protocolVersion === "2024-11-05", "Server must support protocol version 2024-11-05")
    assert(result.serverInfo.name === "synth-mcp-server", "Server must identify as synth-mcp-server")
    assert(result.capabilities.tools !== undefined, "Server must advertise tools capability")
    console.log("[PASS] Initialize handshake succeeds")
  } finally {
    await server.stop()
  }
}

async function testInitializedNotification() {
  const server = startServer()
  try {
    await server.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    })
    // notifications/initialized has no response; notify must not hang.
    server.notify("initialized", {})
    console.log("[PASS] Initialized notification accepted")
  } finally {
    await server.stop()
  }
}

async function testToolsList() {
  const model = await readModel()
  const server = startServer()
  try {
    await server.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    })
    server.notify("initialized", {})
    const result = await server.send("tools/list", {})
    assert(Array.isArray(result.tools), "tools/list must return an array of tools")
    assert(result.tools.length >= model.commandSafety.commands.length, `Expected at least ${model.commandSafety.commands.length} tools, got ${result.tools.length}`)

    const statusTool = result.tools.find((t) => t.name === "synth_status")
    assert(statusTool !== undefined, "synth_status tool must be advertised")
    assert(statusTool.annotations.readOnlyHint === true, "synth_status must be marked read-only")
    assert(statusTool.inputSchema.type === "object", "Tool input schema must be an object")

    const governTool = result.tools.find((t) => t.name === "synth_govern")
    assert(governTool !== undefined, "synth_govern tool must be advertised")
    assert(governTool.annotations.destructiveHint === true, "synth_govern must be marked destructive")

    console.log(`[PASS] tools/list returns ${result.tools.length} tools`)
  } finally {
    await server.stop()
  }
}

async function testReadOnlyToolCall() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-mcp-"))
  const server = startServer(tmpDir)
  try {
    await server.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    })
    server.notify("initialized", {})
    const result = await server.send("tools/call", {
      name: "synth_doctor",
      arguments: {},
    })
    assert(Array.isArray(result.content), "Tool result must include content array")
    assert(result.content.length > 0, "Tool result content must not be empty")
    assert(result.content[0].type === "text", "Tool result content must be text")
    assert(!result.isError, "synth_doctor should not return an error")
    assert(result.content[0].text.includes("synth"), "synth_doctor output should mention synth")
    console.log("[PASS] Read-only tool call executes successfully")
  } finally {
    await server.stop()
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testUnknownToolReturnsError() {
  const server = startServer()
  try {
    await server.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    })
    server.notify("initialized", {})
    const result = await server.send("tools/call", {
      name: "synth_nonexistent",
      arguments: {},
    })
    assert(result.isError === true, "Unknown tool must return isError=true")
    console.log("[PASS] Unknown tool returns error result")
  } finally {
    await server.stop()
  }
}

async function testDeterministicToolManifest() {
  const server1 = startServer()
  const server2 = startServer()
  try {
    const result1 = await server1.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    })
    const result2 = await server2.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    })
    assert(JSON.stringify(result1.serverInfo) === JSON.stringify(result2.serverInfo), "Server info must be deterministic")
    console.log("[PASS] Server handshake is deterministic")
  } finally {
    await server1.stop()
    await server2.stop()
  }
}

async function main() {
  console.log("Running MCP server tests...")
  await testInitialize()
  await testInitializedNotification()
  await testToolsList()
  await testReadOnlyToolCall()
  await testUnknownToolReturnsError()
  await testDeterministicToolManifest()
  console.log("\nAll MCP server tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
