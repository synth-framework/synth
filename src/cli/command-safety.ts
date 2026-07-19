// ============================================================
// CLI: Command Safety Classification
// ============================================================
// Declares the mutation risk of every SYNTH command. Used by the
// Discovery Safety Model to reject operations that would mutate
// repository or governance state during the Discover phase.
// ============================================================

export type CommandSafety = "READ_ONLY" | "PROPOSAL_ONLY" | "POTENTIALLY_MUTATING" | "MUTATING"

export interface CommandMetadata {
  command: string
  safety: CommandSafety
  description: string
  requiresApproval?: boolean
}

const COMMAND_REGISTRY: CommandMetadata[] = [
  { command: "--help", safety: "READ_ONLY", description: "Show generic help" },
  { command: "--version", safety: "READ_ONLY", description: "Print the installed Synth version" },
  { command: "discover", safety: "READ_ONLY", description: "Discover repository structure and produce a read-only analysis" },
  { command: "bootstrap --dry-run", safety: "PROPOSAL_ONLY", description: "Generate a bootstrap proposal without mutating state" },
  { command: "bootstrap", safety: "POTENTIALLY_MUTATING", description: "Transform a repository into a Synth project (mutating only with --approve)" },
  { command: "bootstrap --approve", safety: "MUTATING", description: "Apply bootstrap and initialize governance artifacts", requiresApproval: true },
  { command: "docs generate", safety: "MUTATING", description: "Generate documentation artifacts", requiresApproval: true },
  { command: "init", safety: "MUTATING", description: "Initialize the current directory as a Synth project", requiresApproval: true },
  { command: "mission create", safety: "PROPOSAL_ONLY", description: "Create a Mission proposal" },
  { command: "mission approve", safety: "MUTATING", description: "Approve a Mission draft", requiresApproval: true },
  { command: "expedition create", safety: "PROPOSAL_ONLY", description: "Create an Expedition proposal" },
  { command: "expedition approve", safety: "MUTATING", description: "Approve an Expedition draft", requiresApproval: true },
  { command: "expedition commit", safety: "MUTATING", description: "Commit approved Expedition intent to runtime", requiresApproval: true },
  { command: "expedition start", safety: "MUTATING", description: "Start executing a committed Expedition", requiresApproval: true },
  { command: "expedition complete", safety: "MUTATING", description: "Complete an executing Expedition", requiresApproval: true },
  { command: "doctor", safety: "READ_ONLY", description: "Verify installation and project health" },
  { command: "status", safety: "READ_ONLY", description: "Report the current project state" },
  { command: "explain", safety: "READ_ONLY", description: "Explain operations (replay, lineage, proposals, snapshots, graph, diagnostics, status, identity, resume, governance, all)" },
  { command: "validate", safety: "READ_ONLY", description: "Analyze changes and plan validations" },
  { command: "govern", safety: "MUTATING", description: "Run the full governance pipeline", requiresApproval: true },
  { command: "repair replay", safety: "POTENTIALLY_MUTATING", description: "Propose repairs for runtime drift without mutating state" },
  { command: "repair replay --approve", safety: "MUTATING", description: "Apply repairs for runtime drift", requiresApproval: true },
  { command: "first-contact start", safety: "PROPOSAL_ONLY", description: "Extract intent and create a first-contact proposal draft" },
  { command: "first-contact clarify", safety: "PROPOSAL_ONLY", description: "Show or apply clarification answers to the draft" },
  { command: "first-contact project", safety: "READ_ONLY", description: "Project architecture candidates from the draft" },
  { command: "first-contact verify", safety: "READ_ONLY", description: "Verify capability assumptions for the selected architecture" },
  { command: "first-contact status", safety: "READ_ONLY", description: "Report the current first-contact state" },
  { command: "first-contact materialize --dry-run", safety: "PROPOSAL_ONLY", description: "Preview what materialization would create" },
  { command: "first-contact approve", safety: "MUTATING", description: "Approve the first-contact draft", requiresApproval: true },
  { command: "first-contact materialize --approve", safety: "MUTATING", description: "Materialize the approved artifact into a SYNTH project", requiresApproval: true },
  // `genesis` is an alias for the first-contact greenfield onboarding namespace.
  { command: "genesis start", safety: "PROPOSAL_ONLY", description: "Alias for 'first-contact start'" },
  { command: "genesis clarify", safety: "PROPOSAL_ONLY", description: "Alias for 'first-contact clarify'" },
  { command: "genesis project", safety: "READ_ONLY", description: "Alias for 'first-contact project'" },
  { command: "genesis verify", safety: "READ_ONLY", description: "Alias for 'first-contact verify'" },
  { command: "genesis status", safety: "READ_ONLY", description: "Alias for 'first-contact status'" },
  { command: "genesis materialize --dry-run", safety: "PROPOSAL_ONLY", description: "Alias for 'first-contact materialize --dry-run'" },
  { command: "genesis approve", safety: "MUTATING", description: "Alias for 'first-contact approve'", requiresApproval: true },
  { command: "genesis materialize --approve", safety: "MUTATING", description: "Alias for 'first-contact materialize --approve'", requiresApproval: true },
]

function normalizeCommand(command: string): string {
  return command.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Look up safety metadata for a fully-qualified command string.
 * Returns undefined for unknown commands.
 */
export function getCommandSafety(command: string): CommandMetadata | undefined {
  const normalized = normalizeCommand(command)
  return COMMAND_REGISTRY.find((meta) => normalizeCommand(meta.command) === normalized)
}

/**
 * Return true if the command is safe to run during Discovery.
 * Only READ_ONLY and PROPOSAL_ONLY commands are discovery-safe.
 */
export function isSafeForDiscovery(command: string): boolean {
  const meta = getCommandSafety(command)
  if (!meta) return false
  return meta.safety === "READ_ONLY" || meta.safety === "PROPOSAL_ONLY"
}

function suggestionForCommand(command: string): string {
  if (command.startsWith("docs")) {
    return "generating documentation"
  }
  if (command.startsWith("init")) {
    return "initializing a project"
  }
  if (command.startsWith("govern")) {
    return "running governance"
  }
  if (command.startsWith("mission")) {
    return "managing missions"
  }
  if (command.startsWith("expedition")) {
    return "managing expeditions"
  }
  if (command.startsWith("first-contact") || command.startsWith("genesis")) {
    return "running first-contact onboarding"
  }
  return "running this command"
}

/**
 * Assert that a command is safe for Discovery, throwing a clear
 * phase-boundary error when it is not.
 */
export function assertSafeForDiscovery(command: string): void {
  const meta = getCommandSafety(command)
  if (!meta) {
    throw new Error(
      `Unknown command "${command}" cannot run during Discovery. ` +
        "Complete Discovery with a read-only command first.",
    )
  }
  if (meta.safety === "READ_ONLY" || meta.safety === "PROPOSAL_ONLY") {
    return
  }
  throw new Error(
    `${command} is a ${meta.safety} command and cannot run during Discovery. ` +
      `Run 'synth bootstrap --approve' or complete Discovery before ${suggestionForCommand(command)}.`,
  )
}
