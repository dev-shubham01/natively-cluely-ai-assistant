// Interview Intelligence V1 — Phase 6
// 4 behavior-override answer strategies.
// These always win over intent strategies when their behavior is detected.

import type { AnswerStrategy } from './types';

export const DEFEND_POSITION: AnswerStrategy = {
  id: 'defend_position',
  triggerIntents: [],
  behaviorOverrides: ['PUSHBACK'],
  promptSection:
    'The interviewer is challenging your previous answer. Acknowledge the challenge as ' +
    'legitimate — do not dismiss it. Identify what the interviewer\'s concern or alternative ' +
    'represents. Then reason through it: is the interviewer right, partially right, or operating ' +
    'on a different assumption? If you were wrong: correct yourself clearly and explain the ' +
    'corrected reasoning. If you still stand by your answer: explain specifically what the ' +
    'interviewer\'s alternative misses in your context — the constraint, scale condition, or ' +
    'assumption it doesn\'t hold. Compare both options directly on the key dimension. Show that ' +
    'you engage with challenges analytically, not emotionally.',
  steps: [
    'Acknowledge the challenge without being defensive.',
    'Identify what the interviewer\'s concern or proposed alternative represents.',
    'Evaluate: is the interviewer correct, partially correct, or working from a different assumption?',
    'If you were wrong: correct yourself directly and explain the corrected reasoning.',
    'If you stand by your answer: state specifically what the alternative misses in this context.',
    'Compare both options on the key differentiating dimension to resolve the disagreement.',
  ],
};

export const ACKNOWLEDGE_CORRECTION: AnswerStrategy = {
  id: 'acknowledge_correction',
  triggerIntents: [],
  behaviorOverrides: ['CORRECTION'],
  promptSection:
    'Acknowledge the correction immediately and clearly. Do not deflect, over-apologize, or ' +
    'try to partially defend the wrong answer. Restate the correct version to confirm you ' +
    'understood it. Explain the reasoning behind the correct version — show that you now ' +
    'understand why it\'s right, not just that you accept the correction. If the correction ' +
    'implies additional consequences or related concepts, address them briefly. If the correction ' +
    'itself appears to contain an inconsistency, probe it politely and specifically — but only ' +
    'with genuine reason.',
  steps: [
    'Acknowledge the correction directly: "You\'re right, I should have said…"',
    'Restate the correct version of the claim.',
    'Explain the reasoning behind the correct version — why it is right.',
    'If the correction has additional implications, address them briefly.',
    '(Only if genuinely inconsistent) Probe the correction politely: "I want to make sure I follow — are you saying X? Because Y would imply Z."',
  ],
};

export const RESTATE_CLEARLY: AnswerStrategy = {
  id: 'restate_clearly',
  triggerIntents: [],
  behaviorOverrides: ['CLARIFICATION'],
  promptSection:
    'Identify which specific part of your previous answer was unclear and address that part ' +
    'only. Do not restart the entire answer. Restate the unclear concept in simpler terms, ' +
    'from a different angle, or with a concrete example or analogy. Distinguish what the ' +
    'concept is from what it might be confused with. If you are not sure which part was ' +
    'unclear, briefly ask: "Is it the [specific part] I should clarify?" Keep it focused — ' +
    'the goal is to resolve the specific confusion, not deliver a second version of the full answer.',
  steps: [
    'Identify which specific part of the previous answer the question refers to. If it is unclear which part caused confusion, ask a focused question before restating: "Is it the [specific aspect] you\'d like me to clarify?"',
    'Restate that specific part in simpler terms or from a different angle.',
    'Use a concrete example or analogy if the abstract statement was what caused confusion.',
    'Distinguish what the concept is from what it might be confused with, if relevant.',
    'Confirm or invite a follow-up: "Does that clarify it?"',
  ],
};

export const DEEPEN_EXPLANATION: AnswerStrategy = {
  id: 'deepen_explanation',
  triggerIntents: [],
  behaviorOverrides: ['DEEPENING'],
  promptSection:
    'Do not repeat what you already said. Identify what level of depth was already provided ' +
    'and go one level deeper on the most technically rich dimension: if you described WHAT, ' +
    'now explain HOW; if you explained the mechanism, now discuss the implementation tradeoffs; ' +
    'if you gave an overview, drill into a specific component. Add specificity — a concrete ' +
    'implementation detail, an edge case, a performance characteristic, or an alternative you ' +
    'chose not to take and why. If there are multiple dimensions to explore, choose the most ' +
    'interesting or most practically relevant one.',
  steps: [
    'Identify what level of depth was already covered in the previous answer.',
    'Choose the next level: mechanism, implementation detail, tradeoff, edge case, or alternative.',
    'Provide specific, concrete depth on that dimension — not additional abstractions.',
    'Pick one dimension to deepen rather than trying to cover everything — depth on a single aspect is more valuable than breadth across several.',
    'Stop at a natural point; avoid escalating depth without a signal to continue.',
  ],
};

export const OVERRIDE_STRATEGIES: readonly AnswerStrategy[] = [
  DEFEND_POSITION,
  ACKNOWLEDGE_CORRECTION,
  RESTATE_CLEARLY,
  DEEPEN_EXPLANATION,
];
