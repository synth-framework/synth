import { runExample } from "../../_shared/run-example.js"

await runExample({
  name: "todo",
  mission: {
    subject: "Todo Tracker",
    purpose: "Keep track of tasks and their completion status.",
  },
  expeditions: [
    {
      subject: "Task API",
      goal: "Implement the core task creation and completion API.",
      missionSubject: "Todo Tracker",
    },
  ],
  objectives: [
    {
      subject: "Add Task",
      title: "Implement add task endpoint",
      expeditionSubject: "Task API",
    },
    {
      subject: "Complete Task",
      title: "Implement complete task endpoint",
      expeditionSubject: "Task API",
    },
  ],
})
