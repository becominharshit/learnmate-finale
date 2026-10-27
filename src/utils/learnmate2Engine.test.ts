import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  enforceSourceControlPolicy,
  computeNextSpacedRepetitionSchedule,
  isFlashcardDueForReview,
  gradeExamSimulation,
  getQuestionPaletteState,
  evaluateScientificExpression,
  convertUnits,
  computeStatisticsSummary,
  evaluateTeachItBackCoverage,
  buildInstrumentalLofiPrompt,
  LOFI_INSTRUMENTAL_PRESETS,
} from './learnmate2Engine';
import type { StudyPage, QuizQuestion } from '../types/study';

const SAMPLE_PAGES: StudyPage[] = [
  {
    pageNumber: 1,
    title: 'Sample Spaces and Kolmogorov Axioms',
    content:
      'The Sample Space Omega is the set of all possible outcomes. Non-negativity P(E) >= 0 and Normalization P(Omega) = 1.',
  },
  {
    pageNumber: 2,
    title: 'Bayes Theorem and Conditional Probability',
    content:
      'Bayes Theorem states P(A|B) = P(B|A)P(A) / P(B), updating prior probability with likelihood.',
  },
];

describe('LearnMate 2.0 Pure Engine Tests', () => {
  it('enforces Material Only vs Extended Knowledge source-control policies', () => {
    // Topic absent from material in Material Only mode
    const strictMiss = enforceSourceControlPolicy({
      mode: 'material_only',
      question: 'Explain the Krebs cycle in mitochondria',
      pages: SAMPLE_PAGES,
      rawAnswer: 'The Krebs cycle produces NADH.',
      foundInMaterial: false,
      citations: [],
    });
    assert.equal(strictMiss.foundInMaterial, false);
    assert.ok(strictMiss.answer.includes('not covered in your selected study material'));
    assert.equal(strictMiss.citations.length, 0);

    // Topic present in material in Material Only mode
    const strictHit = enforceSourceControlPolicy({
      mode: 'material_only',
      question: 'What does Bayes Theorem state about prior probability?',
      pages: SAMPLE_PAGES,
      rawAnswer:
        'Bayes Theorem updates prior probability.\n\n**General knowledge expansion:** Extra details.',
      foundInMaterial: true,
      citations: [{ pageNumber: 2, section: 'Bayes Theorem', quote: 'P(A|B) = P(B|A)P(A) / P(B)' }],
    });
    assert.equal(strictHit.foundInMaterial, true);
    assert.equal(strictHit.sourceType, 'material');
    assert.ok(!strictHit.answer.includes('General knowledge expansion'));
    assert.equal(strictHit.citations[0].pageNumber, 2);

    // Extended knowledge mode when absent from material
    const extendedMiss = enforceSourceControlPolicy({
      mode: 'extended_knowledge',
      question: 'Explain the Krebs cycle in mitochondria',
      pages: SAMPLE_PAGES,
      rawAnswer: 'The Krebs cycle oxidizes acetyl-CoA in the mitochondria.',
      foundInMaterial: false,
      citations: [],
    });
    assert.equal(extendedMiss.foundInMaterial, false);
    assert.equal(extendedMiss.sourceType, 'general');
    assert.ok(extendedMiss.answer.includes('Extended Knowledge explanation'));
  });

  it('computes SM-2 spaced repetition intervals and due states accurately', () => {
    const now = Date.UTC(2026, 9, 26, 10, 0, 0);
    const firstKnow = computeNextSpacedRepetitionSchedule(undefined, 'know_it', now);
    assert.equal(firstKnow.repetitions, 1);
    assert.equal(firstKnow.intervalDays, 1);
    assert.equal(firstKnow.easeFactor, 2.6);

    const secondKnow = computeNextSpacedRepetitionSchedule(firstKnow, 'know_it', now);
    assert.equal(secondKnow.repetitions, 2);
    assert.equal(secondKnow.intervalDays, 3);

    const resetCard = computeNextSpacedRepetitionSchedule(secondKnow, 'review_again', now);
    assert.equal(resetCard.repetitions, 0);
    assert.equal(resetCard.intervalDays, 0);

    assert.equal(
      isFlashcardDueForReview(
        {
          id: 'fc-1',
          frontQuestion: 'Q',
          backAnswer: 'A',
          topic: 'T',
          sourcePage: 1,
          sourceLabel: 'Page 1',
          status: 'know_it',
          sr: firstKnow,
        },
        now + 2 * 3600 * 1000 // 2 hours later (not yet 1 day)
      ),
      false
    );
  });

  it('grades JEE-style exam simulations with positive and negative marking', () => {
    const questions: QuizQuestion[] = [
      {
        id: 'q1',
        topic: 'Axioms',
        question: 'Q1',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 1,
        explanation: 'Exp 1',
        sourcePage: 1,
        sourceQuote: 'Quote 1',
        difficulty: 'easy',
      },
      {
        id: 'q2',
        topic: 'Bayes',
        question: 'Q2',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 2,
        explanation: 'Exp 2',
        sourcePage: 2,
        sourceQuote: 'Quote 2',
        difficulty: 'medium',
      },
      {
        id: 'q3',
        topic: 'Random Variables',
        question: 'Q3',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        explanation: 'Exp 3',
        sourcePage: 2,
        sourceQuote: 'Quote 3',
        difficulty: 'hard',
      },
    ];

    const summary = gradeExamSimulation({
      questions,
      selectedIndices: { q1: 1, q2: 0 }, // q1 correct (+4), q2 wrong (-1), q3 unattempted (0)
      markedForReviewIds: ['q2'],
      config: { marksPerCorrect: 4, negativeMarksPerWrong: 1 },
    });

    assert.equal(summary.totalQuestions, 3);
    assert.equal(summary.attemptedCount, 2);
    assert.equal(summary.unattemptedCount, 1);
    assert.equal(summary.correctCount, 1);
    assert.equal(summary.incorrectCount, 1);
    assert.equal(summary.positiveMarks, 4);
    assert.equal(summary.negativeMarksDeducted, 1);
    assert.equal(summary.netScore, 3);
    assert.equal(summary.maxPossibleScore, 12);
    assert.deepEqual(summary.strongTopics, ['Axioms']);
    assert.ok(summary.weakTopics.includes('Bayes'));

    const stateQ2 = getQuestionPaletteState({
      questionId: 'q2',
      visitedIds: new Set(['q1', 'q2']),
      selectedIndices: { q1: 1, q2: 0 },
      markedIds: new Set(['q2']),
    });
    assert.equal(stateQ2, 'answered_and_marked');
  });

  it('evaluates deterministic study utilities (scientific calculator, unit converter, statistics)', () => {
    const calc1 = evaluateScientificExpression('2^3 + sqrt(16) * cos(0)');
    assert.equal(calc1.valid, true);
    assert.equal(calc1.result, 12);

    const badCalc = evaluateScientificExpression('process.exit(1)');
    assert.equal(badCalc.valid, false);

    assert.equal(
      convertUnits({ category: 'temperature', value: 100, fromUnit: 'C', toUnit: 'F' }),
      212
    );
    assert.equal(
      convertUnits({ category: 'length', value: 2.5, fromUnit: 'km', toUnit: 'm' }),
      2500
    );

    const stats = computeStatisticsSummary([2, 4, 4, 4, 5, 5, 7, 9]);
    assert.ok(stats);
    assert.equal(stats.count, 8);
    assert.equal(stats.mean, 5);
    assert.equal(stats.median, 4.5);
    assert.equal(stats.populationStdDev, 2);
  });

  it('evaluates Teach-It-Back coverage and sanitizes Lo-Fi prompts to be strictly instrumental', () => {
    const evalResult = evaluateTeachItBackCoverage({
      topicName: 'Kolmogorov Axioms',
      keyConcepts: ['Sample Space', 'Non-negativity', 'Normalization', 'Disjoint Additivity'],
      sourceSummary: 'Defines sample space and axioms.',
      studentExplanation:
        'The sample space contains all outcomes, non-negativity means probabilities are at least zero, and normalization sets the total space to 1.',
    });
    assert.equal(evalResult.coverageScorePct, 75);
    assert.equal(evalResult.coveredConcepts.length, 3);
    assert.deepEqual(evalResult.missingConcepts, ['Disjoint Additivity']);

    for (const preset of LOFI_INSTRUMENTAL_PRESETS) {
      const prompt = buildInstrumentalLofiPrompt(preset.id);
      assert.ok(prompt.toLowerCase().includes('strictly instrumental only'));
      assert.ok(prompt.toLowerCase().includes('no vocals'));
    }
  });
});
