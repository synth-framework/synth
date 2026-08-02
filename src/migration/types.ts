// ============================================================
// MIGRATION: Types
// ============================================================
// Shared types for legacy Synth state detection and archive/import.
// ============================================================

export type MigrationStateKind = "legacy" | "initialized-v2" | "ungoverned" | "none"

export type MigrationArtifactKind = "synth-dir" | "synth-backup" | "synth-archive" | "ungoverned-event-log" | "manifest"

export interface MigrationArtifact {
  kind: MigrationArtifactKind
  path: string
  schemaVersion?: string
  readable: boolean
  note?: string
}

export interface MigrationDetectionResult {
  legacyStateDetected: boolean
  stateKind: MigrationStateKind
  artifacts: MigrationArtifact[]
  recommendedPath: "archive" | "import" | "none"
  reason: string
  warnings: string[]
}

export interface MigrationPlan {
  path: "archive" | "import" | "none"
  stateKind: MigrationStateKind
  artifacts: MigrationArtifact[]
  sourcePath?: string
  archiveTarget?: string
  importEventCount?: number
  requiredApprovals?: string[]
  wouldRun?: string[]
  warnings: string[]
  reason: string
}
