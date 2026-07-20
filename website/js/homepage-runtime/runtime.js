// ============================================================
// HOMEPAGE RUNTIME: HomepageRuntime
// ============================================================
// In-memory implementation of MissionRuntime for the Mission Studio
// homepage. Pure functions; no filesystem; no CLI.
// ============================================================
import { discoverIntent, extractIntent, generateDomain, generateEvidence, generateExpeditions, generateMission, generateUnknowns, } from "./intent.js";
import { buildSampleEventLog, rebuildStateFromOffset, replayStateToProjection } from "./replay.js";
export class HomepageRuntime {
    async discover(input, mode) {
        const intent = extractIntent(input, mode);
        const discovery = discoverIntent(intent);
        const unknowns = generateUnknowns(intent, discovery);
        const evidence = generateEvidence(intent, discovery);
        const state = {
            mode,
            input,
            intent,
            discovery,
            unknowns,
            evidence,
            answers: [],
            expeditions: [],
        };
        return { state, projection: this.projectGenesis(state, "discovery") };
    }
    async clarify(state, answers) {
        const updated = {
            ...state,
            answers: [...state.answers, ...answers],
        };
        // Apply answers to reduce unknowns.
        const remainingUnknowns = updated.unknowns.items.filter((unknown) => {
            const answered = answers.some((answer) => answer.questionId.includes(unknown.field) || answer.questionId === unknown.field);
            return !answered;
        });
        updated.unknowns = { kind: "unknowns", items: remainingUnknowns };
        // If runtime/language answered, enrich constraints.
        const enrichedDiscovery = { ...updated.discovery };
        for (const answer of answers) {
            if (answer.questionId.includes("runtime") && !enrichedDiscovery.constraints.some((c) => c.startsWith("Runtime:"))) {
                enrichedDiscovery.constraints.push(`Runtime: ${answer.content}`);
            }
            if (answer.questionId.includes("language") && !enrichedDiscovery.constraints.some((c) => c.startsWith("Language:"))) {
                enrichedDiscovery.constraints.push(`Language: ${answer.content}`);
            }
        }
        updated.discovery = enrichedDiscovery;
        return { state: updated, projection: this.projectGenesis(updated, remainingUnknowns.length === 0 ? "domain" : "constraints") };
    }
    async buildMission(state) {
        if (!state.intent || !state.discovery) {
            throw new Error("Genesis state is missing intent or discovery");
        }
        const domain = generateDomain(state.intent, state.discovery);
        const mission = generateMission(state.intent, state.discovery, domain);
        const updated = {
            ...state,
            domain,
            mission,
        };
        return { state: updated, projection: this.projectGenesis(updated, "mission") };
    }
    async buildExpeditions(state) {
        if (!state.intent || !state.discovery || !state.mission) {
            throw new Error("Genesis state is missing mission");
        }
        const expeditions = generateExpeditions(state.mission, state.discovery);
        const updated = {
            ...state,
            expeditions,
        };
        return { state: updated, projection: this.projectGenesis(updated, "expeditions") };
    }
    async loadReplay(events) {
        const state = rebuildStateFromOffset(events, 0);
        const projection = replayStateToProjection(state, 0, events.length);
        return {
            events,
            offset: 0,
            projection,
        };
    }
    async stepReplay(state, direction) {
        let offset = state.offset;
        if (direction === "forward") {
            offset = Math.min(offset + 1, state.events.length - 1);
        }
        else if (direction === "backward") {
            offset = Math.max(offset - 1, 0);
        }
        else if (typeof direction === "number") {
            offset = Math.max(0, Math.min(direction, state.events.length - 1));
        }
        const replayState = rebuildStateFromOffset(state.events, offset);
        const projection = replayStateToProjection(replayState, offset, state.events.length);
        return {
            events: state.events,
            offset,
            projection,
        };
    }
    currentArtifacts(state) {
        if ("events" in state) {
            return state.projection;
        }
        return this.projectGenesis(state, state.mission ? (state.expeditions.length > 0 ? "expeditions" : "mission") : "discovery");
    }
    projectGenesis(state, phase) {
        return {
            phase,
            intent: state.intent,
            discovery: state.discovery,
            unknowns: state.unknowns,
            domain: state.domain,
            mission: state.mission,
            expeditions: state.expeditions,
            evidence: state.evidence,
        };
    }
}
export function createHomepageRuntime() {
    return new HomepageRuntime();
}
export function buildDemoReplay(state) {
    if (!state.mission || state.expeditions.length === 0) {
        return [];
    }
    return buildSampleEventLog(state.input, state.mission, state.expeditions);
}
