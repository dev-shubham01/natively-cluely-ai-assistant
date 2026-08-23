# Natively — End-to-End Project Review

**Date:** 2026-08-18
**Reviewed tree:** `main` @ `c6355a97` (+ one untracked file)
**Product scope as of this review:** a *personal, technical-interview-only* assistant (single mode: `technical-interview`). Every other mode was removed in the Phase 1/Phase 2 mode-lock refactor.
**Companion document:** [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md) — the phased plan derived from these findings.

---

## 0. How to read this report

This is a review of the codebase **against its current purpose**, not against the product it used to be. Natively was built as a commercial, multi-mode, cross-platform, monetized meeting copilot with 8 modes, 8 STT providers, licensing, trials, a Chrome extension, phone mirroring, calendar integration and a public OSS presence. It is now one person's interview tool. Almost every finding below follows from that gap.

Findings are labelled:

| Label | Meaning |
| --- | --- |
| **[VERIFIED]** | I executed a command or read the exact code in this session; evidence cited inline |
| **[PRIOR-AUDIT]** | Established in the 2026-08-18 answer-quality audit earlier today, re-checked here where cheap |
| **[ESTIMATE]** | A sizing or judgment call, explicitly approximate |

Nothing in this report was changed in the tree. This is a read-only review.

---

## 1. Executive summary

**The code is not the problem. The *surface area* is the problem, and the *absence of a quality signal* is the problem.**

Five things matter more than everything else in this document:

1. **The build's own test entry point is red for a missing file, not a regression.** `npm test`, `test:llm`, `ci:tier1` and `test:ci` all fail at collection because one test imports `benchmarks/…/answer_quality_judge.ts`, and `benchmarks/` is gitignored *and absent from disk*. 27 npm scripts point into directories that do not exist. **[VERIFIED]**
2. **The system-design feature is dead code and one `git clean` from being gone forever.** `electron/llm/systemDesignContract.ts` — 15 rounds of live-tested prompt design — is untracked and has **zero importers**. Its own header comment names two importers that do not exist. **[VERIFIED]**
3. **The live answer path drops the round discriminators.** `engine-bridge.ts:114` types `personaBase` as `(ctx: { codingTask: boolean })` and computes only `codingTask` at `:241`. `dsaTask` is never passed (so "write a React stopwatch" gets the DSA narrative contract), and `systemDesignTask` does not exist at all (so the system-design contract can never attach on the path that serves ~all real turns). **[VERIFIED]**
4. **The single highest-leverage realism fix is one line.** Every interview answer is generated at `INTERACTIVE_TEMPERATURE = 0.2` with `INTERACTIVE_SEED = 7` (`LLMHelper.ts:166-167`) — modal, textbook, byte-identical across runs. The comment admits the goal was removing run-to-run variance, which is a document-generator objective, the opposite of interview realism. **[VERIFIED]**
5. **Roughly a third to a half of the production code no longer serves the product.** Monetization, licensing, trials, review prompting, telemetry, phone mirroring, calendar, meeting notes, skills, a Chrome extension, 8 STT providers, 5 translated locales, and the entire OSS-product document set are all still live and maintained. **[ESTIMATE: 60k–90k of 202k production LOC]**

### By the numbers **[VERIFIED]**

| Metric | Value |
| --- | --- |
| Production LOC (`electron` + `src`, excl. tests) | **202,402** |
| Test LOC | 127,225 across **758** `.test.mjs` files |
| `electron/llm` | 284 files / 56,116 lines |
| `electron/services` | 384 files / 89,867 lines |
| `electron/intelligence` | 140 files / 25,210 lines |
| Largest files | `ipcHandlers.ts` 12,879 · `LLMHelper.ts` 8,883 · `NativelyInterface.tsx` 8,700 · `main.ts` 8,153 |
| IPC channels registered in one file | **342** (`safeHandle` ×360 / `safeOn` ×3) |
| npm scripts | 85, of which **27** reference missing paths (24 distinct) |
| Runtime dependencies | 59, of which **10** have zero import sites |
| Locales shipped | 5 (en + es/zh/ja/ru, 3,873 generated lines) |
| STT providers implemented | 8 (5,134 lines) |
| DB migrations | 26 versions, 23 tables |
| CI jobs by OS | macOS ×2, ubuntu ×1, **Windows ×0** |
| Native module binaries present | 1 (`index.darwin-arm64.node`) |

---

## 2. Blockers — things that are broken *right now*

### 2.1 The test suite cannot collect **[VERIFIED]**

`electron/llm/__tests__/AnswerQualityJudge2026_06_08.test.mjs:14` does `await import(<benchmarks path>)`. `benchmarks/` is gitignored at `.gitignore:369` and does not exist on disk.

```bash
node --test electron/llm/__tests__/AnswerQualityJudge2026_06_08.test.mjs
```

→ `# fail 1`, `failureType: 'testCodeFailure'`, `code: 'ERR_TEST_FAILURE'`.

Because `npm test`, `npm run test:llm` and `npm run ci:tier1` all glob `electron/llm/__tests__/**/*.test.mjs`, **every one of them is red before a single assertion runs.** `test:ci` chains through `npm test`, so it is red too. The practical consequence is worse than the red build: a red suite that is *expected* to be red trains you to stop reading it, which is exactly how the next real regression ships unnoticed.

### 2.2 27 npm scripts point at nothing **[VERIFIED]**

24 distinct missing paths. Three whole trees are referenced but absent:

| Missing tree | Scripts depending on it |
| --- | --- |
| `benchmarks/profile-intelligence/` (18 files) | `benchmark:profile*`, `benchmark:wta*`, `benchmark:manual-*`, `benchmark:residual-failures`, `benchmark:multimode:1000`, `benchmark:followup:500`, `benchmark:longsession:100`, `benchmark:livememory`, `benchmark:answer-quality`, `benchmark:live-replay:50`, `benchmark:l4-aggregate`, `test:l4-aggregator`, `ci:tier2`, `ci:tier3`, `ci:tier4` |
| `intelligence-eval-real-ui/` (4 files) | `test:intelligence:ui`, `:headed`, `:debug`, `:report`, `:grader`, `eval:intelligence:ui` |
| `natively-api/tests/` (empty submodule dir) | `test:e2e:screen-understanding` |
| `benchmarks/meeting-notes/` | `eval:meeting-notes` |

`ci:tier2` through `ci:tier4` — the entire declared quality ladder above tier 1 — cannot run at all.

### 2.3 The system-design contract is orphaned *and* untracked **[VERIFIED]**

```
git status --porcelain  →  ?? electron/llm/systemDesignContract.ts
grep -rn "systemDesignContract\|SYSTEM_DESIGN_CONTRACT" electron src  →  (only the file itself)
```

121 lines of very dense prose (~8.3k tokens) encoding 15 rounds of live-tested interview behaviour: stop-and-wait clarification, one-question-at-a-time pacing, PROBLEM→why-it-fails→solution→trade-off discovery narrative, `[[INTERVIEWER_QUESTIONS]]` direction, anti-fabrication of interviewer-owned facts. **None of it reaches a model.** It survived a `git reset` only because it was never `git add`-ed; it is one `git clean -fd` away from permanent loss, and it is not in any backup that a `git` operation would protect.

**This is the single most urgent action item in the repo, and it costs one commit.**

### 2.4 The round discriminators are missing from the live path **[VERIFIED]**

`electron/context-intelligence/orchestration/engine-bridge.ts`:

```ts
:114   personaBase?: (ctx: { codingTask: boolean }) => string | null;
:241   codingTask: (result.decision.questionTypes as readonly string[]).includes('CODING_TASK'),
```

Meanwhile `promptSystemV2.ts:486` decides which coding contract to use with:

```ts
const useDiscoveryContract = isCodeHintAction || input.dsaTask !== false;
```

`undefined !== false` is `true`, so **every** coding turn on the V3 path selects the DSA discovery narrative — including pure implementation asks ("write a React stopwatch", "implement debounce"), for which `CODING_CONTRACT_IMPL` exists and is never selected. And since `systemDesignTask` is absent from the bridge's type entirely, the system-design block cannot attach on the path that `DEFAULT_ENABLED = true` (`context-intelligence/contracts/flag.ts:108`) makes the primary one.

`dsaTask` is threaded correctly through the *legacy* files (`LLMHelper.ts`, `ipcHandlers.ts`, `AnswerLLM.ts`, `WhatToAnswerLLM.ts`, `promptSystemV2.ts`) — the path V3 short-circuits. The wiring exists everywhere except where it runs.

### 2.5 `typecheck:electron` has a standing error **[VERIFIED]**

```
electron/services/resolveCompanySearchProvider.ts(11,37): error TS2307:
Cannot find module '../../premium/electron/knowledge/CompanyResearchEngine'
```

The `premium` submodule's remote returns "Repository not found." It is not un-initialised; it is unreachable. The renderer typecheck (`npx tsc --noEmit`) is clean. So the electron typecheck can never be green until this import is deleted or stubbed — meaning "typecheck is clean" is not a usable gate today.

---

## 3. Answer quality — the mechanisms still in place

All re-verified against the current tree today. This section is the short form; the full causal chain is in the answer-quality audit.

| # | Mechanism | Evidence | Effect |
| --- | --- | --- | --- |
| 1 | Nine `AnswerPlanner.ts` templates literally begin `Use exactly these sections:` | `:200, 217, 248, 270, 313, 328, 349, 363, 386` **[VERIFIED]** | Form-filling instruction → form-filling voice. DSA is the only template rewritten as narrative, and the only round that reads right. |
| 2 | `SYSTEM_DESIGN_TEMPLATE` is 115 tokens of colon labels | `AnswerPlanner.ts:363` **[VERIFIED]** | The live system-design shape, versus the 8.3k-token dead contract in §2.3. |
| 3 | `formatAnswerPlanForPrompt` hands the model a config struct under `STRICT RESPONSE TEMPLATE:` | `AnswerPlanner.ts:3065` **[PRIOR-AUDIT]** | The model is prompted as a form renderer, not a candidate. |
| 4 | `INTERACTIVE_TEMPERATURE = 0.2`, `INTERACTIVE_SEED = 7` | `LLMHelper.ts:166-167`, applied at `:7020, 7164, 7211, 7462` **[VERIFIED]** | Modal, textbook phrasing; identical output every run. Highest realism-per-line-changed fix available. |
| 5 | The humanizer's denylist excludes exactly the interview rounds | `humanLikeness.ts:39-43` names `coding_question_answer`, `dsa_question_answer`, `system_design_answer`, `debugging_question_answer`, `technical_concept_answer` **[VERIFIED]** | The one anti-AI module skips every round this product exists to serve. |
| 6 | The humanizer never runs on the live path anyway | gated behind `answerDiversityGuard`, `default: false` (`intelligenceFlags.ts:409`) **[VERIFIED]** | Also inert: `applySpeakabilityBudget` (returns input), `trimToSpeakable` (documented no-op), `clampResponse` / `validateResponse` / `DIVERSITY_REPAIR_INSTRUCTION` (no call sites). The only always-on anti-tell is em-dash→comma. |
| 7 | Five prompt layers give contradictory system-design orders | `<human_voice>` bans labels · `<length>` carves system design out as "structured" · `<active_mode>` demands six topics in order · `SYSTEM_DESIGN_TEMPLATE` labels them · `<chat_layout>` appends `**Good interview answer:**` **[PRIOR-AUDIT]** | Four layers vote "document". Document wins. Precedence is negotiated in prose across four files instead of decided in code. |
| 8 | `validateCodingMarkdown` hard-codes `repaired: undefined` | `AnswerValidator.ts:188` **[PRIOR-AUDIT]** | DSA format failures are detected, logged, and never fixed. |

**The pattern across all eight:** every anti-AI mechanism that exists is either denied to the interview rounds, disabled by default, or a no-op — while every pro-document mechanism is unconditional.

---

## 4. What should be removed

Ordered by risk, lowest first. Sizes are non-test lines unless noted.

### Tier 1 — Safe deletes: zero behaviour change, no decision needed

| Item | Size | Evidence / why |
| --- | --- | --- |
| `renderer/` | 75 lines + own `package.json` & lockfile | Untouched create-react-app scaffold (`App.test.tsx`, `logo.svg`, `reportWebVitals.ts`). Not referenced by `vite.config.mts` or any build script. **[VERIFIED]** |
| 10 unused runtime deps | — | Zero import sites *and* zero references anywhere: `@paper-design/shaders-react`, `@google/stitch-sdk`, `@tavily/core`, `@grpc/proto-loader`, `@elevenlabs/client`, `@elevenlabs/elevenlabs-js`, `screenshot-desktop`, `three`, `tap`, `liquid-glass-react` (only named in comments; its displacement map was copied into `src/lib/glassDisplacementMap.ts`). **[VERIFIED]** |
| 27 broken npm scripts | — | §2.2. Delete or restore; leaving them is worse than either. |
| `electron/visionBenchmark/` + `test:vision-benchmark` + `vision-benchmark.models.json` + `docs/VISION_MODEL_BENCHMARK.md` | 868 | Zero references from `main.ts` or `ipcHandlers.ts`. A one-off model bake-off, kept as product code. **[VERIFIED]** |
| `electron/premium/` + the `premium` submodule import | 37 + 1 tsc error | §2.5. The remote is gone. Stub or delete the import and `typecheck:electron` goes green. **[VERIFIED]** |
| ~35 one-off scripts in `scripts/` | ~6k **[ESTIMATE]** | `okf-*` (5), `smoke-okf-*` (9), `seminar-fix-2/`, `seminar-hardening/`, `hindsight-*` (4 incl. a Python dev server), `*thesis*` (3), `pi-*` (3), `profile-jd-loop`, `benchmark-*`, `live-*`, `verify-*` (6). Each was a debugging session's scratch file. **[VERIFIED: file list]** |
| Stray artifacts | — | `logs/telemetry.jsonl`, `intelligence-eval-results/iteration-002.json`, `reports/post-pr367-*` (2), `harness.html`, `thinkingDotHarness.html`. |

### Tier 2 — Commercial-product scaffolding: dead weight for a personal tool

None of this serves a single-user tool, and some of it actively phones home.

| Item | Size | Notes |
| --- | --- | --- |
| Licensing | `native-module/src/license.rs` 466 + 6 IPC channels | Verifies keys against `api.gumroad.com` and Dodo Payments, derives a hardware ID from `machine_uid`. **A personal tool should not contain a license server client, and should not read a machine UID.** **[VERIFIED]** |
| Free trial | 1,072 (`src/components/trial/`) + 6 IPC (`trial:start/status/convert/end-byok/wipe-profile-data`) | **[VERIFIED]** |
| Review prompting | 426 + 63 + 903 (`ReviewModal`) + 274 (`ReviewPromptHost`) + 8 IPC | Asks you to review your own app. **[VERIFIED]** |
| Donations | 82 + 254 (`SupportToaster`) + 3 IPC | **[VERIFIED]** |
| `InstallPingManager` | 182 | Install-count telemetry to a remote. **[VERIFIED]** |
| `electron/services/telemetry/` | 714 | Keep only if you personally read it; otherwise it is unaudited egress. |
| Plans / Pro / refund UI | 325 + 1,254 + 176 | `PlansSettings`, `NativelyProSettings`, `HowItWorksRefund`. **[VERIFIED]** |
| `NativelyQuotaBanner`, `FeatureSpotlight` | 130 + 285 | Growth surfaces. **[VERIFIED]** |
| `src/components/onboarding/` | 2,018 | 5 files of first-run toasters and permission walkthroughs. Keep *one* permissions check; the orchestrated toaster host is product onboarding. |
| 4 non-English locales | 3,873 generated lines | `i18n.{es,zh,ja,ru}.generated.ts` + `i18n.ru.generated2.ts` (a duplicate). **[VERIFIED]** |
| OSS/product docs | ~300KB | `README.md` (60KB), `CHANGELOG.md` (136KB), `termsandcondition.md` (44KB), `refund.md`, `PRIVACY.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `ROADMAP.md` (stale product roadmap), `.github/ISSUE_TEMPLATE/`, `FUNDING.yml`, `.github/releases/`. Replace with one honest README describing *your* tool. |

**Tier 2 total ≈ 12k LOC + 24 IPC channels + ~300KB docs. [ESTIMATE]**

### Tier 3 — Non-interview features: each needs a keep/kill decision from you

These are *working* features. They just are not interview features. I have flagged my recommendation, but the call is yours.

| Feature | Size | Recommendation |
| --- | --- | --- |
| **Phone mirroring** — `PhoneMirrorService` 1,789 + `phoneMirrorClient` 965 + `PhoneMirrorSettings` 797 + **46 IPC channels** + QR code dep | 3,551 | **Decide deliberately.** This is the single largest non-core feature and owns 13% of the IPC surface. It could be genuinely useful in an interview (answers on a second screen, off the shared display) — or it could be 3.5k lines you never open. |
| **Meeting notes / post-call** — `services/meeting/` 3,091 + `MeetingPersistence` 1,032 + `post-call/` 178 | 4,301 | **Remove.** Post-call summaries are a meeting-product feature. `MeetingPersistence` is already referenced 0 times from `main.ts`/`ipcHandlers.ts`. **[VERIFIED]** |
| **Hindsight memory** — `HindsightManager` 1,049 + `HindsightStatusBanner` 253 + 4 IPC + 4 `.env` keys + a Python dev server script | 1,302 | **Remove.** An external memory backend for cross-meeting recall. Interview turns need *within-session* state (see §5.3), which this does not provide. |
| **Calendar** — `CalendarManager` 493 + 3 IPC + Google OAuth client id/secret in `.env` | 493 | **Remove.** Meeting-joining feature. Also removes an OAuth secret from your `.env`. |
| **Skills** — `SkillsManager` 889 + `services/skills/` 1,384 + `SkillsSettings` 705 + 5 IPC | 2,978 | **Remove** unless you actively author skills. |
| **Dynamic actions** — `services/dynamic-actions/` 561 + `components/dynamic-actions/` 228 + 3 IPC | 789 | **Remove.** Suggestion-chip infrastructure for meeting contexts. |
| **Browser extension** — `natively-browser/` 3,861 + `services/browser-context/` 961 | 4,822 | **Remove.** A separate Chrome extension with its own store assets, plus in-app plumbing. Screen capture already covers reading a CoderPad/HackerRank tab. |
| **Codex CLI/OAuth** — 1,020 + 769 + 5 IPC | 1,789 | **Remove** unless you route answers through Codex. |
| **7 of 8 STT providers** — Deepgram 326, ElevenLabs 389, Google 470, NativelyPro 1,059, Soniox 456, Rest 517, LocalWhisper 813 | up to 4,030 | **Keep two:** one cloud streaming (whichever you actually use — OpenAI at 1,104 lines is the most developed) plus `LocalWhisperSTT` as the offline fallback. Every extra provider is a device-enumeration and reconnect path you must keep working on two OSes. |
| **LLM providers** — 7 wired (`groq`, `claude`, `openai`, `gemini`, `deepseek`, `ollama`, `codex`) + `AIProvidersSettings.tsx` 4,027 | 4,027 UI | **Keep 2–3.** A 4,027-line provider settings screen for a one-user tool is pure carrying cost; each provider also multiplies the temperature/seed/streaming edge cases in §3. |
| **Knowledge packs / RAG** — `services/knowledge/` 4,997 + `electron/rag/` 5,740 + 12 IPC + 8 DB tables | 10,737 | **Decide, then commit to it.** Only justified if you use resume/JD grounding for behavioral rounds. If the tool is DSA + system design + coding only, this is the largest single deletion available. |

**Tier 3 total ≈ 28k–39k LOC depending on your decisions. [ESTIMATE]**

### Tier 4 — Taxonomy and dead-path cleanup

| Item | Evidence |
| --- | --- |
| Removed modes' answer types survive | The `AnswerType` union still has `sales_answer`, `negotiation_answer`, `lecture_answer`, `general_meeting_answer`, `product_candidate_mix_answer` (`AnswerPlanner.ts:37-49`) — Phase 2 removed mode *ids*, not answer types. **[VERIFIED]** |
| `SYSTEM_DESIGN` QuestionType is inert | Its only consumers are a `generalish` bool and `MIXED`; no prompt block attaches on it. **[PRIOR-AUDIT]** |
| 3 QuestionTypes never emitted | `ROLE_ALIGNMENT`, `DOCUMENT_EXPLANATION`, `GENERAL_INDUSTRY`; `DIRECT_SHORT_TEMPLATE` is dead. **[PRIOR-AUDIT]** |
| Dead polish layers | `applySpeakabilityBudget`, `trimToSpeakable`, `clampResponse`, `validateResponse`, `DIVERSITY_REPAIR_INSTRUCTION` — inert or call-site-free (§3). |
| 330 `never`s + 37 WRONG examples across five prompt files | Each prohibition costs attention on every single turn and plants the string it forbids. **[PRIOR-AUDIT]** |
| Tests for deleted features | 758 test files, of which a large share exercise removed modes, meeting flows, trials and licensing. **[ESTIMATE]** — size this only *after* the feature deletions, so you delete tests with their subject, not separately. |

---

## 5. Architecture findings

### 5.1 Four god files hold the system together

`ipcHandlers.ts` (12,879 lines, 342 channels), `LLMHelper.ts` (8,883), `main.ts` (8,153, 43 `process.platform` branches), `NativelyInterface.tsx` (8,700). **[VERIFIED]**

The practical cost is not aesthetic. `ipcHandlers.ts` is where the round-discriminator wiring has to be threaded through 8 call sites; it is why the `systemDesignTask` work was lost as a unit; it is why a "small prompt fix" turns into a cross-file hunt. Any change touching the answer path pays a tax here.

### 5.2 Two classifiers with no shared taxonomy

`turn-classifier.ts` emits 18 `QuestionType`s for retrieval routing. `AnswerPlanner.ts` emits ~38 `AnswerType`s for template selection, via a **35-branch regex ladder** at `:2592-2863` with no LLM involved. Neither is derivable from the other. Contract activation is then re-derived a *third* time as loose booleans (`codingTask`, `dsaTask`, and the vanished `systemDesignTask`) threaded through 8 call sites. **[PRIOR-AUDIT, spot-checked]**

Three overlapping notions of "what kind of question is this" is why §2.4 could silently lose one of them.

### 5.3 Multi-turn interview state is architecturally blocked

`system_design_answer`'s required layers are `['live_transcript', 'active_mode', 'screen_context', 'preferred_language']` — no `prior_assistant_responses`. `contextRoute.ts:132` makes that layer fail-closed, `stripPriorAssistantTurns` deletes the assistant's own turns from the snapshot, and the layer's budget is 600 chars regardless. **[PRIOR-AUDIT]**

So the system-design contract's core instruction — *"treat this as a small state machine, never lose a fact an earlier state established"* — asks the model to remember what it is forbidden to see. The only recovery path is you reading the answer aloud so STT re-injects it as `[ME]:`.

**This is the deepest structural finding in the report.** Interview realism is a dialogue-state problem being solved as a single-shot template problem. Ten rounds of prompt-engineering gotchas in the contract's history are compensating in prose for state that does not exist in code.

### 5.4 Zero coverage for half the rounds you will actually sit **[VERIFIED]**

Grep across non-test `electron/`:

| Round | Files mentioning it |
| --- | --- |
| machine coding | **0** |
| API design | **0** |
| SQL round | **0** (`sql` appears in 42 files, all DB/storage code) |
| frontend round | **0** |
| LLD / OOP design | 8 / (`OOP` matches 87 files, none as a round type) |

There are contracts (real or dead) for DSA, system design, debugging and behavioral. There is nothing for machine coding, low-level design, API design, SQL, or frontend — rounds that appear in most real interview loops.

### 5.5 342 IPC channels for a single-user app

50 `get*`, 43 `set*`, 46 phone-mirror, 14 profile, 14 modes (for a one-mode app), 12 knowledge, 11 local-model, 10 context, 8 review, 8 codex, 6 trial, 6 license, 6 rag, 5 skills, 4 hindsight, 3 calendar. **[VERIFIED]** After the Tier 2/3 deletions this should fall by well over 100 channels.

---

## 6. Cross-platform analysis

Per `CLAUDE.md`, this is a required section. **The honest finding: the repo declares macOS + Windows support, and only macOS is real.**

### What the code says

- 162 `process.platform` sites across `electron`/`src`/`scripts`; `win32` named in 19 files, `darwin` in 32. **[VERIFIED]**
- Concentrated in `main.ts` (43), `WindowHelper.ts` (22), `ScreenshotHelper.ts` (10), `CropperWindowHelper.ts` (8), `ipcHandlers.ts` (7) — i.e. exactly the overlay/capture/window-level areas `CLAUDE.md` flags as platform-sensitive.
- `electron-builder` declares `win: [nsis x64/ia32, portable x64]` and `linux: [AppImage, deb]` targets. **[VERIFIED]**
- The Rust native module *does* have Windows sources: `wasapi = "0.13.0"` and the `windows` crate under `[target.'cfg(target_os = "windows")'.dependencies]`. **[VERIFIED]**

### What is missing

| Gap | Evidence |
| --- | --- |
| **No Windows CI job at all** | `.github/workflows/`: `build-smoke.yml` → `macos-latest` ×2, `release-macos.yml` → `macos-14`, `react-doctor.yml` → `ubuntu-latest`. **[VERIFIED]** |
| **No Windows release workflow** | Only `release-macos.yml` exists. The NSIS target is declared but never built by CI. **[VERIFIED]** |
| **Only one native binary present** | `native-module/index.darwin-arm64.node`. No `index.win32-x64-msvc.node`. A Windows run would fail at `nativeModuleLoader`. **[VERIFIED]** |
| **No Linux support despite Linux targets** | AppImage/deb targets are declared with no CI, no native binary and no platform branches. Declared-but-absent, same as Windows. |
| **macOS-only stealth stack** | `StealthKeyboardManager` is CGEventTap-based (`SettingsWindowHelper.ts:287`); `stealth_window.rs` and the `cidre` dependency are macOS-only. The overlay/click-through/content-protection behaviour that is the product's core has no reviewed Windows equivalent. |
| **`app:dev` uses `SIGKILL`** | `concurrently --kill-signal SIGKILL` — Unix signal semantics in a shared script. **[VERIFIED]** |

### Recommendation

Pick one and make the repo tell the truth:

- **(A) macOS-only** — delete the `win`/`linux` electron-builder targets, delete the Windows Rust branches, and strip the `CLAUDE.md` cross-platform contract down to "macOS only, deliberately." This is the honest choice for a personal tool on a Mac, and it deletes a large maintenance obligation you are not meeting.
- **(B) Genuinely support Windows** — add a `windows-latest` CI job, build and commit/publish the `win32-x64-msvc` native binary, and physically verify overlay, click-through, always-on-top, system-audio loopback, global shortcuts and screenshots on real Windows.

Doing neither is the current state, and it is the worst of the three: the config claims support that no test, build or binary backs.

---

## 7. Testing and quality signal

| Finding | Detail |
| --- | --- |
| 758 test files, 127k test LOC | And **zero golden files**. No fixture anywhere pairs an interview question with a known-good answer. **[PRIOR-AUDIT]** |
| Of 181 `electron/llm/__tests__` files | 29 assert prompt *substrings*; 12 test regex post-processors on synthetic text; 1 calls a real model (opt-in `RUN_PROMPT_V2_EVAL=1`, never in CI). **[PRIOR-AUDIT]** |
| Consequence | You can rewrite a prompt into something far worse and the suite stays green as long as the greppable tokens survive. This is why the answer-quality problem persisted through many rounds of prompt work. |
| The eval layer that could have caught it is gone | `answer_quality_judge.ts` returned `overall_human_quality_score`, `speakability_score`, and `wrong_voice`/`over_hedged` flags. It lived in gitignored `benchmarks/`. **[PRIOR-AUDIT]** |
| Brittle-by-construction tests | `PromptSystemV2Wiring2026_08_01.test.mjs` asserts one token appears within *1400 characters* of another in 9 files — adding a comment can break it. `…Composition…test.mjs` reads `dist-electron`, so it silently tests stale output unless you `build:electron` first. **[PRIOR-AUDIT]** |
| Known-flaky baseline | ~51–56 pre-existing failures in `test:llm`, count varies run to run; `checkAnswerRelevance — corpus regression pin` is the known flake. Comparing *failing test names* against a stash baseline is the only reliable regression check today. **[PRIOR-AUDIT]** |

**Bottom line:** there is a very large test suite and almost no signal about the thing the product is judged on. 127k lines of tests, zero of which can tell you whether an answer sounds like a person.

---

## 8. Security and privacy

Good news first — this is the healthiest area of the repo.

| Finding | Status |
| --- | --- |
| `.env` with 22 secrets (Google OAuth, OpenAI, Claude, Gemini, Groq, Deepgram, ElevenLabs, Azure, IBM Watson, Hindsight) | **Not tracked.** `git ls-files .env` → no match; ignored at `.gitignore:3` and `:123`. **[VERIFIED]** |
| Any tracked secret material | **None.** Only `.env.example` and the credential *implementation* files. **[VERIFIED]** |
| Secret storage | `keytar` (Keychain / Windows Credential Manager) with an encrypted fallback (`credentialFallbackCrypto.ts`) and dedicated tests. Sound design. |
| Outbound calls a personal tool does not need | License verification to `api.gumroad.com` + Dodo Payments, hardware-ID derivation via `machine_uid` (`license.rs`), `InstallPingManager`, `TelemetryService` writing `logs/telemetry.jsonl`. **[VERIFIED]** — all removable with Tier 2. |
| Unused OAuth secrets sitting in `.env` | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` exist for Calendar. Removing Calendar (Tier 3) lets you revoke them. |
| Screen capture + keyboard tap + system-audio capture | Legitimate and core to the product. Worth noting they are the most invasive permissions an app can hold, so the *smaller* you make the code that holds them, the better. This is an argument for the Tier 3 cuts, not just tidiness. |

---

## 9. What to keep — the actual product

Stated explicitly so the deletion work does not overrun into the core.

**Core answer path (keep, invest here):**
`context-intelligence/` (V3 — 9,107 lines, the live pipeline) · `llm/promptSystemV2.ts` · `llm/codingContract.ts` · `llm/systemDesignContract.ts` (once committed and wired) · `llm/AnswerPlanner.ts` (to be restructured, not deleted) · `AnswerLLM` / `WhatToAnswerLLM` / `IntentClassifier` / `TurnPlanner` · `turn-classifier.ts` + `conversation-state.ts`.

**Capture and I/O (keep, trim providers):**
`electron/audio/` — `MicrophoneCapture`, `SystemAudioCapture`, `nativeModuleLoader`, one cloud STT + `LocalWhisperSTT` · `native-module` (audio, VAD, resampler, stealth window; drop `license.rs`) · `ScreenshotHelper` + `CropperWindowHelper` + `services/screen/` for reading the coding pad.

**Shell (keep, simplify):**
`WindowHelper` (the overlay *is* the product) · `KeybindManager` / global shortcuts · `SettingsManager` · `CredentialsManager` · `db/DatabaseManager` (prune tables with their features) · `ProviderRouter` + `LLMHelper` for 2–3 providers · `update/` if you want auto-updates for yourself.

---

## 10. Validation performed

Per `CLAUDE.md`'s required completion report.

**Commands actually executed:**

```bash
npx tsc --noEmit                                                    # clean
npm run typecheck:electron                                          # 1 error (premium submodule)
node --test electron/llm/__tests__/AnswerQualityJudge2026_06_08.test.mjs   # 1 fail (missing benchmarks/)
git status --porcelain                                              # 1 untracked file
git ls-files --error-unmatch .env                                   # not tracked
```

Plus read-only inventory: LOC/file counts per area, `package.json` script-path existence checks, dependency import-site greps, IPC channel extraction, platform-branch counts, DB migration/table extraction, and direct reads of `engine-bridge.ts`, `promptSystemV2.ts`, `humanLikeness.ts`, `intelligenceFlags.ts`, `LLMHelper.ts`, `AnswerPlanner.ts`, `codingContract.ts`, `systemDesignContract.ts`, `flag.ts`, `license.rs`, `Cargo.toml`.

**Validation status:**

- `Reviewed but not executed on macOS` — the full test suites (`npm test`, `test:llm`, `test:intelligence`) were **not** run in this session; their state is quoted from the documented baseline plus the verified collection failure.
- `Reviewed but not executed on Windows` — no Windows machine available. Every Windows statement above is from configuration, source and CI files only.
- `Requires physical Windows verification` — whether the app runs on Windows at all. Given the absent native binary, my expectation is that it does not, but I have not proven it.
- No build or packaging validation was performed.
- **No files in the project were modified by this review**, other than adding this report and the roadmap.

**Remaining risks in this report:**

1. Tier 3 sizes are line counts of the *primary* files; each feature also has call sites, IPC plumbing, preload entries, DB tables and tests that grow the true removal cost. Treat the numbers as lower bounds.
2. The "unused dependency" list is based on static import greps. A dependency loaded by a fully dynamic specifier would not be caught — run one build after removing each, not all ten at once.
3. Test-file relevance to removed features is an estimate; it can only be measured accurately once the features are gone.
4. Items marked **[PRIOR-AUDIT]** were established earlier today and spot-checked here, not re-derived end to end.
