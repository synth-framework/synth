#!/usr/bin/env node
// ============================================================
// SYNTH MCP Server (EXP-DIST-003)
// ============================================================
// Exposes SYNTH capabilities through the Model Context Protocol.
// Communicates via JSON-RPC 2.0 over stdio.
//
// Usage:
//   node dist/distribution/mcp-server.js
//   node dist/distribution/mcp-server.js --project <path>
//
// The server advertises tools derived from the canonical AI Capability Model.
// Read-only and proposal tools are exposed. Mutating tools are exposed with
// destructive hints so MCP clients can enforce approval boundaries.
// ============================================================

import { readFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { spawn } from "child_process"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PROJECT_ROOT = path.resolve(__dirname, "..", "..")
const MODEL_PATH = path.resolve(PROJECT_ROOT, "src", "distribution", "ai-capability-model.json")

interface CapabilityModel {
  version: string
  platform: {
    name: string
    version: string
    tagline: string
  }
  publicVocabulary: {
    concepts: Array<{ name: string; definition: string }>
  }
  commandSafety: {
    commands: Array<{
      command: string
      safety: "READ_ONLY" | "PROPOSAL_ONLY" | "POTENTIALLY_MUTATING" | "MUTATING"
      description: string
      requiresApproval?: boolean
    }>
  }
  protectedAssets: {
    assets: Array<{ name: string; description: string }>
  }
  governanceLifecycle: {
    phases: Array<{ name: string; description: string }>
  }
}

interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, unknown>
    required?: string[]
  }
  annotations?: {
    title?: string
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
}

interface JsonRpcMessage {
  jsonrpc: "2.0"
  id?: number | string
  method?: string
  params?: unknown
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

function readModel(): CapabilityModel {
  const content = readFileSync(MODEL_PATH, "utf-8")
  return JSON.parse(content) as CapabilityModel
}

function commandToToolName(command: string): string {
  return `synth_${command.replace(/\s+/g, "_").replace(/-/g, "_")}`
}

function buildTools(model: CapabilityModel): McpTool[] {
  return model.commandSafety.commands.map((cmd) => {
    const name = commandToToolName(cmd.command)
    const isReadOnly = cmd.safety === "READ_ONLY"
    const isProposal = cmd.safety === "PROPOSAL_ONLY"
    const isMutating = cmd.safety === "MUTATING" || cmd.safety === "POTENTIALLY_MUTATING"

    const properties: Record<string, unknown> = {}
    const required: string[] = []

    // Extract common flags from command templates.
    if (cmd.command.includes("<subject>")) {
      properties.subject = { type: "string", description: "Subject or title" }
      required.push("subject")
    }
    if (cmd.command.includes("<purpose>")) {
      properties.purpose = { type: "string", description: "Purpose or goal" }
      required.push("purpose")
    }
    if (cmd.command.includes("<id>")) {
      properties.id = { type: "string", description: "Draft or entity ID" }
      required.push("id")
    }
    if (cmd.command.includes("<contract-id>")) {
      properties.contractId = { type: "string", description: "Alignment contract ID" }
      required.push("contractId")
    }
    if (cmd.command.includes("<path>")) {
      properties.path = { type: "string", description: "File or directory path" }
      required.push("path")
    }

    // Generic extra args for commands that accept open-ended input.
    properties.args = {
      type: "array",
      items: { type: "string" },
      description: "Additional positional or flag arguments to pass to synth",
    }

    return {
      name,
      description: `${cmd.description} (safety: ${cmd.safety}${cmd.requiresApproval ? ", requires approval" : ""})`,
      inputSchema: {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      },
      annotations: {
        title: `synth ${cmd.command}`,
        readOnlyHint: isReadOnly || isProposal,
        destructiveHint: isMutating,
        idempotentHint: isReadOnly || isProposal,
        openWorldHint: cmd.command.startsWith("adapter"),
      },
    }
  })
}

function buildServerInfo(model: CapabilityModel) {
  return {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {},
      logging: {},
    },
    serverInfo: {
      name: "synth-mcp-server",
      version: model.platform.version,
    },
  }
}

function runSynthCommand(
  projectDir: string | undefined,
  command: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const cliPath = path.resolve(PROJECT_ROOT, "dist", "cli", "synth.js")
  const allArgs = [cliPath, ...command.split(/\s+/), ...args]
  const cwd = projectDir || process.cwd()

  return new Promise((resolve) => {
    let stdout = ""
    let stderr = ""
    const child = spawn(process.execPath, allArgs, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    })
    child.stdout?.on("data", (data) => {
      stdout += data
    })
    child.stderr?.on("data", (data) => {
      stderr += data
    })
    child.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    })
  })
}

function parseToolArgs(input: Record<string, unknown>): string[] {
  const args: string[] = []

  if (typeof input.subject === "string") args.push("--subject", input.subject)
  if (typeof input.purpose === "string") args.push("--purpose", input.purpose)
  if (typeof input.id === "string") args.push("--draft-id", input.id)
  if (typeof input.contractId === "string") args.push("--alignment-contract-id", input.contractId)
  if (typeof input.path === "string") args.push(input.path)

  if (Array.isArray(input.args)) {
    for (const arg of input.args) {
      if (typeof arg === "string") args.push(arg)
    }
  }

  return args
}

class McpServer {
  private model: CapabilityModel
  private tools: McpTool[]
  private projectDir: string | undefined
  private initialized = false

  constructor(projectDir?: string) {
    this.model = readModel()
    this.tools = buildTools(this.model)
    this.projectDir = projectDir
  }

  private send(message: JsonRpcMessage) {
    const line = JSON.stringify(message)
    process.stdout.write(line + "\n")
  }

  private sendResult(id: number | string, result: unknown) {
    this.send({ jsonrpc: "2.0", id, result })
  }

  private sendError(id: number | string | undefined, code: number, message: string) {
    if (id === undefined) return
    this.send({ jsonrpc: "2.0", id, error: { code, message } })
  }

  async handleMessage(message: JsonRpcMessage) {
    if (message.jsonrpc !== "2.0") return

    const { id, method, params } = message
    const isNotification = id === undefined

    if (method === "initialize") {
      if (isNotification) return
      this.sendResult(id as number | string, buildServerInfo(this.model))
      return
    }

    // MCP lifecycle notification from client.
    if (method === "initialized" || method === "notifications/initialized") {
      this.initialized = true
      return
    }

    if (method === "tools/list") {
      if (isNotification) return
      this.sendResult(id as number | string, { tools: this.tools })
      return
    }

    if (method === "tools/call") {
      if (isNotification) return
      await this.handleToolCall(id as number | string, params as Record<string, unknown>)
      return
    }

    if (method === "notifications/cancelled") {
      return
    }

    if (isNotification) {
      // Ignore unknown notifications silently.
      return
    }

    this.sendError(id, -32601, `Method not found: ${method}`)
  }

  private async handleToolCall(id: number | string, params: Record<string, unknown>) {
    const toolName = params.name as string
    const input = (params.arguments as Record<string, unknown>) || {}

    const tool = this.tools.find((t) => t.name === toolName)
    if (!tool) {
      this.sendResult(id, {
        content: [{ type: "text", text: `Tool not found: ${toolName}` }],
        isError: true,
      })
      return
    }

    const commandEntry = this.model.commandSafety.commands.find((c) => commandToToolName(c.command) === toolName)
    if (!commandEntry) {
      this.sendResult(id, {
        content: [{ type: "text", text: `Command metadata not found for tool: ${toolName}` }],
        isError: true,
      })
      return
    }

    const args = parseToolArgs(input)
    const result = await runSynthCommand(this.projectDir, commandEntry.command, args)

    if (result.exitCode !== 0) {
      this.sendResult(id, {
        content: [
          { type: "text", text: result.stdout || result.stderr || `Command exited with code ${result.exitCode}` },
        ],
        isError: true,
      })
      return
    }

    this.sendResult(id, {
      content: [{ type: "text", text: result.stdout }],
    })
  }

  run() {
    let buffer = ""
    process.stdin.setEncoding("utf-8")
    process.stdin.on("data", (chunk) => {
      buffer += chunk
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const message = JSON.parse(line) as JsonRpcMessage
          this.handleMessage(message).catch((err) => {
            this.sendError(undefined, -32603, err instanceof Error ? err.message : String(err))
          })
        } catch (err) {
          this.sendError(undefined, -32700, err instanceof Error ? err.message : String(err))
        }
      }
    })

    process.stdin.on("end", () => {
      if (buffer.trim()) {
        try {
          const message = JSON.parse(buffer) as JsonRpcMessage
          this.handleMessage(message).catch(() => {
            // Ignore errors during shutdown.
          })
        } catch {
          // Ignore trailing malformed input.
        }
      }
      process.exit(0)
    })
  }
}

function main() {
  const args = process.argv.slice(2)
  const projectIndex = args.indexOf("--project")
  const projectDir = projectIndex >= 0 ? args[projectIndex + 1] : undefined

  const server = new McpServer(projectDir)
  server.run()
}

main()
