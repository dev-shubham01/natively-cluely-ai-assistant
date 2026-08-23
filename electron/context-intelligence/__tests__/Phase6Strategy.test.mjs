// Interview Intelligence V1 — Phase 6 strategy tests.
//
// Covers:
//   A. Registry invariants (19 strategies, unique ids, valid structure)
//   B. Selector — all 18 intents map to the correct strategy
//   C. Selector — all 4 override behaviors win unconditionally
//   D. Override precedence (override beats intent even when intent would match)
//   E. HINT/TOPIC_CHANGE fall to intent-based selection
//   F. debugging → debugging_trace structure regression
//   G. mechanism_explanation → implementation_walkthrough structure regression
//   H. TurnDecision integration (answerStrategy present, frozen, correct)
//   I. Backward compatibility (pre-Phase-6 paths unaffected)

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');

const { STRATEGY_REGISTRY_ARRAY, STRATEGY_REGISTRY, getStrategyById } =
  await import(pathToFileURL(path.join(base, 'strategies/registry.js')).href);
const { selectStrategy } =
  await import(pathToFileURL(path.join(base, 'strategies/selector.js')).href);
const { classifyTurn } =
  await import(pathToFileURL(path.join(base, 'question/turn-classifier.js')).href);
const { decide } =
  await import(pathToFileURL(path.join(base, 'orchestration/orchestrator.js')).href);
const { MODE_POLICIES } =
  await import(pathToFileURL(path.join(base, 'policies/mode-policy-registry.js')).href);

const classify = (q, over = {}) =>
  classifyTurn({ resolvedQuestion: q, policy: MODE_POLICIES['technical-interview'], isFollowUp: false, ...over });

const decision = (q = 'What is a closure?') =>
  decide({ requestId: 'r1', requestSequence: 1, surface: 'manual-chat', modeId: 'technical-interview',
    scope: { userId: 'u1' }, sessionId: 's1', manualQuestion: q });

// ── A. Registry invariants ───────────────────────────────────────────────────

describe('A. Registry invariants', () => {
  test('exactly 19 strategies exist', () => {
    assert.equal(STRATEGY_REGISTRY_ARRAY.length, 19);
  });

  test('all StrategyIds are unique', () => {
    const ids = STRATEGY_REGISTRY_ARRAY.map((s) => s.id);
    assert.equal(new Set(ids).size, 19);
  });

  test('STRATEGY_REGISTRY Map has exactly 19 entries', () => {
    assert.equal(STRATEGY_REGISTRY.size, 19);
  });

  test('getStrategyById returns the correct strategy', () => {
    const s = getStrategyById('define_concept');
    assert.ok(s, 'define_concept must be in the registry');
    assert.equal(s.id, 'define_concept');
  });

  test('getStrategyById returns undefined for unknown id', () => {
    assert.equal(getStrategyById('nonexistent_id'), undefined);
  });

  test('all strategies have valid structure (id, triggerIntents, behaviorOverrides, promptSection, steps)', () => {
    for (const s of STRATEGY_REGISTRY_ARRAY) {
      assert.ok(typeof s.id === 'string' && s.id.length > 0, `${s.id}: id must be a non-empty string`);
      assert.ok(Array.isArray(s.triggerIntents), `${s.id}: triggerIntents must be an array`);
      assert.ok(Array.isArray(s.behaviorOverrides), `${s.id}: behaviorOverrides must be an array`);
      assert.ok(typeof s.promptSection === 'string' && s.promptSection.length > 0, `${s.id}: promptSection must be non-empty`);
      assert.ok(Array.isArray(s.steps) && s.steps.length > 0, `${s.id}: steps must be a non-empty array`);
    }
  });

  test('no intent appears in multiple strategies', () => {
    const seen = new Map();
    for (const s of STRATEGY_REGISTRY_ARRAY) {
      for (const intent of s.triggerIntents) {
        assert.ok(!seen.has(intent), `intent "${intent}" appears in both "${seen.get(intent)}" and "${s.id}"`);
        seen.set(intent, s.id);
      }
    }
  });

  test('no behavior override appears in multiple strategies', () => {
    const seen = new Map();
    for (const s of STRATEGY_REGISTRY_ARRAY) {
      for (const b of s.behaviorOverrides) {
        assert.ok(!seen.has(b), `behavior "${b}" appears in both "${seen.get(b)}" and "${s.id}"`);
        seen.set(b, s.id);
      }
    }
  });

  test('all 4 required override behaviors are covered', () => {
    const covered = new Set(STRATEGY_REGISTRY_ARRAY.flatMap((s) => s.behaviorOverrides));
    for (const b of ['PUSHBACK', 'CORRECTION', 'CLARIFICATION', 'DEEPENING']) {
      assert.ok(covered.has(b), `required override behavior "${b}" has no strategy`);
    }
  });

  test('HINT has no override strategy', () => {
    const has = STRATEGY_REGISTRY_ARRAY.some((s) => s.behaviorOverrides.includes('HINT'));
    assert.ok(!has, 'HINT must not be a behaviorOverride — it falls to intent-based selection');
  });

  test('TOPIC_CHANGE has no override strategy', () => {
    const has = STRATEGY_REGISTRY_ARRAY.some((s) => s.behaviorOverrides.includes('TOPIC_CHANGE'));
    assert.ok(!has, 'TOPIC_CHANGE must not be a behaviorOverride — it falls to intent-based selection');
  });

  test('override strategies appear before intent strategies in STRATEGY_REGISTRY_ARRAY', () => {
    const firstIntent = STRATEGY_REGISTRY_ARRAY.findIndex((s) => s.triggerIntents.length > 0);
    const lastOverride = [...STRATEGY_REGISTRY_ARRAY].reverse().findIndex((s) => s.behaviorOverrides.length > 0);
    const lastOverrideIndex = STRATEGY_REGISTRY_ARRAY.length - 1 - lastOverride;
    assert.ok(lastOverrideIndex < firstIntent,
      'all override strategies must precede all intent strategies for efficient Stage 1 scan');
  });
});

// ── B. Selector — 18 intents → correct strategy ─────────────────────────────

describe('B. Selector — intent coverage', () => {
  const INTENT_MAP = [
    ['concept_explanation', 'define_concept'],
    ['knowledge_check',     'define_concept'],
    ['mechanism_explanation', 'explain_mechanism'],
    ['technology_decision', 'justify_decision'],
    ['comparison',          'analyze_options'],
    ['tradeoff',            'analyze_options'],
    ['coding_task',         'implement_solution'],
    ['debugging',           'trace_bug'],
    ['optimization',        'optimize_approach'],
    ['system_design',       'design_system'],
    ['lld',                 'design_classes'],
    ['scalability',         'analyze_scale'],
    ['project_context',     'describe_project'],
    ['project_deep_dive',   'describe_project'],
    ['experience_question', 'narrate_experience'],
    ['behavioral',          'tell_behavioral_story'],
    ['introduction',        'introduce_self'],
    ['follow_up_generic',   'continue_thread'],
  ];

  for (const [intent, expectedId] of INTENT_MAP) {
    test(`${intent} → ${expectedId}`, () => {
      const s = selectStrategy(intent, 'QUESTION');
      assert.ok(s, `selectStrategy("${intent}", "QUESTION") must not return undefined`);
      assert.equal(s.id, expectedId);
    });
  }

  test('all 18 InterviewIntentTypes are covered (no undefined result)', () => {
    for (const [intent] of INTENT_MAP) {
      const s = selectStrategy(intent, 'QUESTION');
      assert.ok(s, `intent "${intent}" returned undefined — no strategy covers it`);
    }
  });
});

// ── C. Selector — 4 override behaviors ──────────────────────────────────────

describe('C. Selector — override behavior coverage', () => {
  const OVERRIDE_MAP = [
    ['PUSHBACK',     'defend_position'],
    ['CORRECTION',   'acknowledge_correction'],
    ['CLARIFICATION','restate_clearly'],
    ['DEEPENING',    'deepen_explanation'],
  ];

  for (const [behavior, expectedId] of OVERRIDE_MAP) {
    test(`${behavior} → ${expectedId}`, () => {
      // Use a valid intent — it must be ignored by Stage 1
      const s = selectStrategy('concept_explanation', behavior);
      assert.ok(s, `selectStrategy("concept_explanation", "${behavior}") must not return undefined`);
      assert.equal(s.id, expectedId);
    });
  }
});

// ── D. Override precedence ───────────────────────────────────────────────────

describe('D. Override precedence — override always beats intent', () => {
  const ALL_INTENTS = [
    'concept_explanation', 'knowledge_check', 'mechanism_explanation',
    'technology_decision', 'comparison', 'tradeoff', 'coding_task',
    'debugging', 'optimization', 'system_design', 'lld', 'scalability',
    'project_context', 'project_deep_dive', 'experience_question',
    'behavioral', 'introduction', 'follow_up_generic',
  ];

  const OVERRIDE_BEHAVIORS = ['PUSHBACK', 'CORRECTION', 'CLARIFICATION', 'DEEPENING'];
  const EXPECTED_IDS = {
    PUSHBACK:      'defend_position',
    CORRECTION:    'acknowledge_correction',
    CLARIFICATION: 'restate_clearly',
    DEEPENING:     'deepen_explanation',
  };

  for (const behavior of OVERRIDE_BEHAVIORS) {
    for (const intent of ALL_INTENTS) {
      test(`intent="${intent}" behavior="${behavior}" → ${EXPECTED_IDS[behavior]}`, () => {
        const s = selectStrategy(intent, behavior);
        assert.ok(s, `selectStrategy("${intent}", "${behavior}") must not return undefined`);
        assert.equal(s.id, EXPECTED_IDS[behavior],
          `override "${behavior}" must win over intent "${intent}"`);
      });
    }
  }
});

// ── E. HINT / TOPIC_CHANGE fall to intent-based selection ───────────────────

describe('E. HINT and TOPIC_CHANGE fall to intent-based selection', () => {
  test('HINT + coding_task → implement_solution (not an override)', () => {
    const s = selectStrategy('coding_task', 'HINT');
    assert.ok(s);
    assert.equal(s.id, 'implement_solution', 'HINT has no override — intent strategy applies');
  });

  test('TOPIC_CHANGE + system_design → design_system (not an override)', () => {
    const s = selectStrategy('system_design', 'TOPIC_CHANGE');
    assert.ok(s);
    assert.equal(s.id, 'design_system', 'TOPIC_CHANGE has no override — intent strategy applies');
  });

  test('QUESTION + debugging → trace_bug', () => {
    const s = selectStrategy('debugging', 'QUESTION');
    assert.ok(s);
    assert.equal(s.id, 'trace_bug');
  });

  test('FOLLOW_UP + follow_up_generic → continue_thread', () => {
    const s = selectStrategy('follow_up_generic', 'FOLLOW_UP');
    assert.ok(s);
    assert.equal(s.id, 'continue_thread');
  });
});

// ── F. debugging → debugging_trace (STEP 0 regression) ──────────────────────

describe('F. debugging → debugging_trace structure regression', () => {
  test('a debugging question gets debugging_trace AnswerStructure', () => {
    const r = classify('Your code is timing out on large inputs. How would you debug it?');
    assert.equal(r.interviewIntent?.intent, 'debugging', 'must classify as debugging intent');
    assert.equal(r.interviewIntent?.expectedAnswer.structure, 'debugging_trace',
      'debugging must map to debugging_trace, not implementation_walkthrough');
  });

  test('coding_task still gets implementation_walkthrough (unaffected)', () => {
    const r = classify('Implement binary search.');
    assert.equal(r.interviewIntent?.expectedAnswer.structure, 'implementation_walkthrough');
  });

  test('optimization still gets implementation_walkthrough (unaffected)', () => {
    const r = classify('How would you optimize this O(n²) algorithm?');
    assert.equal(r.interviewIntent?.expectedAnswer.structure, 'implementation_walkthrough');
  });
});

// ── G. mechanism_explanation → implementation_walkthrough (STEP 0 regression) ─

describe('G. mechanism_explanation → implementation_walkthrough structure regression', () => {
  test('a mechanism question gets implementation_walkthrough AnswerStructure', () => {
    const r = classify('How does the JavaScript event loop work internally?');
    assert.equal(r.interviewIntent?.intent, 'mechanism_explanation',
      'must classify as mechanism_explanation intent');
    assert.equal(r.interviewIntent?.expectedAnswer.structure, 'implementation_walkthrough',
      'mechanism_explanation must map to implementation_walkthrough, not direct_definition');
  });

  test('concept_explanation still gets direct_definition (unaffected)', () => {
    const r = classify('What is a closure?');
    assert.equal(r.interviewIntent?.intent, 'concept_explanation');
    assert.equal(r.interviewIntent?.expectedAnswer.structure, 'direct_definition');
  });

  test('knowledge_check still gets direct_definition (unaffected)', () => {
    // "Are you familiar with X?" is the canonical knowledge_check form.
    const r = classify('Are you familiar with consistent hashing?');
    assert.equal(r.interviewIntent?.intent, 'knowledge_check',
      'question must classify as knowledge_check for this regression to be meaningful');
    assert.equal(r.interviewIntent?.expectedAnswer.structure, 'direct_definition',
      'knowledge_check must still get direct_definition after mechanism_explanation change');
  });
});

// ── H. TurnDecision integration ──────────────────────────────────────────────

describe('H. TurnDecision integration', () => {
  test('answerStrategy is present on a classified interview question', () => {
    const d = decision('What is a closure?');
    assert.ok(d.interviewIntent, 'interviewIntent must be present');
    assert.ok(d.answerStrategy, 'answerStrategy must be present when interviewIntent is present');
  });

  test('answerStrategy has the correct id for the intent', () => {
    const d = decision('What is a closure?');
    assert.equal(d.answerStrategy?.id, 'define_concept');
  });

  test('answerStrategy for debugging question is trace_bug', () => {
    const d = decision('Your code is timing out on large inputs. How would you debug this?');
    assert.equal(d.answerStrategy?.id, 'trace_bug');
  });

  test('answerStrategy for system design is design_system', () => {
    const d = decision('Design a URL shortener.');
    assert.equal(d.answerStrategy?.id, 'design_system');
  });

  test('answerStrategy is deeply frozen', () => {
    const d = decision('What is a closure?');
    assert.ok(Object.isFrozen(d.answerStrategy), 'answerStrategy must be frozen');
    assert.ok(Object.isFrozen(d.answerStrategy?.steps), 'answerStrategy.steps must be frozen');
  });

  test('answerStrategy contains promptSection and steps', () => {
    const d = decision('What is a closure?');
    assert.ok(typeof d.answerStrategy?.promptSection === 'string' && d.answerStrategy.promptSection.length > 0);
    assert.ok(Array.isArray(d.answerStrategy?.steps) && d.answerStrategy.steps.length > 0);
  });

  test('interviewIntent remains frozen and unmodified by Phase 6 wiring', () => {
    const d = decision('What is a closure?');
    assert.ok(Object.isFrozen(d.interviewIntent), 'interviewIntent must still be frozen');
    assert.ok(Object.isFrozen(d.interviewIntent?.expectedAnswer), 'interviewIntent.expectedAnswer must be frozen');
  });
});

// ── I. Backward compatibility ────────────────────────────────────────────────

describe('I. Backward compatibility — Phase 2–5 paths unaffected', () => {
  test('a fast-path general question still resolves to FAST', () => {
    const d = decision('What is idempotency in an HTTP API?');
    assert.equal(d.retrievalPlan.path, 'FAST');
    assert.equal(d.retrievalPlan.shouldRetrieve, false);
  });

  test('Phase 5 guard still suppresses RESUME when resume=false', () => {
    const d = decision('What is a closure?');
    assert.ok(!d.retrievalPlan.sourceTypes.includes('RESUME'),
      'RESUME must be suppressed for a general CS question');
  });

  test('Phase 5 guard generic follow-up still produces FAST path', () => {
    const d = decide({
      requestId: 'r-fu', requestSequence: 1, surface: 'manual-chat', modeId: 'technical-interview',
      scope: { userId: 'u1' }, sessionId: 's-fu',
      manualQuestion: 'give me an example (follow-up to: "what is a rest api")',
      isFollowUp: true,
    });
    assert.equal(d.retrievalPlan.path, 'FAST', 'generic follow-up must still be FAST after Phase 6 wiring');
  });

  test('answerStrategy for generic follow-up is continue_thread', () => {
    const d = decide({
      requestId: 'r-fu2', requestSequence: 1, surface: 'manual-chat', modeId: 'technical-interview',
      scope: { userId: 'u1' }, sessionId: 's-fu2',
      manualQuestion: 'give me an example (follow-up to: "what is a rest api")',
      isFollowUp: true,
    });
    // follow_up_generic + FOLLOW_UP behavior → continue_thread (Stage 2, no override)
    assert.equal(d.answerStrategy?.id, 'continue_thread');
  });
});
