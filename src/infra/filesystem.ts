// ============================================================
// INFRA: Filesystem Adapter
// ============================================================

import { promises as fs } from "fs"
import path from "path"

export interface FilesystemAdapter {
  readFile(filePath: string): Promise<string>
  writeFile(filePath: string, content: string): Promise<void>
  appendFile(filePath: string, content: string): Promise<void>
  mkdir(dirPath: string): Promise<void>
  exists(filePath: string): Promise<boolean>
  readdir(dirPath: string): Promise<string[]>
}

export class NodeFilesystemAdapter implements FilesystemAdapter {
  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, "utf-8")
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content)
  }

  async appendFile(filePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.appendFile(filePath, content)
  }

  async mkdir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true })
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  async readdir(dirPath: string): Promise<string[]> {
    return fs.readdir(dirPath)
  }
}

export class InMemoryFilesystemAdapter implements FilesystemAdapter {
  private files = new Map<string, string>()

  async readFile(filePath: string): Promise<string> {
    const content = this.files.get(filePath)
    if (content === undefined) {
      throw new Error(`File not found: ${filePath}`)
    }
    return content
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    this.files.set(filePath, content)
  }

  async appendFile(filePath: string, content: string): Promise<void> {
    const existing = this.files.get(filePath) || ""
    this.files.set(filePath, existing + content)
  }

  async mkdir(_dirPath: string): Promise<void> {}

  async exists(filePath: string): Promise<boolean> {
    return this.files.has(filePath)
  }

  async readdir(dirPath: string): Promise<string[]> {
    const entries: string[] = []
    for (const filePath of this.files.keys()) {
      const dir = path.dirname(filePath)
      if (dir === dirPath || filePath.startsWith(dirPath + "/")) {
        entries.push(path.relative(dirPath, filePath))
      }
    }
    return entries
  }

  clear(): void {
    this.files.clear()
  }

  listFiles(): string[] {
    return Array.from(this.files.keys())
  }
}
