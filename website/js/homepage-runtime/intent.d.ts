import type { ClarificationQuestion, DiscoveryCard, DomainCard, EntryMode, EvidenceCard, ExpeditionCard, IntentCard, MissionCard, UnknownsCard } from "./types.js";
export declare function extractIntent(input: string, mode: EntryMode): IntentCard;
export declare function discoverIntent(intent: IntentCard): DiscoveryCard;
export declare function generateUnknowns(intent: IntentCard, discovery: DiscoveryCard): UnknownsCard;
export declare function generateDomain(intent: IntentCard, discovery: DiscoveryCard): DomainCard;
export declare function generateMission(intent: IntentCard, discovery: DiscoveryCard, domain: DomainCard): MissionCard;
export declare function generateExpeditions(mission: MissionCard, discovery: DiscoveryCard): ExpeditionCard[];
export declare function generateEvidence(intent: IntentCard, discovery: DiscoveryCard): EvidenceCard[];
export declare function generateClarificationQuestions(unknowns: UnknownsCard): ClarificationQuestion[];
