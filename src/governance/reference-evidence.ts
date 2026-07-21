// ============================================================
// GOVERNANCE: Reference Evidence Binding
// ============================================================
// Formal relationship between a requirement and the artifact that
// justifies it. Keeps large binaries out of the event log by binding
// to URIs and content hashes.
// ============================================================

export type EvidenceKind =
  | "image"
  | "document"
  | "video"
  | "audio"
  | "example_url"
  | "example_path"
  | "design_board"
  | "cli_recording"

export type ReferenceEvidence = {
  id: string
  kind: EvidenceKind
  uri: string
  hash?: string
  mimeType?: string
  description?: string
  capturedAt: number
}

export type ReferenceEvidenceInput = {
  kind: EvidenceKind
  uri: string
  hash?: string
  mimeType?: string
  description?: string
}

export type ReferenceEvidenceValidationResult = {
  valid: boolean
  errors: string[]
}

const EVIDENCE_KINDS: EvidenceKind[] = [
  "image",
  "document",
  "video",
  "audio",
  "example_url",
  "example_path",
  "design_board",
  "cli_recording",
]

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

export function validateReferenceEvidence(
  evidence: unknown
): ReferenceEvidenceValidationResult {
  if (typeof evidence !== "object" || evidence === null) {
    return { valid: false, errors: ["ReferenceEvidence must be an object"] }
  }
  const e = evidence as Partial<ReferenceEvidence>
  const errors: string[] = []

  if (!isNonEmptyString(e.id)) errors.push("id is required")
  if (!EVIDENCE_KINDS.includes(e.kind as EvidenceKind)) errors.push("kind must be a supported evidence kind")
  if (!isNonEmptyString(e.uri)) errors.push("uri is required")
  if (e.hash !== undefined && !isNonEmptyString(e.hash)) errors.push("hash must be a non-empty string")

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] }
}

function makeId(): string {
  return `evidence-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Create a reference evidence record. */
export function createReferenceEvidence(input: ReferenceEvidenceInput): ReferenceEvidence {
  return {
    id: makeId(),
    kind: input.kind,
    uri: input.uri,
    hash: input.hash,
    mimeType: input.mimeType,
    description: input.description,
    capturedAt: Date.now(),
  }
}

/** Bind evidence to an Alignment Contract by returning updated reference IDs. */
export function bindEvidenceToContract(
  contract: { referenceEvidenceIds: string[] },
  evidenceId: string
): string[] {
  if (contract.referenceEvidenceIds.includes(evidenceId)) return contract.referenceEvidenceIds
  return [...contract.referenceEvidenceIds, evidenceId]
}
