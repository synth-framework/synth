// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { printError } from "./print.js"
import { cmdRepoInit, cmdRepoBranchCreate, cmdRepoPrOpen, cmdRepoPrApprove, cmdRepoPrMerge, cmdRepoReleaseCreate, cmdRepoStatus } from "./repo.js"


export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "init") await cmdRepoInit(flags)
  else if (sub === "branch" && positional[2] === "create") await cmdRepoBranchCreate(flags)
  else if (sub === "pr" && positional[2] === "open") await cmdRepoPrOpen(flags)
  else if (sub === "pr" && positional[2] === "approve") await cmdRepoPrApprove(flags)
  else if (sub === "pr" && positional[2] === "merge") await cmdRepoPrMerge(flags)
  else if (sub === "release" && positional[2] === "create") await cmdRepoReleaseCreate(flags)
  else if (sub === "status") await cmdRepoStatus()
  else
    printError(
      "Usage: synth repo init --forge-provider <p> --version-strategy <s> | synth repo branch create --name <n> --type <t> | synth repo pr open --head <h> --base <b> --title <t> --body-file <f> | synth repo pr approve --id <id> | synth repo pr merge --id <id> --commit <sha> | synth repo release create --tag <t> --commit <sha> | synth repo status",
    )
}
