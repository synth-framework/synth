// ============================================================
// GOVERNANCE: Change Control System
// ============================================================
// Controls system evolution through proposals, approval flows,
// and controlled change application.
// ============================================================

/** Proposal — a proposed system change */
export type Proposal = {
  id: string
  type: "capability_add" | "capability_remove" | "policy_change" | "schema_change"
  description: string
  payload: Record<string, unknown>
  status: "pending" | "approved" | "rejected" | "applied"
  proposedBy: string
  proposedAt: number
  approvedBy?: string
  approvedAt?: number
  appliedAt?: number
}

/** Governance engine — manages proposals and change control */
export class GovernanceEngine {
  private proposals = new Map<string, Proposal>()
  private approvedActors: Set<string> = new Set(["admin", "system"])
  private applied = false

  /** Submit a proposal */
  submit(proposal: Omit<Proposal, "status" | "proposedAt">): Proposal {
    const full: Proposal = {
      ...proposal,
      status: "pending",
      proposedAt: Date.now(),
    }

    this.proposals.set(full.id, full)
    return full
  }

  /** Approve a proposal */
  approve(proposalId: string, approver: string): Proposal {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`)
    }

    if (!this.approvedActors.has(approver)) {
      throw new Error(`Actor '${approver}' is not authorized to approve proposals`)
    }

    proposal.status = "approved"
    proposal.approvedBy = approver
    proposal.approvedAt = Date.now()

    return proposal
  }

  /** Reject a proposal */
  reject(proposalId: string): Proposal {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`)
    }

    proposal.status = "rejected"
    return proposal
  }

  /** Mark a proposal as applied */
  markApplied(proposalId: string): Proposal {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`)
    }

    if (proposal.status !== "approved") {
      throw new Error(`Proposal must be approved before applying`)
    }

    proposal.status = "applied"
    proposal.appliedAt = Date.now()
    this.applied = true

    return proposal
  }

  /** Get a proposal */
  get(proposalId: string): Proposal | undefined {
    return this.proposals.get(proposalId)
  }

  /** List all proposals */
  list(): Proposal[] {
    return Array.from(this.proposals.values())
  }

  /** List pending proposals */
  listPending(): Proposal[] {
    return this.list().filter((p) => p.status === "pending")
  }

  /** Add an approved actor */
  addApprover(actor: string): void {
    this.approvedActors.add(actor)
  }

  /** Remove an approved actor */
  removeApprover(actor: string): void {
    this.approvedActors.delete(actor)
  }

  /** Check if any changes have been applied */
  hasChanges(): boolean {
    return this.applied
  }

  /** Get governance statistics */
  getStats(): {
    total: number
    pending: number
    approved: number
    rejected: number
    applied: number
  } {
    const all = this.list()
    return {
      total: all.length,
      pending: all.filter((p) => p.status === "pending").length,
      approved: all.filter((p) => p.status === "approved").length,
      rejected: all.filter((p) => p.status === "rejected").length,
      applied: all.filter((p) => p.status === "applied").length,
    }
  }
}
