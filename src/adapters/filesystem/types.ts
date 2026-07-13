// ============================================================
// ADAPTER: Filesystem — Evidence Adapter Types
// ============================================================
// Canonical types for the Filesystem Adapter.
// The adapter reads arbitrary local directories and files and emits
// Observations for Mission Studio.
// ============================================================

import type { ObservationBatch } from "../../types/index.js"

export type FilesystemConfig = {
  /** Root directory to scan */
  rootDirectory?: string
  /** Explicit file list; takes precedence over directory scan */
  files?: string[]
  /** Maximum snippet length in characters for text files */
  maxSnippetLength?: number
  /** Include hidden files and directories */
  includeHidden?: boolean
}

export interface FilesystemAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: string
    category: "integration"
    description: string
  }

  /** Scan configured filesystem paths and emit observations */
  observe(): Promise<ObservationBatch>
}
