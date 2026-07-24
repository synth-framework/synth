// ============================================================
// HOMEPAGE RUNTIME: Replay Engine
// ============================================================
// Deterministic, in-memory state reconstruction from a sample
// event log. Pure functions only; no persistence.
// ============================================================
export function createEmptyState() {
    return {
        version: 0,
        phase: "idle",
        expeditions: [],
        stateHash: "0",
    };
}
export function applyEvent(state, event) {
    const payload = event.payload;
    if (!payload || typeof payload !== "object")
        return state;
    switch (event.type) {
        case "SYSTEM_GENESIS": {
            return { ...state, version: 1, phase: "intent" };
        }
        case "MISSION_CREATED": {
            const mission = payload.mission;
            if (mission) {
                return { ...state, mission, phase: "mission" };
            }
            break;
        }
        case "MISSION_APPROVED": {
            if (state.mission) {
                return { ...state, phase: "expeditions" };
            }
            break;
        }
        case "EXPEDITION_CREATED": {
            const expedition = payload.expedition;
            if (expedition) {
                return { ...state, expeditions: [...state.expeditions, expedition] };
            }
            break;
        }
        case "EXPEDITION_STARTED": {
            const id = String(payload.id ?? "");
            return {
                ...state,
                expeditions: state.expeditions.map((e) => (e.id === id ? { ...e, status: "executing" } : e)),
            };
        }
        case "EXPEDITION_COMPLETED": {
            const id = String(payload.id ?? "");
            return {
                ...state,
                expeditions: state.expeditions.map((e) => (e.id === id ? { ...e, status: "completed" } : e)),
                phase: "governance",
            };
        }
        case "REPLAY_ENABLED": {
            return { ...state, phase: "replay" };
        }
    }
    return state;
}
export function rebuildState(events) {
    let state = createEmptyState();
    for (const event of events) {
        state = applyEvent(state, event);
    }
    state.stateHash = computeStateHash(state);
    return state;
}
export function rebuildStateFromOffset(events, offset) {
    let state = createEmptyState();
    for (let i = 0; i <= offset && i < events.length; i++) {
        state = applyEvent(state, events[i]);
    }
    state.stateHash = computeStateHash(state);
    return state;
}
export function computeStateHash(state) {
    const data = {
        v: state.version,
        phase: state.phase,
        mission: state.mission?.id,
        expeditions: state.expeditions.map((e) => `${e.id}:${e.status}`).sort(),
    };
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash + char) | 0;
    }
    return String(Math.abs(hash));
}
export function buildSampleEventLog(input, mission, expeditions) {
    return [
        { type: "SYSTEM_GENESIS", payload: { projectName: input.slice(0, 40) } },
        { type: "MISSION_CREATED", payload: { mission } },
        { type: "MISSION_APPROVED", payload: { id: mission.id } },
        ...expeditions.map((expedition) => ({
            type: "EXPEDITION_CREATED",
            payload: { expedition },
        })),
        ...expeditions.map((expedition) => ({
            type: "EXPEDITION_STARTED",
            payload: { id: expedition.id },
        })),
        ...expeditions.map((expedition) => ({
            type: "EXPEDITION_COMPLETED",
            payload: { id: expedition.id },
        })),
        { type: "REPLAY_ENABLED", payload: {} },
    ];
}
export function replayStateToProjection(state, offset, totalEvents) {
    return {
        phase: state.phase,
        mission: state.mission,
        expeditions: state.expeditions,
        unknowns: { kind: "unknowns", items: [] },
        evidence: [],
        replay: {
            offset,
            totalEvents,
            stateHash: state.stateHash,
        },
    };
}
