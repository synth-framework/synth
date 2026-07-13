// ============================================================
// WORKSPACE: Execution Artifact Adapter
// ============================================================
// Projects canonical WorkItems to external execution artifacts.
// Pure projection — no IO, no mutation.
// ============================================================

import type { WorkItem } from "../types/index.js"

export type ArtifactProjection = {
  format: string
  data: unknown
}

export class ExecutionArtifactAdapter {
  private adapters = new Map<string, (workItem: WorkItem) => ArtifactProjection>()

  constructor() {
    this.adapters.set("github", ExecutionArtifactAdapter.githubIssue)
    this.adapters.set("jira", ExecutionArtifactAdapter.jiraTicket)
    this.adapters.set("legacy-ticket", ExecutionArtifactAdapter.legacyTicket)
  }

  register(name: string, adapter: (workItem: WorkItem) => ArtifactProjection): void {
    this.adapters.set(name, adapter)
  }

  project(workItem: WorkItem, adapterName = "default"): ArtifactProjection {
    const adapter = this.adapters.get(adapterName)
    if (!adapter) return ExecutionArtifactAdapter.canonical(workItem)
    return adapter(workItem)
  }

  static canonical(workItem: WorkItem): ArtifactProjection {
    return { format: "canonical", data: workItem }
  }

  static githubIssue(workItem: WorkItem): ArtifactProjection {
    return {
      format: "github",
      data: {
        title: (workItem.metadata?.name as string) || workItem.id,
        body: `Work Item: ${workItem.id}\nStatus: ${workItem.status}`,
        labels: [`status:${workItem.status}`],
        state: workItem.status === "complete" ? "closed" : "open",
      },
    }
  }

  static jiraTicket(workItem: WorkItem): ArtifactProjection {
    const statusMap: Record<string, string> = {
      idle: "To Do",
      active: "In Progress",
      blocked: "Blocked",
      complete: "Done",
    }
    return {
      format: "jira",
      data: {
        summary: (workItem.metadata?.name as string) || workItem.id,
        description: `Work Item: ${workItem.id}`,
        status: statusMap[workItem.status] || "To Do",
        issuetype: { name: "Task" },
      },
    }
  }

  static legacyTicket(workItem: WorkItem): ArtifactProjection {
    return {
      format: "legacy-ticket",
      data: {
        id: workItem.id,
        name: (workItem.metadata?.name as string) || workItem.id,
        status: workItem.status,
        metadata: workItem.metadata,
      },
    }
  }
}
