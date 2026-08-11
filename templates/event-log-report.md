# SYNTH Event Log Self-Inspection Report

Generated: {{generatedAt}}
Source: {{source}}
Events analyzed: {{eventCount}}
Time range: {{firstTimestamp}} → {{lastTimestamp}}

## Lifecycle summary

| Metric | Count |
|---|---|
| Missions approved | {{missionsApproved}} |
| Expeditions approved | {{expeditionsApproved}} |
| Expeditions committed | {{expeditionsCommitted}} |
| Expeditions started | {{expeditionsStarted}} |
| Expeditions completed | {{expeditionsCompleted}} |
| Expeditions cancelled | {{expeditionsCancelled}} |
| Expeditions archived | {{expeditionsArchived}} |
| Expeditions paused | {{expeditionsPaused}} |

## Event counts

| Event type | Count |
|---|---|
{{#eventCounts}}
| {{type}} | {{count}} |
{{/eventCounts}}

## Friction patterns

### Governance snapshot failures

- Total failures: {{snapshotFailureTotal}}
- Dirty-tree failures: {{dirtyTreeTotal}}

{{#dirtyTreeByExpedition}}
- Expedition `{{expeditionId}}`: {{count}} dirty-tree failure(s)
{{/dirtyTreeByExpedition}}

### Repairs accepted

{{repairsAccepted}}

### Cancelled expeditions

{{#cancelledExpeditions}}
- `{{id}}`: {{reason}}
{{/cancelledExpeditions}}

## Recommendations

{{#recommendations}}
- **{{priority}}** — {{pattern}}: {{observation}}
  - Suggestion: {{suggestion}}
{{/recommendations}}
