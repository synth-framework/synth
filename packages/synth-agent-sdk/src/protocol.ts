// ============================================================
// SYNTH Agent SDK — Protocol Parser
// ============================================================
// Parses the Genesis Protocol and repository metadata contracts
// so an agent can discover SYNTH capabilities and follow the
// correct workflow without repository-specific instructions.
// ============================================================

export type RepositoryType = "greenfield" | "brownfield" | "hybrid" | "unknown"
export type LifecyclePhase =
  | "uninitialized"
  | "initialized"
  | "planning"
  | "approved"
  | "executing"
  | "blocked"
  | "complete"
export type MutationPolicy = "READ_ONLY" | "PROPOSAL_ONLY" | "MUTATING"

export type GenesisProtocol = {
  version: string
  repositoryType: RepositoryType
  lifecyclePhase: LifecyclePhase
  mutationPolicy: MutationPolicy
  supportedInputTypes: string[]
  supportedOutputArtifacts: string[]
  nextCommand: string | undefined
}

export type ParsedCommand = {
  namespace: string
  subcommand: string | undefined
  args: string[]
  flags: Record<string, string | boolean>
}

export function parseSynthCommand(input: string): ParsedCommand {
  const tokens = input.trim().split(/\s+/)
  const namespace = tokens[1] || ""
  const subcommand = tokens[2] && !tokens[2].startsWith("-") ? tokens[2] : undefined
  const args: string[] = []
  const flags: Record<string, string | boolean> = {}

  for (let i = subcommand ? 3 : 2; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.startsWith("--")) {
      const equalIndex = token.indexOf("=")
      if (equalIndex !== -1) {
        flags[token.slice(2, equalIndex)] = token.slice(equalIndex + 1)
      } else if (i + 1 < tokens.length && !tokens[i + 1].startsWith("-")) {
        flags[token.slice(2)] = tokens[i + 1]
        i++
      } else {
        flags[token.slice(2)] = true
      }
    } else if (token.startsWith("-")) {
      flags[token.slice(1)] = true
    } else {
      args.push(token)
    }
  }

  return { namespace, subcommand, args, flags }
}

export function deriveProtocol(metadata: {
  repositoryType?: RepositoryType
  lifecyclePhase?: LifecyclePhase
  mutationPolicy?: MutationPolicy
  supportedInputTypes?: string[]
  supportedOutputArtifacts?: string[]
}): GenesisProtocol {
  const repositoryType = metadata.repositoryType || "unknown"
  const lifecyclePhase = metadata.lifecyclePhase || "uninitialized"
  const mutationPolicy = metadata.mutationPolicy || "READ_ONLY"

  return {
    version: "1.0.0",
    repositoryType,
    lifecyclePhase,
    mutationPolicy,
    supportedInputTypes: metadata.supportedInputTypes || ["natural_language"],
    supportedOutputArtifacts: metadata.supportedOutputArtifacts || [],
    nextCommand: deriveNextCommand(repositoryType, lifecyclePhase),
  }
}

function deriveNextCommand(repositoryType: RepositoryType, lifecyclePhase: LifecyclePhase): string | undefined {
  if (lifecyclePhase === "uninitialized") return "synth init --name <project-name>"
  if (repositoryType === "brownfield" || repositoryType === "hybrid") return "synth discover [--export]"
  if (repositoryType === "greenfield" || repositoryType === "unknown") return "synth first-contact start '<intent>'"
  return undefined
}

export function isMutatingCommand(command: ParsedCommand): boolean {
  const mutatingNamespaces = ["bootstrap", "init", "mission", "expedition", "repair"]
  if (!mutatingNamespaces.includes(command.namespace)) return false
  // Some subcommands are read-only even inside mutating namespaces.
  if (command.namespace === "mission" && command.subcommand === "decisions") return false
  if (command.namespace === "expedition" && !command.subcommand) return false
  if (command.namespace === "discover" && command.subcommand === undefined) return false
  return true
}

export function isProposalOnlyCommand(command: ParsedCommand): boolean {
  return (
    command.namespace === "mission" &&
    (command.subcommand === "create" || command.subcommand === "evidence")
  )
}
