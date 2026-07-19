// ============================================================
// DISTRIBUTION: SYNTH MCP Server
// ============================================================
// Exposes SYNTH capabilities through the Model Context Protocol.
// This skeleton uses stdio transport and implements a small set
// of read-only tools. Mutations are delegated to the SYNTH CLI
// so that the ExecutionGate remains the single authority.
//
// EXP-DIST-003
// ============================================================

import { bootstrap } from "../../core/bootstrap.js"
import { getCapabilityModel } from "../capability-model.js"

export type McpTool = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export type McpRequest = {
  jsonrpc: "2.0"
  id?: number | string
  method: string
  params?: Record<string, unknown>
}

export type McpResponse = {
  jsonrpc: "2.0"
  id?: number | string
  result?: unknown
  error?: { code: number; message: string }
}

const TOOLS: McpTool[] = [
  {
    name: "synth_status",
    description: "Report the current SYNTH project governance status",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "synth_list_capabilities",
    description: "List SYNTH capabilities and supported CLI commands",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "synth_explain_replay",
    description: "Verify replay consistency for the current project",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "synth_list_skills",
    description: "List SYNTH agent skills and their triggers",
    inputSchema: { type: "object", properties: {} },
  },
]

async function handleToolCall(name: string, _args: Record<string, unknown>): Promise<unknown> {
  const model = getCapabilityModel()

  switch (name) {
    case "synth_list_capabilities": {
      return {
        capabilities: model.capabilities.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          commands: c.commands,
        })),
      }
    }

    case "synth_list_skills": {
      return {
        skills: model.skills.map((s) => ({
          id: s.id,
          name: s.name,
          trigger: s.trigger,
          description: s.description,
        })),
      }
    }

    case "synth_status": {
      const ctx = await bootstrap({ skipGenesis: true, infra: { persistence: "file" } })
      const state = await ctx.runtime.getState()
      return {
        lifecycle: state.lifecycle,
        missions: Object.keys(state.missions).length,
        expeditions: Object.keys(state.expeditions).length,
        discoveries: Object.keys(state.discoveries).length,
        repositoryInitialized: state.repository !== undefined,
      }
    }

    case "synth_explain_replay": {
      const { createReplayVerifier } = await import("../../core/replay-verifier.js")
      const ctx = await bootstrap({ skipGenesis: true, infra: { persistence: "file" } })
      const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
      const result = await verifier.verify()
      return {
        consistent: result.consistent,
        eventCount: result.eventCount,
        chainValid: result.chainValid,
        explanation: result.explanation,
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

export async function handleRequest(request: McpRequest): Promise<McpResponse> {
  switch (request.method) {
    case "initialize": {
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: {
            name: "synth-mcp-server",
            version: model.version,
          },
        },
      }
    }

    case "tools/list": {
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: { tools: TOOLS },
      }
    }

    case "tools/call": {
      const params = request.params || {}
      const name = String(params.name || "")
      const args = (params.arguments as Record<string, unknown>) || {}
      try {
        const result = await handleToolCall(name, args)
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
        }
      } catch (err) {
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32603,
            message: err instanceof Error ? err.message : String(err),
          },
        }
      }
    }

    default:
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32601, message: `Method not found: ${request.method}` },
      }
  }
}

const model = getCapabilityModel()

export function startMcpServer(): void {
  const stdin = process.stdin
  const stdout = process.stdout
  stdin.setEncoding("utf-8")

  let buffer = ""
  stdin.on("data", async (chunk) => {
    buffer += chunk
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      if (!line.trim()) continue
      let request: McpRequest
      try {
        request = JSON.parse(line) as McpRequest
      } catch {
        stdout.write(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } }) + "\n")
        continue
      }
      const response = await handleRequest(request)
      stdout.write(JSON.stringify(response) + "\n")
    }
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startMcpServer()
}
