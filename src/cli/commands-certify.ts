// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import path from "path"
import { printJson } from "./print.js"
import { runCertification, printCertificationReport, writeMatrix } from "./certification-runner.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdCertify(flags: Record<string, string | boolean>) {
  const libraryDir =
    typeof flags["library-dir"] === "string"
      ? flags["library-dir"]
      : path.resolve(process.cwd(), "tests", "certifications")
  const outputDir =
    typeof flags["output-dir"] === "string"
      ? flags["output-dir"]
      : path.resolve(process.cwd(), "proof", "certifications")
  const matrixPath =
    typeof flags["matrix"] === "string"
      ? flags["matrix"]
      : path.resolve(process.cwd(), "docs", "certification-matrix.md")
  const explain = flags.explain === true || flags.explain === "true"

  const cliPath = process.argv[1]
  const report = await runCertification({
    cliPath,
    libraryDir,
    outputDir,
    explain,
  })

  writeMatrix(report, matrixPath)

  if (explain) {
    printCertificationReport(report)
  } else {
    printJson({
      status: report.summary.failed === 0 ? "ok" : "error",
      kind: "CertificationResult",
      summary: report.summary,
      matrixPath,
      reportGeneratedAt: report.generatedAt,
    })
  }

  if (report.summary.failed > 0) {
    process.exit(1)
  }
}


export async function cmdCertifyHelp() {
  printJson(namespaceHelp("certify", "Run failure and recovery certification scenarios", [
    { name: "synth certify", description: "Run the default certification scenario library" },
    { name: "synth certify --explain", description: "Emit the full structured certification report" },
    { name: "synth certify --library-dir <dir>", description: "Load scenarios from a custom directory" },
    { name: "synth certify --output-dir <dir>", description: "Write structured evidence reports to <dir>" },
    { name: "synth certify --matrix <path>", description: "Write the certification matrix to <path>" },
  ]))
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  await cmdCertify(flags)
}
