import type { AnswerType } from './AnswerPlanner';
import { CODING_OPENING_HEADING, CODING_APPROACH_HEADING_RE } from './codingContract';
import type { ExplicitCodingContract } from './codingFollowup';

export interface AnswerValidationResult {
  ok: boolean;
  missingSections: string[];
  hasCodeBlock: boolean;
  hasComplexity: boolean;
  repaired?: string;
}

const hasCodeBlock = (answer: string): boolean => /```[a-zA-Z0-9+#-]*\n[\s\S]+?```/.test(answer);
const hasLanguageTaggedCodeBlock = (answer: string): boolean => /```[a-zA-Z0-9+#-]+\n[\s\S]+?```/.test(answer);
// Big-O may be wrapped in LaTeX ($O(n)$ / \(O(n)\)), backticks (`O(n)`), or bare.
// Allow an optional opener (`$`, `\(`, backtick) between the label and the O(.
const hasComplexity = (answer: string): boolean =>
  /\bTime(?:\s+Complexity)?\s*:?\s*(?:`|\$|\\\()?\s*O\s*\(/i.test(answer)
  && /\bSpace(?:\s+Complexity)?\s*:?\s*(?:`|\$|\\\()?\s*O\s*\(/i.test(answer);

const isCodingType = (answerType: AnswerType): boolean =>
  answerType === 'coding_question_answer' || answerType === 'dsa_question_answer';

/**
 * "We never classified this", NOT "we determined this is not coding"
 * (2026-08-02). AnswerPlanner assigns `unknown_answer` from a single
 * condition — `if (!question) answerType = 'unknown_answer'` (AnswerPlanner.ts
 * ~:2527) — so it is the ABSENCE of a classification, reached whenever no
 * question could be extracted (empty transcript, Ambient AI Chat suppressing
 * STT, a screen/DOM-only press with no spoken or typed question).
 *
 * That distinction is load-bearing for the two scaffold detectors below. Their
 * entire premise (see detectAndExtractScaffoldMisfire's doc comment) is that a
 * real negotiation/behavioral/lecture answer "has no reason to ever contain"
 * coding vocabulary — true of answers KNOWN to be non-coding, false of
 * unclassified ones. A user who captures a coding problem from their browser
 * and presses "What should I say?" without ever asking a question out loud gets
 * `unknown_answer` plus a legitimate coding answer carrying exactly the
 * fingerprint these detectors treat as proof of contamination: `## Approach`,
 * `## Code`, `## Complexity`, `O(n)`. Both detectors then fire on a correct
 * answer — extraction discards the real content as scaffold, and the
 * unrecovered path replaces the whole answer via bounded regeneration.
 * Observed live 2026-08-01 (two of three presses destroyed).
 *
 * Treat unclassified as out of scope for both, matching the codebase's
 * established preference for shipping intact content over silently discarding
 * real answers. `general_meeting_answer` is deliberately NOT included: it is a
 * real classification reached only when a question EXISTS, and is pinned by
 * ScaffoldMisfireExtraction_2026_07_18.test.mjs.
 */
const isUnclassifiedType = (answerType: AnswerType): boolean =>
  answerType === 'unknown_answer';

const startsWithCodeLikeContent = (answer: string): boolean => {
  const trimmed = answer.trimStart();
  return /^```/.test(trimmed)
    || /^(def|function|class|const|let|var|public|private|import|from|SELECT\b|WITH\b)\b/i.test(trimmed);
};

const containsForbiddenCodingContext = (answer: string): boolean =>
  /\b(resume|job description|salary|compensation|negotiation|Natively|as an AI|AI assistant)\b/i.test(answer);

const extractFirstCodeBlock = (answer: string): { language: string; code: string; block: string } | null => {
  const match = answer.match(/```([a-zA-Z0-9+#-]*)\n([\s\S]+?)```/);
  if (!match) return null;
  return {
    language: match[1]?.trim() || 'python',
    code: match[2]?.trim() || '',
    block: match[0],
  };
};

/**
 * Validates the discovery-narrative shape (see codingContract.ts): opens with
 * the fixed opening heading, has at least one numbered "## Approach N"
 * heading (numbered consecutively from 1), every approach section carries its
 * own language-tagged code block, and the fixed closing headings both appear
 * after the last approach, in order.
 *
 * Deliberately no deterministic repair here (`repaired` is always
 * `undefined`). The old repair worked because six FIXED slots each have one
 * obvious canonical home for any recognized heading; a model-chosen number of
 * "Approach N: <name>" sections doesn't have that property, and a wrong
 * programmatic re-split could visibly mangle a correct answer. A validation
 * failure is surfaced via `missingSections` for the caller to log — see the
 * call sites in IntelligenceEngine.ts / ipcHandlers.ts.
 */
export const validateCodingMarkdown = (response: string): AnswerValidationResult => {
  const answer = response.trim();

  const firstHeadingMatch = answer.match(/^\s*#{1,3}\s+.+$/m);
  const opensCorrectly = Boolean(firstHeadingMatch)
    && new RegExp(`^\\s*##\\s+${CODING_OPENING_HEADING}\\b`, 'i').test(firstHeadingMatch![0]);

  const approachMatches = [...answer.matchAll(new RegExp(CODING_APPROACH_HEADING_RE.source, 'gim'))];
  const hasApproach = approachMatches.length > 0;
  const numbersInOrder = approachMatches.every((m, i) => Number(m[1]) === i + 1);

  const everyApproachHasCode = approachMatches.every((m, i) => {
    const start = (m.index ?? 0) + m[0].length;
    const end = approachMatches[i + 1]?.index ?? answer.length;
    return hasLanguageTaggedCodeBlock(answer.slice(start, end));
  });

  const lastApproachIdx = approachMatches.length ? (approachMatches[approachMatches.length - 1].index ?? -1) : -1;
  const complexityIdx = answer.search(/^##\s+Complexity\s*$/im);
  const followUpIdx = answer.search(/^##\s+Interviewer Follow-up Points\s*$/im);
  const closingOrderOk = complexityIdx >= 0 && followUpIdx >= 0
    && complexityIdx > lastApproachIdx && followUpIdx > complexityIdx;

  const missingSections: string[] = [];
  if (!opensCorrectly) missingSections.push(CODING_OPENING_HEADING);
  if (!hasApproach) missingSections.push('Approach');
  if (hasApproach && !everyApproachHasCode) missingSections.push('Approach code block');
  if (complexityIdx < 0) missingSections.push('Complexity');
  if (followUpIdx < 0) missingSections.push('Interviewer Follow-up Points');

  const codeBlock = hasCodeBlock(answer);
  const complexity = hasComplexity(answer);
  const startsWithCode = startsWithCodeLikeContent(answer);
  const hasTaggedBlock = hasLanguageTaggedCodeBlock(answer);
  const leaksContext = containsForbiddenCodingContext(answer);

  const ok = opensCorrectly
    && hasApproach
    && everyApproachHasCode
    && numbersInOrder
    && closingOrderOk
    && codeBlock
    && hasTaggedBlock
    && complexity
    && !startsWithCode
    && !leaksContext;

  return {
    ok,
    missingSections,
    hasCodeBlock: codeBlock,
    hasComplexity: complexity,
    // Deliberately no repair for this variable-shape answer type — see the
    // module-level function comment above.
    repaired: undefined,
  };
};

/**
 * Campaign 2 longsession run-022/023/024 finding (2026-07-18): MiniMax-M3
 * occasionally answers a NON-coding question (behavioral, JD-fit,
 * negotiation, technical-concept — confirmed via direct AnswerPlanner calls
 * that answerType routing is correct in every repro) using a coding-contract-
 * flavored planning scaffold ("## Approach" / "## Technique..." / etc. —
 * SHARED_CODING_RULES's headings are unconditionally present in every
 * system prompt, so the model has them in context regardless of question
 * type). `validateAnswerStructure` deliberately no-ops for non-coding
 * answerTypes (line ~407 below) since it only ever validates that a CODING
 * answer used the contract correctly — there was no counterpart check for
 * the opposite direction.
 *
 * Reading the FULL raw repro dumps (not just the truncated report preview)
 * showed the model does not always follow the rigid six-section contract —
 * it uses several loosely coding-scaffold-flavored variants — but in the
 * cases observed so far, a real, complete, well-formed answer is cleanly
 * present AFTER the scaffold, either following a trailing `---` separator
 * or under a final heading.
 *
 * Code-review 2026-07-18 HIGH fix: the first draft's trigger (≥2 headings
 * from a generic word list — Approach/Code/Complexity/Answer) was NOT a
 * strong enough signal on its own. A skeptic pass constructed several
 * plausible, real, substantive non-coding answers (negotiation framing,
 * behavioral narrative, document-grounded lecture answer echoing a paper's
 * own "Approach"/"Code" section names) that would have had real, valuable
 * content silently and unrecoverably discarded, since this function runs
 * BEFORE every other repair/validator in the pipeline and nothing
 * downstream has a signal that a truncation happened. Fixed by requiring a
 * CODING-SCAFFOLD-SPECIFIC fingerprint before extracting, not just any two
 * headings: either (a) one of the two headings that are near-unique to the
 * real coding contract and essentially never appear in a legitimate
 * non-coding structured answer ("Technique / Data Structure / Algorithm
 * Used", "Dry Run"), or (b) explicit complexity/Big-O notation
 * ("O(...)"/"Time Complexity"/"Space Complexity") in the discarded head —
 * both are things a real negotiation/behavioral/lecture answer has no
 * reason to ever contain. A generic Approach/Code/Complexity/Answer
 * heading pair ALONE no longer triggers extraction.
 */
// Additive (2026-08-xx, discovery-narrative rollout): "Understanding the
// Problem" is the new contract's opening heading. Every old alternative is
// kept unchanged so existing fixtures/behavior keep passing — this only adds
// recognition of the new shape's leak signature, it removes nothing.
const SCAFFOLD_MISFIRE_HEADING_RE = /^\s*#{1,3}\s*(?:Approach|Technique(?:\s*\/\s*Data Structure\s*\/\s*Algorithm Used)?|Code|Dry Run|Complexity|Interviewer Follow-up Points|Key Reasoning|Key Talking Points(?:\s*\([^)]*\))?|Answer(?:\s*\([^)]*\))?|Understanding the Problem)\s*$/im;

// Coding-scaffold-specific signals — near-unique to the real coding
// contract, essentially never appear in a legitimate non-coding answer.
// Deliberately NOT matching a numbered "Approach \d+" heading here, even
// though it's now the new contract's most distinctive marker: this fingerprint
// also gates non-coding answer types (system_design_answer,
// debugging_question_answer), which can legitimately use their own numbered
// "Approach 1 / Approach 2" comparison structure for real content — matching
// on that alone would risk discarding a correct answer. "Understanding the
// Problem" and the complexity-notation signal below are the two-pronged
// fingerprint instead.
const CODING_SCAFFOLD_UNIQUE_HEADING_RE = /^\s*#{1,3}\s*(?:Technique(?:\s*\/\s*Data Structure\s*\/\s*Algorithm Used)?|Dry Run|Understanding the Problem)\s*$/im;
const CODING_SCAFFOLD_COMPLEXITY_NOTATION_RE = /\bO\([^)]{1,20}\)|\b(?:Time|Space)\s+Complexity\b/i;

const hasCodingScaffoldFingerprint = (text: string): boolean =>
  CODING_SCAFFOLD_UNIQUE_HEADING_RE.test(text) || CODING_SCAFFOLD_COMPLEXITY_NOTATION_RE.test(text);

export const detectAndExtractScaffoldMisfire = (answerType: AnswerType, answer: string): string | null => {
  if (isCodingType(answerType)) return null; // that's validateAnswerStructure's job
  if (isUnclassifiedType(answerType)) return null; // no classification ⇒ premise doesn't hold
  const text = String(answer || '');
  if (!text.trim()) return null;

  const headingMatches = [...text.matchAll(new RegExp(SCAFFOLD_MISFIRE_HEADING_RE.source, 'gim'))];
  if (headingMatches.length < 2) return null; // not a strong enough structural signal
  if (!hasCodingScaffoldFingerprint(text)) return null; // generic headings alone are not enough

  // Pattern A: a trailing `---`-separated block after the scaffold (A10's
  // shape) — take everything after the LAST standalone `---` line. Only the
  // HEAD (the discarded portion) needs the fingerprint above — the tail is
  // the real answer being recovered, so it correctly does NOT need to
  // contain coding vocabulary itself.
  const separatorMatch = [...text.matchAll(/^\s*---\s*$/gim)].pop();
  if (separatorMatch && separatorMatch.index !== undefined) {
    const head = text.slice(0, separatorMatch.index);
    const tail = text.slice(separatorMatch.index + separatorMatch[0].length).trim();
    if (hasCodingScaffoldFingerprint(head) && tail.length >= 20 && !SCAFFOLD_MISFIRE_HEADING_RE.test(tail.split('\n')[0])) {
      return tail;
    }
  }

  // Pattern B: content under the LAST recognized heading, when that heading
  // itself reads like a final-answer marker (C12's shape: "## Answer
  // (spoken, ~22s)"). Only trust this when the heading text itself signals
  // "this is the actual answer" — NOT for a generic last heading like
  // "## Interviewer Follow-up Points" (A17's shape), which is real content
  // but not a clean single answer block, so this function intentionally
  // returns null for that case rather than guessing. The discarded HEAD
  // (everything before this heading) must carry the fingerprint, mirroring
  // Pattern A.
  const lastHeading = headingMatches[headingMatches.length - 1];
  if (lastHeading.index !== undefined && /answer/i.test(lastHeading[0])) {
    const head = text.slice(0, lastHeading.index);
    const tail = text.slice(lastHeading.index + lastHeading[0].length).trim();
    if (hasCodingScaffoldFingerprint(head) && tail.length >= 20) return tail;
  }

  // Pattern C: content under a trailing BOLD-TEXT final-answer marker,
  // e.g. "**Direct Answer:**" (run-026 C15's shape — the model used real
  // `## ` headings for the scaffold portion but switched to a bold-text
  // marker for the final answer instead of another `## ` heading, so
  // Pattern B's line-start-heading match never fired even though the exact
  // same "fingerprinted scaffold, then a clean final answer" shape is
  // present).
  //
  // Code-review 2026-07-18 HIGH fix: the first draft's regex
  // (`\*\*[^*\n]*answer[^*\n]*\*\*`) matched ANY bold-wrapped text on its own
  // line merely CONTAINING "answer" anywhere — no closed vocabulary, unlike
  // Pattern B's heading match (which can only ever match
  // SCAFFOLD_MISFIRE_HEADING_RE's short, fixed word list). A skeptic pass
  // constructed a real answer containing its own internal bold rhetorical
  // aside mid-narrative ("**So what was the answer that finally worked?**")
  // and proved everything before it — genuine, valuable answer content, not
  // scaffold — would be silently discarded, since `.pop()` always takes the
  // LAST such match and the true scaffold earlier in the text still
  // satisfies the fingerprint gate regardless of where the wrong split
  // point lands. Fixed by restricting the marker to a closed set of short,
  // label-shaped phrasings (mirroring Pattern B's own closed-vocabulary
  // discipline exactly, not just its stated intent) — a marker must be
  // ONLY a label like "Direct Answer" / "Final Answer" / "Answer (spoken)",
  // never an arbitrary sentence or question that happens to contain the
  // word "answer".
  const BOLD_ANSWER_MARKER_RE = /^\s*\*\*\s*(?:direct|final|spoken|the)?\s*answer\s*(?:\([^)]{0,40}\))?\s*:?\s*\*\*:?\s*$/im;
  const boldMarkerMatch = [...text.matchAll(new RegExp(BOLD_ANSWER_MARKER_RE.source, 'gim'))].pop();
  if (boldMarkerMatch && boldMarkerMatch.index !== undefined) {
    const head = text.slice(0, boldMarkerMatch.index);
    const tail = text.slice(boldMarkerMatch.index + boldMarkerMatch[0].length).trim();
    if (hasCodingScaffoldFingerprint(head) && tail.length >= 20 && !SCAFFOLD_MISFIRE_HEADING_RE.test(tail.split('\n')[0])) {
      return tail;
    }
  }

  return null;
};

/**
 * Detection-only signal for scaffold contamination detectAndExtractScaffoldMisfire
 * could not cleanly recover from (campaign2 longsession run-039 script-a/c
 * investigation, 2026-07-19): presses A4/A5/C9 all carry the same coding-
 * scaffold fingerprint (a "Technique / Data Structure / Algorithm Used"
 * heading and/or O(...)/complexity notation) as every case
 * detectAndExtractScaffoldMisfire already handles, but the real content sits
 * under a heading NONE of that function's extraction patterns recognize
 * (e.g. A5's "## STAR story, Long-Tail aggregation at Datadog" — a model-
 * invented heading, not one of the fixed scaffold/answer labels) — so
 * extraction returns null even though the contamination is real and severe
 * (G3 judge on all three: answersQuestion=false, noMetaTalk=false, reason
 * cites literal "## Approach" / meta-commentary leakage). A 5th sample from
 * the same investigation (C8) is a different shape entirely — a fabricated
 * multi-turn [INTERVIEWER]/[APPLICANT]/[ASSISTANT] transcript ending in the
 * exact isNonAnswerSentinel string, with no coding fingerprint at all — NOT
 * covered by this detector (that shape has no scaffold heading to key off
 * of; it needs a different signal, and already partially has one: it ends in
 * the sentinel string IntelligenceEngine.isNonAnswerSentinel independently
 * catches).
 *
 * With only 5 real repros already surfacing 3+ distinct heading shapes,
 * hand-rolling a 4th/5th/Nth extraction pattern per new shape does not
 * generalize — the same lesson already learned building the answer-
 * relevance guard (see its own doc comment on phrase-matching not
 * generalizing). This function intentionally does NOT attempt extraction;
 * it only answers "is this text scaffold-contaminated AND did surgical
 * extraction already fail on it" so a caller can fall back to a bounded
 * regeneration (the same repair mechanics the answer-relevance guard and
 * profile-repair guard already use) instead of either shipping the raw
 * scaffold-and-meta-commentary text or attempting a brittle new regex.
 */
export const hasUnrecoveredScaffoldContamination = (answerType: AnswerType, answer: string): boolean => {
  if (isCodingType(answerType)) return false;
  if (isUnclassifiedType(answerType)) return false; // no classification ⇒ premise doesn't hold
  const text = String(answer || '');
  if (!text.trim()) return false;
  const headingMatches = [...text.matchAll(new RegExp(SCAFFOLD_MISFIRE_HEADING_RE.source, 'gim'))];
  if (headingMatches.length < 2) return false;
  if (!hasCodingScaffoldFingerprint(text)) return false;
  return detectAndExtractScaffoldMisfire(answerType, text) === null;
};

export const validateAnswerStructure = (
  answerType: AnswerType,
  answer: string,
  // When the user gave an EXPLICIT format constraint ("code only", "give the
  // complexity", "dry run this", "explain without code"), the default DSA
  // discovery-narrative template MUST NOT be enforced — that was the bug where
  // "code only" got a full template force-injected by repair (task Phase 11).
  // For an explicit contract we only sanity-check the user's REQUESTED shape
  // and never rewrite into the default structure.
  explicitContract: ExplicitCodingContract = null,
): AnswerValidationResult => {
  if (!isCodingType(answerType)) {
    return {
      ok: true,
      missingSections: [],
      hasCodeBlock: hasCodeBlock(answer),
      hasComplexity: hasComplexity(answer),
    };
  }

  if (explicitContract) {
    return validateExplicitCodingContract(explicitContract, answer);
  }

  // dsa_question_answer (named algorithm problems: "reverse a linked list")
  // keeps the six-section validator. coding_question_answer (general
  // implementation: "write a React stopwatch") goes through the lighter
  // impl validator that only requires a code block and corrects a wrong
  // fence tag (the canonical bug: model fences JSX as ```python).
  if (answerType === 'coding_question_answer') {
    return validateImplAnswer(answer);
  }

  return validateCodingMarkdown(answer);
};

/**
 * Light validator for general implementation answers (coding_question_answer).
 * Only requires a language-tagged code block. Detects and repairs JSX/React
 * code that the model misfenced as ```python — a contract-induced error from
 * the old CODING_CONTRACT that always said "language tag ```python".
 */
const validateImplAnswer = (answer: string): AnswerValidationResult => {
  const trimmed = (answer || '').trim();
  const codeBlock = extractFirstCodeBlock(trimmed);
  if (!codeBlock) {
    return { ok: false, missingSections: ['Code'], hasCodeBlock: false, hasComplexity: false };
  }

  const isJsx = /\bimport\s+React\b|\buseState\s*\(|\buseEffect\s*\(|\buseRef\s*\(|\bclassName\s*=|<[A-Z][a-zA-Z]*[\s/>]/.test(codeBlock.code);
  // Note: codeBlock.language defaults to 'python' when the fence had no tag
  // (see extractFirstCodeBlock). Treat empty/undefined as "no tag" so an
  // untagged JSX fence still triggers repair — empty-tag is as wrong as
  // mis-tagging as python.
  const langRaw = (codeBlock.language || '').toLowerCase();
  const wrongTag = isJsx && langRaw !== 'tsx' && langRaw !== 'jsx';
  if (wrongTag) {
    // Build the actual opening-fence substring from the matched block (NOT
    // from codeBlock.language — the language is the *normalized* tag and may
    // differ from the literal opening). The block begins with ```, optional
    // tag, then \n. Replace just that prefix with ```tsx\n so the body is
    // untouched.
    const openingMatch = codeBlock.block.match(/^```([^\n]*)\n/);
    const actualOpening = openingMatch ? openingMatch[0] : '```\n';
    const fixed = trimmed.replace(actualOpening, '```tsx\n');
    return { ok: false, missingSections: [], hasCodeBlock: true, hasComplexity: false, repaired: fixed };
  }

  return { ok: true, missingSections: [], hasCodeBlock: true, hasComplexity: hasComplexity(trimmed) };
};

/**
 * Validate (but do NOT template-repair) a coding answer that the user explicitly
 * constrained. The only "repair" we ever do here is the narrow, honest case where the
 * user asked for CODE ONLY and the model still wrapped it in prose/headings: we strip
 * to the first fenced code block. Every other explicit shape is accepted as-is — the
 * user's instruction wins over the default template. Never forces six sections.
 */
export const validateExplicitCodingContract = (
  explicitContract: ExplicitCodingContract,
  answer: string,
): AnswerValidationResult => {
  const trimmed = (answer || '').trim();
  const codeBlock = extractFirstCodeBlock(trimmed);

  if (explicitContract === 'code_only') {
    // Accept a clean single fenced block. If the model added prose/headings around
    // it, reduce to just the code (honoring "code only"). If there is no code block
    // at all, leave it alone (don't fabricate) — the contract prompt already told the
    // model what to do; a missing block is a model failure repair can't invent past.
    const onlyCode = codeBlock ? codeBlock.block.trim() : trimmed;
    const hasExtraProse = codeBlock
      ? trimmed.replace(codeBlock.block, '').replace(/\s+/g, '').length > 0
      : false;
    const ok = Boolean(codeBlock) && !hasExtraProse && !/^#{1,3}\s/m.test(trimmed);
    return {
      ok,
      missingSections: [],
      hasCodeBlock: Boolean(codeBlock),
      hasComplexity: hasComplexity(trimmed),
      repaired: ok ? undefined : onlyCode,
    };
  }

  // complexity_only / dry_run_only / explain_only: accept the model's shape verbatim.
  // We never inject the six-section template; the user constrained the format.
  if (explicitContract === 'explain_only') {
    // "without code" — if the model still emitted ANY fenced block(s), strip them ALL
    // (a model can emit more than one; the first-block-only strip left blocks 2+ —
    // code-review LOW 2026-06-15). Collapse the blank runs the removal leaves.
    const ok = !codeBlock;
    const stripped = trimmed.replace(/```[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();
    return {
      ok,
      missingSections: [],
      hasCodeBlock: Boolean(codeBlock),
      hasComplexity: hasComplexity(trimmed),
      repaired: ok ? undefined : stripped,
    };
  }

  return {
    ok: true,
    missingSections: [],
    hasCodeBlock: Boolean(codeBlock),
    hasComplexity: hasComplexity(trimmed),
  };
};
