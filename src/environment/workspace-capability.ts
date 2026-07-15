// ============================================================
// ENVIRONMENT: Workspace Capability
// ============================================================
// Workspace capability provider interface and default filesystem
// implementation. The Core must never assume that process.cwd()
// is the workspace root; all workspace interaction flows through
// this capability.
// ============================================================

import type { ObservationContext } from "./types.js"

/** Locator for a project within a workspace */
export type ProjectLocator = {
  name: string
  path: string
  kind: "synth" | "package" | "unknown"
}

/** Description of a discovered workspace */
export type WorkspaceDescriptor = {
  root: string
  exists: boolean
  hasSynthManifest: boolean
  hasPackageManifest: boolean
  projects: ProjectLocator[]
  metadata: {
    manifestPath?: string
    packagePath?: string
    [key: string]: unknown
  }
}

/** SYNTH workspace manifest */
export type WorkspaceManifest = {
  name: string
  version: string
  projectType?: string
  [key: string]: unknown
}

/** Result of preparing a workspace */
export type WorkspacePrepared = {
  root: string
  manifest?: WorkspaceManifest
  ready: boolean
  reason: string
}

/** Workspace capability provider interface */
export interface WorkspaceProvider {
  readonly name: string
  readonly version: string
  discover(ctx: ObservationContext): Promise<WorkspaceDescriptor>
  locateRoot(ctx: ObservationContext, startPath?: string): Promise<string | undefined>
  listProjects(ctx: ObservationContext, root: string): Promise<ProjectLocator[]>
  readManifest(ctx: ObservationContext, root: string): Promise<WorkspaceManifest | undefined>
  prepare(ctx: ObservationContext, root: string): Promise<WorkspacePrepared>
}

/** Filesystem-backed workspace provider */
export class FilesystemWorkspaceProvider implements WorkspaceProvider {
  readonly name = "filesystem-workspace"
  readonly version = "1.0.0"

  async discover(ctx: ObservationContext): Promise<WorkspaceDescriptor> {
    const root = await this.locateRoot(ctx, ctx.cwd)
    if (!root) {
      return {
        root: ctx.cwd,
        exists: false,
        hasSynthManifest: false,
        hasPackageManifest: false,
        projects: [],
        metadata: {},
      }
    }

    const manifest = await this.readManifest(ctx, root)
    const projects = await this.listProjects(ctx, root)

    return {
      root,
      exists: true,
      hasSynthManifest: manifest !== undefined,
      hasPackageManifest: (await ctx.readFile(`${root}/package.json`)) !== undefined,
      projects,
      metadata: {
        manifestPath: manifest ? `${root}/.synth/manifest.json` : undefined,
      },
    }
  }

  async locateRoot(ctx: ObservationContext, startPath?: string): Promise<string | undefined> {
    const start = startPath || ctx.cwd
    const parts = start.split("/").filter(Boolean)

    for (let i = parts.length; i >= 0; i--) {
      const candidate = "/" + parts.slice(0, i).join("/")
      const hasSynth = await ctx.pathExists(`${candidate}/.synth/manifest.json`)
      const hasPackage = await ctx.pathExists(`${candidate}/package.json`)
      if (hasSynth || hasPackage) {
        return candidate === "" ? "/" : candidate
      }
    }

    return undefined
  }

  async listProjects(ctx: ObservationContext, root: string): Promise<ProjectLocator[]> {
    const projects: ProjectLocator[] = []

    const packageJson = await ctx.readFile(`${root}/package.json`)
    if (packageJson) {
      try {
        const parsed = JSON.parse(packageJson) as Record<string, unknown>
        projects.push({
          name: String(parsed.name || "root"),
          path: root,
          kind: "package",
        })
      } catch {
        // ignore malformed package.json
      }
    }

    const synthManifest = await ctx.readFile(`${root}/.synth/manifest.json`)
    if (synthManifest) {
      try {
        const parsed = JSON.parse(synthManifest) as Record<string, unknown>
        projects.push({
          name: String(parsed.name || "synth-project"),
          path: root,
          kind: "synth",
        })
      } catch {
        // ignore malformed manifest
      }
    }

    return projects
  }

  async readManifest(ctx: ObservationContext, root: string): Promise<WorkspaceManifest | undefined> {
    const content = await ctx.readFile(`${root}/.synth/manifest.json`)
    if (!content) return undefined
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>
      return {
        name: String(parsed.name || ""),
        version: String(parsed.version || ""),
        ...parsed,
      }
    } catch {
      return undefined
    }
  }

  async prepare(ctx: ObservationContext, root: string): Promise<WorkspacePrepared> {
    const manifest = await this.readManifest(ctx, root)
    if (!manifest) {
      return {
        root,
        ready: false,
        reason: "No SYNTH manifest found; workspace preparation requires a manifest",
      }
    }
    return {
      root,
      manifest,
      ready: true,
      reason: "Workspace manifest loaded successfully",
    }
  }
}

export function createFilesystemWorkspaceProvider(): WorkspaceProvider {
  return new FilesystemWorkspaceProvider()
}
