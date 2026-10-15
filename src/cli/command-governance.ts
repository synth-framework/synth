// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { spawn } from "child_process"
import { governDelegationMessage, npmCommand } from "./govern-delegation.js"
import { printJson } from "./print.js"
import { runVerification } from "../verification/engine.js"


export async function runInternalGovernance(condition: "missing-package-json" | "missing-govern-script"): Promise<void> {
  const report = await runVerification(process.cwd())
  printJson({
    status: report.status === "error" ? "error" : "ok",
    kind: "GovernResult",
    delegated: false,
    condition,
    message: governDelegationMessage(condition),
    report,
  })
  if (report.status === "error") {
    process.exit(1)
  }
}


export interface NpmScriptResult {
  status: number
  stdout: string
  stderr: string
}


/**
 * Run an npm script while preserving the single-channel stdout contract.
 * The child's stdout and stderr are streamed to the parent's stderr for live
 * feedback, captured for inclusion in structured output, and never written
 * directly to the parent's stdout.
 */
export function runNpmScript(args: string[], env: NodeJS.ProcessEnv, cwd: string): Promise<NpmScriptResult> {
  return new Promise((resolve) => {
    let stdout = ""
    let stderr = ""
    const child = spawn(npmCommand(), args, {
      cwd,
      env,
      stdio: ["inherit", "pipe", "pipe"],
    })
    child.stdout?.on("data", (data) => {
      stdout += data
    })
    child.stderr?.on("data", (data) => {
      stderr += data
    })
    child.on("close", (code) => {
      resolve({ status: code ?? 1, stdout, stderr })
    })
  })
}
