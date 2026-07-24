import type { ClarificationAnswer, ClarificationQuestion, DemoContext, DemoExample, OperatorAdapter } from "./types.js";
export declare class DemoOperator implements OperatorAdapter {
    private selectedExampleId?;
    constructor(selectedExampleId?: string);
    proposeIntent(context: DemoContext): Promise<string>;
    answerClarification(questions: ClarificationQuestion[]): Promise<ClarificationAnswer[]>;
    approveMission(): Promise<boolean>;
    selectExample(examples: DemoExample[]): Promise<string>;
}
