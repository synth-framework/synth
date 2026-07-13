// ============================================================
// CORE: Architectural Error Types
// ============================================================

/** Error thrown when a mutation bypasses the ExecutionGate */
export class IllegalMutationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "IllegalMutationError"
  }
}
