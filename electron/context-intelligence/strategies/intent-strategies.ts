// Interview Intelligence V1 — Phase 6
// 15 intent-based answer strategies.
// Each strategy covers one construction approach; grouped intents share an identical arc.

import type { AnswerStrategy } from './types';

export const DEFINE_CONCEPT: AnswerStrategy = {
  id: 'define_concept',
  triggerIntents: ['concept_explanation', 'knowledge_check'],
  behaviorOverrides: [],
  promptSection:
    'Give a precise, one-sentence definition. Then explain the core intuition — what problem ' +
    'it solves or what it enables. Provide one concrete, minimal example. If there is an ' +
    'important property, limitation, or variant that a working engineer should know, add it ' +
    'briefly. Match depth to the question: a knowledge-check needs a crisp confirmation plus ' +
    'a brief explanation; a full "what is" question merits the example and property. Do not ' +
    'pad with history or etymology.',
  steps: [
    'State a precise technical definition in one sentence.',
    'Explain the core intuition: what problem it solves or what it enables.',
    'Provide one concrete, minimal example.',
    'Mention one important property, limitation, or gotcha if it adds genuine value.',
    'Stop — do not expand into adjacent topics.',
  ],
};

export const EXPLAIN_MECHANISM: AnswerStrategy = {
  id: 'explain_mechanism',
  triggerIntents: ['mechanism_explanation'],
  behaviorOverrides: [],
  promptSection:
    'Explain the actual mechanism — the internal sequence, how data moves, how state changes. ' +
    'Do not stop at what it does; explain how it achieves that. Walk through the process in ' +
    'logical order using concrete specifics rather than vague abstractions. If an analogy helps, ' +
    'use it to anchor the explanation — then follow with the technical reality. Describe the key ' +
    'actors, phases, or components involved. If there are important implementation variants, ' +
    'cover the default first.',
  steps: [
    'State what the thing does in one sentence (orientation, not the answer).',
    'Describe the mechanism step by step: the internal sequence and how data or state moves.',
    'Identify the key actors, components, or phases in the mechanism.',
    'Explain one important design choice baked into the mechanism (why it works this way).',
    'State a practical implication or gotcha that follows from the mechanism.',
  ],
};

export const JUSTIFY_DECISION: AnswerStrategy = {
  id: 'justify_decision',
  triggerIntents: ['technology_decision'],
  behaviorOverrides: [],
  promptSection:
    'State the choice and the primary reason directly. Show that you evaluated alternatives ' +
    'deliberately: name 1–2 alternatives and explain why they were less suitable in your ' +
    'specific context. Acknowledge the main tradeoff or weakness of the chosen approach ' +
    'honestly — it reads as stronger than pretending there were none. Tie the decision back ' +
    'to the specific constraints (scale, team, timeline, existing stack, data characteristics). ' +
    'Avoid generic reasons like "it\'s popular" — show that you made the right call for your situation. ' +
    'Draw only from actual constraints and decisions in the evidence — do not invent requirements, ' +
    'constraints, project context, or outcomes.',
  steps: [
    'Restate the choice briefly to confirm you understood the question.',
    'State the primary deciding factor — the one thing that made this the right choice in context.',
    'Name 1–2 alternatives you genuinely considered and why each was less suitable.',
    'Acknowledge the main weakness or tradeoff of the chosen approach.',
    'Tie the decision to the specific constraints or requirements of your context.',
  ],
};

export const ANALYZE_OPTIONS: AnswerStrategy = {
  id: 'analyze_options',
  triggerIntents: ['comparison', 'tradeoff'],
  behaviorOverrides: [],
  promptSection:
    'Identify 3–5 dimensions that genuinely differentiate the options — not an exhaustive ' +
    'checklist. For each dimension, assess each option honestly. For a tradeoff question ' +
    '(single subject), state what the approach optimizes for and what it sacrifices. End ' +
    'with a context-dependent recommendation: the right answer to "which is better" is ' +
    'almost always "it depends on these specific conditions." Sound like someone who has ' +
    'worked with both options, not someone who read the documentation.',
  steps: [
    'Identify the key dimensions of comparison (3–5 that actually matter for this pair).',
    'Assess each option on each dimension — concisely, without false balance.',
    'Identify the scenario where each option is the clear winner.',
    'State a concrete recommendation with explicit context conditions.',
    '(For tradeoff questions) Identify what the approach sacrifices and under what conditions that cost becomes unacceptable.',
  ],
};

export const IMPLEMENT_SOLUTION: AnswerStrategy = {
  id: 'implement_solution',
  triggerIntents: ['coding_task'],
  behaviorOverrides: [],
  promptSection:
    'Think out loud before writing. State the approach, the key insight, and the complexity ' +
    'before writing a single line of code. If there is a naive approach, name it briefly and ' +
    'explain the improvement. Write clean, readable code with meaningful names — not pseudocode, ' +
    'not over-engineered. Narrate the logic as you write it. After the code, state time and ' +
    'space complexity and mention 1–2 edge cases your implementation handles or deliberately ' +
    'assumes away.',
  steps: [
    'Clarify ambiguous input/output requirements if any exist.',
    'State the approach and the key algorithmic or structural insight.',
    'Name the naive approach if one exists; explain why you are improving on it.',
    'Write the solution while narrating the logic.',
    'State time and space complexity.',
    'Name 1–2 edge cases: how your code handles them or what assumptions it makes.',
  ],
};

export const TRACE_BUG: AnswerStrategy = {
  id: 'trace_bug',
  triggerIntents: ['debugging'],
  behaviorOverrides: [],
  promptSection:
    'Do not jump to the first guess. Start by characterizing the symptoms precisely, then form ' +
    '2–3 hypotheses ordered by likelihood — what could cause this specific failure pattern? ' +
    'For each hypothesis, state how you would test or eliminate it. When you identify the root ' +
    'cause, explain the causal chain: why does this input or condition produce this symptom? ' +
    'The fix should address the root cause, not the symptom. If you need more information to ' +
    'narrow the hypotheses, say what you would look at first. After proposing the fix, state ' +
    'how you would verify it actually resolves the root cause — and how to prevent the same ' +
    'failure from recurring.',
  steps: [
    'Restate the observed symptoms precisely — what fails, when, under what conditions.',
    'Identify what information you have vs. what is missing.',
    'Generate 2–3 root cause hypotheses, ordered by likelihood given the symptoms.',
    'For each hypothesis: describe the diagnostic step to confirm or eliminate it.',
    'State the most probable root cause and explain the causal chain from cause to symptom.',
    'Propose the fix and explain why it resolves the root cause — not just the symptom.',
    'Verify the fix: confirm it resolves the root cause using the same diagnostic approach — not just that the symptom disappears.',
    'Prevent recurrence: propose a monitoring alert, regression test, input validation, or architectural change to stop the same failure from happening again.',
  ],
};

export const OPTIMIZE_APPROACH: AnswerStrategy = {
  id: 'optimize_approach',
  triggerIntents: ['optimization'],
  behaviorOverrides: [],
  promptSection:
    'Profile before optimizing — identify the actual bottleneck rather than guessing. State ' +
    'the current complexity and the theoretical minimum for this problem class to frame how ' +
    'much headroom exists. Propose improvements in order of impact-to-complexity ratio: the ' +
    'simplest change that gives the most gain first. For each improvement, state what it gains ' +
    'and what it costs (added complexity, correctness risk, maintainability). Stop when the ' +
    'optimization matches the actual need — don\'t optimize past the requirement.',
  steps: [
    'Identify the current bottleneck and its time/space complexity.',
    'State the theoretical lower bound (optimal complexity for this problem class).',
    'Propose optimization steps in descending order of impact-to-complexity ratio.',
    'For each step: describe the change, the resulting complexity, and its cost or risk.',
    'Confirm when the optimization is sufficient given the stated constraints.',
  ],
};

export const DESIGN_SYSTEM: AnswerStrategy = {
  id: 'design_system',
  triggerIntents: ['system_design'],
  behaviorOverrides: [],
  promptSection:
    'Start by clarifying requirements and stating assumptions — do not design for a spec you ' +
    'invented. Estimate scale (users, QPS, storage) only where it drives a specific architectural ' +
    'decision. Present the high-level architecture first, then drill into the components most ' +
    'likely to be probed. Define the data model and key API contracts. For each major ' +
    'architectural decision, state the alternatives and why you chose this one. Discuss how ' +
    'the system fails and recovers. Discuss the scaling strategy — where the bottlenecks are ' +
    'and how to address them. Tradeoffs must be explicit: every decision has a cost.',
  steps: [
    'Clarify functional and non-functional requirements; state assumptions explicitly.',
    'Estimate scale — DAU, QPS, storage, bandwidth — only where the number drives a design choice.',
    'Present the high-level architecture: main components and data flow between them.',
    'Define the data model and key API contracts.',
    'Drill into the critical component(s) — choices made, alternatives considered, tradeoffs.',
    'Discuss failure modes: what breaks first and how the system recovers.',
    'Discuss the scaling strategy: what gets distributed, replicated, sharded, or cached.',
    'Summarize the key tradeoffs of the overall design.',
  ],
};

export const DESIGN_CLASSES: AnswerStrategy = {
  id: 'design_classes',
  triggerIntents: ['lld'],
  behaviorOverrides: [],
  promptSection:
    'Identify the core entities from the requirements and assign each a single, clear ' +
    'responsibility. Define the relationships — composition over inheritance where appropriate. ' +
    'Present key interfaces and methods in code-form signatures, not full implementations. ' +
    'Walk through a primary use case end-to-end using the class model to show the design works. ' +
    'Identify one or two extension points — where the design allows new features without modification. ' +
    'Apply SOLID principles where they simplify the design, but do not apply them mechanically. ' +
    'Mention a design pattern only if it fits naturally; do not force one.',
  steps: [
    'Identify the core entities from the requirements (nouns → classes).',
    'Assign a single responsibility to each entity.',
    'Define relationships: composition, inheritance, association — justify each.',
    'Define key interfaces and methods — show them as code-form signatures where useful to make the design concrete, not as prose descriptions. Write signatures, not full implementations.',
    'Walk through a primary use case end-to-end using the class model.',
    'Identify one or two extension points: where new features are addable without modification.',
    'Name a design pattern if it genuinely fits here.',
  ],
};

export const DESCRIBE_PROJECT: AnswerStrategy = {
  id: 'describe_project',
  triggerIntents: ['project_context', 'project_deep_dive'],
  behaviorOverrides: [],
  promptSection:
    'Give context first — what problem the project solved and why it mattered — before ' +
    'describing the implementation. Speak about your specific contribution, not the team\'s ' +
    'in aggregate. For a general overview, cover: what it does, the core technology choices, ' +
    'and the most interesting technical challenge. For a deep dive into a specific aspect, ' +
    'explain the decision space: what alternatives existed, why you chose what you did, what ' +
    'was harder than expected, and what you would change now. Be honest about limitations — ' +
    'it reads as credibility, not weakness. Base the answer on the retrieved evidence — do not ' +
    'invent project details, metrics, outcomes, or personal experience not present in the evidence. ' +
    'If the evidence does not cover a detail, acknowledge the gap.',
  steps: [
    'State what the project does and the problem it solves (1–2 sentences of context).',
    'Describe your specific role and contribution.',
    'Explain the core technical decisions: stack, architecture, key approaches.',
    'Describe the most significant technical challenge and how you resolved it.',
    'Mention one limitation or what you would do differently with more time or knowledge.',
    '(For deep dives) Drill into the specific aspect being asked about: decision rationale, implementation detail, measurable outcome.',
  ],
};

export const NARRATE_EXPERIENCE: AnswerStrategy = {
  id: 'narrate_experience',
  triggerIntents: ['experience_question'],
  behaviorOverrides: [],
  promptSection:
    'Use STAR format, but make it feel like a story, not a form submission. Keep Situation ' +
    'and Task brief. Spend most of the time on Action: what you personally did, the technical ' +
    'choices you made and why, and what alternatives you considered. Make the technical ' +
    'specifics concrete — language, tool, approach — rather than staying generic. End with a ' +
    'result that shows measurable impact or learning. Optionally, one sentence of genuine ' +
    'reflection ("I would do X differently now") adds credibility. Base the answer on the ' +
    'retrieved evidence — do not invent events, tools, technical details, metrics, outcomes, ' +
    'or personal actions that are not supported by evidence.',
  steps: [
    'Situation: set the technical context briefly — the system, team size, and constraints (1–2 sentences).',
    'Task: state your specific responsibility or challenge (1 sentence).',
    'Action: explain what you did step by step — technical choices, reasoning, alternatives considered.',
    'Result: state the concrete outcome — metric, delivery, reliability, user impact.',
    'Reflection (optional): one sentence on what you learned or would change.',
  ],
};

export const TELL_BEHAVIORAL_STORY: AnswerStrategy = {
  id: 'tell_behavioral_story',
  triggerIntents: ['behavioral'],
  behaviorOverrides: [],
  promptSection:
    'Use STAR format, but focus on the interpersonal dynamic rather than the technical ' +
    'implementation. Be specific about your own actions — not the team\'s. Show that you ' +
    'understand the other person\'s perspective, not just your own. Do not make the other party ' +
    'the villain; present the situation fairly. End with a concrete outcome for the relationship, ' +
    'team, or project, followed by a genuine reflection — the interviewer is evaluating your ' +
    'judgment and self-awareness, not just what happened. Base the story on actual evidence — ' +
    'do not invent details, conversations, outcomes, or personal actions that are not supported ' +
    'by the retrieved material.',
  steps: [
    'Situation: set the interpersonal context briefly — team, role, relationship (1–2 sentences).',
    'Task: describe the tension or challenge you were facing (1 sentence).',
    'Action: describe specifically what you did — how you communicated, what you decided, what you tried first and adjusted.',
    'Result: state the concrete outcome for the relationship, team, or project.',
    'Reflection: articulate what you learned or would do differently — the interviewer is evaluating your judgment and self-awareness here, not just what happened.',
  ],
};

export const INTRODUCE_SELF: AnswerStrategy = {
  id: 'introduce_self',
  triggerIntents: ['introduction'],
  behaviorOverrides: [],
  promptSection:
    'Tell a coherent story, not a resume recitation. Structure it as: current role → the ' +
    'narrative arc (how you got here in 2–3 sentences) → 1–2 specific technical accomplishments ' +
    'with concrete detail → what you\'re excited about next. Match the depth to the context: ' +
    'a two-minute introduction covers the arc; a longer version can include one project highlight. ' +
    'End with a forward-looking sentence. Make the accomplishments specific — "rebuilt the ' +
    'real-time data pipeline, reducing p99 latency from 4s to 180ms" is better than ' +
    '"worked on performance improvements." Use only accomplishments and metrics from the ' +
    'retrieved evidence — do not invent or inflate achievements, responsibilities, technologies, ' +
    'or outcomes.',
  steps: [
    'State your current role and professional context in one sentence.',
    'Give the narrative arc: how you got here — 2–3 sentences on the journey and what drove it.',
    'Highlight 1–2 specific technical accomplishments with concrete, measurable detail.',
    'State what you are looking for or excited about next.',
    'Connect your background to why this role interests you and what you bring to it.',
  ],
};

export const ANALYZE_SCALE: AnswerStrategy = {
  id: 'analyze_scale',
  triggerIntents: ['scalability'],
  behaviorOverrides: [],
  promptSection:
    'Do not just list what would break — explain why, at what threshold, and what the fix is. ' +
    'Work through the problem layer by layer: compute, storage, network, state. Estimate numbers ' +
    'when they motivate a design decision. Propose solutions in order of impact and simplicity — ' +
    'the cheapest fix first. Distinguish between stateless and stateful components: stateless ' +
    'components scale horizontally with little friction; stateful components (databases, caches, ' +
    'session stores) are where the hard problems live.',
  steps: [
    'Restate the scale target (DAU, QPS, storage) to anchor the analysis.',
    'Identify the first bottleneck: what breaks first in the current design and why.',
    'Propose a targeted fix and estimate how much scale headroom it provides.',
    'Identify the next bottleneck and repeat (2–3 layers is typical).',
    'Address stateful components explicitly — they are the hardest scaling challenge.',
    'Summarize the scaling strategy: what gets distributed, sharded, replicated, or cached.',
  ],
};

export const CONTINUE_THREAD: AnswerStrategy = {
  id: 'continue_thread',
  triggerIntents: ['follow_up_generic'],
  behaviorOverrides: [],
  promptSection:
    'Do not restart the topic — build on what was just discussed. Identify what specifically ' +
    'is being asked: a reason, an example, an alternative, a specific aspect. Address it ' +
    'directly, without re-explaining what you already covered. Use the context from the previous ' +
    'answer rather than rebuilding from scratch. If giving an example, make it concrete and ' +
    'relevant to the point already made. If expanding a reason, go one level deeper. Keep it ' +
    'appropriately brief — a follow-up is a continuation, not a new explanation. The conversation ' +
    'context above tells you what the follow-up refers to — use it rather than asking the ' +
    'candidate to repeat themselves.',
  steps: [
    'Identify what specifically is being asked: a reason, an example, an alternative, a clarification of a specific term.',
    'Address that specific request directly — no preamble, no re-introduction.',
    'Use the prior answer as foundation rather than rebuilding from scratch.',
    'If giving an example: make it concrete, specific, and directly relevant to the prior point.',
    'If expanding a reason: go one level deeper than what was already stated.',
    'Keep it appropriately brief.',
  ],
};

export const INTENT_STRATEGIES: readonly AnswerStrategy[] = [
  DEFINE_CONCEPT,
  EXPLAIN_MECHANISM,
  JUSTIFY_DECISION,
  ANALYZE_OPTIONS,
  IMPLEMENT_SOLUTION,
  TRACE_BUG,
  OPTIMIZE_APPROACH,
  DESIGN_SYSTEM,
  DESIGN_CLASSES,
  DESCRIBE_PROJECT,
  NARRATE_EXPERIENCE,
  TELL_BEHAVIORAL_STORY,
  INTRODUCE_SELF,
  ANALYZE_SCALE,
  CONTINUE_THREAD,
];
