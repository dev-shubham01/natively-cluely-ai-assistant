// electron/context-intelligence/evaluation/golden-case-schema.ts
//
// Type contracts for the Phase 11 golden dataset and evaluator.
// No runtime logic — pure type definitions.

import type { InterviewIntentType, InterviewerBehavior, StrategyId } from '../contracts/types';

export type GoldenRisk = 'high' | 'medium' | 'low';

/**
 * Expected context-requirements snapshot for one golden case.
 * Keys present and true → must be true in actual output.
 * Keys present and false → must be false in actual output (CR-F if violated).
 * Keys absent → no assertion (not checked).
 */
export type GoldenContextRequirements = Partial<{
  conversation:     boolean;
  resume:           boolean;
  projects:         boolean;
  code:             boolean;
  documents:        boolean;
  stories:          boolean;
  generalKnowledge: boolean;
}>;

export interface GoldenExpected {
  intent:              InterviewIntentType;
  strategy:            StrategyId;
  behavior:            InterviewerBehavior;
  contextRequirements: GoldenContextRequirements;
  storyBankActivated:  boolean;
}

export interface GoldenCase {
  id:       string;
  question: string;
  risk:     GoldenRisk;
  notes?:   string;
  expected: GoldenExpected;
}

export type GoldenGrade = 'PASS' | 'FAIL';

export type FailureCategory =
  | 'no_interview_intent'
  | 'intent_mismatch'
  | 'strategy_mismatch'
  | 'behavior_mismatch'
  | 'story_bank_mismatch'
  | 'cr_false_negative'
  | 'cr_false_positive';

export interface ActualClassification {
  intent:              string;
  strategy:            string;
  behavior:            string;
  contextRequirements: Record<string, boolean>;
  storyBankActivated:  boolean;
}

export interface CaseEvaluationResult {
  id:       string;
  question: string;
  risk:     GoldenRisk;
  grade:    GoldenGrade;
  failures: FailureCategory[];
  actual:   ActualClassification;
}

export interface GradeReport {
  totalCases:        number;
  passed:            number;
  failed:            number;
  passRate:          number;
  highRiskCases:     number;
  highRiskPassed:    number;
  highRiskPassRate:  number;
  crFalsePositiveCount: number;
  results:           CaseEvaluationResult[];
}
