import type { ArtifactProjection, ExpeditionCard, MissionCard, SampleEvent, WorkspacePhase } from "./types.js";
export interface ReplayStateShape {
    version: number;
    phase: WorkspacePhase;
    mission?: MissionCard;
    expeditions: ExpeditionCard[];
    stateHash: string;
}
export declare function createEmptyState(): ReplayStateShape;
export declare function applyEvent(state: ReplayStateShape, event: SampleEvent): ReplayStateShape;
export declare function rebuildState(events: SampleEvent[]): ReplayStateShape;
export declare function rebuildStateFromOffset(events: SampleEvent[], offset: number): ReplayStateShape;
export declare function computeStateHash(state: ReplayStateShape): string;
export declare function buildSampleEventLog(input: string, mission: MissionCard, expeditions: ExpeditionCard[]): SampleEvent[];
export declare function replayStateToProjection(state: ReplayStateShape, offset: number, totalEvents: number): ArtifactProjection;
