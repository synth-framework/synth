// ============================================================
// TYPES: Execution Context
// ============================================================
// Deterministic context supplied to every mutation path.
// Replaces global time and randomness in domain logic.
// ============================================================

/** Deterministic execution context for a single command. */
export type ExecutionContext = {
  /** Logical timestamp for the command (monotonic sequence number). */
  timestamp: number

  /** Deterministic identifier for the command transaction. */
  commandId: string

  /** Optional caller-provided correlation identifier. */
  correlationId?: string

  /** Actor initiating the command. */
  actor: string

  /** Capability being executed. */
  capability: string

  /** Log offset at which this command executes. */
  sequence: number

  /** Hash of the previous event in the log; used for chain continuity. */
  previousHash: string
}

/** Subset of context exposed to pure domain functions. */
export type DomainContext = Pick<ExecutionContext, "timestamp" | "commandId">
