// Type declarations for Node.js built-in modules
// (needed because @types/node installation is incomplete in this environment)

declare module "fs" {
  export * from "node:fs"
}

declare module "node:fs" {
  export interface Stats {}
  export interface MakeDirectoryOptions { recursive?: boolean }
  export function access(path: string): Promise<void>
  export function mkdir(path: string, options?: MakeDirectoryOptions): Promise<void>
  export function readdir(path: string): Promise<string[]>
  export function readFile(path: string, encoding: string): Promise<string>
  export function writeFile(path: string, data: string): Promise<void>
  export function appendFile(path: string, data: string): Promise<void>

  export const promises: {
    access(path: string): Promise<void>
    mkdir(path: string, options?: MakeDirectoryOptions): Promise<void>
    readdir(path: string): Promise<string[]>
    readFile(path: string, encoding: string): Promise<string>
    writeFile(path: string, data: string): Promise<void>
    appendFile(path: string, data: string): Promise<void>
  }
}

declare module "path" {
  export function join(...paths: string[]): string
  export function dirname(path: string): string
  export function relative(from: string, to: string): string
}

declare module "node:path" {
  export * from "path"
}

declare module "node:crypto" {
  export function randomUUID(): string
}

declare module "crypto" {
  export * from "node:crypto"
}

declare module "child_process" {
  export interface ExecSyncOptions { cwd?: string; encoding?: string }
  export function execSync(command: string, options?: ExecSyncOptions): string
}

declare module "node:child_process" {
  export * from "child_process"
}
