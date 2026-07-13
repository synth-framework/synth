// ============================================================
// ADAPTER: Document — Evidence Adapter Types
// ============================================================
// Canonical types for the Document Adapter.
// The adapter reads documents from local storage and emits
// Observations for Mission Studio.
// ============================================================

import type { ObservationBatch } from "../../types/index.js"

export type DocumentFormat = "markdown" | "text" | "adr" | "pdf" | "docx" | "unknown"

export type DocumentConfig = {
  /** Directory to scan for documents */
  documentsDirectory?: string
  /** Explicit file list; takes precedence over directory scan */
  files?: string[]
  /** Maximum snippet length in characters */
  maxSnippetLength?: number
}

export interface DocumentAdapter {
  readonly metadata: {
    name: string
    version: string
    kind: string
    category: "integration"
    description: string
  }

  /** Scan configured documents and emit observations */
  observe(): Promise<ObservationBatch>
}
