# Natively — Roadmap to a Focused Interview Tool

**Date:** 2026-08-18
**Basis:** [PROJECT_REVIEW.md](PROJECT_REVIEW.md) — every phase below traces to a finding there.
**Target product:** one person's technical-interview copilot. Live audio in, an answer that sounds like *you* thinking out loud, on the rounds you actually sit.

---

## The thesis

Three sentences explain everything in this plan.

1. **You cannot improve what you cannot measure, and right now nothing measures answer quality.** 127k lines of tests, zero golden answers. Every prompt change so far has been evaluated by you reading one live transcript — which is why fixes kept regressing in new domains.
2. **Interview realism is a dialogue-state problem being solved as a single-shot template problem.** Ten rounds of prompt gotchas are prose compensating for state that does not exist in code. Move the state into code and most of the prose becomes deletable.
3. **Every line that is not about interviews is a tax on the lines that are.** The `systemDesignTask` wiring was lost because it had to be threaded through 8 call sites in a 12,879-line file. Subtraction is not tidying here; it is what makes the next change survivable.

**Ordering rule:** measurement → restoration → mechanism → coverage → subtraction → structure. Do not reorder. Every phase after Phase 1 needs Phase 1's judge to know whether it worked.

**Anti-goals** — things to actively stop doing:

- **Stop adding prohibitions.** 330 `never`s across five prompt files. Each one costs attention on every turn and plants the string it forbids. From here, a new rule needs a failing eval case before it earns a line of prompt.
- **Stop hand-verifying with one live transcript.** That method produced 15 rounds of fixes where each one broke in the next domain.
- **Stop adding a boolean per round type.** `codingTask`, `dsaTask`, `systemDesignTask` was already unmanageable at three. One discriminator (Phase 2).
- **Stop declaring platform support the repo does not test.** (Phase 8.)

---

## Decisions only you can make

These block or resize whole phases. Nothing else in this plan needs your input.

| # | Decision | Why it matters | My recommendation |
| --- | --- | --- | --- |
| D1 | **Which rounds do you actually sit?** DSA, system design, machine coding, LLD/OOP, API design, SQL, frontend, behavioral, debugging? | Phase 5's entire scope. Today there is coverage for 4 and *zero* for machine coding, LLD, API design, SQL and frontend. | Pick your real loop — probably DSA + machine coding + system design + LLD. Build those four properly rather than nine badly. |
| D2 | **Keep resume/JD grounding (Profile Intelligence + RAG + knowledge packs)?** | ~10,700 LOC + 8 DB tables + 18 IPC channels. It is the largest single keep-or-kill in the repo. | Keep **only** if you want behavioral/"tell me about yourself" support. If the tool is DSA + design + coding, delete it. |
| D3 | **Keep phone mirroring?** | 3,551 LOC and 46 IPC channels — 13% of the entire IPC surface. | Genuinely useful in an interview (answers on a second screen). Keep if you have used it; otherwise it is the biggest single cut available after D2. |
| D4 | **macOS-only, or genuinely support Windows?** | Today the config claims Windows and nothing tests, builds or ships it — no CI job, no native binary. | **macOS-only.** Delete the `win`/`linux` targets and the Windows Rust branches. Revisit only if you switch machines. |
| D5 | **Which LLM providers and which STT?** | 7 LLM providers + a 4,027-line settings screen; 8 STT implementations. Each multiplies the streaming/temperature/device edge cases. | 2 LLM (one fast, one strong) + 1 cloud STT + `LocalWhisperSTT` offline. |
| D6 | **Keep any telemetry?** | `TelemetryService` + `InstallPingManager` + `logs/telemetry.jsonl`. | Remove. If you want latency numbers, keep `PiLatencyTracer` writing locally only. |

---

## Phase 0 — Stop the loss (do this first, today)

**Nothing else should start before this is done.** These are minutes-to-hours of work protecting weeks of past work.

| # | Action | Detail |
| --- | --- | --- |
| 0.1 | **Commit `electron/llm/systemDesignContract.ts`** | Untracked, zero importers, 15 rounds of live-tested design. One `git clean -fd` from permanent loss. Commit it *unwired* right now; wiring is Phase 2. |
| 0.2 | **Unbreak the test entry point** | Delete or `describe.skip` `electron/llm/__tests__/AnswerQualityJudge2026_06_08.test.mjs`. It fails at import, taking `npm test`, `test:llm`, `ci:tier1` and `test:ci` down with it. Add a comment pointing at Phase 1, which restores its subject. |
| 0.3 | **Prune the 27 broken npm scripts** | Delete every script pointing into `benchmarks/`, `intelligence-eval-real-ui/` and `natively-api/tests/` — including `ci:tier2`/`3`/`4`. Keeping a script that cannot run is worse than not having it. |
| 0.4 | **Make `typecheck:electron` green** | Stub or delete the `premium/electron/knowledge/CompanyResearchEngine` import in `electron/services/resolveCompanySearchProvider.ts`. The submodule's remote is gone; this error is permanent otherwise. |
| 0.5 | **Record a named baseline** | Run `npm test`, `npm run test:llm`, `npm run test:intelligence`; save the **failing test names** (not counts) to `baseline-2026-08-18.txt`. The suite has ~51–56 environment-flaky failures; name-diffing is the only reliable regression check you have until Phase 1. |
| 0.6 | **Tier 1 safe deletes** | `renderer/`, `electron/visionBenchmark/`, the 10 unused dependencies (one build per removal, not all at once), the ~35 one-off `scripts/` files, stray artifacts. Zero behaviour change. |

**Exit criteria:** `git status` clean · `npx tsc --noEmit` and `npm run typecheck:electron` both green · `npm test` reaches assertions instead of failing at collection · a written baseline exists.
**Effort:** 1 session.

---

## Phase 1 — Build the measurement layer

**This is the most important phase in the document.** Everything downstream is unmeasurable without it, and the absence of exactly this is why 15 rounds of prompt fixes kept regressing.

### 1.1 A golden question set

Create `evals/questions/` — **30 questions**, versioned in git, drawn from your real target loop (D1):

- 8 DSA (mix: one where the naive solution is genuinely tempting, one famous-pattern trap like Climbing Stairs, one real-world-story framing)
- 6 system design (at least 3 in domains *other than* rate limiter / URL shortener — those two are so common in training data the model recites them)
- 5 machine coding / implementation ("write a React stopwatch", "implement debounce")
- 4 multi-turn sequences (question → partial answer → remainder — the exact shape that broke in rounds 5, 6, 8 and 12)
- 3 LLD/OOP, 2 debugging, 2 follow-ups on a prior answer

Each question is a small JSON file: the question, the round kind, any prior turns, and 3–6 **assertions in plain English** ("asks exactly one clarifying question, then stops", "no markdown headings", "names the naive approach before the optimal one", "every number traces to something the interviewer said").

### 1.2 An LLM judge

Rebuild what `answer_quality_judge.ts` did, in tracked source this time — `evals/judge.ts`, never gitignored:

```
scores:  human_voice (1-5)   does this sound like a person talking, not an article?
         discovery (1-5)     PROBLEM -> why the simple thing fails -> fix -> trade-off?
         pacing (1-5)        one stage / one question per turn, stopped where it should?
         grounding (pass/fail)  does every fact trace to the transcript?
flags:   wrong_voice, over_hedged, template_leak, heading_leak, fabricated_fact,
         hedged_past_a_question, lost_earlier_fact
```

Run each question ×3 (temperature will be non-zero after Phase 3 — variance is the point) and report per-question and aggregate scores to `evals/results/<date>.json`.

### 1.3 Golden snapshots

For the 10 answers you judge best, save the full answer as a golden file. Not for string equality — as the reference the judge scores *against*, and as the artifact that makes "did this change make things worse?" answerable in one command.

### 1.4 One command

```bash
npm run eval          # 30 questions, 3 runs, judge, diff vs last run, exit non-zero on regression
```

**Exit criteria:** `npm run eval` produces a scored report · a deliberately-worsened prompt (e.g. re-add `Use exactly these sections:` to the DSA template) measurably drops the score. If sabotage does not move the number, the judge is not working yet — fix it before proceeding.
**Effort:** 2–3 sessions. **This is the best-spent time in the whole plan.**

---

## Phase 2 — Restore what the reset destroyed, properly

The `git reset` on 2026-08-11 wiped the system-design wiring and two conversation-state bug fixes. Rebuild them — but **do not re-add a third boolean.**

### 2.1 One discriminator instead of N booleans

Replace `codingTask` / `dsaTask` / `systemDesignTask` with a single value:

```ts
// electron/llm/roundKind.ts
export type RoundKind =
  | 'dsa' | 'machine_coding' | 'system_design' | 'lld'
  | 'debugging' | 'api_design' | 'sql' | 'frontend'
  | 'behavioral' | 'concept' | 'unknown';

export interface RoundContract { readonly full: string; readonly tiny: string; }
export const CONTRACTS: Record<RoundKind, RoundContract | null> = { /* one per kind */ };
```

`promptSystemV2.ts` then attaches `CONTRACTS[roundKind]` — one lookup, no boolean algebra, and a new round type cannot be half-wired because the `Record` is total.

### 2.2 Widen the bridge — the fix that makes any of it run

`engine-bridge.ts:114` currently reads `personaBase?: (ctx: { codingTask: boolean })` and `:241` computes only `codingTask`. Change to `(ctx: { roundKind: RoundKind })`, derive it from `result.decision.questionTypes`, and update both call sites (`IntelligenceEngine.ts` ~2506, `ipcHandlers.ts` ~1205).

> **Do not defer this as "separate work."** `contextIntelligenceV3` is `DEFAULT_ENABLED = true` (`flag.ts:108`) and manual chat short-circuits into it — "when on, this path owns the turn end to end." Wiring only the legacy call sites is what made the system-design contract dead on arrival the first time.

### 2.3 Fix the coding-contract default

`promptSystemV2.ts:486` — `input.dsaTask !== false` means `undefined` selects the DSA narrative for *every* coding turn, so `CODING_CONTRACT_IMPL` is unreachable. With `RoundKind` this becomes an explicit `'dsa'` vs `'machine_coding'` decision with no default-by-accident.

### 2.4 Restore the two conversation-state fixes

Both bugs are **live again** after the reset:

- `isLikelyAnswerToPendingQuestion` in `turn-classifier.ts` + the `ANSWERED_PENDING_QUESTION` reason in `conversation-state.ts` — without it, answering the assistant's own question ("library") is classified as an unrelated new turn and the contract never attaches.
- `clarificationRootQuestion` in `ConversationState` — without it, `previousQuestion` degrades to the last raw turn by the second clarification round, so the task vocabulary is lost and a digits-only reply ("100000") can trigger a document-grounded refusal.

Add a regression eval case for each, from the exact transcripts in the design record.

### 2.5 Restore the display marker and cancellations

`INTERVIEWER_QUESTIONS_MARKER` + `splitInterviewerQuestionsBlock` (mirroring `GIST_MARKER`; gist must remain the true last line), and the `CHAT_LAYOUT` / `CHAT_LAYOUT_TINY` exceptions text that names the system-design contract *and* cancels rule 4's `**Good interview answer:**` close in both tiers.

**Exit criteria:** a live system-design turn attaches the contract on the V3 path, proven by printing the composed prompt · "write a React stopwatch" selects the implementation contract, not the DSA narrative · `npm run eval` passes the two restored-bug cases · Phase 1 scores do not regress.
**Effort:** 2–3 sessions.

---

## Phase 3 — The voice: sampling, humanizer, dead layers

Cheap changes, large effect, and now measurable.

| # | Action | Detail |
| --- | --- | --- |
| 3.1 | **Split the sampling objective** | `INTERACTIVE_TEMPERATURE = 0.2` + `INTERACTIVE_SEED = 7` (`LLMHelper.ts:166-167`) makes every answer modal and byte-identical. Raise to **0.7–0.9 and drop the seed for answer generation**; keep low-temp determinism for classifiers, planners and validators. Sweep 0.5 / 0.7 / 0.9 through `npm run eval` and pick on the `human_voice` score. **Highest realism-per-line-changed change in the repo.** |
| 3.2 | **Narrow the humanizer denylist** | `humanLikeness.ts:39-43` excludes `dsa_question_answer`, `system_design_answer`, `coding_question_answer`, `debugging_question_answer`, `technical_concept_answer` — exactly the rounds that matter. Re-scope the guard to "has a fenced code block to protect" so prose gets humanized and code does not. |
| 3.3 | **Turn the humanizer on, or delete it** | It sits behind `answerDiversityGuard`, `default: false` (`intelligenceFlags.ts:409`), so on the live path it never runs. Flip the default, measure, and if it does not improve the score, delete the module rather than leaving a disabled maybe. |
| 3.4 | **Resolve the dead polish layers** | `applySpeakabilityBudget` (returns input verbatim), `trimToSpeakable` (documented no-op), `clampResponse`, `validateResponse`, `DIVERSITY_REPAIR_INSTRUCTION` (no call sites). Implement or delete. Each one currently reads like a safety net that is not attached to anything. |
| 3.5 | **Make the DSA validator actually repair** | `AnswerValidator.ts:188` hard-codes `repaired: undefined`, so format failures are logged and never fixed. Either repair, or delete the validator and let the eval catch format drift. |

**Exit criteria:** measured `human_voice` improvement across ≥20 of 30 questions · three runs of the same question are visibly different in wording and equally correct · no module in the answer path is a silent no-op.
**Effort:** 1–2 sessions.

---

## Phase 4 — Put the interview state in code

This is the deepest fix and the one that lets you *delete* prompt text instead of adding it.

### 4.1 The problem, precisely

`system_design_answer`'s required layers are `['live_transcript','active_mode','screen_context','preferred_language']` — no `prior_assistant_responses`. `contextRoute.ts:132` makes that layer fail-closed, `stripPriorAssistantTurns` removes the assistant's own turns, and the layer budget is 600 chars anyway. The contract instructs the model to *"treat this as a small state machine, never lose a fact an earlier state established"* — while the pipeline forbids it from seeing its own prior turns. That is not a wording bug; no amount of prose can fix it.

### 4.2 The fix: an explicit state object

```ts
// electron/context-intelligence/question/interviewRoundState.ts
export interface InterviewRoundState {
  roundKind: RoundKind;
  stage: 'clarifying' | 'waiting' | 'requirements_settled'
       | 'high_level' | 'deep_dive' | 'scaling' | 'wrap_up';
  establishedFacts: { fact: string; source: 'interviewer' | 'candidate'; turn: number }[];
  openQuestions: string[];          // asked, not yet answered
  coveredStages: RoundKind extends never ? never : string[];
  problemStatement: string;         // survives every turn — never degrades
}
```

Maintained in code across turns, injected as a compact **fact block** ("Established: 100k req/s, centralized service, no expiry. Open: none. Stage: high_level. Covered: clarifying, requirements."). Small, ordered, and immune to the transcript-truncation and layer-stripping problems.

### 4.3 Then delete the prose it replaces

Once the state block exists, these become redundant and should come out — measuring with `npm run eval` after each removal:

- the "treat this as a small state machine" framing
- the whole-conversation synthesis rule (state carries the facts now)
- the "never focus only on the last answered requirement" rule
- most of the partial-answer / re-ask-only-what-is-open prose (`openQuestions` is data now)

**This is the phase where the contract gets smaller instead of larger.** That is the goal.

### 4.4 A deterministic backstop for stop-and-wait

"Ask and genuinely stop" has needed a live fix in rounds 4, 6 and 7 — it fights the model's pull toward completeness, and prompt-only fixes for it have a real ceiling. Add a post-generation gate mirroring `CodingStreamGate`: **if the draft contains a question to the interviewer, truncate at the end of that sentence.** Deterministic beats a fourth round of wording.

Same class of backstop for the higher-stakes failure: **every number in the output must trace to the transcript**, else regenerate. Fabricating an interviewer-supplied figure can make you state a false fact in a real interview — that is the one failure mode worth spending code on.

**Exit criteria:** the 4 multi-turn eval cases pass 3/3 · the contract is *shorter* than at Phase 3's end · a question-then-hedge answer is impossible by construction, not by instruction.
**Effort:** 3–4 sessions. Highest complexity in the plan; also the highest ceiling.

---

## Phase 5 — Cover the rounds you actually sit

Gated on **D1**. Today: contracts for DSA, system design (dead until Phase 2), debugging (a bare colon-labelled skeleton), behavioral. **Zero** coverage for machine coding, LLD/OOP, API design, SQL and frontend.

For each round you name, use the established pattern:

1. A dependency-free `electron/llm/<x>Contract.ts` exporting the full contract + a `_TINY` variant for local models. Single source of truth — never duplicate the prose.
2. Register it in `CONTRACTS[roundKind]` (Phase 2.1) — the total `Record` means it cannot be half-wired.
3. Add its name to `CHAT_LAYOUT` / `CHAT_LAYOUT_TINY`'s exceptions line in **both** tiers. The contract being attached is not sufficient; chat_layout renders later and wins on recency unless told to defer by name.
4. Add 3–5 eval questions **before** writing the prose, so you are steering by score rather than by one transcript.

**Shape guidance learned the hard way:** ask whether the round is naturally *editorial* (coding: approach → approach → complexity, headings fine) or naturally *conversational* (system design, LLD discussion, debugging: no headings, flowing first-person). Copying coding's heading convention into system design was a real mistake that took three rounds to unwind.

**Priority order (adjust to D1):** machine coding (most common after DSA, and currently mis-routed to the DSA contract) → LLD/OOP → debugging upgrade from skeleton → SQL → API design → frontend.

**Exit criteria:** every round in D1 has a contract, ≥3 eval questions, and a measured score ≥ the DSA baseline.
**Effort:** ~1 session per round.

---

## Phase 6 — The subtraction sweep

Can run in parallel with Phases 3–5 (it touches no answer-path code), but **not before Phase 0**. Order within the phase: delete a feature *with* its IPC channels, preload entries, UI, DB tables and tests in one commit, so nothing is orphaned.

| Step | Content | Approx. LOC | Prereq |
| --- | --- | --- | --- |
| 6.1 | **Tier 2 — commercial scaffolding.** Licensing (incl. `license.rs` and its Gumroad/Dodo calls + hardware-ID derivation), trial, review prompting, donations, `InstallPingManager`, telemetry, plans/Pro/refund UI, quota banner, feature spotlight, 4 non-English locales, product onboarding, the OSS document set (README/CHANGELOG/terms/refund/PRIVACY/SECURITY/CoC/CONTRIBUTING/issue templates). | ~12k + 24 IPC + ~300KB docs | D6 |
| 6.2 | **Tier 3 — non-interview features.** Meeting notes + post-call + `MeetingPersistence`, Hindsight, Calendar (revoke the Google OAuth secret after), Skills, dynamic actions, browser extension + `browser-context`, Codex CLI/OAuth, 6 of 8 STT providers, 4–5 of 7 LLM providers (+ most of the 4,027-line provider settings screen). | ~20k+ | D2, D3, D5 |
| 6.3 | **Tier 4 — taxonomy and dead paths.** Removed modes' answer types (`sales_answer`, `negotiation_answer`, `lecture_answer`, `general_meeting_answer`, `product_candidate_mix_answer`), inert `SYSTEM_DESIGN` QuestionType, 3 never-emitted QuestionTypes, `DIRECT_SHORT_TEMPLATE`, remaining no-op polish layers. | ~2k | Phase 2 |
| 6.4 | **Prune prohibitions with the eval as guard.** 330 `never`s and 37 WRONG examples across five prompt files. Remove in batches of ~10; keep a removal only if the score holds. Expect to keep the failure-anchored WRONG/RIGHT pairs (those demonstrably worked) and drop most abstract bans. | — | Phase 1 |
| 6.5 | **Then delete the orphaned tests.** Only now, when their subject is gone. | large | 6.1–6.3 |
| 6.6 | **Write one honest README** describing what the tool is, how you run it, and the four commands that matter. | — | — |

**Exit criteria:** IPC channel count below ~150 · `npm run eval` unchanged (subtraction must not move quality) · every remaining npm script runs · no file in `electron/` is unreachable from `main.ts`.
**Effort:** 3–5 sessions, chunky but low-risk.

---

## Phase 7 — Structure, once the surface is small

Do this **after** Phase 6, not before — refactoring code you are about to delete is wasted work.

| # | Action | Why |
| --- | --- | --- |
| 7.1 | **Split `ipcHandlers.ts`** (12,879 lines / 342 channels) into per-domain modules with a registration table: `ipc/answer.ts`, `ipc/audio.ts`, `ipc/settings.ts`, `ipc/window.ts`. | This file is why threading one field through 8 call sites is a half-day and why the reset lost a coherent feature. |
| 7.2 | **Unify the classifiers.** 18 `QuestionType`s (retrieval) + ~38 `AnswerType`s (templates) + a 35-branch regex ladder (`AnswerPlanner.ts:2592-2863`) + three loose booleans = four overlapping answers to "what kind of question is this". Collapse to `RoundKind` (Phase 2) + a thin retrieval hint. | Three notions of the same thing is why one of them could silently go missing. |
| 7.3 | **Split `LLMHelper.ts`** (8,883) into per-provider adapters behind one interface. Trivial once D5 leaves 2 providers. | The temperature/seed/streaming special cases in §3 are duplicated per provider today. |
| 7.4 | **Split `NativelyInterface.tsx`** (8,700) — extract the transcript pane, answer pane and input bar. | Any UI change currently risks the whole overlay. |
| 7.5 | **Add a lint script** for the traps that keep recurring: prompt tests asserting a *banned* string's absence (the ban instruction legitimately quotes it), tests asserting token proximity in characters, and tests importing `dist-electron` without a build step. | Three separate sessions were lost to exactly these. |
| 7.6 | **Replace brittle wiring tests** with the eval. A test that asserts one token appears within 1400 characters of another in 9 files is not testing behaviour. | |

**Exit criteria:** no file over ~2,000 lines in the answer path · one classifier · `npm run eval` green throughout.
**Effort:** 4–6 sessions.

---

## Phase 8 — Make the platform claim true

Gated on **D4**. Pick one; the current state (claiming Windows, testing none of it) is the worst option.

**If macOS-only (recommended):** delete the `win` and `linux` electron-builder targets, the Windows Rust branches (`wasapi`, the `windows` crate), and the platform-dispatch scaffolding that exists only for a platform you do not ship. Rewrite `CLAUDE.md`'s cross-platform contract as a deliberate, documented macOS-only decision. **This deletes a maintenance obligation you are currently not meeting, and stops platform-branch review from taxing every future change.**

**If Windows for real:** add a `windows-latest` CI job, build and publish `index.win32-x64-msvc.node`, add a Windows release workflow, then *physically* verify overlay transparency, click-through, always-on-top, WASAPI system-audio loopback, global shortcuts, screenshots and content protection on real Windows. Budget several sessions and expect the overlay/stealth stack to need a genuine Windows implementation, not a port.

Either way: fix `app:dev`'s `--kill-signal SIGKILL` if the repo stays cross-platform, and add one CI job that runs `npm run eval` on a schedule so quality regressions surface without you remembering to look.

**Exit criteria:** every platform the config declares has a CI job, a native binary and a physical verification note — or is deleted.
**Effort:** 1 session (macOS-only) or 5+ (Windows).

---

## Sequencing

```
Phase 0  Stop the loss            ██                                    1 session   ← today
Phase 1  Measurement layer          ██████                              2-3         ← gates everything
Phase 2  Restore + RoundKind              ██████                        2-3
Phase 3  Voice / sampling                       ████                    1-2
Phase 4  State in code                              ████████            3-4
Phase 5  Round coverage (D1)                              ██████        1/round
Phase 6  Subtraction sweep                ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓              3-5   (parallel from Phase 2 on)
Phase 7  Structure                                          ████████    4-6
Phase 8  Platform truth (D4)                                      ██    1 (macOS-only)
```

**If you only do three things:** Phase 0 (protect the work), Phase 1 (build the judge), Phase 3.1 (raise the temperature). That is roughly four sessions and it addresses the loudest symptom you have.

---

## Definition of done

The tool is finished when:

1. `npm run eval` scores ≥4/5 on `human_voice` for every round in D1, across 3 runs each.
2. A multi-turn system-design conversation never loses an earlier established fact — enforced by code, not prose.
3. Asking a clarifying question and then answering it in the same turn is impossible by construction.
4. Every number in an answer traces to something the interviewer actually said.
5. Every round you sit has a contract; every contract has eval coverage.
6. `npm test`, `npm run typecheck:electron` and `npm run eval` are all green, and green means something.
7. Every file in `electron/` is reachable from `main.ts`, and every npm script runs.
8. The README describes the tool that exists.

---

## Risk register

| Risk | Mitigation |
| --- | --- |
| **Phase 1's judge is itself an LLM** and may not agree with your taste. | Calibrate against the 10 golden answers you hand-picked, and against the failure transcripts already documented. If the judge scores a known-bad answer well, fix the judge before trusting a single downstream number. |
| **Raising temperature (3.1) could destabilise classifiers.** | The change is scoped to *answer generation only*. Keep `temperature: 0` and the fixed seed for `IntentClassifier`, `TurnPlanner`, `AnswerPlanner` and validators. Verify the classifier tests separately. |
| **Deleting a feature breaks something silently** — 342 IPC channels have opaque coupling. | Delete one feature per commit with its IPC/preload/UI/DB/tests together; run the app after each. Never batch Tier 3 removals. |
| **Phase 4 is the most complex work in the plan** and could stall. | Phases 0–3 and 5–6 all deliver value without it. If Phase 4 stalls, the deterministic backstops in 4.4 capture much of the benefit for a fraction of the effort — do those first if you want early proof. |
| **The `premium` submodule may come back**, and Phase 0.4 stubs its import. | Stub behind a clearly-named shim rather than deleting the call sites, so restoring it is a one-file change. |
| **Test baselines are environment-flaky** (~51–56 failures, count varies; `checkAnswerRelevance — corpus regression pin` is the known flake). | Always diff failing test *names* against `baseline-2026-08-18.txt`, never counts. |
| **Losing work to another `git reset`.** | Commit early and often, on a branch, and never leave a day's work untracked. This already cost one evening's session and nearly cost the system-design contract permanently. |

---

---

## Interview Intelligence Implementation Roadmap

This section documents the interview intelligence layers built in `electron/context-intelligence/`. The phases below are **distinct from the platform roadmap's Phase 0–8** above: they are implementation phases for the classification, retrieval, strategy, and evaluation layers, executed between 2026-08-18 and 2026-08-25.

---

### Current Status

| Field | Value |
| --- | --- |
| Highest completed phase | Phase 16 (Classification Correctness) |
| V1 classification layer | VERIFIED — all 18 intents source-invariant |
| Golden dataset | 112 cases (gc_001–gc_112) |
| Phase 16 suite | 378/378 |
| Full suite | 8,003 pass / 544 fail (all failures pre-existing; none introduced by Phases 15–16) |
| V1 declared COMPLETE | Phase 14 (2026-08-24) |
| V1 declared VERIFIED | Phase 16 (2026-08-25) |
| Recommended next phase | Phase 17 (Prompt Composition Evaluation) |

---

### Architecture

The module is layered in six tiers. Data flows strictly downward; no tier imports from a tier below it.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BRIDGE  (orchestration/engine-bridge.ts)                               │
│  BridgeInput → resolves mode, scope, flags → calls Orchestrator         │
├─────────────────────────────────────────────────────────────────────────┤
│  CLASSIFICATION  (question/turn-classifier.ts)                          │
│  Question string → QuestionType[], ClaimRequirement[]                   │
│                 → InterviewIntent (18 intents, 17 domains, 8 behaviors) │
│                 → AnswerStrategy  (19 strategies via registry)          │
├─────────────────────────────────────────────────────────────────────────┤
│  POLICIES  (policies/)                                                  │
│  ModePolicy  — grounding policy, source authority, answer rules         │
│  ProviderScopePolicy  — data-scope enforcement per provider             │
├─────────────────────────────────────────────────────────────────────────┤
│  RETRIEVAL  (retrieval/)                                                │
│  CompositeRetrievalPort                                                 │
│    ├── ProfileRetrievalPort   RESUME, JOB_DESCRIPTION                  │
│    ├── ModeRetrievalPort      REFERENCE_FILE                            │
│    ├── StoryBankPort          user stories                              │
│    ├── MeetingRetrievalPort   MEETING_TRANSCRIPT                        │
│    └── LegacyRetrievalPort   backward-compat adapter                   │
├─────────────────────────────────────────────────────────────────────────┤
│  GENERATION  (generation/)                                              │
│  PromptComposer (composePrompt)  — single canonical composition site    │
│  ContextPacker                   — token-budget context assembly        │
├─────────────────────────────────────────────────────────────────────────┤
│  EVALUATION  (evaluation/)                                              │
│  GoldenCases (112 cases), GoldenEvaluator, golden-case-schema           │
└─────────────────────────────────────────────────────────────────────────┘
```

**Single-turn data flow:**
```
BridgeInput (surface, question, modeId, attachedFiles, scope, …)
  └→ EngineBridge
        └→ Orchestrator
              ├── TurnClassifier → QuestionType[], InterviewIntent, AnswerStrategy
              ├── ModePolicyRegistry → ModePolicy (grounding, source authority)
              ├── CompositeRetrievalPort → EvidenceItem[]
              └→ PromptComposer (personaBase + governance + evidence)
                    └→ LLM → answer
```

**Canonical contract types** (`contracts/types.ts`):

| Type | Values |
| --- | --- |
| `SourceType` | 10: RESUME, JOB_DESCRIPTION, PROFILE_FACT, REFERENCE_FILE, PROJECT_FILE, CODING_SAMPLE, CANDIDATE_FILE, MEETING_TRANSCRIPT, CONVERSATION_STATE, SCREEN_CONTEXT |
| `ClaimType` | 15: USER_EMPLOYMENT/PROJECT/SKILL/EDUCATION/MOTIVATION, JOB_RESPONSIBILITY/REQUIRED_SKILL/PREFERRED_SKILL, DOCUMENT_FACT, MEETING_STATEMENT/DECISION, SCREEN_FACT, GENERAL_TECHNICAL/INDUSTRY, RECOMMENDATION |
| `QuestionType` | 17: PERSONAL_EXPERIENCE/PROJECT/SKILL, JOB_REQUIREMENT/ROLE_ALIGNMENT, DOCUMENT_FACT/EXPLANATION, MEETING_FACT, SCREEN_SPECIFIC, GENERAL_TECHNICAL/INDUSTRY, CODING_TASK, SYSTEM_DESIGN, MIXED, FOLLOW_UP, AMBIGUOUS, META_REQUEST |
| `InterviewIntentType` | 18: concept_explanation, mechanism_explanation, technology_decision, comparison, tradeoff, coding_task, debugging, optimization, system_design, lld, project_context, project_deep_dive, experience_question, behavioral, introduction, scalability, knowledge_check, follow_up_generic |
| `InterviewDomain` | 17: javascript, typescript, react, frontend, backend, node, database, networking, os, general_cs, algorithms, data_structures, system_design, security, testing, devops, behavioral, project_specific, unknown |
| `StrategyId` | 19: define_concept, explain_mechanism, justify_decision, analyze_options, implement_solution, trace_bug, optimize_approach, design_system, design_classes, describe_project, narrate_experience, tell_behavioral_story, introduce_self, analyze_scale, continue_thread, defend_position, acknowledge_correction, restate_clearly, deepen_explanation |
| `GroundingPolicy` | 4: STRICT_SOURCE_ONLY, SOURCE_FIRST, OPEN_KNOWLEDGE, ASK_BEFORE_FALLBACK |
| `InterviewerBehavior` | 8: QUESTION, FOLLOW_UP, DEEPENING, PUSHBACK, CORRECTION, CLARIFICATION, HINT, TOPIC_CHANGE |

---

### Phase 2 — Interview Intent Classification

**Status:** COMPLETE · **Commit:** `bb5cfb95`

**Objective:** Replace ad-hoc boolean flags (`codingTask`/`dsaTask`/`systemDesignTask`) with a typed, exhaustive discriminator for interview intent.

**Implemented:**
- `InterviewIntent` interface and all supporting types in `contracts/types.ts`
- 18 `InterviewIntentType` values, 17 `InterviewDomain` values, 11 `QuestionStyle` values, 8 `InterviewerBehavior` values
- `ContextRequirements` (7 boolean fields: conversation, resume, projects, code, documents, stories, generalKnowledge)
- `ExpectedAnswer` shape (depth, structure, includeExample, includeTradeoffs, includeCode, includeComplexity)
- `DEFAULT_INTERVIEW_INTENT` backward-compat fallback
- `engine-bridge.ts` updated: derives `interviewIntent` from `questionTypes`
- Fix: coding contract `dsaTask !== false` default bug — `undefined` was selecting the DSA narrative for every coding turn
- Fix: two conversation-state bugs restored after git reset (`isLikelyAnswerToPendingQuestion`, `clarificationRootQuestion`)

**Key files:** `contracts/types.ts`, `question/turn-classifier.ts`, `orchestration/engine-bridge.ts`

**Tests:** TurnClassifier.test.mjs (Phase 2 classification section)

**Validation:** Covered by automated tests; physical execution on macOS.

---

### Phase 3 — Context Requirements Derivation

**Status:** COMPLETE · **Commit:** `85f2dd42` (combined Phase 3/4 commit)

**Objective:** Wire the first set of `ContextRequirements` boolean fields from classifier output.

**Implemented:**
- `conversation`, `resume`, `projects`, `code`, `documents` populated from question-type signals in `turn-classifier.ts`
- Initial topic-chain structure for multi-turn continuity

**Key files:** `question/turn-classifier.ts`

---

### Phase 4 — Topic Chain and Round State

**Status:** COMPLETE · **Commits:** `85f2dd42`, `0c30aa86`

**Objective:** Put interview conversation state in code so cross-turn context survives without relying on the model context window.

**Implemented:**
- `ChainTurn` interface: question, answerSummary (≤280 chars), intent, domain, interviewerBehavior
- Topic chain capped at `CHAIN_CAP = 6` turns; oldest evicted on overflow
- Chain resets on topic/domain shift (prevents context bleed across unrelated questions)

**Key files:** `contracts/types.ts` (ChainTurn), topic-chain logic in `question/`

**Tests:** TopicChain.test.mjs (471 lines)

---

### Phase 5 — Context Requirements: Complete Wiring

**Status:** COMPLETE · **Commit:** `0daca003`

**Objective:** Wire all 7 `ContextRequirements` fields and add systematic matrix test coverage.

**Implemented:**
- All 7 fields derived from classifier signals: conversation, resume, projects, code, documents, stories (partial), generalKnowledge
- `Phase5ContextRequirements.test.mjs`: systematic ContextRequirements matrix — each intent × each field × representative question

**Key files:** `question/turn-classifier.ts`

**Tests:** Phase5ContextRequirements.test.mjs (444 lines)

---

### Phase 6 — Answer Strategy Registry

**Status:** COMPLETE · **Commit:** `0efee714`

**Objective:** Select a construction-approach strategy per turn so the prompt-composer knows *how* to build the answer (step order, framing, depth), not just what topic to address.

**Implemented:**
- `AnswerStrategy` interface: id, triggerIntents, behaviorOverrides, promptSection, steps
- 19 strategies total:
  - 4 **override strategies** (`override-strategies.ts`): `defend_position`, `acknowledge_correction`, `restate_clearly`, `deepen_explanation` — fire on PUSHBACK/CORRECTION/CLARIFICATION/DEEPENING regardless of intent (Stage 1 scan)
  - 15 **intent strategies** (`intent-strategies.ts`): one per intent type (Stage 2 lookup)
- `STRATEGY_REGISTRY` (`registry.ts`): invariant-validated at module load — duplicate id, duplicate intent, forbidden override behavior all throw at startup
- `selectStrategy()` (`selector.ts`): Stage 1 = override scan, Stage 2 = intent lookup
- `prompt-composer.ts`: emits `answerStrategy.promptSection` in `<answer_strategy>` block
- Registry invariant: exactly 19 strategies enforced; any addition or removal throws

**Key files:** `strategies/override-strategies.ts`, `strategies/intent-strategies.ts`, `strategies/registry.ts`, `strategies/selector.ts`, `generation/prompt-composer.ts`

**Tests:** Phase6Strategy.test.mjs (366 lines)

---

### Phase 7 — Story Bank Port

**Status:** COMPLETE · **Commit:** `f517b0bd`

**Objective:** Connect the story retrieval path and promote `stories` to a first-class `ContextRequirements` field.

**Implemented:**
- `StoryBankPort` (`retrieval/story-bank-port.ts`): retrieves user story evidence from a dedicated store
- `CompositeRetrievalPort` (`retrieval/composite-retrieval-port.ts`): orchestrates all retrieval ports in priority order; returns merged, deduplicated `EvidenceItem[]`
- `stories: boolean` wired fully in `ContextRequirements`
- `storyBankActivated` field observable through the golden-case evaluator
- 48/48 Phase 7 tests pass

**Key files:** `retrieval/story-bank-port.ts`, `retrieval/composite-retrieval-port.ts`, `contracts/types.ts`

**Tests:** Phase7StoryBank.test.mjs (598 lines, 48 tests)

---

### Phase 8 — Wiring Consolidation and Immutability

**Status:** COMPLETE · **Commit:** `63bf1809`

**Objective:** Ensure all Phase 2–7 types and interfaces are correctly threaded through the full pipeline; make the `TurnDecision` immutable to prevent downstream mutation.

**Implemented:**
- Full audit of engine-bridge → orchestrator → composer wiring
- `TurnDecision` now carries `interviewIntent` and `answerStrategy` as typed fields (not raw strings)
- `freezeTurnDecision()` deep-freezes the entire decision object at the orchestrator exit point; mutation at any downstream site becomes a runtime error
  - *Why:* five independent source-decision sites were found drifting in the pre-V3 stack; freezing makes the invariant enforceable rather than conventional

**Key files:** `orchestration/engine-bridge.ts`, `orchestration/orchestrator.ts`, `contracts/types.ts`

---

### Phase 9 — Strategy Quality Assurance

**Status:** COMPLETE · **Commit:** `0f2317ed`

**Objective:** Verify strategy selection produces semantically appropriate strategies — not just structurally valid ones.

**Implemented:**
- For each of the 18 intent types: at least one representative question → expected strategy asserted
- For each of the 4 override behaviors (PUSHBACK, CORRECTION, CLARIFICATION, DEEPENING): override strategy verified
- Strategy `promptSection` content validated (non-empty, meaningful steps, not just structural)
- All 9 assertions pass for every strategy

**Tests:** Phase9StrategyQuality.test.mjs (292 lines)

---

### Phase 10 — Observability and Retrieval Hardening

**Status:** COMPLETE · **Commit:** `10c62749`

**Objective:** Make the pipeline's decisions observable and harden retrieval against stale-version and scope violations.

**Implemented:**
- `EvidenceProvenance` type (9 values): PROFILE_RESUME, PROFILE_JOB_DESCRIPTION, PROFILE_FACT, MODE_REFERENCE_FILE, LIVE_STT, IMPORTED_TRANSCRIPT, TEST_TRANSCRIPT, MEETING_NOTE, MANUAL_CHAT, PRIOR_ASSISTANT_MESSAGE — stamped by each retrieval port at the only layer that knows which store it read from
- `retrievedVersionId` on `RetrievalCandidate`: makes stale-version collision assertions possible (the active version and the retrieved version are now separately recorded)
- `answerabilityScore` carried through the `RetrievalCandidate` shape
- `recordLegacyTurn` in `observability/legacy-trace.ts`
- Profile source routing and scope-enforcement improvements

**Key files:** `contracts/types.ts`, `observability/legacy-trace.ts`, `retrieval/`

**Tests:** EvidenceProvenance2026_08_01.test.mjs, ProfileRetrievalPort2026_07_31.test.mjs

---

### Phase 11 — Evaluation Layer

**Status:** COMPLETE · **Commit:** `2b763b94`

**Objective:** Build a deterministic evaluation harness so answer-quality regressions are detectable without running live transcripts.

**Implemented:**
- `evaluation/golden-case-schema.ts`: `GoldenCase` type (id, question, risk level, expected fields)
- `evaluation/golden-cases.ts`: 46 initial golden cases across all 18 intent types
- `evaluation/golden-evaluator.ts`: runs every golden case against the live classifier; reports pass/fail per expected field; returns structured results
- `GoldenDataset.test.mjs`: golden evaluator wired into the test suite
- `ObservabilityRegression.test.mjs`: 16 seed cases
- 49 new tests pass at Phase 11 completion

**Key files:** `evaluation/`, `__tests__/GoldenDataset.test.mjs`

**Tests:** GoldenDataset.test.mjs (46 cases × multi-field assertions), ObservabilityRegression.test.mjs (16)

---

### Phase 12 — Hardening and Regression Armor

**Status:** COMPLETE · **Commit:** `2b3f0979`

**Objective:** Expand golden coverage to 85 cases, add strategy reachability invariants, and lock observability output shape.

**Implemented:**
- Golden dataset expanded from 46 to 85 cases; boundary and high-risk cases added per intent
- `StrategyReachability.test.mjs` (20 tests): every strategy must be reachable from at least one intent; every intent must map to a strategy — prevents dead-code strategy accumulation
- `ObservabilityRegression.test.mjs` expanded to 16 locked cases: observability output shape is now a regression boundary
- 124/124 new tests pass

**Tests:** StrategyReachability.test.mjs (20), ObservabilityRegression.test.mjs (16)

---

### Phase 13 — Golden Dataset Completion

**Status:** COMPLETE · **Commit:** `722faf53`

**Objective:** Bring the golden dataset to full coverage across all 18 intent types with representative and high-risk boundary cases.

**Implemented:**
- Golden dataset expanded from 85 to 99 cases (gc_001–gc_099)
- High-risk boundary cases for each intent type: cases that are plausible misclassifications (e.g., concept_explanation vs. knowledge_check, project_deep_dive vs. project_context)
- All 18 intent types covered with multiple representative questions

**Key files:** `evaluation/golden-cases.ts`

**Tests:** GoldenDataset.test.mjs (99 cases)

---

### Phase 14 — V1 Closure

**Status:** COMPLETE · **Commit:** `4432d09d`

**Objective:** Fix the last behavioral defect (AG-003) and declare the V1 interview intent classification layer complete.

**Defect fixed:**
- `PROJECT_DEEP_RE` extended with action verbs: handle, solve, approach, debug, troubleshoot, optimize, implement, fix, resolve, investigate, diagnose
- CODING_TASK branch guards against PERSONAL_PROJECT + PROJECT_DEEP_RE co-occurrence — "How did you solve X in your project?" reaches `project_deep_dive`, not `coding_task`
- gc_079 revised: `project_context` → `project_deep_dive` (semantically correct)
- gc_088–gc_091 lock the boundary and solve-conflict behavior

**Test results:** 1,116/1,118 pass (2 pre-existing FlagAndAdapter failures — Electron runtime requirement only)

**V1 architecture layers (all wired at Phase 14):**

| Layer | File |
| --- | --- |
| Turn classifier | `question/turn-classifier.ts` |
| InterviewIntent + ContextRequirements | `contracts/types.ts` |
| StrategyRegistry (19 strategies) | `strategies/` |
| Strategy selector | `strategies/selector.ts` |
| Composite retrieval | `retrieval/composite-retrieval-port.ts` |
| StoryBankPort | `retrieval/story-bank-port.ts` |
| Prompt composer | `generation/prompt-composer.ts` |
| Context packer | `generation/context-packer.ts` |
| Engine bridge | `orchestration/engine-bridge.ts` |
| Orchestrator | `orchestration/orchestrator.ts` |
| Evaluation harness | `evaluation/` |

**V1 DECLARED COMPLETE at Phase 14.**

---

### Phase 15 — V1 Correctness Remediation

**Status:** COMPLETE · **Commit:** `0610acb7`

**Objective:** Fix three root-cause defects found by requirement-first analysis (D-01, D-02, D-03). These were defects against the *intended architecture*, not probe-derived patches.

**Defects fixed:**

**D-01: Source-availability routing confusion**
- `hasAnyPersonalCue` flag gates the RESUME-primary fallback — questions with no personal cue no longer infer USER_PROJECT
- `d01Blocked = true` when fallback is suppressed; routes generic questions to `GENERAL_TECHNICAL` in last-resort
- `howWouldYouGeneral`: `/\bhow would you\b/.test(q) && !CONTEXT_ANAPHOR_RE.test(q)` — questions without a context anaphor ("this"/"it"/"that") → `GENERAL_TECHNICAL`; questions WITH an anaphor ("how would you scale *this* system?") → `DOCUMENT_FACT` (preserved)

**D-02: Weak personal-project language detection**
- `PERSONAL_PAST_PROJECT_RE` extended with past-tense decision verbs: chose, picked, adopted, selected, and the "made you [choice verb]" modal construction

**D-03: Classifier/persona split-brain**
- `engine-bridge.ts` now derives `codingTask` from `interviewIntent.intent` (the Phase 13 typed layer), not raw `questionTypes` strings

**Supporting fixes:**
- `METRIC_LOOKUP_RE` added to `definiteValueLookup`: metric questions ("peak transaction volume of the payments API") bypass `conceptComplement` suppression so they always route to grounded retrieval
- `isBareFollowUp` exception: "how do you X?" (5 words, no anaphor) is not treated as a bare follow-up

**Golden cases updated:**
- gc_012: `USER_MOTIVATION` (projects=true, stories=true, resume=false per CLAIM_AUTHORITY)
- gc_099: `concept_explanation`/`define_concept` (generalKnowledge=true, not DOCUMENT_FACT)

**New test file:** `Phase15SourceInvariance.test.mjs` (28 tests) — source availability must not change semantic intent

**Phase 15 suite:** 360/360 · **Full suite:** 8,003 pass / 544 fail (all pre-existing)

**V1 VERIFIED — architecture matches implementation at Phase 15.**

---

### Phase 16 — Classification Correctness

**Status:** COMPLETE · **Commits:** `accd1611`, `831da4ca`

**Objective:** Fix three defects where narrow regex patterns missed common real-world phrasings; verify all 18 intents are source-invariant.

**Defects fixed:**

**D1: INTRODUCTION_RE too narrow**
- Added: "walk me/us through your [adjective] background" — covers "professional", "career", "technical" modifiers and the "us" pronoun
- Added: "tell me a little about yourself" — modifier before "about yourself"

**D2: DEBUGGING regex incomplete**
- Added: "why is/does this/my [code-type noun]" — covers function, method, script, test, loop, program, query, app, service, component
- Added: "what is wrong with" — expanded form of "what's wrong"
- Added: "find the bug" / "find bugs"

**D3: EXPERIENCE_CHALLENGE_RE missing superlatives**
- Added "the" to article alternation (superlatives use "the", not "a/an")
- Added "hardest" and "toughest" to adjective list (only base forms "hard"/"tough" were present)

**Golden cases:** 13 new cases (gc_100–gc_112): introduction variants, debugging patterns, superlative experience questions, and negative boundaries

**Source-invariance matrix:** All 18 intents verified stable with and without attached documents

**New test file:** `Phase16ClassificationCorrectness.test.mjs` (34 tests):
- Section A: all 18 intents source-invariant
- Section B: D1 introduction fix positive + negative
- Section C: D2 debugging fix positive + negative
- Section D: D3 superlative experience positive + negative

**Phase 16 suite:** 378/378 · 0 new regressions

---

### Interview Coverage Matrix

| Category | Question Type | Status | Intent(s) |
| --- | --- | --- | --- |
| **Concept & Knowledge** | Concept definition ("What is X?") | ✅ SUPPORTED | concept_explanation |
| | Mechanism ("How does X work?") | ✅ SUPPORTED | mechanism_explanation |
| | Knowledge check ("What would you use for X?") | ✅ SUPPORTED | knowledge_check |
| **Problem Solving** | Coding task ("Write / implement X") | ✅ SUPPORTED | coding_task |
| | Debugging ("Why is this failing?") | ✅ SUPPORTED | debugging |
| | Optimization ("How would you optimize X?") | ✅ SUPPORTED | optimization |
| **Design** | System design / HLD | ✅ SUPPORTED | system_design |
| | Low-level design / OOP | ✅ SUPPORTED | lld |
| | Scalability analysis | ✅ SUPPORTED | scalability |
| **Decision & Tradeoff** | Technology decision | ✅ SUPPORTED | technology_decision |
| | Comparison ("X vs Y") | ✅ SUPPORTED | comparison |
| | Tradeoff analysis | ✅ SUPPORTED | tradeoff |
| **Project & Experience** | Project context | ✅ SUPPORTED | project_context |
| | Project deep-dive | ✅ SUPPORTED | project_deep_dive |
| | Experience question | ✅ SUPPORTED | experience_question |
| **Personal / Behavioral** | Behavioral / STAR | ✅ SUPPORTED | behavioral |
| | Introduction ("Tell me about yourself") | ✅ SUPPORTED | introduction |
| **Conversation State** | Generic follow-up | ✅ SUPPORTED | follow_up_generic |
| | Pushback response | ✅ SUPPORTED | override: defend_position |
| | Correction response | ✅ SUPPORTED | override: acknowledge_correction |
| | Clarification | ✅ SUPPORTED | override: restate_clearly |
| | Deepening elaboration | ✅ SUPPORTED | override: deepen_explanation |
| **Grounding Policy** | Open-world (general knowledge) | ✅ SUPPORTED | OPEN_KNOWLEDGE |
| | Source-first (resume / docs) | ✅ SUPPORTED | SOURCE_FIRST |
| | Strict source only | ✅ SUPPORTED | STRICT_SOURCE_ONLY |
| **Multi-turn** | Topic chain continuity (6-turn cap) | ✅ SUPPORTED | ChainTurn |
| | Anaphor-aware routing | ✅ SUPPORTED | CONTEXT_ANAPHOR_RE |

---

### Known Limitations / Technical Debt

1. **`general_cs` domain detection is approximate.** The domain classifier uses regex patterns; unusual phrasings in a general CS question may fall through to `unknown`. No eval case currently exercises the `unknown` domain path.

2. **`d01Blocked` is not directly unit-testable.** The source-availability fallback suppression flag is internal to the classifier. Its behavior is covered by golden cases and source-invariance tests but is not independently observable through the public API.

3. **Strategy prompt sections are not LLM-evaluated.** The 19 strategy `promptSection`/`steps` fields are verified structurally (non-empty, correct type) and heuristically (Phase9StrategyQuality.test.mjs) but not evaluated against actual LLM output for semantic quality.

4. **FlagAndAdapter.test.mjs: 2 pre-existing failures.** These require the Electron runtime (IPC, native modules) and cannot be fixed in the Node test environment. They predate Phase 2 and are not regressions.

5. **544 pre-existing full-suite failures.** All traced to native module ABI mismatches (better-sqlite3 under direct `node --test`), environment gaps (Electron-only IPC tests), or missing build artifacts. None originate in the context-intelligence layer.

6. **`StoryBankPort` activates on intent, not on story existence.** If the story store is empty, `stories: true` in `ContextRequirements` is set (the intent warrants stories) but retrieval returns no evidence. The classifier does not know whether stories exist, only whether the intent warrants them.

7. **No eval harness for full prompt composition.** `GoldenDataset.test.mjs` validates classification and strategy selection. It does not run `composePrompt()` → LLM and evaluate the resulting answer. Answer quality is not machine-verified.

8. **`implementation_walkthrough` AnswerStructure not end-to-end tested.** This structure is assigned to debugging intents; the strategy steps exist but no eval case runs it through full prompt composition. Deferred from Phase 15.

---

### Recommended Next Phase — Phase 17: Prompt Composition Evaluation

**Rationale:** The V1 classifier is verified (Phase 16). The next largest gap is that `composePrompt()` output is never machine-evaluated. A question can reach the correct intent, correct strategy, and correct retrieval path — and still produce a poorly-structured answer because the `promptSection` content is verified only structurally, not semantically.

**Scope:**
1. For each of the 18 intent types, run `composePrompt()` with a representative `TurnDecision` + empty evidence + known policy, and assert structural properties of the output:
   - `<answer_strategy>` section present and contains the strategy's steps
   - Evidence section absent when `generalKnowledge: true` and no evidence was retrieved
   - `personaBase` section ordered before all governance sections
   - No strategy section when intent is `follow_up_generic` with `OPEN_KNOWLEDGE`
2. Add 18 composition golden cases to the test suite (one per intent)
3. Add a reachability invariant: every `StrategyId` in the registry must appear in at least one composition test

**Why Phase 17 before LLM-based answer quality eval:**
- Composition invariants are deterministic, fast (no LLM calls), and already implied by the architecture but nowhere asserted
- They close the gap between "strategy selected" and "strategy instructions actually reach the model in the correct position"
- The composition test suite becomes a regression guard for future `prompt-composer.ts` changes

**What this does NOT cover:** Actual answer quality (human voice, grounding, pacing) — that requires LLM calls, is non-deterministic, and needs human calibration against golden transcripts. That is a separate future phase.

**Estimated tests:** ~50–60 new tests  
**Key files to modify:** `generation/prompt-composer.ts`, new `__tests__/Phase17PromptComposition.test.mjs`  
**Exit criteria:** Every strategy in the registry is verified to appear in the composed prompt for its canonical intent; `composePrompt()` with no evidence + generalKnowledge=true produces no evidence block.
