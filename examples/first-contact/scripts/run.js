import { runExample } from "../../_shared/run-example.js"

await runExample({
  name: "first-contact",
  // EXP-FIRSTCONTACT-009: re-record the canonical journey on the hardened
  // pipeline into Archive B. Re-running this script re-records the archive.
  record: { archive: "recorded-journey/evidence-archive-b" },
  mission: {
    subject: "Space Mission Tracking Application",
    purpose: "Track space missions, crew assignments, and launch windows with a simple, realistic implementation.",
  },
  expeditions: [
    {
      subject: "Design Data Model",
      goal: "Design the data model for missions, crew, and launch windows.",
      missionSubject: "Space Mission Tracking Application",
    },
    {
      subject: "Scaffold Application",
      goal: "Scaffold the application structure and core modules.",
      missionSubject: "Space Mission Tracking Application",
    },
    {
      subject: "Implement Mission Views",
      goal: "Implement mission listing and detail views.",
      missionSubject: "Space Mission Tracking Application",
    },
    {
      subject: "Implement Crew Workflow",
      goal: "Add crew assignment workflow.",
      missionSubject: "Space Mission Tracking Application",
    },
    {
      subject: "Validate Implementation",
      goal: "Validate the implementation with the operator and generate documentation.",
      missionSubject: "Space Mission Tracking Application",
    },
  ],
  objectives: [
    {
      subject: "Define Mission Entity",
      title: "Define the mission entity with id, name, status, and launch window.",
      expeditionSubject: "Design Data Model",
    },
    {
      subject: "Define Crew Entity",
      title: "Define the crew entity with id, name, and role.",
      expeditionSubject: "Design Data Model",
    },
    {
      subject: "Create Project Layout",
      title: "Create the project layout and entry points.",
      expeditionSubject: "Scaffold Application",
    },
    {
      subject: "List Missions",
      title: "Implement the mission listing view.",
      expeditionSubject: "Implement Mission Views",
    },
    {
      subject: "Show Mission Detail",
      title: "Implement the mission detail view.",
      expeditionSubject: "Implement Mission Views",
    },
    {
      subject: "Assign Crew",
      title: "Implement crew assignment to missions.",
      expeditionSubject: "Implement Crew Workflow",
    },
    {
      subject: "Run Validation",
      title: "Run validation and generate proof.",
      expeditionSubject: "Validate Implementation",
    },
  ],
})
