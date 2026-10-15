// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { printJson } from "./print.js"
import { cmdVerify } from "./verify.js"
import { cmdVerifySignatures } from "./signatures.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdVerifyHelp() {
  printJson(namespaceHelp("verify", "Verify governance invariants, projection consistency, and event-log signatures", [
    { name: "synth verify", description: "Run the full governance invariant verification suite" },
    { name: "synth verify signatures", description: "Verify Ed25519 signatures and Merkle roots in the event log" },
    { name: "synth verify signatures --public-key <path>", description: "Verify against a specific public key", args: "--public-key <path>" },
  ]))
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "signatures") await cmdVerifySignatures()
  else await cmdVerify()
}
