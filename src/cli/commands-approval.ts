// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { printJson } from "./print.js"
import { cmdApprovalRequest, cmdApprovalGrant, cmdApprovalDeny, cmdApprovalList, cmdApprovalShow } from "./approval.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdApprovalHelp() {
  printJson(namespaceHelp("approval", "Two-party approval operations for destructive governance actions", [
    { name: "synth approval request --operation <op> --reason \"...\"", description: "Request approval for a destructive operation", args: "--operation <op> --reason <reason>" },
    { name: "synth approval grant --request-id <id> --reason \"...\"", description: "Grant a pending approval request", args: "--request-id <id> --reason <reason>" },
    { name: "synth approval deny --request-id <id> --reason \"...\"", description: "Deny a pending approval request", args: "--request-id <id> --reason <reason>" },
    { name: "synth approval list [--operation <op>] [--status <status>]", description: "List approval requests" },
    { name: "synth approval show --request-id <id>", description: "Show a single approval request", args: "--request-id <id>" },
  ]))
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "request") await cmdApprovalRequest(flags)
  else if (sub === "grant") await cmdApprovalGrant(flags)
  else if (sub === "deny") await cmdApprovalDeny(flags)
  else if (sub === "list") await cmdApprovalList(flags)
  else if (sub === "show") await cmdApprovalShow(flags)
  else await cmdApprovalHelp()
}
