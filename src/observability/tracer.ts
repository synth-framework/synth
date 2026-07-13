// ============================================================
// OBSERVABILITY: Tracing + Logging
// ============================================================

import crypto from "crypto"
import type { SynthEvent, Transaction } from "../types/index.js"

export type TraceRecord = {
  traceId: string
  transactionId: string
  timestamp: number
  actor: string
  capability: string
  duration: number
  status: "success" | "error"
  eventCount: number
  error?: string
}

export class Tracer {
  private traces: TraceRecord[] = []
  private maxTraces: number

  constructor(maxTraces: number = 1000) {
    this.maxTraces = maxTraces
  }

  trace(
    tx: Transaction,
    actor: string,
    capability: string,
    events: SynthEvent[],
    startTime: number
  ): void {
    const record: TraceRecord = {
      traceId: crypto.randomUUID(),
      transactionId: tx.id,
      timestamp: Date.now(),
      actor,
      capability,
      duration: Date.now() - startTime,
      status: "success",
      eventCount: events.length,
    }
    this.addTrace(record)
  }

  traceError(
    txId: string,
    actor: string,
    capability: string,
    error: Error,
    startTime: number
  ): void {
    const record: TraceRecord = {
      traceId: crypto.randomUUID(),
      transactionId: txId,
      timestamp: Date.now(),
      actor,
      capability,
      duration: Date.now() - startTime,
      status: "error",
      eventCount: 0,
      error: error.message,
    }
    this.addTrace(record)
  }

  private addTrace(record: TraceRecord): void {
    this.traces.push(record)
    if (this.traces.length > this.maxTraces) {
      this.traces = this.traces.slice(-this.maxTraces)
    }
  }

  getTraces(): TraceRecord[] {
    return [...this.traces]
  }

  getTracesForTransaction(txId: string): TraceRecord[] {
    return this.traces.filter((t) => t.transactionId === txId)
  }

  getTracesForActor(actor: string): TraceRecord[] {
    return this.traces.filter((t) => t.actor === actor)
  }

  getErrors(): TraceRecord[] {
    return this.traces.filter((t) => t.status === "error")
  }

  getStats() {
    const total = this.traces.length
    const successful = this.traces.filter((t) => t.status === "success").length
    const failed = total - successful
    const avgDuration = total > 0
      ? this.traces.reduce((sum, t) => sum + t.duration, 0) / total
      : 0

    return {
      totalExecutions: total,
      successfulExecutions: successful,
      failedExecutions: failed,
      averageDuration: Math.round(avgDuration),
    }
  }

  clear(): void {
    this.traces = []
  }
}

export class Logger {
  private component: string

  constructor(component: string) {
    this.component = component
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log("INFO", message, meta)
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("WARN", message, meta)
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log("ERROR", message, meta)
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log("DEBUG", message, meta)
  }

  private log(level: string, message: string, meta?: Record<string, unknown>): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      ...meta,
    }
    // Diagnostic logs go to stderr so structured CLI output can use stdout.
    console.error(JSON.stringify(entry))
  }
}
