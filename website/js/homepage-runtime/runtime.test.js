// ============================================================
// HOMEPAGE RUNTIME: Tests
// ============================================================
import { describe, it } from "node:test";
import assert from "node:assert";
import { createHomepageRuntime, buildDemoReplay } from "./runtime.js";
import { demoExamples } from "./demos.js";
void describe("HomepageRuntime", () => {
    const runtime = createHomepageRuntime();
    void it("discovers intent and produces artifacts", async () => {
        const { projection } = await runtime.discover("Build a CRM", "greenfield");
        assert.strictEqual(projection.phase, "discovery");
        assert.ok(projection.intent);
        assert.strictEqual(projection.intent.description, "Build a CRM");
        assert.ok(projection.discovery);
        assert.ok(projection.unknowns.items.length > 0);
        assert.ok(projection.evidence.length > 0);
    });
    void it("produces deterministic output for the same input", async () => {
        const a = await runtime.discover("Build a CRM", "greenfield");
        const b = await runtime.discover("Build a CRM", "greenfield");
        assert.deepStrictEqual(a.projection, b.projection);
        assert.deepStrictEqual(a.state, b.state);
    });
    void it("builds a mission after domain modeling", async () => {
        let { state } = await runtime.discover("Build a CRM", "greenfield");
        ({ state } = await runtime.clarify(state, []));
        const { projection } = await runtime.buildMission(state);
        assert.strictEqual(projection.phase, "mission");
        assert.ok(projection.mission);
    });
    void it("builds expeditions after mission", async () => {
        let { state } = await runtime.discover("Build a CRM with auth and billing", "greenfield");
        ({ state } = await runtime.clarify(state, []));
        ({ state } = await runtime.buildMission(state));
        const { projection } = await runtime.buildExpeditions(state);
        assert.strictEqual(projection.phase, "expeditions");
        assert.ok(projection.expeditions.length > 0);
    });
    void it("builds architecture after expeditions", async () => {
        let { state } = await runtime.discover("Build a CRM with auth and billing", "greenfield");
        ({ state } = await runtime.clarify(state, []));
        ({ state } = await runtime.buildMission(state));
        ({ state } = await runtime.buildExpeditions(state));
        const { projection } = await runtime.buildArchitecture(state);
        assert.strictEqual(projection.phase, "architecture");
        assert.ok(projection.architecture);
        assert.ok(projection.architecture.length > 0);
    });
    void it("builds repository summary after architecture", async () => {
        let { state } = await runtime.discover("Build a CRM with auth and billing", "greenfield");
        ({ state } = await runtime.clarify(state, []));
        ({ state } = await runtime.buildMission(state));
        ({ state } = await runtime.buildExpeditions(state));
        ({ state } = await runtime.buildArchitecture(state));
        const { projection } = await runtime.buildRepository(state);
        assert.strictEqual(projection.phase, "repository");
        assert.ok(projection.repository);
        assert.strictEqual(projection.repository.status, "governed");
    });
    void it("replays a sample event log", async () => {
        let { state } = await runtime.discover("Build a CRM", "greenfield");
        ({ state } = await runtime.clarify(state, []));
        ({ state } = await runtime.buildMission(state));
        ({ state } = await runtime.buildExpeditions(state));
        const events = buildDemoReplay(state);
        assert.ok(events.length > 0);
        const replay = await runtime.loadReplay(events);
        assert.strictEqual(replay.offset, 0);
        assert.ok(replay.projection.replay);
        const advanced = await runtime.stepReplay(replay, "forward");
        assert.strictEqual(advanced.offset, 1);
    });
    void it("covers all curated demo examples", async () => {
        for (const example of demoExamples) {
            const { projection } = await runtime.discover(example.input, example.mode);
            assert.ok(projection.intent, `missing intent for ${example.id}`);
            assert.ok(projection.discovery, `missing discovery for ${example.id}`);
        }
    });
});
