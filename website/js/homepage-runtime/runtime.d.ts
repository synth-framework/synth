import type { ArtifactProjection, ClarificationAnswer, EntryMode, GenesisResult, GenesisState, MissionRuntime, ReplayState, SampleEvent } from "./types.js";
export declare class HomepageRuntime implements MissionRuntime {
    discover(input: string, mode: EntryMode): Promise<GenesisResult>;
    clarify(state: GenesisState, answers: ClarificationAnswer[]): Promise<GenesisResult>;
    buildMission(state: GenesisState): Promise<GenesisResult>;
    buildExpeditions(state: GenesisState): Promise<GenesisResult>;
    buildArchitecture(state: GenesisState): Promise<GenesisResult>;
    buildRepository(state: GenesisState): Promise<GenesisResult>;
    approveContract(state: GenesisState): Promise<GenesisResult>;
    approveMission(state: GenesisState): Promise<GenesisResult>;
    approvePlan(state: GenesisState): Promise<GenesisResult>;
    startExecution(state: GenesisState): Promise<GenesisResult>;
    completeExecution(state: GenesisState): Promise<GenesisResult>;
    approveReview(state: GenesisState): Promise<GenesisResult>;
    acceptOutcome(state: GenesisState): Promise<GenesisResult>;
    loadReplay(events: SampleEvent[]): Promise<ReplayState>;
    stepReplay(state: ReplayState, direction: "forward" | "backward" | number): Promise<ReplayState>;
    currentArtifacts(state: GenesisState | ReplayState): ArtifactProjection;
    private projectGenesis;
}
export declare function createHomepageRuntime(): MissionRuntime;
export declare function buildDemoReplay(state: GenesisState): SampleEvent[];
