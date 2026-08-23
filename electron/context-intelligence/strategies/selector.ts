// Interview Intelligence V1 — Phase 6
// Deterministic two-stage strategy selector.
//
// Stage 1: behavior override — wins unconditionally. PUSHBACK/CORRECTION/
//   CLARIFICATION/DEEPENING each map to a dedicated override strategy.
// Stage 2: intent match — runs only when Stage 1 finds nothing.
// Stage 3: undefined — graceful degradation. Prompt-composer omits the
//   answer_strategy section. No fallback strategy is invented.
//
// HINT and TOPIC_CHANGE have no override strategy — they fall to Stage 2.
// QUESTION and FOLLOW_UP also fall to Stage 2.

import type { AnswerStrategy, InterviewIntentType, InterviewerBehavior } from './types';
import { STRATEGY_REGISTRY_ARRAY } from './registry';

/**
 * Select the appropriate AnswerStrategy for a given intent and behavior.
 *
 * Pure, synchronous, deterministic. No mutations. No LLM calls.
 * Returns undefined when no strategy matches (graceful degradation).
 */
export function selectStrategy(
  intent: InterviewIntentType,
  behavior: InterviewerBehavior,
): AnswerStrategy | undefined {
  // Stage 1: behavior override wins unconditionally.
  for (const s of STRATEGY_REGISTRY_ARRAY) {
    if (s.behaviorOverrides.includes(behavior)) return s;
  }

  // Stage 2: intent match.
  for (const s of STRATEGY_REGISTRY_ARRAY) {
    if (s.triggerIntents.includes(intent)) return s;
  }

  // Stage 3: no match — graceful degradation.
  return undefined;
}
