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
  { command: "mission delete", safety: "MUTATING", description: "Delete an empty Mission", requiresApproval: true },
  { command: "expedition create", safety: "PROPOSAL_ONLY", description: "Create an Expedition proposal" },
  { command: "expedition approve", safety: "MUTATING", description: "Approve an Expedition draft", requiresApproval: true },
  { command: "expedition commit", safety: "MUTATING", description: "Commit approved Expedition intent to runtime", requiresApproval: true },
  { command: "expedition start", safety: "MUTATING", description: "Start executing a committed Expedition", requiresApproval: true },
  { command: "expedition complete", safety: "MUTATING", description: "Complete an executing Expedition", requiresApproval: true },
  { command: "expedition delete", safety: "MUTATING", description: "Delete an empty Expedition", requiresApproval: true },
  { command: "expedition move", safety: "MUTATING", description: "Re-parent an Expedition to another Mission", requiresApproval: true },
  { command: "expedition certify", safety: "MUTATING", description: "Certify convergence for an executing Expedition", requiresApproval: true },
  { command: "doctor", safety: "READ_ONLY", description: "Verify installation and project health" },
  { command: "checkpoint", safety: "READ_ONLY", description: "Run pre-flight checkpoint before implementation work" },
  { command: "status", safety: "READ_ONLY", description: "Report the current project state" },
  { command: "report", safety: "READ_ONLY", description: "Print a global human-readable project report" },
  { command: "explain", safety: "READ_ONLY", description: "Explain operations (replay, lineage, proposals, snapshots, graph, diagnostics, status, identity, resume, governance, all)" },
  { command: "validate", safety: "READ_ONLY", description: "Analyze changes and plan validations" },
  { command: "validate --full", safety: "MUTATING", description: "Run the complete canonical governance pipeline", requiresApproval: true },
  { command: "govern", safety: "MUTATING", description: "Run the full governance pipeline", requiresApproval: true },
  { command: "repair replay", safety: "POTENTIALLY_MUTATING", description: "Propose repairs for runtime drift without mutating state" },
  { command: "repair replay --approve", safety: "MUTATING", description: "Apply repairs for runtime drift", requiresApproval: true },
  { command: "repair state", safety: "POTENTIALLY_MUTATING", description: "Diagnose canonical-state divergences without mutating state" },
  { command: "repair state --approve", safety: "MUTATING", description: "Regenerate canonical-state.json from replay", requiresApproval: true },
  { command: "first-contact", safety: "PROPOSAL_ONLY", description: "Preview guided onboarding plan for greenfield, brownfield, or legacy projects" },
  { command: "first-contact --dry-run", safety: "PROPOSAL_ONLY", description: "Preview guided onboarding plan without mutating state" },
  { command: "first-contact --approve", safety: "MUTATING", description: "Apply guided onboarding plan", requiresApproval: true },
  { command: "first-contact start", safety: "PROPOSAL_ONLY", description: "Extract intent and create a first-contact proposal draft" },
  { command: "first-contact clarify", safety: "PROPOSAL_ONLY", description: "Show or apply clarification answers to the draft" },
  { command: "first-contact project", safety: "READ_ONLY", description: "Project architecture candidates from the draft" },
  { command: "first-contact verify", safety: "READ_ONLY", description: "Verify capability assumptions for the selected architecture" },
  { command: "first-contact status", safety: "READ_ONLY", description: "Report the current first-contact state" },
  { command: "first-contact materialize --dry-run", safety: "PROPOSAL_ONLY", description: "Preview what materialization would create" },
  { command: "first-contact approve", safety: "MUTATING", description: "Approve the first-contact draft", requiresApproval: true },
  { command: "first-contact materialize --approve", safety: "MUTATING", description: "Materialize the approved artifact into a SYNTH project", requiresApproval: true },
  { command: "first-contact onboard:detect", safety: "READ_ONLY", description: "Detect repository state for onboarding" },
  { command: "first-contact onboard:archive", safety: "MUTATING", description: "Archive legacy Synth state", requiresApproval: true },
  { command: "first-contact onboard:init", safety: "MUTATING", description: "Initialize an empty directory as a Synth project", requiresApproval: true },
  { command: "first-contact onboard:bootstrap", safety: "MUTATING", description: "Apply Synth governance to a brownfield project", requiresApproval: true },
  { command: "first-contact onboard:mission", safety: "MUTATING", description: "Create the baseline mission", requiresApproval: true },
  { command: "first-contact onboard:govern", safety: "MUTATING", description: "Run the governance pipeline after onboarding", requiresApproval: true },
  // `genesis` is an alias for the first-contact greenfield onboarding namespace.
  { command: "genesis", safety: "PROPOSAL_ONLY", description: "Alias for 'first-contact' preview" },
  { command: "genesis --dry-run", safety: "PROPOSAL_ONLY", description: "Alias for 'first-contact --dry-run'" },
  { command: "genesis --approve", safety: "MUTATING", description: "Alias for 'first-contact --approve'", requiresApproval: true },
  { command: "genesis start", safety: "PROPOSAL_ONLY", description: "Alias for 'first-contact start'" },
  { command: "genesis clarify", safety: "PROPOSAL_ONLY", description: "Alias for 'first-contact clarify'" },
  { command: "genesis project", safety: "READ_ONLY", description: "Alias for 'first-contact project'" },
  { command: "genesis verify", safety: "READ_ONLY", description: "Alias for 'first-contact verify'" },
  { command: "genesis status", safety: "READ_ONLY", description: "Alias for 'first-contact status'" },
  { command: "genesis materialize --dry-run", safety: "PROPOSAL_ONLY", description: "Alias for 'first-contact materialize --dry-run'" },
  { command: "genesis approve", safety: "MUTATING", description: "Alias for 'first-contact approve'", requiresApproval: true },
  { command: "genesis materialize --approve", safety: "MUTATING", description: "Alias for 'first-contact materialize --approve'", requiresApproval: true },
  // Repository governance (EXP-PROGRAM-028)
  { command: "repo init", safety: "MUTATING", description: "Initialize repository governance state", requiresApproval: true },
  { command: "repo branch create", safety: "MUTATING", description: "Record a governed branch", requiresApproval: true },
  { command: "repo pr open", safety: "MUTATING", description: "Open a promotion pull request", requiresApproval: true },
  { command: "repo pr approve", safety: "MUTATING", description: "Approve a proposed promotion", requiresApproval: true },
  { command: "repo pr merge", safety: "MUTATING", description: "Merge an approved pull request", requiresApproval: true },
  { command: "repo release create", safety: "MUTATING", description: "Create a governed release", requiresApproval: true },
  { command: "repo status", safety: "READ_ONLY", description: "Report repository governance state" },
  // Automated release versioning (EXP-RELEASE-001)
  { command: "release", safety: "PROPOSAL_ONLY", description: "Preview the next semver release without mutating state" },
  { command: "release --dry-run", safety: "PROPOSAL_ONLY", description: "Preview the next semver release without mutating state" },
  { command: "release --approve", safety: "MUTATING", description: "Apply the next semver release", requiresApproval: true },
  { command: "mission decisions", safety: "READ_ONLY", description: "List Mission decisions" },
  { command: "mission evidence add", safety: "PROPOSAL_ONLY", description: "Add evidence to a Mission draft" },
  { command: "mission snapshot", safety: "READ_ONLY", description: "Inspect or list Mission snapshots" },
  { command: "mission project", safety: "READ_ONLY", description: "Project a Mission from an approved Alignment Contract" },
  { command: "mission verify-charter", safety: "READ_ONLY", description: "Verify expedition charter integrity" },
  { command: "mission report", safety: "READ_ONLY", description: "Show mission status and its expeditions" },
  { command: "program list", safety: "READ_ONLY", description: "List governance programs" },
  { command: "program show", safety: "READ_ONLY", description: "Show a single governance program" },
  { command: "program rank", safety: "READ_ONLY", description: "Rank active programs by weighted open work" },
  { command: "expedition list", safety: "READ_ONLY", description: "List governance expeditions" },
  { command: "expedition show", safety: "READ_ONLY", description: "Show a single governance expedition" },
  { command: "expedition report", safety: "READ_ONLY", description: "Show a rich expedition report with charter intent, evidence, and expected output" },
  { command: "expedition rank", safety: "READ_ONLY", description: "Rank open expeditions by priority, status, and downstream impact" },
  { command: "validate dependencies", safety: "READ_ONLY", description: "Verify expedition charter dependency resolution" },
  { command: "validate artifact", safety: "READ_ONLY", description: "Validate governance artifacts" },
  { command: "version", safety: "READ_ONLY", description: "Print the installed Synth version" },
  { command: "verify", safety: "READ_ONLY", description: "Verify governance invariants and projection consistency" },
  { command: "certify", safety: "READ_ONLY", description: "Run failure and recovery certification scenarios" },
  { command: "capabilities", safety: "READ_ONLY", description: "List installed and missing CLI capabilities" },
  { command: "ai refresh", safety: "MUTATING", description: "Regenerate .synth/ai/ metadata from canonical state", requiresApproval: true },
  // Adapter management delegated through `synth adapter <subcommand>`
  { command: "adapter list", safety: "READ_ONLY", description: "List registered adapters" },
  { command: "adapter info", safety: "READ_ONLY", description: "Show adapter metadata and health" },
  { command: "adapter enable", safety: "POTENTIALLY_MUTATING", description: "Activate an adapter in the current session" },
  { command: "adapter disable", safety: "POTENTIALLY_MUTATING", description: "Deactivate an adapter in the current session" },
  { command: "adapter configure", safety: "MUTATING", description: "Configure adapter settings", requiresApproval: true },
  { command: "adapter status", safety: "READ_ONLY", description: "Report adapter runtime status" },
  { command: "adapter health", safety: "READ_ONLY", description: "Report adapter health check" },
  { command: "adapter init", safety: "MUTATING", description: "Initialize an adapter", requiresApproval: true },
  { command: "adapter create-branch", safety: "MUTATING", description: "Create a repository branch through the adapter", requiresApproval: true },
  { command: "adapter checkout", safety: "MUTATING", description: "Check out a branch through the adapter", requiresApproval: true },
  { command: "adapter commit", safety: "MUTATING", description: "Create a commit through the adapter", requiresApproval: true },
  { command: "adapter promote", safety: "MUTATING", description: "Promote a branch through the adapter", requiresApproval: true },
  { command: "adapter install-hooks", safety: "MUTATING", description: "Install git hooks through the adapter", requiresApproval: true },
  { command: "adapter github-create-issue", safety: "MUTATING", description: "Create a GitHub issue through the adapter", requiresApproval: true },
  { command: "adapter github-create-pr", safety: "MUTATING", description: "Create a GitHub pull request through the adapter", requiresApproval: true },
  { command: "adapter github-merge-pr", safety: "MUTATING", description: "Merge a GitHub pull request through the adapter", requiresApproval: true },
  { command: "adapter tdd-generate-test", safety: "PROPOSAL_ONLY", description: "Generate a TDD test proposal through the adapter" },
  { command: "adapter tdd-verify-failure", safety: "READ_ONLY", description: "Verify a TDD test fails as expected" },
  { command: "adapter tdd-verify-implementation", safety: "READ_ONLY", description: "Verify a TDD implementation passes" },
  { command: "adapter tdd-evidence", safety: "PROPOSAL_ONLY", description: "Generate TDD evidence proposal through the adapter" },
  { command: "adapter bdd-create-feature", safety: "PROPOSAL_ONLY", description: "Create a BDD feature proposal through the adapter" },
  { command: "adapter bdd-create-scenario", safety: "PROPOSAL_ONLY", description: "Create a BDD scenario proposal through the adapter" },
  { command: "adapter bdd-generate-tests", safety: "READ_ONLY", description: "Generate BDD acceptance tests" },
  { command: "adapter bdd-verify", safety: "READ_ONLY", description: "Verify BDD behavior" },
  { command: "adapter bdd-evidence", safety: "PROPOSAL_ONLY", description: "Generate BDD behavior evidence proposal" },
  { command: "intent create", safety: "MUTATING", description: "Create an Intent Model from a JSON file", requiresApproval: true },
  { command: "intent refine", safety: "MUTATING", description: "Run a refinement session and produce a Refinement Report", requiresApproval: true },
  { command: "intent submit", safety: "MUTATING", description: "Submit a refined Intent Model for Alignment Contract creation", requiresApproval: true },
  { command: "intent approve", safety: "MUTATING", description: "Approve or reject a Refinement Report", requiresApproval: true },
  { command: "alignment create", safety: "MUTATING", description: "Create an Alignment Contract proposal", requiresApproval: true },
  { command: "alignment submit", safety: "MUTATING", description: "Submit an Alignment Contract for approval", requiresApproval: true },
  { command: "alignment approve", safety: "MUTATING", description: "Approve an Alignment Contract", requiresApproval: true },
  { command: "alignment prepare", safety: "MUTATING", description: "Prepare alignment from refined Intent Models", requiresApproval: true },
  // Git governance snapshots (EXP-GIT-001)
  { command: "snapshot create", safety: "MUTATING", description: "Create a git-anchored governance snapshot", requiresApproval: true },
  { command: "snapshot list", safety: "READ_ONLY", description: "List governance snapshot tags" },
  { command: "snapshot show", safety: "READ_ONLY", description: "Show governance snapshot metadata" },
  { command: "snapshot verify", safety: "READ_ONLY", description: "Verify snapshot replay consistency" },
  { command: "snapshot", safety: "READ_ONLY", description: "Show snapshot help" },
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

/**
 * Classify a parsed argv invocation into the canonical command string used
 * by the command-safety registry and capability-detection logic.
 *
 * Exported here (rather than in synth.ts) so capabilities-data.ts can detect
 * whether a command-surface capability is actually wired in the dispatcher
 * without creating a circular dependency with the CLI entry point.
 */
export function classifyInvocation(
  rawArgs: string[],
  positional: string[],
  flags: Record<string, string | boolean>,
): string {
  if (rawArgs.length === 0 || rawArgs.includes("--help") || rawArgs.includes("-h")) return "--help"
  if (rawArgs.includes("--version") || rawArgs.includes("-v")) return "--version"

  const namespace = positional[0] || ""
  const sub = positional[1]

  if (namespace === "report") return "report"

  if (namespace === "bootstrap") {
    if (flags.approve === true) return "bootstrap --approve"
    if (flags["dry-run"] === true) return "bootstrap --dry-run"
    return "bootstrap"
  }
  if (namespace === "docs" && sub === "generate") return "docs generate"
  if (namespace === "repair" && sub === "replay") {
    return flags.approve === true || flags.approve === "true" ? "repair replay --approve" : "repair replay"
  }
  if (namespace === "repair" && sub === "state") {
    return flags.approve === true || flags.approve === "true" ? "repair state --approve" : "repair state"
  }
  if (namespace === "first-contact" || namespace === "genesis") {
    const prefix = namespace
    if (!sub) {
      if (flags.approve === true || flags.approve === "true") return `${prefix} --approve`
      if (flags["dry-run"] === true) return `${prefix} --dry-run`
      return prefix
    }
    if (sub === "start") return `${prefix} start`
    if (sub === "clarify") return `${prefix} clarify`
    if (sub === "project") return `${prefix} project`
    if (sub === "verify") return `${prefix} verify`
    if (sub === "approve") return `${prefix} approve`
    if (sub === "status") return `${prefix} status`
    if (sub === "materialize") {
      if (flags["dry-run"] === true) return `${prefix} materialize --dry-run`
      if (flags.approve === true || flags.approve === "true") return `${prefix} materialize --approve`
      return `${prefix} materialize`
    }
  }
  if (namespace === "repo") {
    if (sub === "init") return "repo init"
    if (sub === "branch" && positional[2] === "create") return "repo branch create"
    if (sub === "pr" && positional[2] === "open") return "repo pr open"
    if (sub === "pr" && positional[2] === "approve") return "repo pr approve"
    if (sub === "pr" && positional[2] === "merge") return "repo pr merge"
    if (sub === "release" && positional[2] === "create") return "repo release create"
    if (sub === "status") return "repo status"
  }
  if (namespace === "release") {
    if (flags.approve === true || flags.approve === "true") return "release --approve"
    if (flags["dry-run"] === true) return "release --dry-run"
    return "release"
  }
  if (namespace === "mission") {
    if (sub === "create") return "mission create"
    if (sub === "approve") return "mission approve"
    if (sub === "decisions") return "mission decisions"
    if (sub === "evidence" && positional[2] === "add") return "mission evidence add"
    if (sub === "snapshot") return "mission snapshot"
    if (sub === "project") return "mission project"
    if (sub === "verify-charter") return "mission verify-charter"
    if (sub === "report") return "mission report"
    if (sub === "delete") return "mission delete"
  }
  if (namespace === "program") {
    if (sub === "list") return "program list"
    if (sub === "show") return "program show"
    if (sub === "rank") return "program rank"
  }
  if (namespace === "validate") {
    if (flags.full === true || flags.full === "true") return "validate --full"
    if (sub === "dependencies") return "validate dependencies"
    if (sub === "artifact") return "validate artifact"
    return "validate"
  }
  if (namespace === "task") {
    if (sub === "list") return "task list"
    if (sub === "explain") return "task explain"
    if (sub === "graph") return "task graph"
    if (sub === "doctor") return "task doctor"
    return "task"
  }
  if (namespace === "snapshot") {
    if (sub === "create") return "snapshot create"
    if (sub === "list") return "snapshot list"
    if (sub === "show") return "snapshot show"
    if (sub === "verify") return "snapshot verify"
    return "snapshot"
  }
  if (namespace === "adapter") {
    const adapterSub = sub || ""
    const known = [
      "list", "info", "enable", "disable", "configure", "status", "health", "init",
      "create-branch", "checkout", "commit", "promote", "install-hooks",
      "github-create-issue", "github-create-pr", "github-merge-pr",
      "tdd-generate-test", "tdd-verify-failure", "tdd-verify-implementation", "tdd-evidence",
      "bdd-create-feature", "bdd-create-scenario", "bdd-generate-tests", "bdd-verify", "bdd-evidence",
    ]
    if (known.includes(adapterSub)) return `adapter ${adapterSub}`
    return "adapter"
  }
  if (namespace === "intent") {
    if (sub === "create") return "intent create"
    if (sub === "refine") return "intent refine"
    if (sub === "submit") return "intent submit"
    if (sub === "approve") return "intent approve"
  }
  if (namespace === "alignment") {
    if (sub === "create") return "alignment create"
    if (sub === "submit") return "alignment submit"
    if (sub === "approve") return "alignment approve"
    if (sub === "prepare") return "alignment prepare"
  }
  if (namespace === "expedition") {
    if (sub === "create") return "expedition create"
    if (sub === "approve") return "expedition approve"
    if (sub === "commit") return "expedition commit"
    if (sub === "start") return "expedition start"
    if (sub === "complete") return "expedition complete"
    if (sub === "archive") return "expedition archive"
    if (sub === "delete") return "expedition delete"
    if (sub === "move") return "expedition move"
    if (sub === "evidence") return "expedition evidence"
    if (sub === "certify") return "expedition certify"
    if (sub === "list") return "expedition list"
    if (sub === "show") return "expedition show"
    if (sub === "rank") return "expedition rank"
    if (sub === "report") return "expedition report"
  }
  if (namespace === "capabilities") {
    return "capabilities"
  }
  if (namespace === "project") {
    if (sub === "AGENTS.md") return "project AGENTS.md"
    return "project"
  }

  return namespace
}
