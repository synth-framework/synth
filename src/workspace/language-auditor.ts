// ============================================================
// WORKSPACE: Canonical Language Auditor
// ============================================================
// Verifies architectural layers use the correct vocabulary.
// Enforces SKR-001 knowledge-graph constraints and ASC-001
// legacy Ticket elimination.
// ============================================================

import { promises as fs } from "fs"
import path from "path"

export type LanguageLayerTerms = Record<string, string[]>

export type ForbiddenEntry = {
  term: string
  replacement?: string
  status?: "forbidden"
}

export type AuditIssue = {
  severity: "critical" | "warning"
  rule: string
  invariant?: string
  message: string
  match?: string
  node?: string
  relationship?: string
}

export type AuditResult = {
  passed: boolean
  issues: AuditIssue[]
  timestamp: number
}

export type LanguageReport = {
  planning: Array<{ term: string; status: string }>
  execution: Array<{ term: string; status: string }>
  governance: Array<{ term: string; status: string }>
  infrastructure: Array<{ term: string; status: string }>
  projection: Array<{ term: string; status: string }>
  workspace: Array<{ term: string; status: string }>
  forbidden: ForbiddenEntry[]
  skr: {
    approvedNodes: Array<{ term: string; status: string }>
    approvedRelationships: Array<{ term: string; status: string }>
    forbiddenNodes: Array<{ term: string; status: string }>
    forbiddenRelationships: Array<{ term: string; status: string }>
  }
}

export type LoadFromFileResult = {
  loaded: boolean
  layers: Record<string, string[]> | null
  forbidden: Array<{ term: string; replacement: string }> | null
  error: string | null
}

export class CanonicalLanguageAuditor {
  public loadedFromFile = false
  public sourcePath: string
  public ubiquitousLanguage: LanguageLayerTerms = {}
  public forbidden: { planning: string[]; architecture: string[] } = { planning: [], architecture: [] }
  public skrForbiddenNodes: string[] = []
  public skrApprovedNodes: string[] = []
  public skrApprovedRelationships: string[] = []
  public skrForbiddenRelationships: string[] = []

  constructor(options: { sourcePath?: string } = {}) {
    this.sourcePath = options.sourcePath || path.join(process.cwd(), "docs", "ubiquitous-language.md")
    this._loadDefaults()
  }

  private _loadDefaults() {
    this.ubiquitousLanguage = {
      planning: ["Mission", "Expedition", "Objective", "Discovery", "Decision", "SideQuest", "PlanningCognitionEngine", "EngineeringIntent"],
      execution: ["WorkItem", "Event", "Capability", "Intent", "ExecutionPlan", "ExecutionPrimitive", "RuntimeEngine", "CommandBus"],
      governance: ["Policy", "Invariant", "Seal", "Permit", "Attestation", "Genesis"],
      infrastructure: ["EventStore", "StateStore", "Replay", "Determinism", "ChainHash", "Partition"],
      projection: ["Projection", "ExecutionArtifactAdapter", "ArtifactIndependence"],
      workspace: ["Workspace", "Orientation", "Health", "Confidence", "SuggestedAction"],
    }
    this.forbidden = {
      planning: ["Ticket", "Sprint", "Story", "Epic", "Task", "Command", "Script"],
      architecture: ["GitHubIssue", "JiraTicket", "LinearIssue"],
    }
    this.skrForbiddenNodes = [
      "Agent", "Tool", "Workflow", "Capability", "Runtime", "Protocol",
      "Server", "Adapter", "Plugin", "Transport", "Provider", "Connector",
      "MCP", "A2A", "GitHub", "Jira", "Linear",
    ]
    this.skrApprovedNodes = [
      "Mission", "Expedition", "Objective", "WorkItem",
      "Discovery", "Decision", "Artifact", "Observation", "Constraint",
    ]
    this.skrApprovedRelationships = [
      "depends_on", "implements", "supports", "derived_from",
      "discovers", "produces", "invalidates", "blocks", "relates_to", "references",
    ]
    this.skrForbiddenRelationships = [
      "invoke", "execute", "rpc", "call", "tool_use", "http_request",
      "capability_invoke", "workflow_trigger", "agent_dispatch",
    ]
  }

  async loadFromFile(filePath?: string): Promise<LoadFromFileResult> {
    const srcPath = filePath || this.sourcePath
    try {
      const content = await fs.readFile(srcPath, "utf-8")
      const layers: Record<string, string[]> = {}
      const forbidden: Array<{ term: string; replacement: string }> = []

      const layerPattern = /##\s+(\w+)\s+Layer\n[\s\S]*?(?=##\s+\w+\s+Layer|##\s+Forbidden|$)/g
      const layerMatches = [...content.matchAll(layerPattern)]
      for (const match of layerMatches) {
        const layerName = match[1].toLowerCase()
        const tableRows = match[0].match(/\|\s*\*\*([^*]+)\*\*\s*\|/g) || []
        const terms = tableRows
          .map((row) => row.replace(/^\|\s*\*\*|\*\*\s*\|$/g, "").trim().replace(/\s+/g, ""))
          .filter(Boolean)
        if (terms.length > 0) layers[layerName] = terms
      }

      const forbiddenPattern = /##\s+Forbidden\s+Terms[\s\S]*?(?=##|$)/
      const forbiddenMatch = content.match(forbiddenPattern)
      if (forbiddenMatch) {
        const rows = forbiddenMatch[0].match(/\|\s*(\w+)\s*\|\s*(\w[\w\s]*)\s*\|/g) || []
        for (const row of rows) {
          const parts = row.split("|").map((p) => p.trim()).filter(Boolean)
          if (parts.length >= 2 && parts[0] !== "Forbidden Term") {
            forbidden.push({ term: parts[0], replacement: parts[1] })
          }
        }
      }

      if (Object.keys(layers).length > 0) {
        this.ubiquitousLanguage = { ...this.ubiquitousLanguage, ...layers }
      }
      if (forbidden.length > 0) {
        this.forbidden.planning = forbidden.map((f) => f.term)
      }
      this.loadedFromFile = true

      return { loaded: true, layers, forbidden, error: null }
    } catch (err) {
      return { loaded: false, layers: null, forbidden: null, error: (err as Error).message }
    }
  }

  auditSource(src: string): AuditResult {
    const issues: AuditIssue[] = []

    if (/function\s+createTicket\s*\(\s*id\s*[,)]/.test(src)) {
      issues.push({ severity: "critical", rule: "ASC-I1", message: "Domain contains createTicket wrapper — must be createWorkItem" })
    }
    if (/case\s+"CreateTicket":/.test(src) && !src.includes("CAPABILITY_ALIASES")) {
      const applyDomainMatch = src.match(/function applyDomain[\s\S]*?switch\s*\(intent\.capability\)[\s\S]*?default/)
      if (applyDomainMatch && /case\s+"CreateTicket":/.test(applyDomainMatch[0])) {
        issues.push({ severity: "critical", rule: "ASC-I2", message: "applyDomain contains CreateTicket case — must use CreateWorkItem only" })
      }
    }
    if (/\{\s*name:\s*"CreateTicket"/.test(src)) {
      issues.push({ severity: "critical", rule: "ASC-I3", message: "Registry contains CreateTicket entry — must have zero Ticket entries" })
    }

    const skrIssues = this.auditSKR(src, { isSourceCode: true })
    issues.push(...skrIssues.issues)

    return { passed: issues.length === 0, issues, timestamp: Date.now() }
  }

  auditSKR(input: string | Record<string, unknown>, options: { isSourceCode?: boolean } = {}): AuditResult {
    const issues: AuditIssue[] = []
    const isSourceCode = options.isSourceCode ?? false

    if (isSourceCode && typeof input === "string") {
      const kindPattern = new RegExp(`^\\s*kind\\s*:\\s*(${this.skrForbiddenNodes.join("|")})\\b`, "gm")
      const kindMatches = [...input.matchAll(kindPattern)]
      for (const m of kindMatches) {
        issues.push({
          severity: "critical",
          rule: "SKR-I1",
          invariant: "KI-001",
          message: `Forbidden node type '${m[1]}' found in knowledge definition — infrastructure vocabulary MUST NOT appear in canonical knowledge`,
          match: m[0].trim(),
        })
      }

      const classPattern = new RegExp(`^(?!\\s*//).*?class\\s+(${this.skrForbiddenNodes.filter((n) => n.length > 2).join("|")})\\b`, "gm")
      const classMatches = [...input.matchAll(classPattern)]
      for (const m of classMatches) {
        if (!this._isInfrastructureClass(m[1], input, m.index ?? 0)) {
          issues.push({
            severity: "critical",
            rule: "SKR-I2",
            invariant: "KI-001",
            message: `Class '${m[1]}' defines forbidden node type — canonical knowledge MUST use approved node types only`,
            match: m[0].replace(/.*?class/, "class").trim(),
          })
        }
      }

      const relPattern = new RegExp(`(${this.skrForbiddenRelationships.join("|")})\\s*:\\s*`, "g")
      const relMatches = [...input.matchAll(relPattern)]
      for (const m of relMatches) {
        issues.push({
          severity: "critical",
          rule: "SKR-I3",
          invariant: "KI-002",
          message: `Forbidden relationship '${m[1]}' — execution mechanisms belong in Execution IR, not Knowledge Representation`,
          match: m[0],
        })
      }

      for (const nodeType of this.skrForbiddenNodes) {
        const fnPattern = new RegExp(`function\\s+create${nodeType}\\s*\\(`)
        if (fnPattern.test(input)) {
          issues.push({
            severity: "critical",
            rule: "SKR-I4",
            invariant: "KI-001",
            message: `Domain factory create${nodeType}() defines forbidden node type — use createWorkItem/createDiscovery/etc`,
          })
        }
      }
    } else if (!isSourceCode) {
      let graph: Record<string, unknown> = {}
      if (typeof input === "string") {
        try { graph = JSON.parse(input) as Record<string, unknown> } catch { /* not JSON, skip */ }
      } else {
        graph = input
      }

      if (graph && typeof graph === "object") {
        const nodes = graph.nodes as Array<{ kind?: string; id?: string }> | undefined
        if (nodes && Array.isArray(nodes)) {
          for (const node of nodes) {
            if (node.kind && this.skrForbiddenNodes.includes(node.kind)) {
              issues.push({
                severity: "critical",
                rule: "SKR-I5",
                invariant: "KI-001",
                message: `Knowledge graph contains forbidden node type '${node.kind}' (id: ${node.id || "?"})`,
                node: node.id,
              })
            }
            if (node.kind && !this.skrApprovedNodes.includes(node.kind) && !this.skrForbiddenNodes.includes(node.kind)) {
              issues.push({
                severity: "warning",
                rule: "SKR-I6",
                invariant: "KI-008",
                message: `Unknown node type '${node.kind}' (id: ${node.id || "?"}) — not in approved SKR vocabulary`,
                node: node.id,
              })
            }
          }
        }

        const relationships = graph.relationships as Array<{ type?: string; id?: string; source?: string; target?: string }> | undefined
        if (relationships && Array.isArray(relationships)) {
          for (const rel of relationships) {
            if (rel.type && this.skrForbiddenRelationships.includes(rel.type)) {
              issues.push({
                severity: "critical",
                rule: "SKR-I7",
                invariant: "KI-002",
                message: `Knowledge graph contains forbidden relationship '${rel.type}'`,
                relationship: rel.id || `${rel.source}-${rel.target}`,
              })
            }
            if (rel.type && !this.skrApprovedRelationships.includes(rel.type) && !this.skrForbiddenRelationships.includes(rel.type)) {
              issues.push({
                severity: "warning",
                rule: "SKR-I8",
                invariant: "KI-008",
                message: `Unknown relationship type '${rel.type}' — not in approved SKR vocabulary`,
                relationship: rel.id || `${rel.source}-${rel.target}`,
              })
            }
          }
        }

        if (graph.kind && graph.kind !== "SynthKnowledgeGraph") {
          issues.push({
            severity: "warning",
            rule: "SKR-I9",
            message: `Root kind '${String(graph.kind)}' !== 'SynthKnowledgeGraph'`,
          })
        }
      }
    }

    return { passed: issues.length === 0, issues, timestamp: Date.now() }
  }

  private _isInfrastructureClass(name: string, src: string, classIndex: number): boolean {
    const context = src.slice(Math.max(0, classIndex - 200), classIndex)
    const infraMarkers = ["Runtime", "Engine", "Store", "Bus", "Registry", "Adapter", "Protocol"]
    return infraMarkers.some((m) => context.includes(m))
  }

  auditDocs(_docsDir: string, _readFileFn?: (path: string) => Promise<string>): AuditResult {
    return { passed: true, issues: [], timestamp: Date.now() }
  }

  getLanguageReport(): LanguageReport {
    return {
      planning: this.ubiquitousLanguage.planning.map((t) => ({ term: t, status: "canonical" })),
      execution: this.ubiquitousLanguage.execution.map((t) => ({ term: t, status: "canonical" })),
      governance: this.ubiquitousLanguage.governance.map((t) => ({ term: t, status: "canonical" })),
      infrastructure: this.ubiquitousLanguage.infrastructure.map((t) => ({ term: t, status: "canonical" })),
      projection: this.ubiquitousLanguage.projection.map((t) => ({ term: t, status: "canonical" })),
      workspace: this.ubiquitousLanguage.workspace.map((t) => ({ term: t, status: "canonical" })),
      forbidden: [
        { term: "Ticket", replacement: "WorkItem", status: "forbidden" },
        { term: "Sprint", replacement: "Expedition", status: "forbidden" },
        { term: "Story", replacement: "Objective", status: "forbidden" },
        { term: "Epic", replacement: "Objective", status: "forbidden" },
        { term: "Task", replacement: "WorkItem", status: "forbidden" },
      ],
      skr: {
        approvedNodes: this.skrApprovedNodes.map((t) => ({ term: t, status: "canonical" })),
        approvedRelationships: this.skrApprovedRelationships.map((t) => ({ term: t, status: "canonical" })),
        forbiddenNodes: this.skrForbiddenNodes.map((t) => ({ term: t, status: "forbidden" })),
        forbiddenRelationships: this.skrForbiddenRelationships.map((t) => ({ term: t, status: "forbidden" })),
      },
    }
  }
}
