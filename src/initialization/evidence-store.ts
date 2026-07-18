// ============================================================
// INITIALIZATION: Evidence Store
// ============================================================
// Persists the evidence and ProjectModel produced during project
// initialization so the transition can be audited and replayed.
//
// Evidence artifacts are written under `.synth/data/evidence/initialization/`
// and referenced from the PROJECT_INITIALIZED event. This keeps the
// event log compact while preserving full provenance.
// ============================================================

import type { FilesystemProvider } from "../environment/filesystem-capability.js"
import { createPosixFilesystemProvider } from "../environment/filesystem-capability.js"
import type { InitializationEvidence } from "../adapters/initialization-adapter.js"
import type { ProjectModel } from "./project-model.js"

export const INITIALIZATION_EVIDENCE_SCHEMA_VERSION = "1.0.0"

/** A persisted initialization evidence artifact. */
export interface InitializationEvidenceArtifact {
  schemaVersion: typeof INITIALIZATION_EVIDENCE_SCHEMA_VERSION
  projectId: string
  projectName: string
  collectedAt: string
  evidence: InitializationEvidence
  model: ProjectModel
}

/** Store for initialization evidence artifacts. */
export interface InitializationEvidenceStore {
  /**
   * Persist evidence and the derived ProjectModel.
   * Returns the relative path of the artifact (under `.synth/data/evidence/initialization/`).
   */
  persist(
    projectId: string,
    projectName: string,
    evidence: InitializationEvidence,
    model: ProjectModel,
  ): Promise<string>
}

function sanitizeTimestamp(timestamp: string): string {
  return timestamp.replace(/[:.]/g, "-")
}

/**
 * Create an evidence store backed by a FilesystemProvider.
 *
 * The store writes artifacts to `.synth/data/evidence/initialization/`
 * relative to the provider's root.
 */
export function createInitializationEvidenceStore(
  fs: FilesystemProvider,
): InitializationEvidenceStore {
  const evidenceDir = ".synth/data/evidence/initialization"

  return {
    async persist(
      projectId: string,
      projectName: string,
      evidence: InitializationEvidence,
      model: ProjectModel,
    ): Promise<string> {
      await fs.ensureDirectory(evidenceDir)

      const collectedAt = new Date().toISOString()
      const filename = `${sanitizeTimestamp(collectedAt)}-${projectId}.json`
      const relativePath = `${evidenceDir}/${filename}`

      const artifact: InitializationEvidenceArtifact = {
        schemaVersion: INITIALIZATION_EVIDENCE_SCHEMA_VERSION,
        projectId,
        projectName,
        collectedAt,
        evidence,
        model,
      }

      await fs.writeFile(relativePath, JSON.stringify(artifact, null, 2))
      return relativePath
    },
  }
}

/** Create a POSIX-backed evidence store rooted at the current directory. */
export function createPosixInitializationEvidenceStore(): InitializationEvidenceStore {
  return createInitializationEvidenceStore(createPosixFilesystemProvider(process.cwd()))
}
