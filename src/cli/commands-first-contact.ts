// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { printError } from "./print.js"
import { cmdFirstContactStart, cmdFirstContactClarify, cmdFirstContactProject, cmdFirstContactVerify, cmdFirstContactApprove, cmdFirstContactMaterialize, cmdFirstContactStatus, cmdFirstContactOnboard, cmdFirstContactOnboardDetect, cmdFirstContactOnboardArchive, cmdFirstContactOnboardInit, cmdFirstContactOnboardBootstrap, cmdFirstContactOnboardMission, cmdFirstContactOnboardGovern } from "./first-contact.js"


export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (!sub) await cmdFirstContactOnboard(positional.slice(1), flags)
  else if (sub === "start") await cmdFirstContactStart(positional.slice(2), flags)
  else if (sub === "clarify") await cmdFirstContactClarify(positional.slice(2), flags)
  else if (sub === "project") await cmdFirstContactProject(positional.slice(2), flags)
  else if (sub === "verify") await cmdFirstContactVerify(positional.slice(2), flags)
  else if (sub === "approve") await cmdFirstContactApprove(positional.slice(2), flags)
  else if (sub === "materialize") await cmdFirstContactMaterialize(positional.slice(2), flags)
  else if (sub === "status") await cmdFirstContactStatus(positional.slice(2), flags)
  else if (sub === "onboard:detect") await cmdFirstContactOnboardDetect(positional.slice(2), flags)
  else if (sub === "onboard:archive") await cmdFirstContactOnboardArchive(positional.slice(2), flags)
  else if (sub === "onboard:init") await cmdFirstContactOnboardInit(positional.slice(2), flags)
  else if (sub === "onboard:bootstrap") await cmdFirstContactOnboardBootstrap(positional.slice(2), flags)
  else if (sub === "onboard:mission") await cmdFirstContactOnboardMission(positional.slice(2), flags)
  else if (sub === "onboard:govern") await cmdFirstContactOnboardGovern(positional.slice(2), flags)
  else
    printError(
      "Usage: synth first-contact [--dry-run | --approve] | synth first-contact start \"<intent>\" | synth first-contact clarify [--field <field> --answer <answer> | --agent-choice <choice> --reason <why> --scope <area>] | synth first-contact project | synth first-contact verify | synth first-contact approve | synth first-contact materialize --dry-run | --approve | synth first-contact status | synth first-contact onboard:<detect|archive|init|bootstrap|mission|govern>",
    )
}
