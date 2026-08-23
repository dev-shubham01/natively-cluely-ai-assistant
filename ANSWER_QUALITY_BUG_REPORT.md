# Natively — Answer Quality Bug Report

**Date:** 2026-08-18
**Tree audited:** `c6355a97` ("dsa prompt fixed finalised version"), working tree clean except one untracked file
**Companion report:** https://claude.ai/code/artifact/983ddf2e-b480-4ab9-bc4d-90756bfdfd61

## How this fits with the other two documents

| Document | Role |
|---|---|
| `PROJECT_REVIEW.md` | breadth — architecture, security, cross-platform, what to keep |
| `PROJECT_ROADMAP.md` | **the plan of record** — phases, sequencing, definition of done |
| **this file** | depth — the defect inventory, empirically verified, with reproduction commands |

This report does not propose a competing plan. Every defect below maps to an existing roadmap phase in the final section.

**Findings here that are absent from both other documents** — all discovered by executing the compiled code rather than reading it:

**Two are not quality problems at all, and both outrank everything else:**

- **B-0** — "What is your code review process?" produces a refusal that **speaks the name "Natively" out loud to the interviewer.** A disclosure bug in a tool whose whole premise is discretion.
- **S-1 / S-2 / S-3** — the universal stream filter **actively corrupts correct model output**: `hi - lo` becomes `hi, lo` in prose, inline code adjacent to an em dash is replaced by invisible `U+0001` characters, and a fence marker split across chunks corrupts code *inside* the block. This runs on every stream on every surface, and there is no un-mutated copy.

**Then the routing layer:**

- **B-1** the canonical Two Sum problem statement receives no coding contract at all
- **B-3** 17% of 236 realistic interview questions match **no branch whatsoever**
- **B-9** `Design Twitter` / `Design Uber` / `design Splitwise` → generic fallback, because the pattern requires an article
- **B-10** a bare `\bcounter\b` sends concurrency questions to salary negotiation
- **B-11** "why did you choose X?" after a design answer forces the résumé in, inventing provenance
- **B-13** "Do **not** write code" is what selects the coding contract
- **B-17** design follow-ups never keep the design shape — the deepening half of the round
- **C-1** the `approach_first` style directive contradicts the DSA contract and wins on recency
- **E-1** templates mandate labels that post-processing then strips, leaving document-shaped prose
- **A-4** the 56-failure baseline is substantially orphaned tests asserting on reverted code

None of these are reachable by prompt authoring. Several are single-line fixes.

---

## Scope and method

This is an exhaustive defect inventory for the "answers don't sound like a real candidate" problem. Every finding below is tagged:

- **`[VERIFIED]`** — reproduced by executing the compiled code in `dist-electron/` or by running the project's own tooling. Repro commands included.
- **`[READ]`** — established by reading source; not executed.

Commands actually run for this report:

```bash
npm run typecheck:electron          # 1 error
npm run test:llm                    # 3231 tests, 56 fail, 4 cancelled, 26 skipped
git status --porcelain              # 1 untracked file, nothing else
git log -S systemDesignTask --all   # empty
git reflog                          # 10 resets in 18 entries
```

Plus ad-hoc Node scripts against `dist-electron` to exercise `planAnswer`, `classifyTurn`, `buildSystemPromptV2`, `formatAnswerPlanForPrompt`, `detectAnswerStyle`, and `compressToSpeakable` directly.

**A note on causality.** The single most important finding is not a code defect. It is that a `git reset` destroyed a session of work, the only surviving file was untracked (so the feature looked complete), and no test could detect the loss. Bugs B-1 through B-4 and E-1 through E-3 are *consequences* of that, not independent mistakes.

---

## Severity summary

| ID | Severity | Defect | Status |
|---|---|---|---|
| **A-1** | 🔴 Critical | `git reset` wiped the 2026-08-11 system-design session; untracked file is sole survivor | [VERIFIED] |
| **A-2** | 🔴 Critical | 10 resets in 18 reflog entries — systemic uncommitted-work loss | [VERIFIED] |
| **A-3** | 🔴 Critical | `npm test` fails at collection (orphaned import); CI red for a missing file | [VERIFIED] |
| **A-4** | 🔴 Critical | 56 tests fail on a clean checkout of HEAD — red is normalized, gates nothing | [VERIFIED] |
| **A-5** | 🟠 High | `typecheck:electron` fails — missing `premium` submodule | [VERIFIED] |
| **A-6** | 🟠 High | `benchmarks/` gitignored and absent → 26 npm scripts + the quality judge gone | [VERIFIED] |
| **B-0** | 🔴 **Critical** | **"your … code" questions produce a refusal that speaks the name "Natively" to the interviewer** | [VERIFIED] |
| **B-1** | 🔴 Critical | Canonical Two Sum problem statement → `general_meeting_answer`, **no coding contract** | [VERIFIED] |
| **B-2** | 🔴 Critical | On live V3 path, "walk me through your approach to \<DSA\>" → `PERSONAL_EXPERIENCE` | [VERIFIED] |
| **B-3** | 🔴 Critical | 17% of 236 interview questions match **no branch at all**; ~46% land on a wrong shape | [VERIFIED] |
| **B-4** | 🔴 Critical | V3 omits `dsaTask` → DSA narrative contract on every coding turn | [VERIFIED] |
| **B-5** | 🟠 High | LLD/machine-coding questions → distributed-systems document template | [VERIFIED] |
| **B-6** | 🟠 High | SQL query → DSA contract demanding multiple approaches + Big-O | [VERIFIED] |
| **B-7** | 🟠 High | DSA question phrased as "how would you approach…" → template that **forbids code** | [VERIFIED] |
| **B-8** | 🟡 Medium | `SYSTEM_DESIGN` question type is inert — attaches nothing | [READ] |
| **B-9** | 🔴 Critical | `Design Twitter` / `Design Uber` / `design Splitwise` → `general_meeting_answer` | [VERIFIED] |
| **B-10** | 🔴 Critical | Bare `\bcounter\b` in negotiation patterns → concurrency questions get a salary script | [VERIFIED] |
| **B-11** | 🔴 Critical | "why did you choose X?" after a design answer forces the résumé in → invented provenance | [VERIFIED] |
| **B-12** | 🟠 High | `build` / `create` / `make` absent from coding patterns → frontend lane dead | [VERIFIED] |
| **B-13** | 🟠 High | "Do **not** write code" triggers the coding route — negation inverts intent | [VERIFIED] |
| **B-14** | 🟠 High | `explain the Raft algorithm` / `what is a palindrome?` → full coding contract | [VERIFIED] |
| **B-15** | 🟠 High | "do you know what a deadlock is?" → self-rating from résumé, not a definition | [VERIFIED] |
| **B-16** | 🟠 High | `How would you shard the database?` → fallback; verb list has ~10 holes | [VERIFIED] |
| **B-17** | 🟠 High | Design follow-ups never keep the design shape — the deepening half of the round | [VERIFIED] |
| **B-18** | 🟠 High | Fallback lean pulls the résumé into neutral technical questions | [VERIFIED] |
| **B-19** | 🟡 Medium | SQL/frontend concept vocabulary absent → `INNER JOIN`, virtual DOM → fallback | [VERIFIED] |
| **B-20** | 🟡 Medium | The system-design exclusion at `:2627` is dead — an earlier branch pre-empts it | [VERIFIED] |
| **S-1** | 🔴 **Critical** | **Stream filter rewrites `hi - lo` to `hi, lo` — arithmetic stated wrong in every DSA answer** | [VERIFIED] |
| **S-2** | 🔴 **Critical** | **Inline code adjacent to an em dash is replaced by invisible `U+0001` control chars** | [VERIFIED] |
| **S-3** | 🔴 **Critical** | **Split fence markers desync tracking → corruption *inside* generated code blocks** | [VERIFIED] |
| **S-4** | 🟠 High | `$&` / `` $` `` / `$'` in code are treated as replacement patterns → mangled snippets | [VERIFIED] |
| **S-5** | 🟠 High | Any mention of `<verification_spec` truncates the answer to EOF | [VERIFIED] |
| **S-6** | 🟠 High | Regenerated coding answers ship the hidden spec block — wrong variable stripped | [READ] |
| **S-7** | 🟠 High | A provider dying mid-stream is ranked **first forever** (`ttftEma: 0`) | [VERIFIED] |
| **S-8** | 🟠 High | A whitespace-only first chunk discards a healthy provider for 30 s | [VERIFIED] |
| **S-9** | 🟠 High | Rate limits classified as `auth` → 300 s breaker, zero retries | [VERIFIED] |
| **S-10** | 🟠 High | Manual-chat fallback line truncated by 18 chars, or emitted blank | [VERIFIED] |
| **S-11** | 🟡 Medium | `CodingStreamGate` does not enforce its never-show-code-first guarantee | [VERIFIED] |
| **S-12** | 🟡 Medium | Inner TTFT budget (2.5 s) undercuts the documented outer budget (7 s) | [READ] |
| **S-13** | 🟡 Medium | `raceStreamWithDeadline`: speculative branch has no deadline or abort | [READ] |
| **S-14** | 🟡 Medium | Stalled streams persist truncated text as a complete answer, unmarked | [READ] |
| **C-1** | 🔴 Critical | `approach_first` style directive contradicts the DSA contract, with recency advantage | [VERIFIED] |
| **C-2** | 🟠 High | Five prompt layers give contradictory system-design orders; document wins 4–1 | [READ] |
| **C-3** | 🟠 High | `CHAT_LAYOUT` no longer defers to the system-design contract (reset casualty) | [VERIFIED] |
| **D-1** | 🔴 Critical | `temperature 0.2` + fixed `seed 7` for every interview answer | [READ] |
| **D-2** | 🔴 Critical | Humanizer denylist excludes every technical round by name | [VERIFIED] |
| **D-3** | 🟠 High | Live voice path never humanizes — behind a default-`false` flag | [READ] |
| **E-1** | 🟠 High | Templates mandate labels that post-processing then strips | [VERIFIED] |
| **E-2** | 🟠 High | `validateCodingMarkdown` detects format failures and ignores them | [READ] |
| **E-3** | 🟠 High | Three post-processing paths with materially different shaping | [READ] |
| **E-4** | 🟡 Medium | Six dead or no-op polish layers still exported and referenced | [READ] |
| **F-1** | 🔴 Critical | Multi-turn design state architecturally unreachable | [VERIFIED] |
| **F-2** | 🔴 Critical | Two conversation-continuity bugs live again after the reset | [VERIFIED] |
| **F-3** | 🟠 High | `[[INTERVIEWER_QUESTIONS]]` has no parser and never had a renderer | [VERIFIED] |
| **G-1** | 🟠 High | Zero coverage for machine coding, LLD, API design, SQL, frontend, concurrency | [VERIFIED] |
| **G-2** | 🟡 Medium | Prompt bloat: 330 prohibitions, 37 negative examples across 5 files | [VERIFIED] |
| **H-1** | 🟡 Medium | No lint script despite eslint plugins installed | [VERIFIED] |
| **H-2** | 🟡 Medium | CI is macOS-only — violates the repo's own cross-platform contract | [READ] |

---

## Part A — Repository and build health

### A-1 🔴 The system-design session was destroyed by `git reset` `[VERIFIED]`

The 8,347-token contract in `electron/llm/systemDesignContract.ts` is intact. Everything that connected it to the app is gone.

```bash
git status --porcelain
# ?? electron/llm/systemDesignContract.ts     ← the only line

git log -S systemDesignTask --all
# (empty — the activation flag was never committed)

git reflog | head -2
# c6355a97 HEAD@{0}: reset: moving to HEAD
# c6355a97 HEAD@{1}: commit: dsa prompt fixed finalised version   (11 Aug, 15:57)
```

The session ran the evening of 11 Aug — after that commit, never committed itself. **A reset does not touch untracked files**, so the one file not yet `git add`-ed survived while every tracked edit reverted. A later rebuild (`dist-electron`, 16 Aug) compiled the orphaned contract into `systemDesignContract.js` with no wiring near it, which is why the feature looks present on disk and does nothing at runtime.

| Piece | State | Evidence |
|---|---|---|
| Contract prose, 15 rounds | **survived** | untracked |
| `systemDesignTask` + 8 call sites | **gone** | absent from source, `dist-electron`, all history |
| `systemDesignContractBlock` | **gone** | no such function in `promptSystemV2.ts` |
| `CHAT_LAYOUT` deferral | **gone** | `promptSystemV2.ts:522` names only the coding contract |
| `INTERVIEWER_QUESTIONS_MARKER` + splitter | **gone** | no constant, no parser |
| `isLikelyAnswerToPendingQuestion` | **gone** | `resolveReference` has 3 triggers, not 4 |
| `clarificationRootQuestion` | **gone** | identifier absent from `conversation-state.ts` |
| Digit-entity guard at injection point | **gone** | guard only at `turn-classifier.ts:1191`, the wrong place |
| Rounds 13–15 regression tests | **gone** | anchored strings absent |

The file's own header comment still asserts two importers. It was accurate when written; the code it describes reverted and the comment, living in the untracked file, did not.

### A-2 🔴 Ten resets in eighteen reflog entries `[VERIFIED]`

```bash
git reflog | grep -c "reset: moving to"   # 10
```

This is a workflow pattern, not an accident. Reflog shows resets clustered at `HEAD@{5,6}`, `HEAD@{8,9,10,11,12}`, `HEAD@{14,15}`. Each one discarded uncommitted working-tree changes, and several left behind tests asserting on code that no longer exists (see A-4).

**Consequence:** every uncommitted change is one keystroke from unrecoverable, and there is no signal when it happens.

### A-3 🔴 `npm test` fails at collection `[VERIFIED]`

```
electron/llm/__tests__/AnswerQualityJudge2026_06_08.test.mjs:15
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '.../benchmarks/profile-intelligence/answer_quality_judge.ts'
```

That file is inside the `npm test` glob, so **`npm test`, `test:llm`, `ci:tier1`, and `test:ci` all fail** — and `npm test` is step 8 of `.github/workflows/build-smoke.yml:54`. A red build has stopped carrying information.

The orphaned test is also the only surviving specification of the deleted judge: it asserts `judgeAnswerDeterministic()` returned `overall_human_quality_score`, `speakability_score`, `confidence_score`, `grounding_score`, and flags `assistant_meta` / `wrong_voice` / `underclaiming` / `over_hedged` / `false_refusal` / `overclaiming`. **Read it before rebuilding the judge.**

### A-4 🔴 56 tests fail on a clean checkout of HEAD `[VERIFIED]`

```
# tests 3231
# pass 3145
# fail 56
# cancelled 4
# skipped 26
```

The working tree has no modifications, so this is HEAD's own state. Two failure classes:

**Missing `premium` submodule** — `.gitmodules` points at `natively-premium.git`; `premium/` is an empty directory. **53 test files** import through it.

```bash
grep -rl "premium/" --include="*.test.mjs" electron/ | wc -l   # 53
```

**Orphaned wiring assertions** — tests asserting on code that was reverted, the same pattern as A-1. Verified examples:

| Test assertion | Reality |
|---|---|
| "exactly 13 call sites use `_isCurrentStream`" | `grep -c "_isCurrentStream(" electron/ipcHandlers.ts` → **0** |
| "`ipcHandlers.ts` no longer defines its own `stripPriorAssistantTurns`" | still defined at `ipcHandlers.ts:120` |
| "imports `stripPriorAssistantTurns` from `./llm/conversationHistoryPolicy`" | it does not |

**Consequence — and this is the load-bearing one:** with 56 normalized failures, a *new* failure is invisible. This is precisely why the A-1 loss went unnoticed. Any regression gate must start from a green baseline.

### A-5 🟠 `typecheck:electron` fails `[VERIFIED]`

```
electron/services/resolveCompanySearchProvider.ts(11,37): error TS2307:
  Cannot find module '../../premium/electron/knowledge/CompanyResearchEngine'
```

One error, same root cause as A-4. Per prior notes the premium repo returns "Repository not found," so this is unrecoverable — the import needs a stub, a type shim, or deletion.

### A-6 🟠 `benchmarks/` is gitignored and absent `[VERIFIED]`

```bash
ls benchmarks            # No such file or directory
grep -n "^benchmarks/" .gitignore   # 369:benchmarks/
```

Gone with it: `answer_quality_judge.ts` (the voice judge), `harness.cjs` (which `verify:humanized-answers`, `verify:spoken-quality`, and `verify-current-answer-quality.mjs` all require), and the targets of **26 npm scripts** — every `benchmark:*`, `eval:meeting-notes`, and `ci:tier2` through `ci:tier4`.

What survived and is reusable: `scripts/humanized-answers-dataset.mjs` (80+ questions with expectation flags), `scripts/spoken-quality-dataset.mjs`, `electron/llm/__tests__/fixtures/promptV2BehaviorScenarios.json` (16 scenarios). Only the harness and judge are missing.

Also unrunnable: `tests/e2e-modes/llmJudge.mjs` and `tests/context-os-real-backend/llm-judge.mjs` both need `NATIVELY_API_BASE` (default `localhost:3000`), and `natively-api/` is an empty directory.

---

## Part B — Question routing (the largest source of bad answers)

There are **two independent classifiers with no shared taxonomy**:

| | `turn-classifier.ts` | `AnswerPlanner.ts` |
|---|---|---|
| Emits | 18 `QuestionType` | 38 `AnswerType` |
| Decides | which sources to retrieve | which template/contract |
| Prompt effect | one boolean (`codingTask`) | the full `<answer_contract>` |
| Live on | V3 path (**default enabled**) | legacy path |

Both are pure regex ladders — no LLM anywhere in either decision.

### B-1 🔴 The canonical Two Sum statement gets no coding contract `[VERIFIED]`

```bash
node -e "
const AP=require('./dist-electron/electron/llm/AnswerPlanner.js');
console.log(AP.planAnswer({question:'Given an array of integers, return indices of the two numbers such that they add up to a target'}).answerType);
"
# general_meeting_answer
```

`general_meeting_answer` → `GENERAL_TEMPLATE` → *"Answer naturally and directly. Use only relevant context. Keep it predictable and concise."*

And `voicePerspective: assistant_explanation` → *"Answer in a neutral, explanatory voice. **Do not roleplay as the candidate.**"*

The live V3 path is no better:

```bash
node -e "
const {classifyTurn}=require('./dist-electron/electron/context-intelligence/question/turn-classifier.js');
const {MODE_POLICIES}=require('./dist-electron/electron/context-intelligence/policies/mode-policy-registry.js');
console.log(classifyTurn({resolvedQuestion:'Given an array of integers, return indices of the two numbers such that they add up to a target',policy:MODE_POLICIES['technical-interview'],isFollowUp:false}).questionTypes);
"
# [ 'GENERAL_TECHNICAL' ]
```

`GENERAL_TECHNICAL` → `codingTask: false` → and the contract block is skipped entirely:

```bash
node -e "
const V2=require('./dist-electron/electron/llm/promptSystemV2.js');
const p=V2.buildSystemPromptV2({mode:'technical-interview',action:'what_to_say',tier:'cloud',codingTask:false});
console.log('coding_contract present:', /<coding_contract>/.test(p));
"
# coding_contract present: false
```

**Net effect for the single most common interview question in existence, pasted verbatim:** a 13,152-character prompt containing zero coding guidance, a template that says "keep it concise," and an instruction not to speak as the candidate. No approach structure, no required code block, no complexity analysis.

Bare `"two sum"` routes correctly on the legacy path (`dsa_question_answer`) but **still returns `GENERAL_TECHNICAL` on V3.** The named-problem regex is a hardcoded list; the actual problem statement matches nothing, and `looksLikeFormalProblemStatement` requires `Input:`/`Output:` structural markers that a spoken or pasted prose statement lacks.

### B-2 🔴 A DSA question routes to personal experience on the live path `[VERIFIED]`

```
"Walk me through your approach to finding two numbers that add up to a target"
  → V3:            [ 'PERSONAL_EXPERIENCE' ]
  → AnswerPlanner: general_meeting_answer
```

`PERSONAL_EXPERIENCE` drives V3's retrieval toward résumé and profile sources. An algorithm question becomes a question about the candidate's history. (On the legacy path `profileContextPolicy` is `forbidden`, so that path at least cannot leak résumé content — V3 has its own retrieval and does not consult `AnswerPlanner`'s layer rules.)

The trigger is the behavioral framing of "walk me through your…", which outranks all technical routing.

### B-3 🔴 Measured misroute rate: ~46% `[VERIFIED]`

Full battery run against `planAnswer` and `classifyTurn`. ❌ = wrong shape, ⚠️ = defensible but poor.

| Question | `AnswerType` | V3 `QuestionType` | |
|---|---|---|---|
| Two Sum, verbatim statement | `general_meeting` | `GENERAL_TECHNICAL` | ❌ |
| "finding two numbers that add up to a target" | `general_meeting` | — | ❌ |
| "Walk me through your approach to \<two sum\>" | `general_meeting` | `PERSONAL_EXPERIENCE` | ❌ |
| "How would you approach finding the two numbers…" | `technical_concept` | — | ❌ |
| "merge two sorted linked lists" | `general_meeting` | — | ❌ |
| "build a debounced search input in React" | `general_meeting` | `GENERAL_TECHNICAL` | ❌ |
| "how does the garbage collector work in Java" | `general_meeting` | — | ❌ |
| "what happens when you type a URL in the browser" | `general_meeting` | — | ❌ |
| "how would you scale this to a million users" | `technical_concept` | — | ❌ |
| "design a parking lot system" | `system_design` | `SYSTEM_DESIGN` | ❌ |
| "design a chess game using OOP" | `system_design` | `SYSTEM_DESIGN` | ❌ |
| "write a query to find the second highest salary" | `dsa_question` | `CODING_TASK` | ❌ |
| "design a REST API for a booking system" | `system_design` | `SYSTEM_DESIGN` | ⚠️ |
| "implement a thread-safe counter" | `coding_question` | `CODING_TASK` | ⚠️ |
| "explain your most challenging project" | `project_followup` | — | ⚠️ |
| "two sum" | `dsa_question` ✅ | `GENERAL_TECHNICAL` ❌ | ⚠️ |
| "reverse a linked list" | `dsa_question` ✅ | — | ✅ |
| "find the longest palindromic substring" | `dsa_question` ✅ | — | ✅ |
| "given a binary tree, return its level order traversal" | `dsa_question` ✅ | — | ✅ |
| "implement an LRU cache" | `dsa_question` ✅ | `CODING_TASK` | ✅ |
| "design a url shortener" | `system_design` ✅ | `SYSTEM_DESIGN` | ✅ |
| "the API returns 500 intermittently, how would you debug it" | `debugging_question` ✅ | — | ✅ |
| "tell me about a time you disagreed with your manager" | `behavioral_interview` ✅ | — | ✅ |
| "what are your salary expectations" | `negotiation` ✅ | — | ✅ |

**11 of 24 clearly wrong, 4 more marginal.** The pattern: routing works for *short canonical phrasings* and fails for *how interviewers actually speak* — full problem statements, "walk me through", "how would you approach", and any topic outside the hardcoded keyword lists.

Reproduce:

```bash
node -e "
const AP=require('./dist-electron/electron/llm/AnswerPlanner.js');
['Given an array of integers, return indices of the two numbers such that they add up to a target',
 'merge two sorted linked lists','build a debounced search input in React',
 'how does the garbage collector work in Java','what happens when you type a URL in the browser',
 'design a parking lot system','write a query to find the second highest salary'
].forEach(q=>console.log(AP.planAnswer({question:q}).answerType.padEnd(26),'|',q));
"
```

### B-4 🔴 V3 omits `dsaTask` → DSA narrative on every coding turn `[VERIFIED]`

Both V3 `personaBase` callbacks pass `codingTask` but not `dsaTask`:

- `electron/ipcHandlers.ts:1205`
- `electron/IntelligenceEngine.ts:2506`

`codingContractBlock` gates on `input.dsaTask !== false` (`promptSystemV2.ts:486`), so `undefined` selects the discovery narrative:

```bash
node -e "
const V2=require('./dist-electron/electron/llm/promptSystemV2.js');
const p=V2.buildSystemPromptV2({mode:'technical-interview',action:'what_to_say',tier:'cloud',codingTask:true});
console.log('DSA headings demanded:', /Understanding the Problem/.test(p));
"
# DSA headings demanded: true
```

**Effect:** on the primary live voice path, "write me a React stopwatch" or "implement a thread-safe counter" gets `## Understanding the Problem` / `## Approach 1` / `## Approach 2` / `## Complexity` / `## Interviewer Follow-up Points`. The `CODING_CONTRACT_IMPL` path is unreachable from V3.

### B-5 🟠 LLD / machine-coding questions get a distributed-systems document `[VERIFIED]`

"design a parking lot system" and "design a chess game using OOP" both → `system_design_answer` → `SYSTEM_DESIGN_TEMPLATE` (`AnswerPlanner.ts:363`):

```
Use exactly these sections:
Clarify Requirements:  /  High-Level Design:  /  Core Components:
Data Flow:  /  Scaling / Reliability:  /  Tradeoffs:  /  Follow-up Points:
```

These are class-design questions. The interviewer wants entities, responsibilities, relationships, and an interface — and gets "Data Flow" and "Scaling / Reliability" for a parking lot.

### B-6 🟠 SQL gets the DSA contract `[VERIFIED]`

"write a query to find the second highest salary" → `dsa_question_answer` → `CODING_CONTRACT`, which mandates a brute-force `## Approach 1`, an optimized `## Approach 2` with its own full code block, and `## Complexity` with time *and* space Big-O. For a single SQL statement. The contract's worked examples are Python-flavored throughout.

### B-7 🟠 A DSA question hits a template that forbids code `[VERIFIED]`

"How would you approach finding the two numbers that sum to a target?" → `technical_concept_answer` → `TECHNICAL_CONCEPT_TEMPLATE` (`AnswerPlanner.ts:421`):

> THIS IS A SPOKEN ANSWER. Output MUST be ONE short paragraph of plain sentences. It is WRONG if it contains ANY of these: … **a code block or a code example** …
> 2 to 4 sentences, usually 40 to 80 words.

The candidate is in a coding round and the tool is structurally prevented from producing code.

### B-0 🔴 A refusal that names your tool out loud to the interviewer `[VERIFIED]`

**This is a disclosure bug, not a quality bug. Fix it before anything else in this report.**

`SOURCE_CODE_EVIDENCE_PATTERNS` (`AnswerPlanner.ts:981`) contains:

```
/\b(what does |show me |whats )?(your|the natively|natively'?s)\s+(actual\s+|real\s+)?[\w ]*\bcode\b\s*(look|is|for|of)?/i
```

The `[\w ]*` permits **any words** between "your" and "code". This is the **third branch in the entire ladder**, ahead of everything.

```bash
node -e "
const AP=require('./dist-electron/electron/llm/AnswerPlanner.js');
['What is your code review process?','How do you keep your code clean?',
 'Do you write unit tests for your code?','Walk me through your code review checklist.'
].forEach(q=>{const p=AP.planAnswer({question:q});
  console.log(p.answerType, '|', p.profileContextPolicy, '|', q);});
"
# source_code_evidence_answer | required | What is your code review process?
# source_code_evidence_answer | required | How do you keep your code clean?
# source_code_evidence_answer | required | Do you write unit tests for your code?
# source_code_evidence_answer | required | Walk me through your code review checklist.
```

`SOURCE_CODE_EVIDENCE_TEMPLATE` (`AnswerPlanner.ts:478-486`) then hard-instructs, verbatim:

> If the exact source code is NOT loaded, say clearly: **"I don't have Natively's exact source code loaded in my current context, so I can't give you a repo-verifiable snippet."**

So an ordinary behavioural question — *"What's your code review process?"* — produces a reply that refuses to answer, **says the product name "Natively" aloud**, and uses unmistakable assistant phrasing ("loaded in my current context"). For a tool whose entire premise is that the interviewer does not know it is there, this is the worst available failure mode, and it fires on a question almost every engineering interview asks.

`What is your zip code?` also matches.

### B-9 🔴 `Design Twitter` is invisible to the system-design patterns `[VERIFIED]`

`SYSTEM_DESIGN_PATTERNS` (`AnswerPlanner.ts:752`) is `/\bsystem design\b|\bdesign (a|an|the)\b/i` — **it requires an article.** Company-name design prompts, the most common real phrasing, have none.

```
Design Twitter.                                  → general_meeting_answer   (no branch matched)
Design Uber.                                     → general_meeting_answer
design Splitwise                                 → general_meeting_answer
Low level design of a food delivery app          → general_meeting_answer
How would you design Instagram?                  → technical_concept_answer (40–80 words, no code)
design a Twitter clone                           → system_design_answer  ✅
```

The single word `a` flips the route. And the consequence compounds: `general_meeting_answer` also drops `shouldShowImmediateScaffold` from `true` to `false` and cuts `maxInitialLatencyMs` from 2500 to 1500 (`:2964-2968`) — so the biggest question of the interview is *budgeted* as a throwaway.

### B-10 🔴 A bare `\bcounter\b` routes concurrency questions to salary negotiation `[VERIFIED]`

`NEGOTIATION_PATTERNS` (`:789`) includes `/\bcounter(?:\s*-?\s*offer|ing|\b)/` — the third alternative is a **bare `\bcounter\b`**. Negotiation is branch 7, ahead of all technical routing. Its only escape is `hasExplicitCodingVerb` (`:2502`), whose list is `(write|implement|code|program|function|solve)` — missing the past participle `written`, plus `built`, `make`, `design`, `shard`, `explain`.

```
Have you written a thread-safe counter?          → negotiation_answer  (profile allowed)
Design a counter service.                        → negotiation_answer
How would you shard a counter?                   → negotiation_answer
Implement an atomic counter.                     → coding_question_answer  ✅
```

`implement a counter` works; `written a counter` becomes a compensation discussion with negotiation context layers loaded.

### B-11 🔴 "why did you choose X?" invents résumé provenance for a whiteboard design `[VERIFIED]`

After a system-design answer, the most common deepening question routes to `project_followup_answer` with `profileContextPolicy: 'required'` and `voicePerspective: first_person_candidate` — so the model answers a *hypothetical* design decision as though the candidate personally shipped that system.

With a prior turn of `Design a URL shortener like bit.ly.`:

| follow-up | routes to | profile |
|---|---|---|
| `why did you choose that?` | `project_followup_answer` | **required** |
| `why did you choose Cassandra?` | `project_followup_answer` | **required** |
| `why did you use a bloom filter?` | `project_followup_answer` | **required** |
| `how did you scale it?` | `project_followup_answer` | **required** |
| `why did you choose Kafka over RabbitMQ?` | `follow_up_answer` | forbidden |
| `why did you pick Postgres?` | `general_meeting_answer` | forbidden |
| `why did you choose a queue?` | `dsa_question_answer` | forbidden |

The four-way split comes from the tech-name guard at `:2649-2660`: `postgres` and `kafka` are in `TECHNICAL_SUBJECT_PATTERNS` so they bounce out; `Cassandra` and `bloom filter` are not, so they stay; `queue` is in `DSA_PATTERNS`. **The route for an identical question shape depends on whether the datastore happens to be in a keyword list.**

The `!hasWriteCodeVerb` guard at `:2647` was written to prevent exactly this and cannot fire, because "why did you choose Cassandra" contains no write verb.

### B-12 🟠 `build` / `create` / `make` are missing from the coding patterns `[VERIFIED]`

`CODING_PATTERNS` (`:733`) is `/\b(write|implement|code|program|solve)\b/i`. No `build`, `create`, `make`, `develop`.

```
build a debounced search input in React          → general_meeting_answer
Create a paginated table component in React.     → general_meeting_answer
Build an autocomplete with keyboard navigation.  → general_meeting_answer
Build a CLI tool that parses CSV files.          → general_meeting_answer
Make a function that flattens a nested object.   → general_meeting_answer
Build a retry wrapper with exponential backoff.  → general_meeting_answer
Write a debounced search input in React          → coding_question_answer  ✅
```

Only the verb differs. The whole frontend machine-coding lane is unreachable: no `CODING_CONTRACT_IMPL`, no language-tag instruction, no `preferred_language` layer, no code validation. The user gets prose where they needed a compilable component.

### B-13 🟠 An explicit negation triggers the route it forbids `[VERIFIED]`

`hasWriteCodeVerb` (`:2507`) is an unscoped verb regex, and its veto of system design at `:2714` is unconditional:

```
Design an API rate limiter. Do not write code, just the design.  → coding_question_answer
Design a scalable feed. You can write pseudocode.                → coding_question_answer
Design a code review tool.                                       → coding_question_answer
Design a program scheduler.                                      → coding_question_answer
Design a system to write logs to S3.                             → coding_question_answer
```

The first row is the sharpest: "do **not** write code" is what selects the coding contract. The negation-stripping machinery already exists for the product-solve clause (`textWithoutProductSolveClause`, `:2485`) but was never applied to `write`. The noun senses of `code` and `program` are also unhandled.

### B-14 🟠 Concept questions about algorithms get the full coding contract `[VERIFIED]`

Two mechanisms. `COMMON_CODING_PROBLEM_PATTERNS:669` is a bare `/\bcheck if\b/i` folded into both `CODING_PATTERNS` and `hasWriteCodeVerb`; and the technical-concept branch at `:2762` is gated on `!includesAny(text, CODING_PATTERNS)`, which contains bare nouns (`palindrome`, `anagram`, `substring`, `traversal`, `merge sort`, `algorithm`).

```
explain the Raft algorithm                       → coding_question_answer
what is the Paxos algorithm?                     → coding_question_answer
what is a palindrome?                            → dsa_question_answer
what is tree traversal?                          → dsa_question_answer
explain merge sort                               → coding_question_answer
How do you check if a service is healthy?        → coding_question_answer
Design a system to check if a user has permission → coding_question_answer
```

A two-sentence definition request receives the six-section discovery narrative with brute force, optimisation, dry run and Big-O. Note also `/\b(check|find|determine|detect)\b.*\b(odd|even)\b/i` at `:666` uses an unbounded `.*`, so "check if traffic is even across nodes" is a coding task.

### B-15 🟠 "do you know what X is?" answers with a self-rating instead of a definition `[VERIFIED]`

`SKILL_EXPERIENCE_PATTERNS:1306-1307` (`do you (know|use)`, `are you (familiar|comfortable) with`) is branch 11, ahead of every technical branch.

```
do you know what a deadlock is?                  → skill_experience_answer  (profile required)
Do you know what BFS is?                         → skill_experience_answer
Do you know how HTTPS works?                     → skill_experience_answer
Are you familiar with the CAP theorem?           → skill_experience_answer
Do you know how to implement a trie?             → skill_experience_answer
```

`SKILL_RATING_TEMPLATE` says *"Answer in 1-2 sentences as the candidate. If asked to rate a skill, GIVE a concrete number."* So the interviewer's technical quiz is answered with a résumé-grounded self-assessment rather than the definition they asked for.

### B-16 🟠 Ten missing verbs drop design questions to the fallback `[VERIFIED]`

`HYPOTHETICAL_TECH_PATTERNS:1413` enumerates ~30 verbs after `how would (you|i)`. Missing: `make`, `improve`, `reduce`, `shard`, `cache`, `deploy`, `monitor`, `partition`, `replicate`, `refactor`.

```
How would you shard the database?                → general_meeting_answer
How would you improve the latency?               → general_meeting_answer
How would you cache this?                        → general_meeting_answer
How would you partition the data?                → general_meeting_answer
How would you make this class thread-safe?       → general_meeting_answer
How would you monitor it?                        → general_meeting_answer
```

These also lose `voicePerspective: first_person_candidate` (computed at `:2907` for `technical_concept_answer` only), so mid-conversation the voice flips from "I'd shard by user ID…" to neutral third-person explanation.

### B-17 🟠 Design follow-ups never keep the design shape `[VERIFIED]`

`system_design_answer` appears **once** in `FollowUpResolver.ts`, at `:236` inside `prevWasTechnicalConcept()`. No path anywhere returns `resolvedAnswerType: 'system_design_answer'`. With `previousAnswerType: 'system_design_answer'`:

| follow-up | effective type |
|---|---|
| `why?` / `tell me more` / `go on` | `technical_concept_answer` (40–80 words, no code) |
| `what about at scale?` | `follow_up_answer` |
| `what about consistency?` | `follow_up_answer` |
| `what are the tradeoffs?` | `general_meeting_answer` |
| `what if a node dies?` | `general_meeting_answer` |
| `what would you change if traffic grew 10x?` | `general_meeting_answer` (9 words > the `wordCount > 8` gate at `:252`) |
| `why did you choose that?` | `project_followup_answer` (**résumé forced in**) |

`FollowUpResolver.ts:335-343` folds system design into technical concept; `TOPIC_SHIFT_RE` needs a `SKILL_TOKEN_RE` hit and that list has no `scale` / `consistency` / `sharding` / `tradeoff` tokens.

**The deepening half of a design interview — which is most of it — runs on the generic template with no design sections and a 1500 ms budget.**

### B-18 🟠 The fallback lean pulls the résumé into neutral technical questions `[VERIFIED]`

`classifyUnmatchedFallback` (`:2234-2235`) leans on bare keyword hits:

```
how do you build resilient systems?              → project_answer          (profile required)
what tech would you build it with?               → project_answer          (profile required)
what level of traffic can you handle?            → skill_experience_answer (profile required)
how would you rate the design tradeoffs?         → skill_experience_answer (profile required)
```

Combined with B-9 and B-12, this means a large share of unmatched *technical* questions do not just get a generic template — they get one that **requires** résumé grounding, which is how a design question ends up answered as personal history.

### B-19 🟡 SQL and frontend concept vocabulary is absent `[VERIFIED]`

`TECHNICAL_SUBJECT_PATTERNS` has no JOIN / index / HAVING / window-function / virtual-DOM vocabulary, so these match `TECHNICAL_CONCEPT_PATTERNS` but fail the `isLikelyTechnicalConcept` co-requirement at `:2763`:

```
explain the difference between INNER JOIN and LEFT JOIN  → general_meeting_answer
what is the difference between WHERE and HAVING          → general_meeting_answer
what does a clustered index do                           → general_meeting_answer
explain the virtual DOM                                  → general_meeting_answer
what is the difference between let and var               → general_meeting_answer
explain optimistic vs pessimistic locking                → general_meeting_answer
what is a bloom filter                                   → general_meeting_answer
How do you handle a thundering herd problem?             → general_meeting_answer
```

### B-20 🟡 The system-design exclusion at `:2627` is dead code `[VERIFIED]`

Branch 11 reads `hasSkillExperienceFraming && !includesAny(text, SYSTEM_DESIGN_PATTERNS)`. The exclusion exists so an experience probe naming a design noun is not stolen — but branch 10 (`isExplicitExperienceProbe`, `:2534`) is checked first, has **no such exclusion**, and its regex set is a superset of the phrasings the guard was meant to arbitrate.

```
have you designed a notification system?  → branch 10 → skill_experience_answer  (guard bypassed)
have you implemented a rate limiter?      → branch 10 → skill_experience_answer  (guard bypassed)
do you know how to design a URL shortener? → branch 19 → system_design_answer    (guard bit)
```

Its only live effect is a split: `Have you designed a URL shortener?` gets profile **required**, `Do you know how to design a URL shortener?` gets profile **forbidden**. Same intent, opposite policies.

**Branch reachability:** all 34 assignment branches are reachable. The dead code is at sub-condition granularity — this guard, plus the `!hasWriteCodeVerb` precondition at `:2647` that cannot fire for the shape actually causing B-11.

### B-8 🟡 The `SYSTEM_DESIGN` question type is inert `[READ]`

Its only consumers are a `generalish` boolean (`orchestrator.ts:544`) and the `MIXED` computation (`turn-classifier.ts:1036`). No prompt block, contract, or template attaches on it. Also never emitted at all: `ROLE_ALIGNMENT`, `DOCUMENT_EXPLANATION`, `GENERAL_INDUSTRY`. Dead constant: `DIRECT_SHORT_TEMPLATE` (`AnswerPlanner.ts:403`), defined and never returned.

---

## Part S — Streaming and delivery (active output corruption)

**Read this part first if you only read one.** Everything else in this report is about the model being told the wrong thing. This part is about correct model output being **damaged after generation**, on the path you believe already works.

`LLMHelper.streamChat` (`LLMHelper.ts:5036-5057`) wraps **every** text stream — manual chat and live What-To-Answer alike — in a single `StreamingDashReducer`. Its output is what accumulates into `fullAnswer`/`fullResponse`, so these mutations are what gets displayed, validated, structure-repaired, sent to the code verifier, and persisted. **There is no un-mutated copy.**

### S-1 🔴 Prose arithmetic is rewritten into nonsense `[VERIFIED]`

`postProcessor.ts:132` applies `(?<=[A-Za-z]) - (?=[A-Za-z])` → `", "`.

```bash
node -e "
const {StreamingDashReducer}=require('./dist-electron/electron/llm/postProcessor.js');
const run=s=>new StreamingDashReducer().reduce(s);
['The window size is hi - lo plus one.','We return end - start here.',
 'Take n - k elements.','Compute mid - 1 carefully.'].forEach(s=>console.log(run(s)));
"
# The window size is hi, lo plus one.
# We return end, start here.
# Take n, k elements.
# Compute mid - 1 carefully.        ← digit form is safe
```

The doc comment claims it rewrites only "a hyphen that is unambiguously a PROSE connector (letter - letter — never a digit/bracket/operator neighbour)". **Variable names are letters.** So `hi - lo`, `end - start`, `right - left`, `n - k` — the exact vocabulary of DSA explanation — are destroyed, while the rare `mid - 1` case the guard was written for is protected.

`CODING_CONTRACT` explicitly asks for prose explaining the arithmetic (`codingContract.ts:50,56`), so this fires on the highest-value output the product makes. The candidate reads out arithmetic that is stated wrong.

### S-2 🔴 Inline code is replaced by invisible control characters `[VERIFIED]`

`postProcessor.ts:127-134` protects inline code with `\x01`-delimited sentinels, space-separated. The em-dash rule at `:131` (`/\s*[—–]\s*/g`) **eats the delimiting space**, so the restore needle no longer matches:

```bash
node -e "
const {StreamingDashReducer}=require('./dist-electron/electron/llm/postProcessor.js');
console.log(JSON.stringify(new StreamingDashReducer().reduce('Use \`binarySearch\`—it halves the range.')));
"
# "Use  INL0, it halves the range."
```

The identifier `binarySearch` **is gone entirely**, replaced by `U+0001` control characters that render as nothing. The trigger — inline code or inline math immediately followed by an em dash — is an extremely common LLM construction, and the em dash is precisely what this module exists to remove. Same failure for `$O(n)$—which is fine.`

### S-3 🔴 A split fence marker corrupts code *inside* the block `[VERIFIED]`

`postProcessor.ts:112` splits each chunk on `/(```)/`. A provider that ends a chunk after one or two backticks never produces the `"```"` token, so `inFence` never flips — and the inversion persists for the rest of the stream.

```bash
node -e "
const {StreamingDashReducer}=require('./dist-electron/electron/llm/postProcessor.js');
const run=cs=>{const r=new StreamingDashReducer();return cs.map(c=>r.reduce(c)).join('');};
console.log(JSON.stringify(run(['\`\`','\`python\nres = hi - lo\n','\`\`\`'])));
console.log(JSON.stringify(run(['\`\`\`python\nres = hi - lo\n\`\`\`'])));
"
# "```python\nres = hi, lo\n```"     ← split marker: code corrupted
# "```python\nres = hi - lo\n```"    ← intact marker: safe
```

`res = hi, lo` is valid Python — a tuple, not a subtraction. So `checkCodeCompleteness` and `validateAnswerStructure` pass it, and the code-execution verifier runs the corrupted version. Chunk boundaries are provider-determined and non-deterministic, so this is intermittent and effectively undebuggable from the UI.

### S-4 🟠 `$&` in code is interpreted as a replacement pattern `[VERIFIED]`

`postProcessor.ts:85, 88, 133, 134, 259` restore via `String.replace(stringNeedle, content)`. A string needle has no capture groups, but `$&`, `` $` ``, and `$'` are **still** substituted from the replacement text. Any answer teaching JS `String.replace`, bash `$'…'`, or backtick command substitution comes out mangled — in one observed case trailing prose is spliced *into* the code block.

### S-5 🟠 Mentioning `<verification_spec` truncates the answer `[VERIFIED]`

`codingContract.ts:168-183` — `suppressing` is a one-way latch on `indexOf(OPEN)` with no fence or context awareness, and the non-streaming twin `stripVerificationSpec` treats the close tag as optional, stripping to EOF:

```
IN : "To disable it, remove the <verification_spec> block from the prompt. Then rerun."
OUT: "To disable it, remove the "

IN : "```xml\n<verification_spec>example</verification_spec>\n```\n\nThat tag is how it works."
OUT: "```xml\n"                       ← unterminated fence, total content loss
```

Content *after* a properly closed tag is also dropped. Since the model is prompted about this tag, a model that echoes the instruction — or a user asking about it — truncates the answer. Weak or local providers that emit the spec early suppress every visible section after it.

`finish()` itself is correct, but it is never reached on the early-return paths between `IntelligenceEngine.ts:2652` and the flush at `:3869` (returns at `:2711`, `:2786`, `~:2830`, `:2862`, `:3644`).

### S-6 🟠 Regenerated coding answers ship the hidden spec block `[READ]`

`ipcHandlers.ts:3483-3488`:

```ts
fullResponse = regenTrim;
finalText   = regenTrim;
if (isCodingChat) fullResponse = _stripSpec(fullResponse);   // finalText NOT stripped
```

`finalText` is what the renderer commits (`:4877`). The comment shows the author knew the regen prompt teaches the model to emit a spec — the wrong variable was stripped. Same defect with no strip at all on the code-completeness regen at `:3584-3587`, and at `:3523`.

**Symptom:** raw `<verification_spec>{"entry":"twoSum","language":"python","cases":[…]}</verification_spec>` JSON rendered at the bottom of the answer.

### S-7 🟠 A provider that dies mid-stream is rewarded `[VERIFIED]`

`visionStreamFallback.ts:439-441` marks a provider healthy and records TTFT **at commit**; `:459-462` returns silently on a post-commit failure, and nothing re-penalizes it. The result is `ttftEma: 0`, which makes `orderVisionByHealth` (`:198-203`) rank it **first forever**. The healthy provider never gets a health entry at all, so it can never out-rank it.

Observed across three turns: every answer is one truncated fragment, no error, no fallback. `textStreamFallback.ts:85` delegates to the same engine, so this affects text too.

### S-8 🟠 A whitespace-only first chunk discards a healthy provider `[VERIFIED]`

`visionStreamFallback.ts:434-436` throws `'empty-stream'` when `first.value.trim().length === 0`. A leading `"\n"` delta is normal for Gemini and Groq. The healthy primary is aborted, its breaker opened for 30 s, and the answer comes from a weaker rung. The check guards only chunk #1 — mid-stream whitespace chunks pass fine, so it is inconsistent with itself.

### S-9 🟠 Rate limits are classified as auth failures `[VERIFIED]`

`visionStreamFallback.ts:144-149` tests the `auth` branch first and includes `quota`, `insufficient_quota`, and bare `expired`.

| error | `classifyVisionError` | `classifyProviderError` |
|---|---|---|
| `429 … Resource has been exhausted (e.g. check quota).` | **auth** | rate_limit (retryable) |
| `429 … insufficient_quota` | **auth** | rate_limit (retryable) |
| `Session expired, please retry` | **auth** | server_error (retryable) |

`auth` sets `providerFatal = true` (`:493`) — zero retries — plus a **300 s** breaker. Gemini's standard per-minute 429 wording contains "quota", so one ordinary rate limit removes Gemini for five minutes. This directly contradicts the documented policy in `providerErrorClassifier.ts:60-65`. Two classifiers, opposite behaviour, same errors.

### S-10 🟠 The fallback line is truncated or blank `[VERIFIED]`

`ipcHandlers.ts:3376-3383` calls `chatSpecStripper.finish()`, then `:3390-3399` sends the fallback through the **already-finished** stripper (`:3242`), re-arming an 18-char hold-back that nothing flushes:

```
fb  : "The model did not produce an answer in time, so I won't guess from your profile."
SENT: "The model did not produce an answer in time, so I won't guess "
```

If the stripper is already suppressing, `push()` returns `''` and the fallback is **emitted as nothing** — a blank bubble.

### S-11 🟡 `CodingStreamGate` does not enforce its guarantee `[VERIFIED]`

`codingStreamGate.ts:28` sets `MAX_GATE_CHARS = 48` and `shouldOpen()` returns true unconditionally at that threshold, never re-closing. 48 characters is enough for a fence plus a function signature, so a code-first answer streams in full. The header comment about "keeping the never-show-code-first guarantee" (`:16-19`) is false. Also `hasEmitted()` returns `this.opened`, so it reports `true` for a stream that emitted nothing.

### S-12 🟡 Inner TTFT budget undercuts the outer one `[READ]`

`textStreamFallback.ts:52` sets `ttftTimeoutMs: 2_500` for every provider without an override — including the entire Gemini text ladder (`LLMHelper.ts:7595-7598`), which also carries a `thinkingBudget`. Meanwhile `liveDeadlines.ts:37-56` documents the outer budgets as 7000 ms cloud / 30000 ms local, with an explicit note that a 3500 ms cap "aborted every MiniMax stream". Only the `natively` rung got an override. Gemini Pro with a reasoning budget routinely exceeds 2.5 s to first token, so the inner engine burns both attempts and reports "all providers failed" long before the outer budget is consulted — reintroducing the failure mode `liveDeadlines.ts` documents as fixed.

### S-13 🟡 `raceStreamWithDeadline` gaps `[READ]`

- `liveDeadlines.ts:185-187` — the `isSpeculative` branch is a bare `await iterator.next()` with **no deadline, no `shouldAbort`, no timer**. A hung prefetch hangs that generator and its socket indefinitely.
- `:157` — `shouldAbort` is checked only at the top of each iteration, so during an 8 s inter-token wait a supersession is not noticed and transport abort is deferred that long.
- `:189-190` — `lastTokenAt` is set *before* `await onToken(...)`, charging IPC-emit time against the next token's stall budget.
- Confirmed **not** a defect: two racers cannot both emit. `openHedged` aborts every loser before yielding, and `if (committed) return` (`:470`) prevents provider switching after the first token.

### S-14 🟡 Stalled streams are persisted as complete answers `[READ]`

On `stall_timeout` with tokens already emitted, both `IntelligenceEngine.ts:2671` (`!emittedStreamingToken`) and `ipcHandlers.ts:3390` skip the fallback, so truncated text is finalized and written to session history **with no marker that it was cut off**. Related: `ipcHandlers.ts:3350` sets `manualFirstUseful = true` on the first token regardless of content, so a whitespace-only first token satisfies neither fallback branch and produces an empty bubble — `IntelligenceEngine.ts:2680` guards the same case correctly, so the two surfaces disagree.

### Verified safe (checked, not defects)

Worth recording so nobody re-audits these: `StreamingSpecStripper.finish()` round-trips exactly, including one character at a time; a partial `<verifica…tion_spec>` split mid-tag is held correctly; generic `<` content (`vector<int>`, `if (a<b)`) is not suppressed; the `\x01` placeholders do not collide with literal `CODE0`/`INL0` in prose, and `CODE1` vs `CODE10` restores correctly; `$$…$$` display math survives; post-commit failure does not duplicate output or switch providers; `PROVIDER_TRANSPORT_ERROR_TEXT` is yielded outside the dash-reducer wrapper so its em dash is intact.

---

## Part C — Prompt composition conflicts

### C-1 🔴 `approach_first` style directly contradicts the DSA contract `[VERIFIED]`

`detectAnswerStyle` (`answerStyle.ts:54`) fires `approach_first` on the most common interviewer phrasings in a coding round:

```bash
node -e "
const {detectAnswerStyle}=require('./dist-electron/electron/llm/answerStyle.js');
['walk me through your approach','how would you approach this problem',
 'walk me through your thinking','explain your approach before coding'
].forEach(q=>console.log(detectAnswerStyle(q).style,'|',q));
"
# approach_first | walk me through your approach
# approach_first | how would you approach this problem
# approach_first | walk me through your thinking
# approach_first | explain your approach before coding
```

Its directive (`answerStyle.ts:91`):

> **STYLE:** Explain the APPROACH/intuition first in 2-3 sentences, THEN the specifics. **Lead with the idea, not the implementation.**

The DSA contract says the opposite:

> Never say "the optimal approach is," … **reason toward the idea, don't announce it.** … This must never read like a clean summary of a solution you already had.

And it asks for multiple approaches, each with its own full code block. "2-3 sentences, lead with the idea" cannot coexist with that.

**The style directive wins on position.** `formatAnswerPlanForPrompt` appends it *after* the template:

```
STRICT RESPONSE TEMPLATE:
${plan.responseTemplate}${renderingDirective}${styleDirective}${lengthDirective}
```

Verified for a real DSA question:

```bash
node -e "
const AP=require('./dist-electron/electron/llm/AnswerPlanner.js');
const plan=AP.planAnswer({question:'Walk me through your approach to reverse a linked list'});
const p=AP.formatAnswerPlanForPrompt(plan,false);
console.log('answerType:',plan.answerType,'| style:',plan.answerStyle);
console.log('STYLE after contract:', p.indexOf('STYLE:') > p.indexOf('Approach 1'));
"
# answerType: dsa_question_answer | style: approach_first
# STYLE after contract: true
```

`approach_first` is also in `STRUCTURED_FULL_STYLES` (`speakability.ts:82`), exempting it from every length check.

The same collision class applies to `bullets` ("Answer as a short bulleted list"), `notes`, and `exam` — all of which fight `<human_voice>`'s no-lists rule.

### C-2 🟠 Five layers give contradictory system-design orders `[READ]`

| Layer | Instruction |
|---|---|
| `<human_voice>` (`promptSystemV2.ts:195`) | "No headings, no labels… never start a line with `- `" |
| `<length>` | "Code, **system design**, notes… may be longer and structured" — explicit carve-out from the above |
| `<active_mode>` (`:301`) | "For system design, cover assumptions, architecture, critical components, tradeoffs, failure handling, and scaling, **in that order**" |
| `SYSTEM_DESIGN_TEMPLATE` (`AnswerPlanner.ts:363`) | seven colon-labeled sections |
| `<chat_layout>` (`:512`) | bold labels, hyphen bullets, mandatory `**Good interview answer:**` close |

Four of five vote for a document. Precedence is asserted in prose across four files rather than decided in composition, so every rule must be defended against every other rule by argument — and the recency-advantaged one wins.

`<active_mode>` also carries a second conflict independent of formatting: "state the approach, then the reasoning and key tradeoffs" is *conclusion-first*, the exact inverse of the discovery narrative.

### C-3 🟠 `CHAT_LAYOUT` no longer defers to the system-design contract `[VERIFIED]`

`promptSystemV2.ts:522`:

> Exceptions, in precedence order: **the coding contract** owns full coding answers when attached. …

The system-design contract is not named — that sentence was a reset casualty (A-1). Even once the contract is rewired, `chat_layout` will reintroduce its labels and its `**Good interview answer:**` close on the typed surface.

---

## Part D — Voice and humanization

### D-1 🔴 Temperature 0.2 with a fixed seed `[READ]`

`electron/LLMHelper.ts:167`:

```ts
const INTERACTIVE_TEMPERATURE = 0.2; // "very low" per report
const INTERACTIVE_SEED = 7;          // fixed seed where the SDK supports it
```

Near-zero temperature makes the model emit the highest-probability continuation available — the distribution-central, textbook phrasing that reads as machine-generated. The fixed seed means the same question yields a byte-identical answer forever, so it can never sound spontaneous.

The code comment states the goal plainly: *"removes needless run-to-run variance."* That is a document-generator objective. Realism is the opposite objective, and the two were never separated. `recommendedGenerationProfile` reinforces it, returning `variance: 'low'` for the default `answer` action.

**This is the highest realism-per-line-changed fix available**, and it is one constant.

### D-2 🔴 The humanizer excludes every technical round by name `[VERIFIED]`

`electron/llm/humanLikeness.ts:39-43`:

```ts
const STRUCTURE_PRESERVED_TYPES = new Set<AnswerType>([
  'coding_question_answer', 'dsa_question_answer', 'system_design_answer',
  'debugging_question_answer', 'technical_concept_answer', 'lecture_answer',
  'project_link_answer', 'source_code_evidence_answer', 'ethical_usage_answer',
]);
export function shouldHumanizeOutput(t) { return !STRUCTURE_PRESERVED_TYPES.has(t); }
```

Every round type in question is on the denylist. The one module built to strip the machine voice never runs on any of them. The intent — protect code and precision — is sound; the implementation is too coarse. System design has no code to protect, and `humanizeSpokenAnswer` already has a sentinel mechanism that shields fenced regions.

What it would have caught: em/en dashes, semicolons, `leverage`→`use`, `seamless`→`smooth`, `robust and scalable`→`reliable`, `proven track record`, `actionable insights`, and 30 more corporate patterns. Notably it does **not** catch `delve`, `obviously`, `it's important to note`, or `the optimal approach is` — the list is LinkedIn-flavored, not AI-tell-flavored.

### D-3 🟠 The live voice path never humanizes at all `[READ]`

Even for accepted types, the humanizer reaches the live "what should I say" path only via `applyAnswerContract`, gated on `answerDiversityGuard` — default **`false`** (`electron/intelligence/intelligenceFlags.ts:409`). On default settings the primary voice path runs no humanizer, no repetition guard, and no speakability measurement.

The only always-on anti-tell in the entire app is `StreamingDashReducer` (`LLMHelper.ts:5039`), which rewrites em dashes to commas in every chunk. One punctuation substitution.

---

## Part E — Post-processing

### E-1 🟠 Templates mandate labels that post-processing then strips `[VERIFIED]`

`BEHAVIORAL_TEMPLATE` (`AnswerPlanner.ts:200`) instructs the model to emit `Direct Answer:`, `Strong Example / STAR:`, `Why It Matters For This Role:`, `Short Closing Line:`. `SCAFFOLD_LABEL_RE` (`answerPolish.ts:488`) then deletes exactly those four:

```bash
node -e "
const AP=require('./dist-electron/electron/llm/answerPolish.js');
console.log(AP.compressToSpeakable('Direct Answer:\nI led the migration.\n\nStrong Example / STAR:\nWe had a failing pipeline. I rebuilt it. Latency dropped.\n\nWhy It Matters For This Role:\nIt maps to your platform work.\n\nShort Closing Line:\nThat is the work I like most.'));
"
# I led the migration. We had a failing pipeline. I rebuilt it. Latency dropped.
# It maps to your platform work. That is the work I like most.
```

**Three costs.** It wastes output tokens on labels that are discarded. It forces the model into document-section cognition, which shapes the *prose* and not just the labels — look at that output: five disconnected section stubs, not a person talking. And when the strip does not fire, the labels leak, which is the documented "scaffold misfire" failure class that `detectAndExtractScaffoldMisfire` (`AnswerValidator.ts:254`) exists to catch after the fact.

The same round-trip applies to `PROJECT_TEMPLATE`, `JD_FIT_TEMPLATE`, `GAP_ANALYSIS_TEMPLATE`, `NEGOTIATION_TEMPLATE`, and the two `RESUME_JD_*` templates.

### E-2 🟠 DSA format failures are detected and ignored `[READ]`

`validateCodingMarkdown` (`AnswerValidator.ts:134-191`) checks the opening heading, consecutive approach numbering, a language-tagged fence per approach, and closing-section order — then returns `repaired: undefined`, hard-coded at `:188`. No regeneration is triggered for a structural failure either. The validator is a logger.

Contrast: `checkCodeCompleteness` *does* drive one regeneration (`ipcHandlers.ts:3553`), and the coding-meta retry does too (`:3464`). Structure alone has no enforcement.

### E-3 🟠 Three post-processing paths with different shaping `[READ]`

| Path | Shaping |
|---|---|
| `IntelligenceEngine.runWhatShouldISay` (live voice) | 23 steps, but humanizer/diversity/speakability all behind the default-off flag. Always-on: `cleanAnswerArtifacts` + conditional `compressToSpeakable`. |
| `ipcHandlers` manual chat | Not flag-gated. `detectCorporateFiller` (log-only) → `cleanAnswerArtifacts` → `humanizeForAnswerType` → `compressTechnicalConcept` → `compressToSpeakable` → diversity guard. |
| `IntelligenceEngine.runManualAnswer` | `validateAnswerStructure` only. **No artifact cleanup, no humanizer, no leak detectors.** |

The same answer text gets materially different treatment depending on which surface produced it. Every regeneration in the codebase is capped at exactly one attempt; there are no retry loops.

### E-4 🟡 Six dead or no-op polish layers `[READ]`

| Symbol | State |
|---|---|
| `applySpeakabilityBudget` (`speakability.ts:465`) | returns input verbatim, `changed: false` — measure-only |
| `trimToSpeakable` (`speakability.ts:361`) | documented no-op, `@deprecated` |
| `postProcessor.clampResponse` | only reference is commented out at `LLMHelper.ts:1854` |
| `postProcessor.validateResponse` | exported at `llm/index.ts:15`, never called |
| `DIVERSITY_REPAIR_INSTRUCTION` (`answerPolish.ts:762`) | no call site |
| `detectCorporateFiller` | log-only, never mutates or gates |

Consequence: every word-count and seconds threshold in `speakability.ts` (`SOFT_MAX_WORDS 85`, `HARD_MAX_SECONDS 35`, `SPOKEN_FULL_MAX_WORDS 180`) is decorative. Nothing enforces length anywhere.

---

## Part F — Multi-turn state

### F-1 🔴 The design conversation state machine is architecturally unreachable `[VERIFIED]`

The contract demands the model "always know which state you're in," never repeat an answered question, and never lose an earlier fact. All of that requires seeing its own prior turns.

`system_design_answer`'s required layers (`AnswerPlanner.ts:1899`):

```
['live_transcript', 'active_mode', 'screen_context', 'preferred_language']
```

`prior_assistant_responses` is absent — and `contextRoute.ts:132` makes that one layer **fail-closed**, forbidden unless explicitly required. `stripPriorAssistantTurns` then deletes `[ASSISTANT (PREVIOUS SUGGESTION)]` blocks from the transcript snapshot. Even where the layer *is* granted, its budget is 600 characters (`contextRoute.ts:60`) — shorter than one design turn.

Only three answer types request the layer: `project_followup_answer`, `follow_up_answer`, `negotiation_answer`.

The sole surviving channel is indirect: if the user reads the previous answer aloud and STT captures it as a `[ME]:` line, some state leaks back. That is not a state machine.

### F-2 🔴 Two conversation-continuity bugs are live again `[VERIFIED]`

Both were root-caused to a line and fixed; both fixes were reset casualties (A-1).

**The "library" coherence bug.** `resolveReference` (`conversation-state.ts:286-370`) recognizes only three trigger shapes — a pronoun, a bare follow-up, a rephrase request. A short content-bearing reply to the assistant's *own* question ("library", "centralised service") matches none, falls through to `NO_REFERENT_TRIGGER`, never classifies as system design, and the contract is not attached to that turn at all. Confirmed: no `ANSWERED_PENDING_QUESTION` reason exists in the file.

**The bare-number refusal.** A bare 2+ digit run is treated as an entity signal, triggering an ungated primary-source lookup against the résumé, which finds nothing and emits a document-grounded refusal — asking the user to upload a project brief mid-interview. The guard for exactly this shape exists at `turn-classifier.ts:1191` but only gates a later fast-path, not the injection point where the bad claim is added.

This bug is **made more likely by the contract's own "ask one question at a time" rule**, which increases how often a conversation reaches a second or third clarification round — the depth this bug needs.

### F-3 🟠 `[[INTERVIEWER_QUESTIONS]]` has no parser and never had a renderer `[VERIFIED]`

The contract instructs the model to emit the marker plus a numbered list. `GIST_MARKER` has `splitGistLine` (`promptSystemV2.ts:745`) and `stripDisplayMarkup`; the interviewer-questions marker has neither — the splitter that mirrored them was a reset casualty, and the UI side was never built.

Restoring the contract alone puts the raw `[[INTERVIEWER_QUESTIONS]]` string into the displayed answer and into anything spoken, because `spokenFormatViolations` and `stripDisplayMarkup` do not know about it.

---

## Part G — Coverage and prompt bloat

### G-1 🟠 Six interview round types have no representation `[VERIFIED]`

```bash
grep -rin "machine.coding\|low.level.design\|\bLLD\b\|object.oriented design\|api design" \
  --include="*.ts" electron/
# (no matches)
```

No `AnswerType`, template, or contract exists for machine coding, LLD/OOP design, API design, SQL, frontend/React rounds, or concurrency. Today these fall into whichever adjacent branch a keyword happens to hit — see B-5, B-6, and B-3.

### G-2 🟡 Prompt growth by accretion `[VERIFIED]`

| File | "never" | WRONG examples | "observed failure" |
|---|---|---|---|
| `AnswerPlanner.ts` | 95 | 1 | 0 |
| `prompts.ts` | 78 | 5 | 0 |
| `systemDesignContract.ts` | 66 | 19 | 8 |
| `promptSystemV2.ts` | 63 | 8 | 0 |
| `codingContract.ts` | 28 | 4 | 0 |
| **Total** | **330** | **37** | **8** |

The system-design contract carries 66 prohibitions and 19 negative examples in 122 lines. Each live test added one more; nothing was ever generalized or removed.

Two costs. The instruction budget for one round type (5,673 tokens) now exceeds the entire core persona (2,618). And the negative examples plant the strings they forbid — the contract that bans opening with "my first thought is to use Redis" is simultaneously the densest source of the words *Redis* and *my first thought* in the whole prompt.

For reference, composed system-prompt sizes:

| Configuration | Size |
|---|---|
| No coding contract (`GENERAL_TECHNICAL`) | 13,152 chars |
| DSA contract attached | 20,784 chars |
| Impl contract attached | 15,806 chars |

---

## Part H — Tooling and CI

### H-1 🟡 No lint script `[VERIFIED]`

`@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` are in `devDependencies`. There is no `eslint` binary, no config file, and no npm script. `npm run doctor` (`npx react-doctor@latest`) is the only static-analysis entry point.

### H-2 🟡 CI is macOS-only `[READ]`

`.github/workflows/build-smoke.yml` runs `macos-latest` with no matrix. There is no Windows job. This contradicts `CLAUDE.md`'s explicit CI expectation of a `[macos-latest, windows-latest]` matrix for shared application behavior.

Never run in CI: `ci:tier1`–`ci:tier4`, any `benchmark:*`, any `eval:*`, `verify:humanized-answers`, `verify:spoken-quality`, `verify:memory-context`, `test:e2e` (Playwright never runs), `test:modes`.

`.husky/pre-commit` fails closed on step 1 only (`verify-native-arch.js`); steps 2 and 3 are `|| true` advisory. **No test, typecheck, or quality gate on commit** — which is part of why A-1 and A-2 were possible.

---

## Root cause chain

```
10 × git reset (A-2)
  └── uncommitted work discarded repeatedly
        ├── system-design wiring + 2 bug fixes lost (A-1, F-2)
        └── orphaned tests accumulate (A-4)
              └── 56-failure baseline normalizes red CI
                    └── npm test already broken anyway (A-3)
                          └── no signal that anything was lost
                                └── prompt iteration continues against
                                    a disconnected file for a week
```

Independently, the answer path itself is broken in ways prompt work cannot reach. Three separate chains, each sufficient on its own to produce the complaint:

```
Two regex classifiers, no shared taxonomy
  ├── 17% of realistic questions match no branch at all (B-3)
  ├── canonical Two Sum gets no coding contract (B-1)
  ├── "Design Twitter" needs an article to be recognised (B-9)
  ├── a bare \bcounter\b routes concurrency → salary (B-10)
  ├── "do not write code" selects the coding contract (B-13)
  ├── "your ... code" → a refusal that names the product (B-0)
  └── contract selection needs booleans at 8 call sites
        └── one forgot dsaTask → DSA narrative everywhere (B-4)

Templates are slot-filling documents
  ├── model told to emit labels (E-1)
  ├── post-processor strips them (E-1)
  └── the prose in between stays document-shaped → reads as AI

Correct output is damaged after generation
  ├── hi - lo → hi, lo in every DSA explanation (S-1)
  ├── inline code → invisible U+0001 characters (S-2)
  ├── split fence → corruption inside code blocks (S-3)
  └── no un-mutated copy exists anywhere in the pipeline

Humanization exists but is unreachable
  ├── denylist excludes all technical rounds (D-2)
  ├── live path gated off by default (D-3)
  └── temperature 0.2 + fixed seed guarantees modal phrasing (D-1)
```

The through-line: **every layer that was supposed to improve the answer is either disconnected, inverted, or damaging it.** The prompts were never the variable.

---

## Mapping to `PROJECT_ROADMAP.md`

`PROJECT_ROADMAP.md` is the plan of record. Every defect above lands in one of its phases:

| Roadmap phase | Defects it closes |
|---|---|
| **Phase 0** — Stop the loss | A-1, A-2, **plus the new Phase 0.5 below** |
| **Phase 1** — Build the measurement layer | A-3, A-4, A-5, A-6 |
| **Phase 2** — Restore what the reset destroyed | C-3, F-2, F-3, and the rewiring half of A-1 |
| **Phase 3** — The voice | D-1, D-2, D-3, E-3, E-4 |
| **Phase 4** — Interview state in code | F-1 |
| **Phase 5** — Cover the rounds you actually sit | B-1 … B-20, G-1 |
| **Phase 6** — The subtraction sweep | E-1, E-2, G-2, B-8's dead constants |
| **Phase 7** — Structure | C-1, C-2 |
| **Phase 8** — Make the platform claim true | H-1, H-2 |
| *(unplaced)* | **all of Part S** — the streaming layer has no phase yet |

### Two proposed changes to the sequencing

**1 — Insert a "Phase 0.5: stop shipping broken output" before Phase 1.**

Four defects here are actively damaging answers right now, are unrelated to prompt design, and are each a small, self-contained fix. They should not wait behind the measurement layer, because they degrade the very output the measurement layer would score.

- **B-0** — tighten `SOURCE_CODE_EVIDENCE_PATTERNS` at `AnswerPlanner.ts:981`. The `[\w ]*` gap is the whole bug. Until then, ordinary interview questions can name your product to the interviewer.
- **S-1** — delete or narrow the `(?<=[A-Za-z]) - (?=[A-Za-z])` rule at `postProcessor.ts:132`. It has no upside that justifies rewriting arithmetic.
- **S-2** — make the sentinel restore tolerant of lost delimiter whitespace, or run the dash rules *before* the protect/restore round-trip.
- **S-3** — buffer partial backtick runs across chunk boundaries in the fence splitter.

That is roughly a day, and it removes an entire class of "why did it say that?" that no prompt change could ever explain.

**2 — Promote the routing fixes (B-0 aside: B-1, B-3, B-9, B-10, B-11, B-13) out of Phase 5 to immediately after Phase 1.**

They are invisible to prompt work and cheap relative to their effect. Right now the canonical Two Sum statement, `Design Twitter`, `build a debounced search input`, and `merge two sorted linked lists` all receive a template that says "answer naturally and concisely" plus an instruction *not* to speak as the candidate — and 17% of realistic questions match no branch at all. No amount of contract authoring reaches those turns, because no contract is attached to them.

Two things make it tractable early: the fix is mostly classification, not prompt design, so it does not depend on Phase 7's structural work; and Phase 1's eval will show the gain immediately and unambiguously, which is the kind of early result that makes continuing the rest of the roadmap easy to justify.

Concretely: replace the hardcoded named-problem lists with structural detection or one cheap classifier call, introduce the `RoundKind` discriminator Phase 5 needs anyway, and fix B-4 in the two `personaBase` functions while you are already inside them.

**Also worth noting:** Part S has no home in the current roadmap at all. The streaming and provider-fallback layer was not in scope for either existing document, and it contains three critical defects. It needs its own phase — S-7 through S-9 in particular (health-tracking and error-classification bugs) will cause intermittent, hard-to-reproduce quality complaints that look like model problems.

The rest of the ordering stands as written in the roadmap.

---

## What to stop doing

**Adding prohibitions.** 330 "never"s already cost attention on every turn, and each negative example plants the string it forbids. When you catch a failure, prefer removing the instruction that caused it, or restructuring so it cannot arise, over appending a rule against it.

**Judging prompt changes by reading one answer.** Every conclusion in this report that mattered came from executing code, and two of them contradicted what the source comments claimed. Until step 3 exists, a prompt change has no measurable effect — favourable or otherwise.
