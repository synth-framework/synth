import { runExample } from "../../_shared/run-example.js"

await runExample({
  name: "blog",
  mission: {
    subject: "Personal Blog",
    purpose: "Publish articles with metadata and generated documentation.",
  },
  expeditions: [
    {
      subject: "Article Pipeline",
      goal: "Implement article creation, editing, and publishing flow.",
      missionSubject: "Personal Blog",
    },
  ],
  objectives: [
    {
      subject: "Create Draft",
      title: "Implement create draft endpoint",
      expeditionSubject: "Article Pipeline",
    },
    {
      subject: "Publish Article",
      title: "Implement publish article endpoint",
      expeditionSubject: "Article Pipeline",
    },
  ],
})
