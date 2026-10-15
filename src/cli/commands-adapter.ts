// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import path from "path"
import { spawn } from "child_process"
import { printJson } from "./print.js"
import { namespaceHelp } from "./command-help.js"
import { __dirname } from "./command-location.js"


export async function cmdAdapterHelp() {
  printJson(namespaceHelp("adapter", "Delegate to the adapter management CLI", [
    { name: "synth adapter <adapter> [args...]", description: "Run an adapter-specific command" },
    { name: "synth adapter install-hooks", description: "Install governance git hooks (backs up existing hooks)" },
  ]))
}


export async function cmdAdapter(args: string[]) {
  // Delegate to the existing adapter CLI by spawning it.
  // Exit directly with the child's code so its stdout/stderr remains the only output.
  return new Promise<never>((_resolve) => {
    const child = spawn("node", [path.join(__dirname, "adapter.js"), ...args], {
      stdio: "inherit",
      cwd: process.cwd(),
    })
    child.on("close", (code) => {
      process.exit(code ?? 1)
    })
  })
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  await cmdAdapter(positional.slice(1))
}
