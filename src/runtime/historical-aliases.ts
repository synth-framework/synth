// ============================================================
// RUNTIME: Historical Alias Registry
// ============================================================
// Durable registry for known historical identity aliases.
//
// The event log is immutable. When legacy genesis snapshots or pre-model
// events created duplicate identities, the resolver needs a way to treat
// those duplicates as aliases of a single canonical identity without
// editing history.
//
// This registry is governance metadata. It lives under the runtime data
// directory (`.synth/data/governance/historical-aliases.json` for governed
// projects, `data/governance/historical-aliases.json` for ungoverned repos).
// ============================================================

import type { FilesystemProvider } from "../environment/filesystem-capability.js"
import type { AggregateGraphNode } from "./replay.js"

export const HISTORICAL_ALIASES_SCHEMA_VERSION = "1.0.0"
export const HISTORICAL_ALIASES_FILE = "governance/historical-aliases.json"

export type AggregateKind = AggregateGraphNode["kind"]

export interface HistoricalAlias {
  /** Canonical aggregate kind */
  kind: AggregateKind
  /** Canonical aggregate id */
  canonicalId: string
  /** Event ids that are known aliases of the canonical identity */
  aliasEventIds: string[]
  /** Historical program this alias belongs to, if any */
  historicalProgram?: string
}

export interface HistoricalProgram {
  id: string
  name: string
  description: string
  immutable: boolean
}

export interface HistoricalAliasRegistry {
  schemaVersion: typeof HISTORICAL_ALIASES_SCHEMA_VERSION
  description?: string
  /** Key = `${kind}:${canonicalId}` */
  canonicalIdentities: Record<string, HistoricalAlias>
  historicalPrograms: Record<string, HistoricalProgram>
}

export function identityKey(kind: AggregateKind, id: string): string {
  return `${kind}:${id}`
}

export function createEmptyHistoricalAliasRegistry(): HistoricalAliasRegistry {
  return {
    schemaVersion: HISTORICAL_ALIASES_SCHEMA_VERSION,
    description: "Empty historical alias registry",
    canonicalIdentities: {},
    historicalPrograms: {},
  }
}

export function isKnownAlias(
  registry: HistoricalAliasRegistry,
  kind: AggregateKind,
  id: string,
  eventId?: string,
): boolean {
  const alias = registry.canonicalIdentities[identityKey(kind, id)]
  if (!alias) return false
  if (eventId === undefined) return true
  return alias.aliasEventIds.includes(eventId)
}

export function getCanonicalId(
  registry: HistoricalAliasRegistry,
  kind: AggregateKind,
  id: string,
): string | undefined {
  return registry.canonicalIdentities[identityKey(kind, id)]?.canonicalId
}

export async function loadHistoricalAliasRegistry(
  fs: FilesystemProvider,
): Promise<HistoricalAliasRegistry> {
  try {
    const text = await fs.readFile(HISTORICAL_ALIASES_FILE)
    if (text === undefined) return createEmptyHistoricalAliasRegistry()
    const parsed = JSON.parse(text) as HistoricalAliasRegistry
    if (parsed.schemaVersion !== HISTORICAL_ALIASES_SCHEMA_VERSION) {
      // Future versions: add migration logic here.
      return createEmptyHistoricalAliasRegistry()
    }
    return parsed
  } catch {
    return createEmptyHistoricalAliasRegistry()
  }
}

export async function saveHistoricalAliasRegistry(
  fs: FilesystemProvider,
  registry: HistoricalAliasRegistry,
): Promise<void> {
  await fs.ensureDirectory(HISTORICAL_ALIASES_FILE.split("/")[0])
  await fs.writeFile(HISTORICAL_ALIASES_FILE, JSON.stringify(registry, null, 2))
}
