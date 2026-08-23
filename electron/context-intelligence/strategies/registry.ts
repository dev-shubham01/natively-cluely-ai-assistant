// Interview Intelligence V1 — Phase 6
// Single authoritative strategy registry.
//
// Ordering: override strategies FIRST (Stage 1 scan terminates faster).
// Invariants are validated at module load — failures are loud during development.

import type { AnswerStrategy, StrategyId } from './types';
import { OVERRIDE_STRATEGIES } from './override-strategies';
import { INTENT_STRATEGIES } from './intent-strategies';

// Override strategies precede intent strategies so Stage 1 scan terminates early.
const ALL_STRATEGIES: readonly AnswerStrategy[] = [
  ...OVERRIDE_STRATEGIES,
  ...INTENT_STRATEGIES,
];

// ── Invariant validation ─────────────────────────────────────────────────────

function validateRegistry(strategies: readonly AnswerStrategy[]): void {
  const ids = new Set<string>();
  const intents = new Set<string>();
  const behaviors = new Set<string>();

  const REQUIRED_OVERRIDE_BEHAVIORS = ['PUSHBACK', 'CORRECTION', 'CLARIFICATION', 'DEEPENING'];
  const FORBIDDEN_OVERRIDE_BEHAVIORS = ['HINT', 'TOPIC_CHANGE', 'QUESTION', 'FOLLOW_UP'];

  for (const s of strategies) {
    if (ids.has(s.id)) throw new Error(`[StrategyRegistry] Duplicate StrategyId: "${s.id}"`);
    ids.add(s.id);

    for (const intent of s.triggerIntents) {
      if (intents.has(intent)) throw new Error(`[StrategyRegistry] Intent "${intent}" appears in multiple strategies`);
      intents.add(intent);
    }

    for (const behavior of s.behaviorOverrides) {
      if (FORBIDDEN_OVERRIDE_BEHAVIORS.includes(behavior))
        throw new Error(`[StrategyRegistry] Behavior "${behavior}" must not be a behaviorOverride`);
      if (behaviors.has(behavior)) throw new Error(`[StrategyRegistry] Behavior "${behavior}" appears in multiple strategies`);
      behaviors.add(behavior);
    }
  }

  for (const required of REQUIRED_OVERRIDE_BEHAVIORS) {
    if (!behaviors.has(required))
      throw new Error(`[StrategyRegistry] Required override behavior "${required}" has no strategy`);
  }

  if (strategies.length !== 19)
    throw new Error(`[StrategyRegistry] Expected exactly 19 strategies, found ${strategies.length}`);
}

validateRegistry(ALL_STRATEGIES);

// ── Public exports ───────────────────────────────────────────────────────────

/** Ordered array: override strategies first, then intent strategies. */
export const STRATEGY_REGISTRY_ARRAY: readonly AnswerStrategy[] = ALL_STRATEGIES;

/** Map for O(1) lookup by id. */
export const STRATEGY_REGISTRY: ReadonlyMap<StrategyId, AnswerStrategy> = new Map(
  ALL_STRATEGIES.map((s) => [s.id, s]),
);

/** Returns the strategy for the given id, or undefined if not found. */
export function getStrategyById(id: StrategyId): AnswerStrategy | undefined {
  return STRATEGY_REGISTRY.get(id);
}
