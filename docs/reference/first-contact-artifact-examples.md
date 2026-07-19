# First Contact Discovery Artifact Examples

> Example artifacts illustrating the `synth-first-contact-artifact-v1` schema.

These examples are non-normative. They show what a completed Discovery artifact looks like after Discovery approval.

---

## Example 1 — Space Mission Tracker

```json
{
  "$schema": "synth-first-contact-artifact-v1",
  "id": "artifact-space-mission-tracker",
  "sessionId": "session-abc123",
  "version": "1.0.0",
  "createdAt": "2026-07-19T10:00:00.000Z",
  "approvedAt": "2026-07-19T10:15:00.000Z",
  "intent": {
    "description": "Let's build a space mission tracker.",
    "goals": [
      "Track upcoming space launches",
      "Display mission status and details",
      "Allow users to subscribe to mission updates"
    ],
    "successCriteria": [
      "Users can view a list of upcoming launches",
      "Users can see detailed mission information",
      "Users receive notifications for mission updates"
    ]
  },
  "audience": {
    "primaryUsers": ["space enthusiasts", "journalists"],
    "stakeholders": ["product owner", "engineering team"]
  },
  "environment": {
    "targetRuntime": "web",
    "languagePreferences": ["typescript"],
    "platformConstraints": ["serverless", "responsive-ui"]
  },
  "capabilities": {
    "required": ["launch-api", "notifications", "responsive-ui"],
    "optional": ["user-accounts", "historical-search"]
  },
  "constraints": {
    "functional": ["must display launches within 24 hours of API update"],
    "nonFunctional": ["mobile-first design", "accessible UI"]
  },
  "unknowns": [],
  "risks": [
    {
      "id": "risk-001",
      "category": "technical",
      "description": "Third-party launch API availability and rate limits.",
      "severity": "medium",
      "mitigation": "Cache data and handle API failures gracefully."
    }
  ],
  "confidence": {
    "overall": 0.92,
    "threshold": 0.8,
    "byField": {
      "intent": 0.95,
      "audience": 0.85,
      "environment": 0.9,
      "capabilities": 0.88,
      "constraints": 0.9
    }
  },
  "architectureCandidates": [
    {
      "id": "arch-001",
      "name": "Next.js + Vercel + public launch API",
      "description": "Statically generated web app fetching launch data at build and runtime.",
      "rationale": "Matches the web target, TypeScript preference, and serverless constraint.",
      "tradeoffs": {
        "advantages": ["Rapid prototyping", "TypeScript-native", "Serverless hosting"],
        "disadvantages": ["Limited backend logic", "Depends on external API"]
      },
      "assumptions": ["Node >= 20", "Vercel account available"],
      "recommended": true,
      "confidence": 0.9
    },
    {
      "id": "arch-002",
      "name": "Python Flask + SQLite + cron fetcher",
      "description": "Small server-rendered application with a local database and periodic API fetch.",
      "rationale": "Simple stack with minimal dependencies.",
      "tradeoffs": {
        "advantages": ["Simple deployment", "Full control over data"],
        "disadvantages": ["Requires persistent server", "More operational burden"]
      },
      "assumptions": ["Python >= 3.11"],
      "recommended": false,
      "confidence": 0.75
    }
  ],
  "selectedArchitecture": {
    "id": "arch-001",
    "name": "Next.js + Vercel + public launch API"
  },
  "capabilityVerification": {
    "status": "passed",
    "blockers": [],
    "reportHash": "verify-hash-abc"
  },
  "transcript": [
    {
      "turn": 1,
      "actor": "operator",
      "type": "input",
      "content": "Let's build a space mission tracker.",
      "timestamp": "2026-07-19T10:00:00.000Z"
    },
    {
      "turn": 2,
      "actor": "system",
      "type": "question",
      "content": "Who are the primary users?",
      "timestamp": "2026-07-19T10:01:00.000Z"
    },
    {
      "turn": 3,
      "actor": "operator",
      "type": "answer",
      "content": "Space enthusiasts and journalists.",
      "timestamp": "2026-07-19T10:02:00.000Z"
    },
    {
      "turn": 4,
      "actor": "operator",
      "type": "approval",
      "content": "Approve Discovery artifact and selected architecture.",
      "timestamp": "2026-07-19T10:15:00.000Z"
    }
  ],
  "provenance": {
    "eventIds": ["evt-001", "evt-002", "evt-003"],
    "sessionHash": "session-hash-abc",
    "validatorVersion": "1.0.0"
  },
  "artifactHash": "artifact-hash-abc"
}
```

---

## Example 2 — Markdown Viewer in Python

```json
{
  "$schema": "synth-first-contact-artifact-v1",
  "id": "artifact-markdown-viewer-python",
  "sessionId": "session-def456",
  "version": "1.0.0",
  "createdAt": "2026-07-19T11:00:00.000Z",
  "approvedAt": "2026-07-19T11:10:00.000Z",
  "intent": {
    "description": "Create me a markdown viewer in Python.",
    "goals": [
      "Render markdown files as HTML",
      "Support a simple command-line interface",
      "Allow custom CSS themes"
    ],
    "successCriteria": [
      "Users can pass a markdown file and receive rendered HTML",
      "Users can select a theme from the command line",
      "Output is valid, standalone HTML"
    ]
  },
  "audience": {
    "primaryUsers": ["technical writers", "developers"],
    "stakeholders": ["open-source maintainers"]
  },
  "environment": {
    "targetRuntime": "cli",
    "languagePreferences": ["python"],
    "platformConstraints": ["cross-platform", "no-network-required"]
  },
  "capabilities": {
    "required": ["markdown-parser", "html-renderer", "cli-parser"],
    "optional": ["theme-hot-reload", "plugin-system"]
  },
  "constraints": {
    "functional": ["must support CommonMark"],
    "nonFunctional": ["single-file executable preferred", "no external network calls"]
  },
  "unknowns": [
    {
      "id": "unknown-001",
      "field": "capabilities.optional",
      "description": "Whether a plugin system is desired is unclear.",
      "confidence": 0.4,
      "accepted": true
    }
  ],
  "risks": [
    {
      "id": "risk-001",
      "category": "product",
      "description": "Scope may expand if plugin system is added later.",
      "severity": "low",
      "mitigation": "Defer plugin system to a later Expedition."
    }
  ],
  "confidence": {
    "overall": 0.85,
    "threshold": 0.8,
    "byField": {
      "intent": 0.95,
      "audience": 0.8,
      "environment": 0.9,
      "capabilities": 0.75,
      "constraints": 0.9
    }
  },
  "architectureCandidates": [
    {
      "id": "arch-001",
      "name": "Python + markdown-it-py + Jinja2",
      "description": "Command-line tool that parses markdown and renders it with a Jinja2 template.",
      "rationale": "Fits Python preference and CommonMark requirement.",
      "tradeoffs": {
        "advantages": ["Mature libraries", "Easy theming with Jinja2"],
        "disadvantages": ["Requires dependency management"]
      },
      "assumptions": ["Python >= 3.10"],
      "recommended": true,
      "confidence": 0.9
    },
    {
      "id": "arch-002",
      "name": "Pure Python stdlib implementation",
      "description": "Minimal markdown parser implemented with only Python standard library.",
      "rationale": "Eliminates external dependencies.",
      "tradeoffs": {
        "advantages": ["Zero dependencies", "Easy distribution"],
        "disadvantages": ["Incomplete CommonMark support", "More implementation work"]
      },
      "assumptions": ["Python >= 3.10"],
      "recommended": false,
      "confidence": 0.65
    }
  ],
  "selectedArchitecture": {
    "id": "arch-001",
    "name": "Python + markdown-it-py + Jinja2"
  },
  "capabilityVerification": {
    "status": "passed",
    "blockers": [],
    "reportHash": "verify-hash-def"
  },
  "transcript": [
    {
      "turn": 1,
      "actor": "operator",
      "type": "input",
      "content": "Create me a markdown viewer in Python.",
      "timestamp": "2026-07-19T11:00:00.000Z"
    },
    {
      "turn": 2,
      "actor": "system",
      "type": "question",
      "content": "Should the viewer support plugins?",
      "timestamp": "2026-07-19T11:05:00.000Z"
    },
    {
      "turn": 3,
      "actor": "operator",
      "type": "answer",
      "content": "Not for now.",
      "timestamp": "2026-07-19T11:06:00.000Z"
    },
    {
      "turn": 4,
      "actor": "operator",
      "type": "approval",
      "content": "Approve Discovery artifact and selected architecture.",
      "timestamp": "2026-07-19T11:10:00.000Z"
    }
  ],
  "provenance": {
    "eventIds": ["evt-101", "evt-102", "evt-103"],
    "sessionHash": "session-hash-def",
    "validatorVersion": "1.0.0"
  },
  "artifactHash": "artifact-hash-def"
}
```
