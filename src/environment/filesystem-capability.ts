// ============================================================
// ENVIRONMENT: Filesystem Capability
// ============================================================
// Filesystem capability provider interface and POSIX reference
// implementation. The Core must never import fs/path directly;
// all filesystem interaction flows through this capability.
// ============================================================

import { readFile, writeFile, readdir, access, mkdir, rm, stat, constants } from "node:fs/promises"
import { resolve, dirname } from "node:path"

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

  constructor(root: string) {
    this.root = root
  }

  private resolve(path: string): string {
    return resolve(this.root, path)
  }

  async readFile(path: string): Promise<string | undefined> {
    try {
      return await readFile(this.resolve(path), "utf-8")
    } catch {
      return undefined
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    const fullPath = this.resolve(path)
    await mkdir(dirname(fullPath), { recursive: true })
    await writeFile(fullPath, content, "utf-8")
  }

  async listDirectory(path: string): Promise<string[]> {
    try {
      return await readdir(this.resolve(path))
    } catch {
      return []
    }
  }

  async pathExists(path: string): Promise<boolean> {
    try {
      await access(this.resolve(path), constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  async isDirectory(path: string): Promise<boolean> {
    try {
      const info = await stat(this.resolve(path))
      return info.isDirectory()
    } catch {
      return false
    }
  }

  async ensureDirectory(path: string): Promise<void> {
    await mkdir(this.resolve(path), { recursive: true })
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await rm(this.resolve(path))
    } catch {
      // ignore errors on missing files
    }
  }
}

/** In-memory filesystem provider for testing */
export class InMemoryFilesystemProvider implements FilesystemProvider {
  readonly name = "in-memory-filesystem"
  readonly version = "1.0.0"
  readonly root = "/"
  private files = new Map<string, string>()
  private directories = new Set<string>()

  constructor(initialFiles: Record<string, string> = {}) {
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

  async readFile(path: string): Promise<string | undefined> {
    return this.files.get(this.normalize(path))
  }

  async writeFile(path: string, content: string): Promise<void> {
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

export function createPosixFilesystemProvider(root: string): FilesystemProvider {
  return new PosixFilesystemProvider(root)
}

export function createInMemoryFilesystemProvider(initialFiles?: Record<string, string>): FilesystemProvider {
  return new InMemoryFilesystemProvider(initialFiles)
}
