import { runExample } from "../../_shared/run-example.js"

await runExample({
  name: "polyglot",
  mission: {
    subject: "Polyglot Service",
    purpose: "Build a service with components in multiple languages.",
  },
  expeditions: [
    {
      subject: "Language Boundaries",
      goal: "Define clear contracts between the Go, Python, and Node components.",
      missionSubject: "Polyglot Service",
    },
  ],
  objectives: [
    {
      subject: "Define Service Contract",
      title: "Define the shared service contract",
      expeditionSubject: "Language Boundaries",
    },
    {
      subject: "Implement Adapters",
      title: "Implement language-specific adapters for the contract",
      expeditionSubject: "Language Boundaries",
    },
  ],
})
