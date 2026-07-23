import { describe, it } from "node:test"
import assert from "node:assert"
import { applyDomain } from "../dist/domain/execution.js"
import { createEmptyState, rebuildState } from "../dist/runtime/replay.js"
import { buildDerivedState } from "../dist/state/derived/index.js"
import { createIntentModel, validateIntentModel, computeConfidence } from "../dist/governance/intent-model.js"
import { startRefinement, answerQuestion, submitForRefinedIntent } from "../dist/governance/refinement-layer.js"

function makeCtx(timestamp = Date.now()) {
  return {
    timestamp,
    commandId: `cmd-${timestamp}`,
    actor: "test",
    capability: "Test",
    sequence: 0,
    previousHash: "genesis",
    currentState: createEmptyState(),
  }
}

function makeInput(overrides = {}) {
  return {
    rawIntentReference: "homepage-request",
    explicitObjectives: ["Build a homepage"],
    implicitObjectives: ["Product demonstration"],
    audience: "Visitors",
    problemStatement: "SYNTH needs a public entry point",
    desiredOutcome: "Visitor understands SYNTH in five minutes",
    nonGoals: ["Backend runtime"],
    forbiddenInterpretations: ["Generic dashboard", "AI chat interface"],
    allowedInterpretations: ["Mission Studio as the homepage"],
    referenceEvidenceIds: ["design-board-v4.png"],
    unresolvedAmbiguity: [],
    knownUnknowns: ["Scroll thresholds"],
    ...overrides,
  }
}

function createRunner() {
  const eventLog = []
  let seq = 0

  function run(capability, payload) {
    const state = rebuildState(eventLog)
    const derivedState = buildDerivedState(eventLog)
    const invocation = { actor: "test", capability, payload }
    const result = applyDomain(invocation, state, derivedState, { ...makeCtx(), currentState: state })
    for (const e of result.events) {
      eventLog.push({
        id: `evt-${seq}`,
        type: e.type,
        timestamp: Date.now(),
        transactionId: "tx-1",
        capability,
        actor: "test",
        payload: e.payload,
        previousHash: "genesis",
        eventHash: `hash-${seq}`,
      })
      seq += 1
    }
    return rebuildState(eventLog)
  }
  run.getEvents = () => eventLog
  return run
}

void describe("Intent Model", () => {
  void it("creates a valid Intent Model from input", () => {
    const model = createIntentModel(makeInput())
    assert.strictEqual(model.explicitObjectives[0], "Build a homepage")
    assert.strictEqual(model.forbiddenInterpretations[0], "Generic dashboard")
    assert.ok(model.confidenceLevel > 0.8)
    assert.strictEqual(model.status, "sufficient")
  })

  void it("validates a correct Intent Model", () => {
    const model = createIntentModel(makeInput())
    const result = validateIntentModel(model)
    assert.strictEqual(result.valid, true)
  })

  void it("rejects an Intent Model missing explicit objectives", () => {
    const model = createIntentModel(makeInput({ explicitObjectives: [] }))
    const result = validateIntentModel(model)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes("explicitObjectives")))
  })

  void it("computes low confidence for sparse input", () => {
    const confidence = computeConfidence({
      rawIntentReference: "x",
      explicitObjectives: ["Build a homepage"],
    })
    assert.ok(confidence < 0.8)
  })
})

void describe("Refinement Layer", () => {
  void it("starts a refinement session with generated questions", () => {
    const model = createIntentModel(makeInput({ desiredOutcome: undefined, audience: undefined }))
    const session = startRefinement(model)
    assert.strictEqual(session.intentModelId, model.id)
    assert.ok(session.questions.length > 0)
  })

  void it("answers a question and raises confidence", () => {
    let model = createIntentModel(makeInput({ desiredOutcome: undefined }))
    const session = startRefinement(model)
    const question = session.questions.find((q) => q.id === "q-outcome")
    assert.ok(question)

    const beforeConfidence = model.confidenceLevel
    const result = answerQuestion(session, model, question.id, "Visitor understands SYNTH")
    model = result.model
    assert.ok(model.confidenceLevel > beforeConfidence)
    assert.strictEqual(model.desiredOutcome, "Visitor understands SYNTH")
  })

  void it("submits a sufficient Intent Model", () => {
    const model = createIntentModel(makeInput())
    const submitted = submitForRefinedIntent(model)
    assert.strictEqual(submitted.status, "sufficient")
  })

  void it("rejects submission of an insufficient Intent Model", () => {
    const model = createIntentModel({ rawIntentReference: "x", explicitObjectives: ["Build a homepage"] })
    assert.throws(() => submitForRefinedIntent(model), /confidence is too low/)
  })
})

void describe("Intent Refinement Domain Integration", () => {
  void it("creates an Intent Model via domain capability", () => {
    const run = createRunner()
    run("CreateIntentModel", { input: makeInput() })
    const derived = buildDerivedState(run.getEvents())
    const model = Object.values(derived.intentModels)[0]
    assert.ok(model)
    assert.strictEqual(model.status, "sufficient")
  })

  void it("runs a clarification session and submits the model", () => {
    const run = createRunner()

    run("CreateIntentModel", {
      input: {
        rawIntentReference: "homepage-request",
        explicitObjectives: ["Build a homepage"],
      },
    })
    let derived = buildDerivedState(run.getEvents())
    const model = Object.values(derived.intentModels)[0]
    assert.ok(model.confidenceLevel < 0.8)

    run("StartRefinementSession", { intentModelId: model.id })
    derived = buildDerivedState(run.getEvents())
    const session = Object.values(derived.refinementSessions)[0]
    assert.ok(session.questions.length > 0)

    const questions = session.questions
    for (const question of questions) {
      let answer = "Answer"
      if (question.id === "q-audience") answer = "Visitors"
      if (question.id === "q-outcome") answer = "Visitor understands SYNTH"
      if (question.id === "q-authoritative") answer = "design-board-v4.png"
      if (question.id === "q-protected") answer = "No generic dashboard"
      if (question.id === "q-problem") answer = "SYNTH needs a public entry point"
      if (question.id === "q-out-of-scope") answer = "Backend runtime"
      if (question.id === "q-risk") answer = "Performance on low-end devices"
      run("AnswerRefinementQuestion", {
        sessionId: session.id,
        questionId: question.id,
        answer,
      })
    }

    derived = buildDerivedState(run.getEvents())
    const answeredModel = Object.values(derived.intentModels)[0]
    assert.ok(answeredModel.confidenceLevel >= 0.8)

    run("SubmitIntentModel", { intentModelId: answeredModel.id })
    derived = buildDerivedState(run.getEvents())
    assert.strictEqual(Object.values(derived.intentModels)[0].status, "sufficient")
  })

  void it("rejects submission of an insufficient model", () => {
    const run = createRunner()
    run("CreateIntentModel", {
      input: { rawIntentReference: "x", explicitObjectives: ["Build a homepage"] },
    })
    const derived = buildDerivedState(run.getEvents())
    const model = Object.values(derived.intentModels)[0]
    assert.throws(() => run("SubmitIntentModel", { intentModelId: model.id }), /confidence is too low/)
  })
})
