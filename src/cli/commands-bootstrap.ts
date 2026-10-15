// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { printJson } from "./print.js"
import { namespaceHelp } from "./command-help.js"
import { cmdBootstrap } from "./command-bootstrap.js"


export async function cmdBootstrapHelp() {
  const help = namespaceHelp("bootstrap", "Transform a repository into a Synth project", [
    { name: "synth bootstrap [path]", description: "Analyze repository and produce a bootstrap proposal" },
    { name: "synth bootstrap [path] --dry-run", description: "Generate proposal without mutating state", args: "--dry-run" },
    { name: "synth bootstrap [path] --approve", description: "Apply bootstrap and initialize governance artifacts", args: "--approve" },
    { name: "synth bootstrap [path] --approve --human", description: "Apply bootstrap and print human-readable progress", args: "--approve --human" },
    { name: "synth bootstrap [path] --approve --stream-stages", description: "Stream structured stage events to stderr", args: "--approve --stream-stages" },
    { name: "synth bootstrap [path] --name <name>", description: "Override the project name", args: "--name <name>" },
    { name: "synth bootstrap [path] --with-website", description: "Scaffold a static website", args: "--with-website" },
    { name: "synth bootstrap [path] --with-example", description: "Scaffold an example directory", args: "--with-example" },
  ])
  help.usage = "synth bootstrap [path] [options]"
  printJson(help)
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  await cmdBootstrap(positional.slice(1), flags)
}
