// ============================================================
// CLI: ceremony / auto-commit
// ============================================================
// Extracted from src/cli/synth.ts by EXP-CLI-003 item 3.
//
// The goal names this as one of the four helper clusters that must be extracted
// ONCE into a module of its own, so that when the 97 cmd* handlers move out of
// the 9120-line dispatcher into a verb -> loader registry they import these from
// one home instead of duplicating them. Duplication is exactly how entry.ts and
// synth.ts drifted apart in the first place.
//
// Behaviour is unchanged: the same code, the same module-scope state, moved.
// Anything that was module-private in synth.ts and is only used here stays
// private here; anything a caller in synth.ts still needs is exported.
// ============================================================

import path from "path"
import { bootstrap } from "../core/bootstrap.js"
import { setAgentTelemetry, printJson, printError, setHumanMode, setQuietMode, setSummaryMode } from "./print.js"
import { ceremonyForCapability, commitCeremony, commitCeremonySync } from "../ledger/ceremony.js"
import { initCliIdentity, injectIdentityContext } from "./identity-context.js"
import { isAutoCommitEnabled } from "./working-tree.js"

export async function bootstrapWithCapabilities(config: Parameters<typeof bootstrap>[0]) {
  const ctx = await bootstrap(config)
  // Capabilities are registered during genesis; when genesis is skipped
  // (the normal CLI path) we register them explicitly so that the CLI
  // can invoke capabilities through the ExecutionGate.
  for (const name of ctx.capabilityRegistry.list()) {
    const cap = ctx.capabilityRegistry.resolve(name)
    if (cap) {
      ctx.runtime.registerCapability(cap)
    }
  }
  // EXP-IDENTITY-001: ensure every handleIntent call carries the CLI identity.
  injectIdentityContext(ctx.api)
  // ADR-055 rev 2 §R2.1 · AC1/AC10: the single choke point where every
  // governance mutation lands a ledger commit. Verbs that commit themselves
  // (verbLevel) and non-ceremony capabilities are skipped; everything else is
  // committed through the Ledger Writer with the normative message shape.
  wrapHandleIntentWithCeremony(ctx.api)
  return ctx
}

/**
 * The ceremony a `handleIntent` call started, waiting to be committed. Marking
 * at the choke point (instead of committing there) is what makes one verb one
 * commit: the verb may write draft files, snapshots or decisions after the
 * capability returns, and all of it belongs to the same ceremony commit.
 */
let pendingCeremony: { key: string; entityId?: string } | undefined

export function markCeremony(key: string, entityId?: string): void {
  pendingCeremony = { key, entityId }
  installExitFlush()
}

/**
 * A verb may mutate governance state and *then* fail — `printError` exits the
 * process, so the deferred flush in `main()` never runs. This last-resort hook
 * commits the pending ceremony synchronously at exit so a failure cannot leave
 * the ledger dirty (it refuses to commit from a checkout that is not on the
 * ledger branch; that would recreate the cross-branch bleed, F12).
 */
let exitFlushInstalled = false
export function installExitFlush(): void {
  if (exitFlushInstalled) return
  exitFlushInstalled = true
  process.on("exit", () => {
    const pending = pendingCeremony
    pendingCeremony = undefined
    if (!pending) return
    // `--no-auto-commit` (global, mirrored into autoCommitDisabledByFlag in
    // main()) disables the exit flush too: the operator asked for no writes.
    if (!isAutoCommitEnabled()) return
    const result = commitCeremonySync(process.cwd(), pending.key, pending.entityId)
    if (result.committed) {
      process.stderr.write(`ledger: recorded ${result.message} on exit (${result.commitHash.slice(0, 8)})\n`)
    } else if (result.reason && result.reason !== "no ledger changes") {
      process.stderr.write(`ledger: the pending ceremony could not be committed on exit — ${result.reason}\n`)
    }
  })
}

/**
 * Commit the pending ceremony (ADR-055 rev 2 §R2.1 · AC1/AC10). Called by the
 * handlers that want the commit in their response envelope, and by `main()`
 * after every command so no verb can end with an uncommitted ledger.
 */
export async function flushPendingCeremony(): Promise<LedgerCommitInfo | undefined> {
  const pending = pendingCeremony
  pendingCeremony = undefined
  if (!pending || !isAutoCommitEnabled()) return undefined

  const ceremony = await commitCeremony(process.cwd(), pending.key, pending.entityId)
  if (!ceremony.committed && ceremony.code) {
    // No silent `{committed:false}`: a ceremony whose ledger commit was
    // refused fails loudly with the writer's code and next step.
    printError(ceremony.reason ?? "The ledger commit for this ceremony failed", {
      code: ceremony.code,
      category: "ledger",
      suggestion: ceremony.nextStep,
    })
  }
  return {
    committed: ceremony.committed,
    ...(ceremony.commitHash ? { commitHash: ceremony.commitHash } : {}),
    message: ceremony.message,
    files: ceremony.files,
    ...(ceremony.reason ? { reason: ceremony.reason } : {}),
  }
}

export type LedgerCommitInfo = {
  committed: boolean
  commitHash?: string
  message: string
  files: string[]
  reason?: string
}

/**
 * Wrap `api.handleIntent` so a successful governance capability marks the
 * ceremony the verb must commit. Verb-level ceremonies keep their own commit
 * call sites; this closes the verbs that previously committed nothing at all.
 */
export function wrapHandleIntentWithCeremony(api: { handleIntent: (request: any) => Promise<any> }): void {
  const original = api.handleIntent.bind(api)
  api.handleIntent = async (request: any) => {
    const result = await original(request)
    if (result?.status !== "ok") return result

    const ceremony = ceremonyForCapability(request?.capability, request?.payload)
    if (!ceremony || ceremony.spec.verbLevel) return result

    markCeremony(ceremony.key, ceremony.entityId)
    return result
  }
}

