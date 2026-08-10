// electron/llm/__tests__/CodingContract.test.mjs
//
// Release-blocking coding-structure coverage. Proves the discovery-narrative
// coding contract holds end-to-end across:
//   - codingContract: the shared shape source of truth,
//   - AnswerValidator: validate (no deterministic repair for this shape),
//   - AnswerPlanner: routing + scaffold flag + forbidden-layer isolation.
//
// Shape: one fixed opening heading, a VARIABLE number of numbered
// "## Approach N: <name>" sections (each with its own code), then two fixed
// closing headings. There is no repairCodingMarkdown/renderCodingAnswerMarkdown/
// buildCodingScaffold any more — see AnswerValidator.ts's validateCodingMarkdown
// doc comment for why a variable-shape answer isn't deterministically repaired.

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  planAnswer,
  isCodingAnswerType,
  shouldScaffold,
  validateCodingMarkdown,
  validateAnswerStructure,
  CODING_CONTRACT,
  CODING_CONTRACT_TINY,
  CODING_OPENING_HEADING,
  CODING_CLOSING_SECTIONS,
  CODING_APPROACH_HEADING_RE,
} from '../../../dist-electron/electron/llm/index.js';

const planFor = (question, source = 'what_to_answer') => planAnswer({
  question,
  source,
  speakerPerspective: source === 'what_to_answer' ? 'interviewer' : 'user',
});

// A single-approach well-formed answer — the common case ("many problems
// need just ONE approach because the first natural idea IS already optimal").
const SINGLE_APPROACH_ANSWER = `## Understanding the Problem

We need to check whether a number is even or odd and return the result.

## Approach 1: Modulo

The most direct idea is to check the remainder when dividing by 2.

\`\`\`python
def is_even(n):
    return n % 2 == 0
\`\`\`

## Complexity

Time Complexity: O(1) because it's a single operation.
Space Complexity: O(1) because no extra storage is used.

## Interviewer Follow-up Points

- Negative numbers
- Non-integer input`;

// A two-approach well-formed answer — brute force, then an optimization.
const TWO_APPROACH_ANSWER = `## Understanding the Problem

We need to find two numbers in an array that sum to a target value.

## Approach 1: Brute Force

The first idea is to check every pair directly.

\`\`\`python
def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
\`\`\`

This is O(n^2), which is too slow for large inputs.

## Approach 2: Hash Map

I'm repeatedly searching for the complement, so I can store what I've already seen.

\`\`\`python
def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
\`\`\`

## Complexity

Time Complexity: O(n) because each element is visited once.
Space Complexity: O(n) because of the hash map.

## Interviewer Follow-up Points

- Duplicate values
- No valid pair exists`;

// ── 1. Single source of truth ───────────────────────────────────────────────
describe('canonical coding contract', () => {
  test('CODING_OPENING_HEADING and CODING_CLOSING_SECTIONS are the fixed anchors', () => {
    assert.equal(CODING_OPENING_HEADING, 'Understanding the Problem');
    assert.deepEqual([...CODING_CLOSING_SECTIONS], ['Complexity', 'Interviewer Follow-up Points']);
  });
  test('CODING_APPROACH_HEADING_RE matches a numbered approach heading and captures the number', () => {
    assert.match('## Approach 1: Brute Force', CODING_APPROACH_HEADING_RE);
    assert.match('## Approach 2', CODING_APPROACH_HEADING_RE);
    assert.doesNotMatch('## Approach', CODING_APPROACH_HEADING_RE); // must be numbered
    const m = '## Approach 3: Two Pointers'.match(CODING_APPROACH_HEADING_RE);
    assert.equal(m?.[1], '3');
  });
  test('CODING_CONTRACT contains the fixed anchors and an approach-numbering rule', () => {
    assert.ok(CODING_CONTRACT.includes(`## ${CODING_OPENING_HEADING}`), 'missing opening heading');
    assert.match(CODING_CONTRACT, /##\s+Approach\s+1/, 'missing a numbered approach example');
    for (const s of CODING_CLOSING_SECTIONS) {
      assert.ok(CODING_CONTRACT.includes(`## ${s}`), `contract missing ## ${s}`);
    }
  });
  test('CODING_CONTRACT forbids starting with code and describes a discovery narrative', () => {
    assert.match(CODING_CONTRACT, /Do NOT start .*code/i);
    assert.match(CODING_CONTRACT, /discovery narrative/i);
  });
  test('CODING_CONTRACT instructs only adding another approach when a real limitation justifies it', () => {
    assert.match(CODING_CONTRACT, /genuinely need just|no worse approach exists/i);
  });
  // Live regression (Two Sum): the model skipped straight to "Approach 1: Hash
  // Map" and only mentioned brute force as a follow-up-points afterthought —
  // the exact "already knew the answer" pattern this contract exists to
  // prevent, on the most textbook case for it. Root cause: the original
  // "skip if unnatural" escape valve let the model treat a well-known optimal
  // solution as license to skip the discovery narrative entirely.
  test('CODING_CONTRACT says familiarity with the optimal solution is never a reason to skip Approach 1', () => {
    assert.match(CODING_CONTRACT, /familiarity with the optimal solution is NEVER a reason to skip/i);
  });
  test('CODING_CONTRACT forbids folding a real brute-force narrative into follow-up points instead of its own Approach', () => {
    assert.match(CODING_CONTRACT, /never fold a real .*brute force.* narrative into follow-up points/i);
  });
  // Live regression (2026-08-xx, detailed follow-up spec): the model recognized
  // the hash-map pattern and announced it by name instead of reasoning toward
  // it from an observation about repeated/wasted work. Closed with an explicit
  // banned-phrase list — the same "closed vocabulary" technique already used
  // successfully for human_voice's corporate-filler/AI-tell bans.
  test('CODING_CONTRACT bans announcing a memorized-sounding answer by name', () => {
    for (const phrase of ['the optimal approach is', 'the ideal solution is', 'we can simply use', 'obviously', 'clearly']) {
      assert.ok(CODING_CONTRACT.toLowerCase().includes(phrase), `missing banned phrase: ${phrase}`);
    }
    assert.match(CODING_CONTRACT, /NEVER the technique's name/i);
  });
  test('CODING_CONTRACT frames the reasoning chain: why it works, then the specific repeated/wasted work', () => {
    assert.match(CODING_CONTRACT, /briefly explain why it works/i);
    assert.match(CODING_CONTRACT, /identify the SPECIFIC repeated or wasted work/i);
  });
  // Live regression (Two Sum, 3Sum, Merge K Lists, 2026-08-xx): real answers
  // kept editorializing about the required complexity class inside
  // "Understanding the Problem" ("input size up to 3000, which means an
  // O(n^3) approach will be too slow") even after a first, abstract-only fix
  // attempt. Closed with an explicit WRONG/RIGHT example this time — the same
  // technique that already works reliably for em-dash/semicolon bans below.
  test('CODING_CONTRACT forbids drawing a complexity/approach conclusion inside Understanding the Problem, with a worked example', () => {
    assert.match(CODING_CONTRACT, /plain facts ONLY/);
    assert.match(CODING_CONTRACT, /No Big-O, no "too slow"/i);
    assert.match(CODING_CONTRACT, /WRONG: "\.\.\.input size up to 3000, so an O\(n\^3\) approach will be too slow\."/);
  });
  // Live regression (3Sum, Merge K Lists): Approach 2 kept opening with the
  // technique's name ("If I sort the array first, I can use two pointers...",
  // "I can pair up the lists and merge them in rounds, similar to merge
  // sort.") even after the first abstract-only fix. Closed with a worked
  // example pulled directly from the actual failure.
  test('CODING_CONTRACT forbids Approach 2 from opening with the technique name, with a worked example', () => {
    assert.match(CODING_CONTRACT, /WRONG: "If I sort the array first, I can use two pointers/);
    assert.match(CODING_CONTRACT, /RIGHT: "I keep re-scanning for the same value/);
  });
  // Live regression (3Sum, then recurring on Next Permutation): Approach 1
  // (brute force) was described in prose only, with no code block at all —
  // a real structural violation the validator would catch (missing "Approach
  // code block"), but the model needs a harder instruction to stop producing
  // it in the first place. The Next Permutation recurrence specifically
  // rationalized "generate all permutations, sort them" as too simple to
  // need real code — the instruction now names that exact trap.
  test('CODING_CONTRACT forbids describing an approach without its own code, with no exceptions', () => {
    assert.match(CODING_CONTRACT, /ends with its OWN complete, runnable code/i);
    assert.match(CODING_CONTRACT, /generate all permutations/i);
    assert.match(CODING_CONTRACT, /is a format failure, not an acceptable shortcut/i);
    assert.match(CODING_CONTRACT_TINY, /generate all permutations/i);
  });
  test('CODING_CONTRACT and its tiny variant both reject the LeetCode-editorial framing', () => {
    assert.match(CODING_CONTRACT, /not a LeetCode editorial/i);
    assert.match(CODING_CONTRACT_TINY, /not a LeetCode editorial/i);
  });
  test('tiny contract names the opening heading, approach pattern, and both closing sections', () => {
    assert.ok(CODING_CONTRACT_TINY.includes(`"## ${CODING_OPENING_HEADING}"`));
    assert.match(CODING_CONTRACT_TINY, /Approach N/);
    for (const s of CODING_CLOSING_SECTIONS) {
      assert.ok(CODING_CONTRACT_TINY.includes(`"## ${s}"`), `tiny contract missing ## ${s}`);
    }
  });
});

// ── 2. validateCodingMarkdown accepts well-formed discovery-narrative answers ─
describe('validateCodingMarkdown accepts well-formed answers', () => {
  test('a single-approach answer (already optimal, no second approach needed) passes', () => {
    const v = validateCodingMarkdown(SINGLE_APPROACH_ANSWER);
    assert.equal(v.ok, true, `should pass; missing=${v.missingSections}`);
    assert.deepEqual(v.missingSections, []);
    assert.equal(v.hasCodeBlock, true);
    assert.equal(v.hasComplexity, true);
  });
  test('a two-approach answer (brute force then optimized) passes', () => {
    const v = validateCodingMarkdown(TWO_APPROACH_ANSWER);
    assert.equal(v.ok, true, `should pass; missing=${v.missingSections}`);
    assert.deepEqual(v.missingSections, []);
  });
  test('validateCodingMarkdown never repairs — repaired is always undefined', () => {
    assert.equal(validateCodingMarkdown(SINGLE_APPROACH_ANSWER).repaired, undefined);
    assert.equal(validateCodingMarkdown('garbage, not even close').repaired, undefined);
  });
});

// ── 3. validateCodingMarkdown rejects malformed answers (log-only, no repair) ─
describe('validateCodingMarkdown rejects malformed answers', () => {
  test('code-first answer is invalid', () => {
    const v = validateCodingMarkdown('```python\nprint(1)\n```\n## Understanding the Problem\nx');
    assert.equal(v.ok, false, 'code-first must fail');
    assert.equal(v.repaired, undefined);
  });
  test('missing the opening heading is invalid', () => {
    const noOpening = TWO_APPROACH_ANSWER.replace('## Understanding the Problem', '## Problem Overview');
    const v = validateCodingMarkdown(noOpening);
    assert.equal(v.ok, false);
    assert.ok(v.missingSections.includes(CODING_OPENING_HEADING));
    assert.equal(v.repaired, undefined);
  });
  test('no Approach heading at all is invalid', () => {
    const v = validateCodingMarkdown(`## ${CODING_OPENING_HEADING}\n\nSome prose.\n\n## Complexity\n\nTime: O(1). Space: O(1).\n\n## Interviewer Follow-up Points\n\n- none`);
    assert.equal(v.ok, false);
    assert.ok(v.missingSections.includes('Approach'));
  });
  test('an approach heading with no code block is invalid', () => {
    const noCode = SINGLE_APPROACH_ANSWER.replace(/```python\n[\s\S]*?```/, '');
    const v = validateCodingMarkdown(noCode);
    assert.equal(v.ok, false);
    assert.ok(v.missingSections.includes('Approach code block'));
  });
  test('skipped approach numbering (1, then 3) is invalid', () => {
    const skipped = TWO_APPROACH_ANSWER.replace('## Approach 2: Hash Map', '## Approach 3: Hash Map');
    const v = validateCodingMarkdown(skipped);
    assert.equal(v.ok, false, 'non-consecutive approach numbers must fail');
  });
  test('closing sections before the last approach is invalid (wrong order)', () => {
    const md = [
      `## ${CODING_OPENING_HEADING}`, 'p',
      '## Complexity', 'Time: O(1). Space: O(1).',
      '## Approach 1: Direct', 'a\n```python\nx=1\n```',
      '## Interviewer Follow-up Points', '- f',
    ].join('\n\n');
    const v = validateCodingMarkdown(md);
    assert.equal(v.ok, false, 'Complexity before the last Approach must fail');
  });
  test('a genuinely malformed answer is invalid and yields NO repair (deliberate scope decision)', () => {
    const v = validateCodingMarkdown('just prose, no sections at all');
    assert.equal(v.ok, false);
    assert.ok(v.missingSections.length > 0);
    assert.equal(v.repaired, undefined, 'no deterministic repair for the variable-shape answer type');
  });
});

// ── 4. validateAnswerStructure gating ────────────────────────────────────────
describe('validateAnswerStructure gating', () => {
  test('non-coding answer types are not forced into the coding contract', () => {
    const v = validateAnswerStructure('identity_answer', 'My name is Alex.');
    assert.equal(v.ok, true);
    assert.deepEqual(v.missingSections, []);
  });
  test('dsa answer type validates the discovery-narrative contract, with no repair', () => {
    const v = validateAnswerStructure('dsa_question_answer', 'just prose, no sections');
    assert.equal(v.ok, false);
    assert.equal(v.repaired, undefined);
  });
  test('dsa answer type accepts a well-formed discovery-narrative answer', () => {
    const v = validateAnswerStructure('dsa_question_answer', TWO_APPROACH_ANSWER);
    assert.equal(v.ok, true, `should pass; missing=${v.missingSections}`);
  });
});

// ── 5. Planner routes coding problems correctly + scaffold flag ─────────────
describe('planAnswer coding routing + scaffold + isolation', () => {
  const codingQs = [
    'what is the code for odd even',
    'can you solve two sum',
    'reverse a linked list',
    'implement binary search',
    'valid parentheses',
    'write a function for fibonacci',
    'longest substring without repeating characters',
  ];
  for (const q of codingQs) {
    test(`"${q}" routes to a coding answer type`, () => {
      const plan = planFor(q);
      assert.ok(
        plan.answerType === 'coding_question_answer' || plan.answerType === 'dsa_question_answer',
        `"${q}" → ${plan.answerType}`,
      );
      assert.ok(isCodingAnswerType(plan.answerType));
      assert.equal(plan.shouldShowImmediateScaffold, true, 'coding should scaffold');
    });
    test(`"${q}" forbids resume/JD/negotiation/custom/reference`, () => {
      const plan = planFor(q);
      for (const layer of ['resume', 'jd', 'negotiation', 'custom_context', 'reference_files']) {
        assert.ok(plan.forbiddenContextLayers.includes(layer), `"${q}" must forbid ${layer}`);
      }
    });
  }

  test('system design + debugging also scaffold', () => {
    assert.equal(shouldScaffold('system_design_answer'), true);
    assert.equal(shouldScaffold('debugging_question_answer'), true);
    assert.equal(planFor('design a url shortener').shouldShowImmediateScaffold, true);
  });

  test('identity / non-coding do NOT scaffold', () => {
    assert.equal(shouldScaffold('identity_answer'), false);
    assert.equal(planFor('what is my name?', 'manual_input').shouldShowImmediateScaffold, false);
  });

  test('maxFirstUsefulTokenMs is set and aliases maxInitialLatencyMs', () => {
    const plan = planFor('two sum');
    assert.equal(typeof plan.maxFirstUsefulTokenMs, 'number');
    assert.equal(plan.maxFirstUsefulTokenMs, plan.maxInitialLatencyMs);
  });
});

// ── 6. CONTEXT-ISOLATION-CODING regression (release-blocking) ───────────────
describe('CONTEXT-ISOLATION-CODING', () => {
  test('coding plans never require resume/jd/negotiation layers', () => {
    for (const q of ['write code for odd even', 'two sum', 'binary search']) {
      const plan = planFor(q, 'manual_input');
      for (const layer of ['resume', 'jd', 'negotiation']) {
        assert.ok(!plan.requiredContextLayers.includes(layer), `"${q}" must not REQUIRE ${layer}`);
      }
    }
  });
});
