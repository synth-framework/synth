// ============================================================
// FIRST CONTACT: Rule-Based Architecture Projection Adapter
// ============================================================
// Produces architecture candidates from a Discovery Artifact using
// deterministic rules based on runtime, language, and capability hints.
// ============================================================

import type {
  ArchitectureCandidate,
  ArchitectureProjectionAdapter,
  ArchitectureProjectionResult,
} from "../types.js"

interface ArtifactView {
  intent: { description: string; goals: string[]; successCriteria: string[] }
  audience: { primaryUsers: string[]; stakeholders: string[] }
  environment: { targetRuntime: string; languagePreferences: string[]; platformConstraints: string[] }
  capabilities: { required: string[]; optional: string[] }
  constraints: { functional: string[]; nonFunctional: string[] }
}

function hasLanguage(artifact: ArtifactView, language: string): boolean {
  return artifact.environment.languagePreferences.some((l) => l.toLowerCase() === language.toLowerCase())
}

function hasRuntime(artifact: ArtifactView, runtime: string): boolean {
  return artifact.environment.targetRuntime.toLowerCase() === runtime.toLowerCase()
}

function hasCapability(artifact: ArtifactView, capability: string): boolean {
  return artifact.capabilities.required.some((c) => c.toLowerCase().includes(capability.toLowerCase()))
}

function hasConstraint(artifact: ArtifactView, constraint: string): boolean {
  const all = [...artifact.constraints.functional, ...artifact.constraints.nonFunctional]
  return all.some((c) => c.toLowerCase().includes(constraint.toLowerCase()))
}

function webTypeScriptCandidate(artifact: ArtifactView): ArchitectureCandidate {
  const usesApi = hasCapability(artifact, "api") || hasCapability(artifact, "launch")
  const name = usesApi ? "Next.js + Vercel + external API" : "Next.js + Vercel static app"
  return {
    id: "arch-web-nextjs",
    name,
    description: "Full-stack or static TypeScript web application hosted on Vercel.",
    rationale: "Matches the web runtime and TypeScript preference with a serverless deployment model.",
    tradeoffs: {
      advantages: ["TypeScript-native", "Rapid prototyping", "Serverless hosting", "Large ecosystem"],
      disadvantages: ["Vendor lock-in if using Vercel", "Requires Node runtime"],
    },
    assumptions: ["Node >= 20", "Vercel account or equivalent serverless platform available"],
    recommended: true,
    confidence: 0.85,
  }
}

function webPythonCandidate(artifact: ArtifactView): ArchitectureCandidate {
  const name = hasCapability(artifact, "api") ? "FastAPI + Uvicorn" : "Flask + Jinja2"
  return {
    id: "arch-web-python",
    name,
    description: "Python web application using a lightweight framework.",
    rationale: "Matches the web runtime and Python preference without requiring a JavaScript frontend build.",
    tradeoffs: {
      advantages: ["Familiar Python ecosystem", "Simple deployment", "Good for API backends"],
      disadvantages: ["May require persistent server", "Less integrated frontend tooling"],
    },
    assumptions: ["Python >= 3.10", "WSGI/ASGI server available"],
    recommended: false,
    confidence: 0.7,
  }
}

function cliPythonCandidate(artifact: ArtifactView): ArchitectureCandidate {
  return {
    id: "arch-cli-python",
    name: "Python CLI with Click + Jinja2",
    description: "Command-line tool implemented in Python with argument parsing and templated output.",
    rationale: "Matches the CLI runtime and Python preference with minimal dependencies.",
    tradeoffs: {
      advantages: ["Simple distribution via pip", "Mature CLI libraries", "Easy testing"],
      disadvantages: ["Requires Python runtime", "Limited to command-line users"],
    },
    assumptions: ["Python >= 3.10"],
    recommended: true,
    confidence: 0.85,
  }
}

function cliNodeCandidate(artifact: ArtifactView): ArchitectureCandidate {
  return {
    id: "arch-cli-node",
    name: "Node.js CLI with Commander + ESM",
    description: "Command-line tool implemented in TypeScript/JavaScript for Node.js.",
    rationale: "Matches the CLI runtime and Node/TypeScript preference with modern ESM tooling.",
    tradeoffs: {
      advantages: ["Fast startup", "Easy npm distribution", "TypeScript support"],
      disadvantages: ["Requires Node runtime", "Smaller standard library than Python"],
    },
    assumptions: ["Node >= 20"],
    recommended: false,
    confidence: 0.75,
  }
}

function fallbackCandidate(artifact: ArtifactView): ArchitectureCandidate {
  const runtime = artifact.environment.targetRuntime || "unknown"
  const language = artifact.environment.languagePreferences[0] || "unspecified"
  return {
    id: "arch-fallback",
    name: `${runtime || "General"} application in ${language || "preferred language"}`,
    description: "A minimal architecture derived from the stated runtime and language preferences.",
    rationale: "Fallback candidate used when no specific rule matches the input.",
    tradeoffs: {
      advantages: ["Broadly applicable", "Minimal assumptions"],
      disadvantages: ["Lacks specific tooling recommendations", "Requires more design work"],
    },
    assumptions: ["Operator will refine runtime and language choices"],
    recommended: true,
    confidence: 0.5,
  }
}

export class RuleBasedArchitectureProjectionAdapter implements ArchitectureProjectionAdapter {
  readonly version = "1.0.0"

  project(artifact: ArtifactView): ArchitectureProjectionResult {
    const candidates: ArchitectureCandidate[] = []

    if (hasRuntime(artifact, "web")) {
      if (hasLanguage(artifact, "typescript") || hasLanguage(artifact, "javascript") || hasLanguage(artifact, "node")) {
        candidates.push(webTypeScriptCandidate(artifact))
      }
      if (hasLanguage(artifact, "python")) {
        candidates.push(webPythonCandidate(artifact))
      }
    }

    if (hasRuntime(artifact, "cli")) {
      if (hasLanguage(artifact, "python")) {
        candidates.push(cliPythonCandidate(artifact))
      }
      if (hasLanguage(artifact, "typescript") || hasLanguage(artifact, "javascript") || hasLanguage(artifact, "node")) {
        candidates.push(cliNodeCandidate(artifact))
      }
    }

    // If no runtime-specific rule matched, infer a candidate from language alone.
    if (candidates.length === 0) {
      if (hasLanguage(artifact, "python")) {
        candidates.push(cliPythonCandidate(artifact))
      } else if (
        hasLanguage(artifact, "typescript") ||
        hasLanguage(artifact, "javascript") ||
        hasLanguage(artifact, "node")
      ) {
        candidates.push(webTypeScriptCandidate(artifact))
      }
    }

    if (candidates.length === 0) {
      candidates.push(fallbackCandidate(artifact))
    }

    // Mark a single recommended candidate.
    const recommended = candidates.find((c) => c.recommended) ?? candidates[0]
    if (recommended && !recommended.recommended) {
      recommended.recommended = true
    }

    return { candidates, recommended }
  }
}
