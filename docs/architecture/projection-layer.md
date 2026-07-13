# Projection Layer

**Part of:** SKR-001
**Status:** Active Architecture
**Date:** 2026-06-28

---

## Purpose

The Projection Layer defines how the system communicates with external tools. It is the ONLY layer aware of external systems.

## Adapters

| Adapter | External System | Maps SKR To |
|---------|----------------|-------------|
| `GitHubAdapter` | GitHub | Issues, PRs, Projects |
| `JiraAdapter` | Jira | Tickets, Epics, Sprints |
| `LinearAdapter` | Linear | Issues, Cycles |
| `FilesystemAdapter` | Local filesystem | Files, Markdown |
| `MCPAdapter` | Model Context Protocol | Resources, Tools |
| `A2AAdapter` | Agent-to-Agent Protocol | Agent messages |
| `SlackAdapter` | Slack | Notifications |

## Invariant

No external vocabulary may leak upward into canonical knowledge. A WorkItem in SKR is always a WorkItem. The GitHubAdapter may project it to a GitHub Issue, but the SKR node remains protocol-independent.

## Example

```javascript
// Projection: WorkItem → GitHub Issue
const workItem = skrGraph.getNode("WI-001");
const githubIssue = githubAdapter.project(workItem);
// githubIssue = { title: "...", body: "...", labels: [...] }
// workItem remains unchanged — still a canonical WorkItem
```

## Related Documents

- [SKR-001.md](SKR-001.md) — Full SKR specification
- [ubiquitous-language.md](../ubiquitous-language.md) — Vocabulary contract

---

*Part of SKR-001 — Synth Knowledge Representation*
