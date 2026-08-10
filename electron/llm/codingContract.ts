// electron/llm/codingContract.ts
//
// THE single source of truth for the coding/DSA answer structure. Every prompt
// surface and the validator import from here, so the shape can never drift
// apart across files again.
//
// History: the section spec was duplicated across prompts.ts (colon labels),
// tinyPrompts.ts (comma list), AnswerPlanner.ts (## headings), the assist
// prompt (### Dry Run), and AnswerValidator.ts (## headings). The model got
// contradictory instructions and the validator's `## ` check could reject the
// very format another prompt asked for. This module ends that.
//
// Shape: a genuine discovery narrative, not a fixed slot-filling template —
// one fixed opening heading, a VARIABLE number of numbered
// "## Approach N: <name>" sections (only as many as the problem actually
// warrants, often just one), then two fixed closing headings. The variable
// middle is why there's no flat section tuple: only the FIXED anchors are
// named constants below — "how many approaches" is a property of the
// answer, not the contract.
//
// Dependency-free on purpose (no imports) so it can be pulled into prompts.ts,
// AnswerPlanner.ts, AnswerValidator.ts, and tests without any cycle risk.

/** The one required opening heading, WITHOUT the markdown prefix. */
export const CODING_OPENING_HEADING = 'Understanding the Problem';

/** The required closing headings, in order, WITHOUT the markdown prefix. */
export const CODING_CLOSING_SECTIONS = ['Complexity', 'Interviewer Follow-up Points'] as const;

/**
 * Matches a numbered approach heading, e.g. "## Approach 1" or
 * "## Approach 2: Two Pointers". Capture group 1 is the number.
 */
export const CODING_APPROACH_HEADING_RE = /^##\s+Approach\s+(\d+)\b[^\n]*$/im;

/**
 * The full contract text injected into prompts. Imperative, model-facing.
 * Keep this the ONLY place the prose lives.
 */
export const CODING_CONTRACT = `CODING / DSA RESPONSE CONTRACT — a genuine discovery narrative like a candidate thinking out loud in an interview, not a LeetCode editorial and not a canned template. Output these markdown headings, in THIS order, nothing before the first heading:

## Understanding the Problem
- Restate what's returned, the input shape, and the constraints — plain facts ONLY. No Big-O, no "too slow"/"efficient", no hint at which approach the constraints rule in or out; that belongs in Approach 1.
WRONG: "...input size up to 3000, so an O(n^3) approach will be too slow." RIGHT: "...input size up to 3000." (stop there)

## Approach 1: <the FIRST, most direct idea — e.g. "Brute Force", "Check Every Pair", "Nested Loops">
- Start with the most direct idea, even when you already know a better one — familiarity with the optimal solution is NEVER a reason to skip this step. Reason toward it the way it would naturally occur first, briefly explain why it works, never staged as a strawman.
- Only skip straight to a single final approach when NO meaningfully worse alternative exists (e.g. the problem is inherently one linear scan, like parsing a string). Feeling "obvious" or "classic" is NOT a reason to skip it.
- THIS is where Big-O and "too slow" belong: state its complexity, then identify the SPECIFIC repeated or wasted work this problem's constraints make costly (e.g. "n up to 10^5 makes this O(n^2) too slow" or "I'm re-scanning for the same value every time") — never jump straight to naming the fix with no stated reason.
- Every approach heading — including this first one — ends with its OWN complete, runnable code in one fenced block with a language tag, even when the idea sounds simple enough to describe in one sentence ("generate all permutations," "check every pair," "recompute from scratch each time"). Prose describing an approach with no code block for it is a format failure, not an acceptable shortcut.

## Approach 2: <short name> (when a meaningfully worse Approach 1 exists — its limitation belongs here)
- The FIRST sentence is the observation that turns the wasted work you just found into an idea — NEVER the technique's name.
WRONG: "If I sort the array first, I can use two pointers to find the pair." RIGHT: "I keep re-scanning for the same value, so I can store what I've already seen instead."
- Then explain why the idea resolves the limitation, state its complexity, and give its own FULL code. If a further REAL limitation justifies it, repeat this pattern again — otherwise this is final.

(Add "## Approach N: <name>" sections ONLY as many times as the problem warrants — some genuinely need just ONE, because no worse approach exists. Never manufacture a fake limitation to pad the answer. Never fold a real "brute force" narrative into follow-up points instead of its own Approach.)

## Complexity
- Time Complexity: O(...), because ...
- Space Complexity: O(...), because ...
(For the final approach — earlier approaches' complexity already came up while explaining their limitations.)

## Interviewer Follow-up Points
- Syntax/built-ins, edge cases, assumptions, duplicates, boundaries, tradeoffs, or optimizations the interviewer might probe.

Never say "the optimal approach is," "the ideal solution is," "we can simply use," "obviously," or "clearly" — reason toward the idea, don't announce it. Sound like a strong engineer thinking in real time: confident, never faked hesitation, never unsure of DSA. Number Approach headings from 1, in order, never skipped. Do NOT start with code — \`## Understanding the Problem\` comes first. A missing/renamed fixed heading, an Approach heading with no code, or starting with code, is a format failure.`;

/**
 * A compact variant of the contract for tiny-model prompts where token budget
 * is tight but the SAME discovery-narrative shape must hold.
 */
export const CODING_CONTRACT_TINY = `Coding/DSA answers are a discovery narrative like a candidate thinking out loud, not a LeetCode editorial or template. Markdown headings, in order, nothing before the first: "## Understanding the Problem" (restate the problem/constraints as plain FACTS only, no complexity/approach conclusion yet), then one or more "## Approach N: <name>" sections from 1 — start with the most direct idea EVEN IF you know a better one (familiarity is never a reason to skip it), say why it works, then name the SPECIFIC repeated/wasted work that limits it; the NEXT approach's first sentence must be the observation that turns that wasted work into an idea, BEFORE naming the data structure/algorithm; every approach needs its own code block, no exceptions, even a one-sentence idea like "generate all permutations" or "check every pair" — a description alone is never enough; add another approach ONLY if a real limitation justifies it (some need just Approach 1) — then "## Complexity" (Time + Space for the final approach, each "O(...) because...") and "## Interviewer Follow-up Points". Never say "the optimal approach is," "obviously," or "clearly". Never start with code, never skip an approach's code, never fake uncertainty.`;

/**
 * Contract for GENERAL IMPLEMENTATION tasks (React components, scripts, utilities,
 * UI builds) that are NOT classic DSA / LeetCode / interview algorithm questions.
 * Used by `CODING_IMPL_TEMPLATE` in AnswerPlanner for `coding_question_answer`.
 *
 * Why a separate contract: the DSA discovery-narrative template (CODING_CONTRACT)
 * forces every coding answer into an interview-walkthrough shape (problem
 * restatement, numbered approaches each with their own reasoning and code,
 * complexity, follow-ups) with a python fence. That is wrong for "write a React stopwatch" or
 * "build me a CSV parser" — the user wants ready-to-run code, not an essay. This
 * contract keeps the no-leak / no-Natively rules but asks for code-first output
 * with the CORRECT language tag and a short explanation. The repair layer also
 * sniffs for JSX/React content and corrects a `python` fence to `tsx` defensively.
 */
export const CODING_CONTRACT_IMPL = `IMPLEMENTATION RESPONSE CONTRACT:
- Write the complete code in ONE fenced code block with the CORRECT language tag:
  - React / JSX / TSX → \`\`\`tsx
  - TypeScript (non-JSX) → \`\`\`typescript
  - JavaScript (non-JSX) → \`\`\`javascript
  - Python → \`\`\`python
  - SQL → \`\`\`sql
  (match the language the user asked for or implied)
- After the code, write a SHORT explanation (3–6 sentences) covering key design
  decisions and any non-obvious parts.
- Do NOT use the DSA interview discovery-narrative structure (## Understanding
  the Problem / numbered ## Approach N sections / ## Complexity / ##
  Interviewer Follow-up Points) unless the user explicitly asks for it.
- This is a complete, ready-to-run implementation — not an interview walkthrough.`;

/**
 * Optional verification-spec instruction. Appended to the coding prompt ONLY
 * when code-execution verification is enabled. Asks the model to emit a hidden
 * machine-readable test block AFTER all the sections so Natively can run the
 * code against test cases in the background. The block is stripped before the
 * answer is shown (see stripVerificationSpec) — the user never sees it.
 *
 * `input` is the ARGUMENT LIST for the entry function (a one-arg function still
 * uses a one-element array), and `expected` is the value it should return.
 */
export const CODING_VERIFICATION_INSTRUCTION = `After all the sections above, output a hidden test block EXACTLY in this form (it is removed before display, so the user never sees it — keep it strictly valid JSON):

<verification_spec>
{"entry":"<the function or method name in your FINAL approach's Code, e.g. twoSum>","language":"<python|javascript|java|cpp|...>","cases":[{"input":[<arg1>,<arg2>],"expected":<return value>}]}
</verification_spec>

Rules for the spec:
- "entry" MUST be the exact name of the function/method a caller would invoke in your FINAL, most-optimized approach's Code — never an earlier brute-force or intermediate approach's function. Verification only tests your final approach.
- "input" is the ARGUMENT LIST passed to that function, in order (wrap a single argument in a one-element array).
- Include EVERY example from the problem statement, PLUS 1-3 edge cases (empty input, duplicates, boundaries) you are confident about.
- Use only concrete JSON values (numbers, strings, booleans, arrays, objects, null). No code, no expressions, no comments.
- LINKED LISTS / BINARY TREES: if any argument or the return value is a linked list (ListNode) or binary tree (TreeNode), add "argTypes" and/or "retType" so the runner can build/compare them. Use "list" for a linked list, "tree" for a binary tree, "value" (or omit) otherwise. Encode a linked list as a plain array [1,2,3]; encode a binary tree in LeetCode LEVEL-ORDER with null for missing nodes, e.g. [3,9,20,null,null,15,7]. Example: \`{"entry":"reverseList","language":"python","argTypes":["list"],"retType":"list","cases":[{"input":[[1,2,3]],"expected":[3,2,1]}]}\`.
- SQL: if your Code is a SQL query, set "language":"sql" and OMIT "entry"/"cases". Instead provide "schema" (array of CREATE TABLE statements), "seeds" (array of INSERT statements), and "expected" (the result-set rows as {column: value} objects using your SELECT's output column names/aliases). Add "ordered":true ONLY if the problem requires a specific row order; otherwise omit it (rows compare order-insensitively). Write standard SQL that runs on SQLite. Only a single read-only SELECT is verified. Example: \`{"language":"sql","schema":["CREATE TABLE T(id INT, v INT)"],"seeds":["INSERT INTO T VALUES (1,10),(2,20)"],"expected":[{"id":2,"v":20}]}\`. If you cannot give reliable schema/seed/expected, emit \`{"language":"sql","schema":[],"seeds":[],"expected":[]}\` to skip verification rather than guess.
- If you genuinely cannot produce reliable expected outputs, output \`<verification_spec>{"entry":"<name>","language":"<lang>","cases":[]}</verification_spec>\` rather than guessing wrong values.`;

/**
 * The regex that finds the hidden spec block (for stash-and-strip). The close
 * tag is OPTIONAL: a truncated stream (max-tokens / network cutoff / model
 * error) can emit the opening tag with no close — we must still strip from the
 * opening tag to end-of-string so the raw spec never leaks into the displayed
 * or persisted answer. `[\s\S]*?` + the `(?:</verification_spec>|$)` alternation
 * strips a terminated block minimally, or an unterminated one to EOF.
 */
export const VERIFICATION_SPEC_RE = /\s*<verification_spec>[\s\S]*?(?:<\/verification_spec>|$)/i;

/**
 * Remove EVERY hidden <verification_spec> block from an answer before display.
 * A fresh GLOBAL regex is created per call (not the exported constant) so we
 * strip ALL blocks — a model that hallucinates a second/trailing spec must not
 * leak it — without the shared-`lastIndex` footgun of a module-level /g regex.
 * Idempotent and safe on answers that never had one.
 */
export const stripVerificationSpec = (answer: string): string =>
  typeof answer === 'string'
    ? answer.replace(/\s*<verification_spec>[\s\S]*?(?:<\/verification_spec>|$)/gi, '\n').trim()
    : answer;

/**
 * Stateful, streaming-safe suppressor for the hidden <verification_spec> block.
 * The spec is always emitted AFTER the six visible sections, so once we see the
 * opening tag (even partially, across chunk boundaries) we suppress it and
 * everything after it — the spec never reaches the UI mid-stream. Used per
 * stream in the WTA + chat coding paths. A small tail buffer holds back a
 * possible partial "<verification_spec" prefix until we know it isn't the tag.
 */
export class StreamingSpecStripper {
  private suppressing = false;
  private tail = '';
  private static readonly OPEN = '<verification_spec';
  // Longest prefix of OPEN we might be mid-emitting; hold back at most this much.
  private static readonly HOLD = StreamingSpecStripper.OPEN.length;

  push(chunk: string): string {
    if (this.suppressing) return '';
    let buf = this.tail + chunk;
    const idx = buf.indexOf(StreamingSpecStripper.OPEN);
    if (idx >= 0) {
      this.suppressing = true;
      this.tail = '';
      return buf.slice(0, idx); // emit text before the spec, drop the rest
    }
    // No full tag yet. Hold back a trailing slice that could be a partial tag so
    // we don't emit "<verification_sp" and then suppress the rest next chunk.
    const keep = Math.max(0, buf.length - StreamingSpecStripper.HOLD);
    const emit = buf.slice(0, keep);
    this.tail = buf.slice(keep);
    return emit;
  }

  /** Flush any safely-non-tag tail at stream end. */
  finish(): string {
    if (this.suppressing) return '';
    const out = this.tail;
    this.tail = '';
    return out;
  }
}
