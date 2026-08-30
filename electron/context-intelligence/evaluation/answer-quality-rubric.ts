// electron/context-intelligence/evaluation/answer-quality-rubric.ts
//
// Phase 22 — type schema for technical-interview answer-quality evaluation.
// Pure type definitions — no runtime logic.
//
// These types describe the evaluation of LLM-generated interview answers,
// distinct from the golden-case-schema.ts types which describe classification.

import type { InterviewIntentType } from '../contracts/types';

// ── flags ────────────────────────────────────────────────────────────────────

/**
 * Signal flags raised by either the deterministic pre-filter or the LLM judge.
 * A flag documents a specific defect pattern; its presence influences grading.
 */
export type AnswerQualityFlag =
  // Voice / register defects
  | 'wrong_voice'               // AI meta-commentary ("As an AI", "Certainly!", "Great question!")
  | 'template_leak'             // Markdown ## / ### headings in a conversational answer
  | 'over_hedged'               // Excessive hedging qualifiers in a short answer
  // Grounding defects
  | 'fabricated_claim'          // Personal-experience markers in a general-knowledge answer with no evidence
  | 'unsupported_metric'        // Specific numeric claim with no evidence provided
  // Depth defects
  | 'too_brief'                 // Answer < 30 words for a deep-intent question
  | 'too_exhaustive'            // Covers > 5 independent subtopics for a high-followUp intent
  // Strategy defects
  | 'missing_star_structure'    // Behavioral answer lacks Situation / Action / Result shape
  | 'missing_requirements_step' // System-design answer never clarifies requirements
  | 'missing_complexity'        // Coding-task answer omits time / space complexity
;

// ── case definition ──────────────────────────────────────────────────────────

/**
 * One answer-quality evaluation fixture.
 * Distinct from GoldenCase (classification only) — these cases describe expected
 * ANSWER properties, not classification outcomes.
 */
export interface AnswerQualityCase {
  /** Unique, stable identifier (aq_001 … aq_012). */
  id: string;
  question: string;
  expectedIntent: InterviewIntentType;
  expectedFollowUpLikelihood: 'high' | 'medium' | 'low';
  expectedDepth: 'brief' | 'standard' | 'deep';
  /**
   * Which rubric dimensions must pass for the case to be graded PASS.
   * Allows individual fixtures to opt out of dimensions that do not apply
   * (e.g. 'grounding' is not meaningful for a pure general-knowledge question
   * with no attached evidence).
   */
  requiredDimensions: ReadonlyArray<
    'voice' | 'strategy_adherence' | 'depth' | 'pacing' | 'grounding'
  >;
  notes?: string;
}

// ── per-result shape ─────────────────────────────────────────────────────────

/** Scores and flags for one evaluated answer. */
export interface AnswerQualityResult {
  caseId: string;
  question: string;
  /** Actual intent resolved by the classifier for this question. */
  actualIntent: string;
  actualFollowUpLikelihood: string;
  /** Full answer text returned by the LLM. */
  answer: string;
  /**
   * Rubric scores.
   * Numeric dimensions: 1 (worst) – 5 (best). null = not evaluated.
   * Pass/fail dimensions: 'pass' | 'fail'. null = not evaluated.
   */
  scores: {
    voice:               number | null;
    strategy_adherence:  number | null;
    depth:               'pass' | 'fail' | null;
    pacing:              'pass' | 'fail' | null;
    grounding:           'pass' | 'fail' | null;
  };
  /** Flags raised by the deterministic pre-filter and/or LLM judge. */
  flags: AnswerQualityFlag[];
  /** Whether all required dimensions passed. */
  grade: 'PASS' | 'FAIL';
  /** How the grade was determined. */
  gradedBy: 'deterministic' | 'llm_judge' | 'deterministic+llm_judge' | 'skipped';
  /** Judge explanation of any failing dimensions. */
  judgeExplanation?: string;
}

// ── report shape ─────────────────────────────────────────────────────────────

/** Summary report written to evaluation/results/{date}.json after one eval run. */
export interface AnswerQualityReport {
  /** ISO 8601 date-time of the run. */
  date: string;
  /** LLM model used for answer generation. */
  model: string;
  /** LLM model used for judging. */
  judgeModel: string;
  totalCases: number;
  passed: number;
  failed: number;
  skipped: number;
  /** 0–1, computed over non-skipped cases only. */
  passRate: number;
  results: AnswerQualityResult[];
}
