import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyIntent, planAnswer, validateAnswerStructure } from '../../../dist-electron/electron/llm/index.js';

const planFor = (question, source = 'what_to_answer') => planAnswer({
  question,
  source,
  speakerPerspective: source === 'what_to_answer' ? 'interviewer' : 'user',
});

// Discovery-narrative shape: one fixed opening heading, one or more numbered
// "## Approach N" headings (each with its own code), then two fixed closing
// headings. No deterministic repair exists for this shape any more — see
// AnswerValidator.ts's validateCodingMarkdown doc comment.
const assertDiscoveryNarrativeContract = (answer) => {
  assert.match(answer, /^##\s+Understanding the Problem\b/, 'must open with Understanding the Problem');
  const approachMatches = [...answer.matchAll(/^##\s+Approach\s+(\d+)\b/gim)];
  assert.ok(approachMatches.length > 0, 'must have at least one numbered Approach heading');
  approachMatches.forEach((m, i) => assert.equal(Number(m[1]), i + 1, 'approach numbers must be consecutive from 1'));
  assert.doesNotMatch(answer.trim(), /^```/, 'must not start with a code fence');
  assert.match(answer, /```[a-zA-Z0-9+#-]+\n[\s\S]+?```/, 'must have a language-tagged code block');
  const complexityIdx = answer.search(/^##\s+Complexity\b/im);
  const followUpIdx = answer.search(/^##\s+Interviewer Follow-up Points\b/im);
  assert.ok(complexityIdx >= 0, 'must have a Complexity heading');
  assert.ok(followUpIdx > complexityIdx, 'Interviewer Follow-up Points must come after Complexity');
  assert.match(answer, /Time Complexity:\s*`?O\([^)]*\)`?/i);
  assert.match(answer, /Space Complexity:\s*`?O\([^)]*\)`?/i);
};

test('planAnswer detects terse DSA questions as dsa_question_answer', () => {
  const twoSum = planFor('Can you solve two sum?');
  assert.equal(twoSum.answerType, 'dsa_question_answer');
  assert.ok(twoSum.forbiddenContextLayers.includes('resume'));
  assert.ok(twoSum.forbiddenContextLayers.includes('jd'));
  assert.match(twoSum.responseTemplate, /## Understanding the Problem/);
  assert.match(twoSum.responseTemplate, /##\s+Approach\s+1/);
});

test('planAnswer detects system design and debugging answer types', () => {
  assert.equal(planFor('Design a scalable notification system').answerType, 'system_design_answer');
  assert.equal(planFor('How would you debug this production exception?').answerType, 'debugging_question_answer');
});

test('planAnswer routes identity and JD-fit questions with isolated context', () => {
  const identity = planFor('What is my name?');
  assert.equal(identity.answerType, 'identity_answer');
  assert.ok(identity.requiredContextLayers.includes('stable_identity'));
  assert.ok(identity.forbiddenContextLayers.includes('negotiation'));

  const jdFit = planFor('Why are you a good fit for this role?');
  assert.equal(jdFit.answerType, 'jd_fit_answer');
  assert.ok(jdFit.requiredContextLayers.includes('jd'));
  assert.ok(jdFit.forbiddenContextLayers.includes('negotiation'));
});

test('validateAnswerStructure accepts complete coding answer', () => {
  const answer = `## Understanding the Problem\n\nWe need to find two indices whose values sum to a target.\n\n## Approach 1: Hash Map\n\nUse a hash map to check complements as we scan, since checking every pair would be O(n^2).\n\n\`\`\`typescript\nfunction twoSum(nums: number[], target: number): number[] {\n  const seen = new Map<number, number>();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (seen.has(complement)) return [seen.get(complement)!, i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}\n\`\`\`\n\n## Complexity\n\nTime Complexity: O(n), because we scan once.\n\nSpace Complexity: O(n), because the map can store all numbers.\n\n## Interviewer Follow-up Points\n\n- Duplicates work because we check before insert.\n- Clarify whether to return indices or values.`;

  const result = validateAnswerStructure('dsa_question_answer', answer);
  assert.equal(result.ok, true, `should pass; missing=${result.missingSections}`);
  assert.deepEqual(result.missingSections, []);
  assert.equal(result.hasCodeBlock, true);
  assert.equal(result.hasComplexity, true);
  assertDiscoveryNarrativeContract(answer);
});

test('validateAnswerStructure flags an unstructured dsa answer, with no repair', () => {
  // Discovery-narrative validation applies to dsa_question_answer only (named
  // algorithm problems). coding_question_answer goes through the lighter impl
  // validator that accepts any tagged code block. There is no deterministic
  // repair for the variable-shape dsa answer any more — see
  // AnswerValidator.ts's validateCodingMarkdown doc comment.
  const result = validateAnswerStructure('dsa_question_answer', 'Use a hash map. ```ts\nconst x = 1;\n```');
  assert.equal(result.ok, false);
  assert.ok(result.missingSections.length > 0);
  assert.equal(result.repaired, undefined, 'no deterministic repair for this answer type');
});

test('classifyIntent prioritizes coding over generic example phrasing', async () => {
  const prompts = [
    'give me an example of a React component in TypeScript',
    'can you give a concrete implementation of binary search in Python?',
  ];

  for (const prompt of prompts) {
    const result = await classifyIntent(prompt, prompt, 0);
    assert.equal(result.intent, 'coding', `${prompt} classified as ${result.intent}`);
  }
});

test('planAnswer classifies required odd/even manual prompts as coding answers', () => {
  const prompts = [
    'what is the code for odd even',
    'odd even code',
    'odd even in python',
    'write code to check odd or even',
    'check whether a number is odd or even',
    'how to find if number is odd or even in python',
    'can you write code to check odd or even?',
    'Interviewer: Can you write code to check whether a number is odd or even?',
    'Interviewer: How would you check whether a number is odd or even?',
  ];

  for (const prompt of prompts) {
    const plan = planFor(prompt, 'manual_input');
    assert.ok(
      plan.answerType === 'coding_question_answer' || plan.answerType === 'dsa_question_answer',
      `${prompt} classified as ${plan.answerType}`,
    );
    assert.ok(plan.forbiddenContextLayers.includes('resume'), `${prompt} should forbid resume context`);
    assert.ok(plan.forbiddenContextLayers.includes('jd'), `${prompt} should forbid JD context`);
    assert.ok(plan.forbiddenContextLayers.includes('negotiation'), `${prompt} should forbid negotiation context`);
  }
});

test('validateAnswerStructure rejects code-first markdown, with no repair (deliberate scope decision)', () => {
  const badOddEven = `\`\`\`python
def is_even(number):
    return number % 2 == 0
\`\`\`

The approach uses the modulo operator \`%\`.`;

  // Discovery-narrative enforcement lives on dsa_question_answer only.
  const result = validateAnswerStructure('dsa_question_answer', badOddEven);

  assert.equal(result.ok, false);
  // A model-chosen number of "Approach N" sections has no single canonical
  // home the way six fixed slots did, so a wrong programmatic re-split could
  // visibly mangle a correct answer — validation is log-only for this shape.
  assert.equal(result.repaired, undefined, 'no deterministic repair for the variable-shape answer');
});

test('validateAnswerStructure requires the opening heading, numbered approaches, and closing order for dsa answers, with no repair', () => {
  const wrongOrder = `## Complexity

Time Complexity: O(1). Space Complexity: O(1).

## Understanding the Problem

Check whether a number is even or odd.

## Approach 1: Modulo

Use modulo.

\`\`\`python
def check_odd_even(num):
    return 'Even' if num % 2 == 0 else 'Odd'
\`\`\`

## Interviewer Follow-up Points

- Negative numbers also work in Python.`;

  // Ordering enforcement lives on dsa_question_answer only now.
  const result = validateAnswerStructure('dsa_question_answer', wrongOrder);

  assert.equal(result.ok, false, 'Complexity before the opening heading and the approach must fail');
  assert.equal(result.repaired, undefined, 'no deterministic repair for the variable-shape answer');
});

// ── coding_question_answer (general implementation) path ────────────────────
//
// coding_question_answer goes through validateImplAnswer (light validator):
// any tagged code block passes. JSX/React content fenced with the wrong tag
// (the canonical bug: model emits ```python on React code) is repaired to
// ```tsx. There is NO discovery-narrative enforcement — that lives on
// dsa_question_answer only. This path is untouched by the coding-contract
// redesign.

test('validateAnswerStructure accepts coding_question_answer with a tagged code block', () => {
  const reactCode = `Here's a stopwatch component.

\`\`\`tsx
import React, { useState } from "react";

export default function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  return <div>{elapsed}</div>;
}
\`\`\`

Uses useState to track elapsed time.`;

  const result = validateAnswerStructure('coding_question_answer', reactCode);
  assert.equal(result.ok, true);
  assert.equal(result.hasCodeBlock, true);
});

test('validateAnswerStructure repairs coding_question_answer that misfenced JSX as python', () => {
  const jsxAsPython = `\`\`\`python
import React, { useState } from "react";

export default function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  return <div>{elapsed}</div>;
}
\`\`\``;

  const result = validateAnswerStructure('coding_question_answer', jsxAsPython);
  assert.equal(result.ok, false);
  assert.ok(result.repaired, 'expected repaired fence tag');
  // Fence tag flipped from python to tsx, body untouched.
  assert.match(result.repaired ?? '', /```tsx\nimport React/);
  assert.doesNotMatch(result.repaired ?? '', /```python\nimport React/);
});

test('validateAnswerStructure repairs coding_question_answer with JSX in untagged fence', () => {
  // Empty fence tag is itself a fence problem — JSX content must be tagged
  // tsx for the renderer. validateImplAnswer detects JSX content and rewrites
  // the opening fence to ```tsx.
  const jsxNoTag = `\`\`\`
import React, { useState } from "react";
function Stopwatch() { const [t] = useState(0); return <div>{t}</div>; }
\`\`\``;

  const result = validateAnswerStructure('coding_question_answer', jsxNoTag);
  assert.equal(result.ok, false, 'JSX in untagged fence must trigger repair');
  assert.ok(result.repaired, 'expected repaired fence tag');
  assert.match(result.repaired ?? '', /```tsx\nimport React/);
});
