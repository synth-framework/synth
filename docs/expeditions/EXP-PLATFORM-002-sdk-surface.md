# EXP-PLATFORM-002 — SDK Surface

**Status:** Draft  
**Scope:** Internal Platform SDK canonical infrastructure contracts  

---

## Design rules

1. One concern per module.
2. Stateless pure functions.
3. No business logic.
4. Composable.
5. No wrapper without deleted duplication.
6. Every concern has exactly one authoritative owner.

---

## `sdk/workspace`

```typescript
// workspace/root.ts
export function root(cwd?: string): string
export function resolve(cwd: string, ...segments: string[]): string

// workspace/discovery.ts
export function discover(startDir?: string): string | undefined
```

---

## `sdk/paths`

```typescript
// paths/synth.ts
export function synthDir(root: string): string
export function manifestPath(root: string): string

// paths/runtime.ts
export function dataDir(root: string): string
export function eventsDir(root: string): string
export function stateFile(root: string): string
export function eventLogFile(root: string): string
export function snapshotsDir(root: string): string
export function checkpointsFile(root: string): string
export function decisionsFile(root: string): string

// paths/artifacts.ts
export function discoveryDir(root: string): string
export function firstContactDir(root: string): string
```

---

## `sdk/files`

```typescript
// files/read.ts
export function readText(filePath: string): Promise<string | undefined>
export function readTextSync(filePath: string): string | undefined
export function exists(filePath: string): Promise<boolean>
export function existsSync(filePath: string): boolean
export function listDirectory(dirPath: string): Promise<string[]>

// files/write.ts
export function writeText(filePath: string, content: string): Promise<void>
export function writeTextSync(filePath: string, content: string): void
export function ensureDirectory(dirPath: string): Promise<void>
export function ensureDirectorySync(dirPath: string): void

// files/atomic.ts
export function atomicWrite(filePath: string, content: string): Promise<void>
```

---

## `sdk/json`

```typescript
// json/read.ts
export function readJson<T>(filePath: string): Promise<T | undefined>
export function readJsonSync<T>(filePath: string): T | undefined

// json/write.ts
export function writeJson(filePath: string, value: unknown): Promise<void>
export function writeJsonSync(filePath: string, value: unknown): void
```

---

## `sdk/hashing`

```typescript
// hashing/sha256.ts
export function sha256(value: unknown): string
export function sha256Hex(input: string): string

// hashing/stable-id.ts
export function stableId(...parts: string[]): string
export function shortHash(input: string, length?: number): string

// hashing/canonical.ts
export function canonicalize(value: unknown): string
```

---

## `sdk/manifest`

```typescript
// manifest/read.ts
export function readManifest(root: string): Promise<SynthManifest | undefined>
export function readManifestSync(root: string): SynthManifest | undefined
export function hasManifest(root: string): boolean
```

---

## `sdk/identity`

```typescript
// identity.ts
export function uuid(): string
export function shortId(prefix?: string): string
```

---

## `sdk/temp`

```typescript
// temp.ts
export function directory(prefix?: string): Promise<string>
export function file(prefix?: string): Promise<string>
```

---

## `sdk/process`

```typescript
// process.ts
export type ProcessResult = {
  stdout: string
  stderr: string
  exitCode: number
}

export function exec(command: string, args: string[], options?: { cwd?: string; timeout?: number }): Promise<ProcessResult>
export function execSync(command: string, args: string[], options?: { cwd?: string; timeout?: number }): ProcessResult
```

---

## `sdk/events`

```typescript
// events.ts
export function readEvents(root: string): Promise<SynthEvent[]>
export function appendEvent(root: string, event: SynthEvent): Promise<void>
```

---

## `sdk/state`

```typescript
// state.ts
export function readState(root: string): Promise<CanonicalState | undefined>
export function writeState(root: string, state: CanonicalState): Promise<void>
```

---

## Notes

- `sdk.events` and `sdk.state` are facades over `src/infra/event-store.ts` and `src/infra/state-store.ts`. They do not replace the kernel stores.
- Sync variants are provided where existing consumers require them, but async is preferred for new code.
- All path functions accept an explicit `root` to avoid hidden `process.cwd()` assumptions.
