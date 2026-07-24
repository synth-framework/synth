// ============================================================
// HOMEPAGE RUNTIME: Demo Operator Adapter
// ============================================================
// A deterministic operator adapter that drives the homepage demo
// without calling remote AI models.
// ============================================================

import type { ClarificationAnswer, ClarificationQuestion, DemoContext, DemoExample, OperatorAdapter } from "./types.js"

export class DemoOperator implements OperatorAdapter {
  private selectedExampleId?: string

  constructor(selectedExampleId?: string) {
    this.selectedExampleId = selectedExampleId
  }

  async proposeIntent(context: DemoContext): Promise<string> {
    if (this.selectedExampleId) {
      const example = context.examples.find((e) => e.id === this.selectedExampleId)
      if (example) return example.input
    }

    const example = context.examples[0]
    return example?.input ?? "Build a CRM"
  }

  async answerClarification(questions: ClarificationQuestion[]): Promise<ClarificationAnswer[]> {
    // The demo operator provides safe default answers for every clarification question.
    return questions.map((question) => {
      let content = "Not specified"

      switch (question.field) {
        case "runtime":
          content = "web"
          break
        case "language":
          content = "typescript"
          break
        case "capabilities":
          content = "domain-modeling"
          break
        case "audience":
          content = "internal team"
          break
      }

      return {
        questionId: question.field,
        content,
      }
    })
  }

  async approveMission(): Promise<boolean> {
    return true
  }

  async selectExample(examples: DemoExample[]): Promise<string> {
    if (this.selectedExampleId) {
      const found = examples.find((e) => e.id === this.selectedExampleId)
      if (found) return found.id
    }
    return examples[0]?.id ?? ""
  }
}
