// ============================================================
// MUTATION: Filesystem Provider
// ============================================================
// Performs filesystem mutations on behalf of ExecutionGate.
// Only operations explicitly supported here may be executed.
// ============================================================

import fs from "fs/promises"
import path from "path"
import type { MutationProvider } from "./mutation-provider.js"
import type { MutationRequest, MutationResult } from "../types/index.js"

export class FilesystemMutationProvider implements MutationProvider {
  readonly namespace = "filesystem"

  async mutate(request: MutationRequest): Promise<MutationResult> {
    switch (request.operation) {
      case "write":
        return this.write(request)
      case "mkdir":
        return this.mkdir(request)
      case "append":
        return this.append(request)
      default:
        return {
          success: false,
          target: request.target,
          error: `Unsupported filesystem operation: ${request.operation}`,
        }
    }
  }

  private async write(request: MutationRequest): Promise<MutationResult> {
    const { target, payload } = request
    const content = typeof payload === "string" ? payload : String((payload as Record<string, unknown>)?.content ?? "")
    try {
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, content, "utf-8")
      return { success: true, target }
    } catch (err) {
      return { success: false, target, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async mkdir(request: MutationRequest): Promise<MutationResult> {
    const { target } = request
    try {
      await fs.mkdir(target, { recursive: true })
      return { success: true, target }
    } catch (err) {
      return { success: false, target, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async append(request: MutationRequest): Promise<MutationResult> {
    const { target, payload } = request
    const content = typeof payload === "string" ? payload : String((payload as Record<string, unknown>)?.content ?? "")
    try {
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.appendFile(target, content, "utf-8")
      return { success: true, target }
    } catch (err) {
      return { success: false, target, error: err instanceof Error ? err.message : String(err) }
    }
  }
}
