import { runExample } from "../../_shared/run-example.js"

await runExample({
  name: "monolith",
  mission: {
    subject: "Platform Monorepo",
    purpose: "Coordinate development across multiple packages in a single repository.",
  },
  expeditions: [
    {
      subject: "Package Boundaries",
      goal: "Define ownership, interfaces, and dependency rules for each package.",
      missionSubject: "Platform Monorepo",
    },
  ],
  objectives: [
    {
      subject: "Map Package Dependencies",
      title: "Create a dependency map of all packages",
      expeditionSubject: "Package Boundaries",
    },
    {
      subject: "Define Interface Contracts",
      title: "Define public interface contracts for shared packages",
      expeditionSubject: "Package Boundaries",
    },
    {
      subject: "Enforce Boundaries",
      title: "Enforce package boundary rules in CI",
      expeditionSubject: "Package Boundaries",
    },
  ],
})
