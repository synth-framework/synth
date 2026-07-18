// ============================================================
// ADAPTER: Initialization — Universal Contract
// ============================================================
// The InitializationAdapter is the boundary between an external
// project context and a governed SYNTH ProjectModel.
//
// It does not understand implementation details and it does not
// create governance artifacts. It only answers:
//
//   "Given this input source, can I produce governed evidence?"
//
// All source-specific adapters (filesystem, repository,
// conversation, archive, etc.) implement this contract.
// ============================================================

import type {
  ConfidenceScore,
  Constraint,
  DomainModel,
  LifecycleStage,
  ProjectModel,
  ProjectModelInput,
} from "../initialization/project-model.js"

export type SourceType =
  | "unknown"
  | "filesystem"
  | "repository"
  | "archive"
  | "conversation"
  | "documentation"
  | "external-system"

export type InitializationInput = {
  /** Logical source of the external project context */
  sourceType: SourceType

  /** Location or identifier for the source (path, URL, conversation id, etc.) */
  sourceLocation: string

  /** Optional natural-language statement of intent supplied by the operator */
  declaredIntent?: string

  /** Optional opaque metadata discovered by a source-specific probe */
  metadata?: Record<string, unknown>
}

export interface InitializationAdapter {
  /** Stable adapter identifier */
  readonly id: string

  /** Semantic version of the adapter contract implementation */
  readonly version: string

  /** Return true when this adapter can handle the given input */
  canHandle(input: InitializationInput): boolean

  /**
   * Translate the external input into governed evidence.
   *
   * The adapter must not synthesize implementation assumptions
   * (framework, language, database, platform, etc.) and must not
   * produce missions, expeditions, or work items.
   */
  collectEvidence(input: InitializationInput): Promise<InitializationEvidence>
}

/**
 * Normalized evidence produced by an InitializationAdapter.
 *
 * This is intentionally pre-implementation: it captures intent,
 * lifecycle signal, domains, and constraints without committing to
 * any technology choice.
 */
export interface InitializationEvidence {
  /** Adapter that produced this evidence */
  adapterId: string

  /** Adapter version that produced this evidence */
  adapterVersion: string

  /** Source type from the input */
  sourceType: SourceType

  /** Inferred lifecycle stage, or "unknown" when evidence is insufficient */
  lifecycleStage?: LifecycleStage

  /** Extracted intent statement, or "unknown" */
  intent?: string

  /** Domains identified in the source, if any */
  domains?: DomainModel[]

  /** Constraints identified in the source, if any */
  constraints?: Constraint[]

  /** Free-form summary of what the adapter observed */
  summary: string

  /** Confidence in the evidence */
  confidence?: ConfidenceScore

  /** Opaque metadata discovered by the adapter, subject to ProjectModel validation */
  metadata?: Record<string, unknown>
}

/**
 * Convert InitializationEvidence into a ProjectModelInput for use with
 * createProjectModel. This helper keeps the translation logic in one place
 * so that every adapter converges through the same normalization path.
 */
export function evidenceToProjectModelInput(
  evidence: InitializationEvidence,
): ProjectModelInput {
  return {
    identity: {
      id: evidence.adapterId,
      name: evidence.adapterId,
    },
    intent: evidence.intent ?? "unknown",
    lifecycleStage: evidence.lifecycleStage,
    domains: evidence.domains,
    constraints: evidence.constraints,
    confidence: evidence.confidence,
    metadata: evidence.metadata,
  }
}

export type InitializationResult = {
  success: boolean
  model: ProjectModel
  evidence: InitializationEvidence
  errors?: string[]
}
