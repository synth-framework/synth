// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { printJson } from "./print.js"
import { buildCapabilityEntries, buildImplementedCommandSet } from "./capabilities-data.js"
import { createAdapterRegistry } from "../mission-studio/adapter-registry.js"
import { bootstrapWithCapabilities } from "./auto-commit-ceremony.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdCapabilities() {
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })
  const installedCapabilities = new Set(ctx.capabilityRegistry.list())
  const adapterRegistry = createAdapterRegistry()
  const installedAdapters = new Set(adapterRegistry.list())
  const implementedCommands = buildImplementedCommandSet()

  const capabilities = buildCapabilityEntries(installedCapabilities, installedAdapters, implementedCommands)

  printJson({
    status: "ok",
    kind: "CapabilityReport",
    capabilities,
    adapters: Array.from(installedAdapters).sort(),
  })
}


export async function cmdCapabilitiesHelp() {
  printJson(namespaceHelp("capabilities", "Expose what the installed CLI can and cannot do", [
    { name: "synth capabilities", description: "List installed and missing CLI capabilities" },
    { name: "synth capabilities --json", description: "Emit structured capability report (default)" },
  ], {
    note: "Expected capabilities without a registered runtime capability or adapter are reported as unavailable.",
  }))
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  await cmdCapabilities()
}
