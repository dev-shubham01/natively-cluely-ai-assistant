// Interview Intelligence V1 — Phase 9 strategy quality tests.
//
// Verifies P1 and P2 content changes to strategy objects.
// Does NOT test selection mechanics (covered by Phase6Strategy.test.mjs).
//
// Covers:
//   A. Registry integrity (19 strategies, override precedence unchanged)
//   B. TRACE_BUG — verify + prevent-recurrence steps present
//   C. CONTINUE_THREAD — no internal architecture terminology
//   D. Personal evidence strategies — anti-fabrication guidance present
//   E. DESIGN_CLASSES — code-form signature encouragement present
//   F. RESTATE_CLEARLY — ask-before-restating in Step 1
//   G. TELL_BEHAVIORAL_STORY — self-awareness/judgment in reflection step
//   H. DEEPEN_EXPLANATION — no meta "won't expand" language; pick-one-dimension present

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = path.resolve(process.cwd(), 'dist-electron/electron/context-intelligence');

const { STRATEGY_REGISTRY, STRATEGY_REGISTRY_ARRAY } =
  await import(pathToFileURL(path.join(base, 'strategies/registry.js')).href);
const { selectStrategy } =
  await import(pathToFileURL(path.join(base, 'strategies/selector.js')).href);

const get = (id) => {
  const s = STRATEGY_REGISTRY.get(id);
  assert.ok(s, `strategy "${id}" not found in registry`);
  return s;
};

// ── A. Registry integrity ────────────────────────────────────────────────────

describe('A. Registry integrity (Phase 9 must not change count or override precedence)', () => {
  test('registry still contains exactly 19 strategies', () => {
    assert.equal(STRATEGY_REGISTRY_ARRAY.length, 19);
    assert.equal(STRATEGY_REGISTRY.size, 19);
  });

  test('override strategies still cover all four required behaviors', () => {
    for (const behavior of ['PUSHBACK', 'CORRECTION', 'CLARIFICATION', 'DEEPENING']) {
      const s = selectStrategy('concept_explanation', behavior);
      assert.ok(s, `no strategy for behavior "${behavior}"`);
      assert.ok(s.behaviorOverrides.includes(behavior),
        `behavior "${behavior}" must be covered by an override strategy`);
    }
  });

  test('override strategies win over intent strategies (precedence unchanged)', () => {
    // coding_task + PUSHBACK → defend_position, not implement_solution
    const s = selectStrategy('coding_task', 'PUSHBACK');
    assert.equal(s?.id, 'defend_position');
    // system_design + DEEPENING → deepen_explanation, not design_system
    const s2 = selectStrategy('system_design', 'DEEPENING');
    assert.equal(s2?.id, 'deepen_explanation');
  });

  test('intent strategies are still correctly mapped', () => {
    const pairs = [
      ['concept_explanation', 'define_concept'],
      ['mechanism_explanation', 'explain_mechanism'],
      ['technology_decision', 'justify_decision'],
      ['coding_task', 'implement_solution'],
      ['debugging', 'trace_bug'],
      ['system_design', 'design_system'],
      ['lld', 'design_classes'],
      ['project_context', 'describe_project'],
      ['experience_question', 'narrate_experience'],
      ['behavioral', 'tell_behavioral_story'],
      ['introduction', 'introduce_self'],
      ['follow_up_generic', 'continue_thread'],
    ];
    for (const [intent, expectedId] of pairs) {
      const s = selectStrategy(intent, 'QUESTION');
      assert.equal(s?.id, expectedId, `intent "${intent}" should map to "${expectedId}"`);
    }
  });
});

// ── B. TRACE_BUG ─────────────────────────────────────────────────────────────

describe('B. TRACE_BUG — verify + prevent-recurrence steps', () => {
  const s = get('trace_bug');

  test('has 8 steps (was 6; added verify and prevent-recurrence)', () => {
    assert.equal(s.steps.length, 8, `expected 8 steps, got ${s.steps.length}`);
  });

  test('step 7 addresses verification of the fix', () => {
    const step7 = s.steps[6].toLowerCase();
    assert.ok(
      /verif/.test(step7) || /confirm/.test(step7),
      `step 7 must address verification: "${s.steps[6]}"`
    );
  });

  test('step 8 addresses preventing recurrence', () => {
    const step8 = s.steps[7].toLowerCase();
    assert.ok(
      /prevent/.test(step8) || /recurrence/.test(step8) || /monitoring/.test(step8),
      `step 8 must address prevention/recurrence: "${s.steps[7]}"`
    );
  });

  test('promptSection mentions verify and prevent', () => {
    const ps = s.promptSection.toLowerCase();
    assert.ok(/verif/.test(ps), 'promptSection must mention verification');
    assert.ok(/prevent/.test(ps) || /recurrence/.test(ps), 'promptSection must mention prevention');
  });
});

// ── C. CONTINUE_THREAD ───────────────────────────────────────────────────────

describe('C. CONTINUE_THREAD — no internal architecture terminology in LLM-facing text', () => {
  const s = get('continue_thread');

  test('promptSection does not contain "Phase 4"', () => {
    assert.ok(
      !/phase 4/i.test(s.promptSection),
      `promptSection must not reference "Phase 4": found in "${s.promptSection.slice(0, 100)}..."`
    );
  });

  test('promptSection does not contain "topic-chain" as an implementation term', () => {
    assert.ok(
      !/topic.chain context/i.test(s.promptSection),
      'promptSection must not reference "topic-chain context" as an internal term'
    );
  });

  test('promptSection instructs the LLM to use conversation context naturally', () => {
    const ps = s.promptSection.toLowerCase();
    assert.ok(
      /conversation context/.test(ps) || /context above/.test(ps),
      'promptSection must reference the conversation context in user-facing terms'
    );
  });

  test('steps do not contain "Phase 4" or implementation references', () => {
    for (const step of s.steps) {
      assert.ok(
        !/phase 4/i.test(step),
        `step must not reference "Phase 4": "${step}"`
      );
    }
  });
});

// ── D. Personal evidence strategies — anti-fabrication ───────────────────────

describe('D. Personal evidence strategies — anti-fabrication guidance', () => {
  const PERSONAL_STRATEGIES = [
    'describe_project',
    'narrate_experience',
    'tell_behavioral_story',
    'justify_decision',
    'introduce_self',
  ];

  const FABRICATION_KEYWORDS = [
    /do not invent/i,
    /don't invent/i,
    /not supported by/i,
    /retrieved evidence/i,
    /acknowledge the gap/i,
    /do not invent.*evidence/i,
  ];

  for (const id of PERSONAL_STRATEGIES) {
    test(`"${id}" promptSection contains anti-fabrication guidance`, () => {
      const s = get(id);
      const ps = s.promptSection;
      const hasGuidance = FABRICATION_KEYWORDS.some((re) => re.test(ps));
      assert.ok(
        hasGuidance,
        `"${id}" promptSection must contain anti-fabrication guidance (checked for: do not invent / retrieved evidence / etc). Got:\n"${ps.slice(-200)}"`
      );
    });
  }

  test('narrate_experience reflection is consistently optional (promptSection says "Optionally")', () => {
    const s = get('narrate_experience');
    assert.ok(
      /optionally/i.test(s.promptSection),
      'narrate_experience promptSection must say "Optionally" for reflection to align with step "(optional)"'
    );
  });
});

// ── E. DESIGN_CLASSES ────────────────────────────────────────────────────────

describe('E. DESIGN_CLASSES — code-form signature encouragement', () => {
  const s = get('design_classes');

  test('step 4 encourages code-form signatures', () => {
    const step4 = s.steps[3].toLowerCase();
    assert.ok(
      /code.form|code form|signatures/.test(step4),
      `step 4 must encourage code-form signatures: "${s.steps[3]}"`
    );
  });

  test('promptSection mentions code-form signatures', () => {
    assert.ok(
      /code.form/i.test(s.promptSection),
      'promptSection must explicitly mention code-form signatures'
    );
  });

  test('step count is still 7', () => {
    assert.equal(s.steps.length, 7, `expected 7 steps, got ${s.steps.length}`);
  });
});

// ── F. RESTATE_CLEARLY ───────────────────────────────────────────────────────

describe('F. RESTATE_CLEARLY — ask-before-restating in step 1', () => {
  const s = get('restate_clearly');

  test('step 1 identifies which part AND includes ask-if-unclear guidance', () => {
    const step1 = s.steps[0].toLowerCase();
    assert.ok(
      /unclear|ask|clarif/.test(step1),
      `step 1 must include ask-if-unclear guidance: "${s.steps[0]}"`
    );
  });

  test('step count is still 5', () => {
    assert.equal(s.steps.length, 5, `expected 5 steps, got ${s.steps.length}`);
  });

  test('promptSection still mentions identifying the unclear part', () => {
    assert.ok(
      /unclear/i.test(s.promptSection),
      'promptSection must still address the unclear-part identification'
    );
  });
});

// ── G. TELL_BEHAVIORAL_STORY — self-awareness in reflection step ──────────────

describe('G. TELL_BEHAVIORAL_STORY — self-awareness/judgment in reflection step', () => {
  const s = get('tell_behavioral_story');

  test('reflection step (step 5) mentions self-awareness or judgment evaluation', () => {
    const step5 = s.steps[4].toLowerCase();
    assert.ok(
      /self.awareness|judgment|evaluating/.test(step5),
      `step 5 must reference self-awareness or judgment: "${s.steps[4]}"`
    );
  });

  test('promptSection contains anti-fabrication guidance', () => {
    assert.ok(
      /do not invent/i.test(s.promptSection),
      'tell_behavioral_story promptSection must contain anti-fabrication guidance'
    );
  });

  test('step count is still 5', () => {
    assert.equal(s.steps.length, 5, `expected 5 steps, got ${s.steps.length}`);
  });
});

// ── H. DEEPEN_EXPLANATION ────────────────────────────────────────────────────

describe('H. DEEPEN_EXPLANATION — no meta "won\'t expand" language; pick-one-dimension present', () => {
  const s = get('deepen_explanation');

  test('step 4 does NOT contain "deliberately not expanding"', () => {
    for (const step of s.steps) {
      assert.ok(
        !/deliberately not expanding/i.test(step),
        `steps must not contain "deliberately not expanding": "${step}"`
      );
    }
  });

  test('step 4 instructs picking one dimension', () => {
    const step4 = s.steps[3].toLowerCase();
    assert.ok(
      /pick one|one dimension|single aspect/.test(step4),
      `step 4 must say "pick one dimension" or similar: "${s.steps[3]}"`
    );
  });

  test('step count is still 5', () => {
    assert.equal(s.steps.length, 5, `expected 5 steps, got ${s.steps.length}`);
  });
});
