import { runExample } from "../../_shared/run-example.js"

await runExample({
  name: "legacy-node",
  mission: {
    subject: "Legacy Node Migration",
    purpose: "Modernize a legacy Node.js application incrementally.",
  },
  expeditions: [
    {
      subject: "Adapter Layer",
      goal: "Introduce an adapter layer around legacy code without changing it.",
      missionSubject: "Legacy Node Migration",
    },
  ],
  objectives: [
    {
      subject: "Audit Legacy API",
      title: "Document current legacy API surface",
      expeditionSubject: "Adapter Layer",
    },
    {
      subject: "Wrap Core Module",
      title: "Wrap the core legacy module with a stable adapter",
      expeditionSubject: "Adapter Layer",
    },
  ],
})
