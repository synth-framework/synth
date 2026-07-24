// ============================================================
// HOMEPAGE RUNTIME: Public Experience Resolver Tests
// ============================================================
import { describe, it } from "node:test";
import assert from "node:assert";
import { createHomepageRuntime } from "./runtime.js";
import { resolvePublicExperience } from "./public-experience.js";
import { DemoOperator } from "./operator.js";
void describe("PublicExperienceResolver", () => {
    const runtime = createHomepageRuntime();
    async function clarifyWithDefaults(state) {
        const operator = new DemoOperator();
        const questions = state.unknowns.items.map((u, i) => ({ id: `q-${i}`, field: u.field, description: u.description }));
        const answers = await operator.answerClarification(questions);
        const result = await runtime.clarify(state, answers);
        return result.state;
    }
    async function buildFullState() {
        let { state } = await runtime.discover("Build a CRM with auth and billing", "greenfield");
        state = await clarifyWithDefaults(state);
        ({ state } = await runtime.approveContract(state));
        ({ state } = await runtime.approveMission(state));
        ({ state } = await runtime.buildExpeditions(state));
        ({ state } = await runtime.approvePlan(state));
        ({ state } = await runtime.completeExecution(state));
        ({ state } = await runtime.approveReview(state));
        ({ state } = await runtime.acceptOutcome(state));
        return state;
    }
    void it("starts at question step when unknowns remain", async () => {
        const { state } = await runtime.discover("Build a CRM", "greenfield");
        const experience = resolvePublicExperience(state);
        assert.strictEqual(experience.step, "question");
        assert.ok(experience.message.length > 0);
        assert.strictEqual(experience.progress.current, 2);
    });
    void it("question step has no actions", async () => {
        const { state } = await runtime.discover("Build a CRM", "greenfield");
        const experience = resolvePublicExperience(state);
        assert.strictEqual(experience.step, "question");
        assert.strictEqual(experience.actions.length, 0);
    });
    void it("moves to understanding after clarification", async () => {
        let { state } = await runtime.discover("Build a CRM", "greenfield");
        state = await clarifyWithDefaults(state);
        const experience = resolvePublicExperience(state);
        assert.strictEqual(experience.step, "understanding");
        assert.ok(experience.actions.some((a) => a.id === "approve-contract"));
    });
    void it("moves to contract after domain is modeled", async () => {
        let { state } = await runtime.discover("Build a CRM", "greenfield");
        state = await clarifyWithDefaults(state);
        ({ state } = await runtime.buildMission(state));
        const experience = resolvePublicExperience(state);
        assert.strictEqual(experience.step, "contract");
    });
    void it("moves to mission after contract approval", async () => {
        let { state } = await runtime.discover("Build a CRM", "greenfield");
        state = await clarifyWithDefaults(state);
        ({ state } = await runtime.approveContract(state));
        const experience = resolvePublicExperience(state);
        assert.strictEqual(experience.step, "mission");
        assert.ok(experience.actions.some((a) => a.id === "approve-mission"));
    });
    void it("moves to plan after mission approval", async () => {
        let { state } = await runtime.discover("Build a CRM", "greenfield");
        state = await clarifyWithDefaults(state);
        ({ state } = await runtime.approveContract(state));
        ({ state } = await runtime.approveMission(state));
        const experience = resolvePublicExperience(state);
        assert.strictEqual(experience.step, "plan");
    });
    void it("moves to evidence after execution starts", async () => {
        let { state } = await runtime.discover("Build a CRM", "greenfield");
        state = await clarifyWithDefaults(state);
        ({ state } = await runtime.approveContract(state));
        ({ state } = await runtime.approveMission(state));
        ({ state } = await runtime.buildExpeditions(state));
        ({ state } = await runtime.approvePlan(state));
        ({ state } = await runtime.startExecution(state));
        const experience = resolvePublicExperience(state);
        assert.strictEqual(experience.step, "evidence");
    });
    void it("moves to review after execution completes", async () => {
        let { state } = await runtime.discover("Build a CRM", "greenfield");
        state = await clarifyWithDefaults(state);
        ({ state } = await runtime.approveContract(state));
        ({ state } = await runtime.approveMission(state));
        ({ state } = await runtime.buildExpeditions(state));
        ({ state } = await runtime.approvePlan(state));
        ({ state } = await runtime.completeExecution(state));
        const experience = resolvePublicExperience(state);
        assert.strictEqual(experience.step, "review");
    });
    void it("moves to acceptance after review approval", async () => {
        let { state } = await runtime.discover("Build a CRM", "greenfield");
        state = await clarifyWithDefaults(state);
        ({ state } = await runtime.approveContract(state));
        ({ state } = await runtime.approveMission(state));
        ({ state } = await runtime.buildExpeditions(state));
        ({ state } = await runtime.approvePlan(state));
        ({ state } = await runtime.completeExecution(state));
        ({ state } = await runtime.approveReview(state));
        const experience = resolvePublicExperience(state);
        assert.strictEqual(experience.step, "acceptance");
    });
    void it("reaches complete after acceptance", async () => {
        const state = await buildFullState();
        const experience = resolvePublicExperience(state);
        assert.strictEqual(experience.step, "complete");
    });
    void it("does not expose internal vocabulary", async () => {
        const state = await buildFullState();
        const experience = resolvePublicExperience(state);
        const text = JSON.stringify(experience).toLowerCase();
        const forbidden = [
            "alignment",
            "divergence",
            "projection certification",
            "refinement",
            "gate",
            "artifact",
        ];
        for (const term of forbidden) {
            assert.ok(!text.includes(term), `Public experience should not contain "${term}"`);
        }
    });
});
