// src/infra/telemetry.ts
//
// Minimal, dependency-free telemetry for SYNTH CLI internals.
// Not a full APM — just phase timing + structured error capture + a
// synchronous stderr trail so a hung command shows the last phase it entered.
import { performance } from "node:perf_hooks"
import { appendFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

export interface Span {
  name: string
  startedAt: number
  endedAt?: number
  error?: string
}

class Telemetry {
  private spans: Span[] = []
  private sink?: string
  readonly enabled: boolean

  constructor() {
    this.enabled = process.env.SYNTH_TELEMETRY !== "0"
    const sinkEnv = process.env.SYNTH_TELEMETRY_SINK
    if (sinkEnv) {
      this.sink = sinkEnv
    } else {
      try {
        this.sink = fileURLToPath(new URL("../../.synth/ai/telemetry.jsonl", import.meta.url))
      } catch {
        this.sink = undefined
      }
    }
  }

  start(name: string): Span {
    const span: Span = { name, startedAt: performance.now() }
    this.spans.push(span)
    this.emit("span:start", { name })
    return span
  }

  end(span: Span, err?: unknown): void {
    span.endedAt = performance.now()
    if (err !== undefined) span.error = err instanceof Error ? err.message : String(err)
    this.emit("span:end", {
      name: span.name,
      ms: Math.round((span.endedAt - span.startedAt) * 100) / 100,
      error: span.error,
    })
  }

  error(err: unknown, ctx?: Record<string, unknown>): void {
    this.emit("error", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      ...ctx,
    })
  }

  openSpans(): string[] {
    return this.spans.filter((s) => s.endedAt === undefined).map((s) => s.name)
  }

  flushOpen(): void {
    const open = this.openSpans()
    if (open.length) this.emit("open-spans", { spans: open })
  }

  private emit(kind: string, payload: Record<string, unknown>): void {
    if (!this.enabled) return
    const line = JSON.stringify({ ts: new Date().toISOString(), kind, ...payload })
    process.stderr.write(`[telemetry] ${line}\n`)
    if (this.sink) {
      try {
        appendFileSync(this.sink, line + "\n")
      } catch {
        // sink writes are best-effort
      }
    }
  }
}

export const telemetry = new Telemetry()

let installed = false
export function installTelemetryHandlers(): void {
  if (installed) return
  installed = true
  process.on("uncaughtException", (err) => {
    telemetry.error(err, { fatal: "uncaughtException" })
    telemetry.flushOpen()
  })
  process.on("unhandledRejection", (reason) => {
    telemetry.error(reason, { fatal: "unhandledRejection" })
    telemetry.flushOpen()
  })
  process.on("SIGINT", () => {
    telemetry.flushOpen()
    process.exit(130)
  })
  process.on("SIGTERM", () => {
    telemetry.flushOpen()
    process.exit(143)
  })
}
