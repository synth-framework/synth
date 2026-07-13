import { runExample } from "../../_shared/run-example.js"

await runExample({
  name: "crm",
  mission: {
    subject: "Customer CRM",
    purpose: "Manage customer contacts and interactions.",
  },
  expeditions: [
    {
      subject: "Contact Management",
      goal: "Implement contact creation and interaction tracking.",
      missionSubject: "Customer CRM",
    },
  ],
  objectives: [
    {
      subject: "Add Contact",
      title: "Implement add contact endpoint",
      expeditionSubject: "Contact Management",
    },
    {
      subject: "Log Interaction",
      title: "Implement log interaction endpoint",
      expeditionSubject: "Contact Management",
    },
  ],
})
