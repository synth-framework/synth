// ============================================================
// ENVIRONMENT: Filesystem Capability
// ============================================================
// Filesystem capability provider interface and POSIX reference
// implementation. The Core must never import fs/path directly;
// all filesystem interaction flows through this capability.
// ============================================================

import { resolve, dirname } from "node:path"
import * as sdkFiles from "../sdk/files/index.js"
import { IllegalMutationError } from "../core/errors.js"

export const FILESYSTEM_WRITE_TOKEN = Symbol("FILESYSTEM_WRITE_TOKEN")

/** Filesystem capability provider interface */
export interface FilesystemProvider {
  readonly name: string
  readonly version: string
  readonly root: string
  readFile(path: string): Promise<string | undefined>
  writeFile(path: string, content: string): Promise<void>
  listDirectory(path: string): Promise<string[]>
  pathExists(path: string): Promise<boolean>
  isDirectory(path: string): Promise<boolean>
  ensureDirectory(path: string): Promise<void>
  deleteFile(path: string): Promise<void>
}

/** POSIX filesystem provider using Node.js fs/promises */
export class PosixFilesystemProvider implements FilesystemProvider {
  readonly name = "posix-filesystem"
  readonly version = "1.0.0"
  readonly root: string
  private writeToken: symbol | undefined

  constructor(root: string, writeToken?: symbol) {
    this.root = root
    this.writeToken = writeToken
  }

  private resolve(path: string): string {
    return resolve(this.root, path)
  }

  private ensureAuthorized(token?: symbol): void {
    if (token !== FILESYSTEM_WRITE_TOKEN) {
      throw new IllegalMutationError(
        "ILLEGAL_FILESYSTEM_WRITE: FilesystemProvider writes require an authorized token. " +
          "Direct writeFile calls without authorization are forbidden."
      )
    }
  }

  async readFile(path: string): Promise<string | undefined> {
    return sdkFiles.readFileMaybe(this.resolve(path))
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.ensureAuthorized(this.writeToken)
    return sdkFiles.writeFile(this.resolve(path), content)
  }

  async listDirectory(path: string): Promise<string[]> {
    return sdkFiles.listDirectory(this.resolve(path))
  }

  async pathExists(path: string): Promise<boolean> {
    return sdkFiles.exists(this.resolve(path))
  }

  async isDirectory(path: string): Promise<boolean> {
    return sdkFiles.isDirectory(this.resolve(path))
  }

  async ensureDirectory(path: string): Promise<void> {
    return sdkFiles.ensureDirectory(this.resolve(path))
  }

  async deleteFile(path: string): Promise<void> {
    return sdkFiles.deleteFile(this.resolve(path))
  }
}

/** In-memory filesystem provider for testing */
export class InMemoryFilesystemProvider implements FilesystemProvider {
  readonly name = "in-memory-filesystem"
  readonly version = "1.0.0"
  readonly root = "/"
  private files = new Map<string, string>()
  private directories = new Set<string>()
  private writeToken: symbol | undefined

  constructor(initialFiles: Record<string, string> = {}, writeToken?: symbol) {
    this.writeToken = writeToken
    this.directories.add("/")
    for (const [path, content] of Object.entries(initialFiles)) {
      this.files.set(path, content)
      let dir = dirname(path)
      while (dir !== "/") {
        this.directories.add(dir)
        dir = dirname(dir)
      }
    }
  }

  private normalize(path: string): string {
    return resolve("/", path)
  }

  private ensureAuthorized(token?: symbol): void {
    if (token !== FILESYSTEM_WRITE_TOKEN) {
      throw new IllegalMutationError(
        "ILLEGAL_FILESYSTEM_WRITE: FilesystemProvider writes require an authorized token. " +
          "Direct writeFile calls without authorization are forbidden."
      )
    }
  }

  async readFile(path: string): Promise<string | undefined> {
    return this.files.get(this.normalize(path))
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.ensureAuthorized(this.writeToken)
    const fullPath = this.normalize(path)
    this.files.set(fullPath, content)
    let dir = dirname(fullPath)
    while (dir !== "/") {
      this.directories.add(dir)
      dir = dirname(dir)
    }
  }

  async listDirectory(path: string): Promise<string[]> {
    const prefix = this.normalize(path)
    const prefixWithSlash = prefix === "/" ? "/" : `${prefix}/`
    const entries = new Set<string>()
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(prefixWithSlash)) {
        const relative = filePath.slice(prefixWithSlash.length)
        const name = relative.split("/")[0]
        if (name) entries.add(name)
      }
    }
    for (const dir of this.directories) {
      if (dir.startsWith(prefixWithSlash)) {
        const relative = dir.slice(prefixWithSlash.length)
        const name = relative.split("/")[0]
        if (name) entries.add(name)
      }
    }
    return Array.from(entries).sort()
  }

  async pathExists(path: string): Promise<boolean> {
    const fullPath = this.normalize(path)
    return this.files.has(fullPath) || this.directories.has(fullPath)
  }

  async isDirectory(path: string): Promise<boolean> {
    return this.directories.has(this.normalize(path))
  }

  async ensureDirectory(path: string): Promise<void> {
    this.directories.add(this.normalize(path))
  }

  async deleteFile(path: string): Promise<void> {
    this.files.delete(this.normalize(path))
  }
}

export function createPosixFilesystemProvider(root: string, writeToken?: symbol): FilesystemProvider {
  return new PosixFilesystemProvider(root, writeToken)
}

export function createInMemoryFilesystemProvider(initialFiles?: Record<string, string>, writeToken?: symbol): FilesystemProvider {
  return new InMemoryFilesystemProvider(initialFiles, writeToken)
}
