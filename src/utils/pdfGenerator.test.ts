import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  normalizePdfText,
  wrapPdfTextLines,
  buildRevisionPdfFilename,
  generateRevisionNotesPdfBytes,
  generateAnnotatedDocumentPdfBytes
} from './pdfGenerator';
import { OnePageRevisionSheet, StudyDocument, PdfAnnotationItem } from '../types/study';

test('normalizePdfText converts math and Unicode symbols into WinAnsi-safe ASCII', () => {
  const input = 'Sample Space Ω: P(A ∩ B) ≤ P(A) × P(B) → Δx ≠ 0';
  const normalized = normalizePdfText(input);
  assert.ok(normalized.includes('Omega'));
  assert.ok(normalized.includes('<='));
  assert.ok(normalized.includes('->'));
  assert.ok(normalized.includes('!='));
});

test('wrapPdfTextLines wraps long paragraphs within maxWidth using a PDFFont', async () => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const paragraph =
    'Kolmogorov axioms establish that probability of any event is non-negative and the entire sample space has probability equal to one.';
  const lines = wrapPdfTextLines(paragraph, font, 10, 220);
  assert.ok(lines.length >= 2);
  lines.forEach((line) => {
    assert.ok(font.widthOfTextAtSize(line, 10) <= 220);
  });
});

test('buildRevisionPdfFilename produces a clean .pdf filename', () => {
  const filename = buildRevisionPdfFilename('Probability Notes.pdf');
  assert.equal(filename, 'LearnMate_Revision_Notes_Probability_Notes.pdf');
});

test('generateRevisionNotesPdfBytes produces a valid multi-section PDF binary starting with %PDF-', async () => {
  const doc: StudyDocument = {
    id: 'doc-1',
    title: 'Probability Notes.pdf',
    sourceType: 'pdf',
    pageCount: 2,
    pages: [
      { pageNumber: 1, title: 'Sample Space', content: 'Omega is the set of all possible outcomes.' },
      { pageNumber: 2, title: 'Axioms', content: 'P(E) >= 0 and P(Omega) = 1.' }
    ],
    createdAt: new Date().toISOString(),
    lastStudiedAt: new Date().toISOString(),
    topics: [],
    overview: 'Core probability concepts and Kolmogorov axioms.'
  };

  const onePageRevision: OnePageRevisionSheet = {
    chapterTitle: 'Probability Foundations',
    overview: 'Probability measures the likelihood of events in a sample space Ω.',
    essentialConcepts: [
      {
        title: 'Conditional Probability',
        summary: 'Probability of A given B has occurred.',
        sourceLabel: 'Page 2',
        sourcePage: 2
      }
    ],
    formulasAndDefinitions: [
      {
        term: 'Addition Rule',
        formulaOrDef: 'P(A ∪ B) = P(A) + P(B) - P(A ∩ B)',
        sourceLabel: 'Page 2'
      }
    ],
    keyRelationships: ['Sample Space -> Events: Events are subsets of Omega'],
    commonMistakesToAvoid: ['Assuming disjoint events are independent'],
    quickRecallQuestions: [
      { question: 'What is P(Ω)?', shortAnswer: 'P(Ω) = 1 by normalization axiom.' }
    ]
  };

  const pdfBytes = await generateRevisionNotesPdfBytes({
    document: doc,
    onePageRevision,
    stickyNotes: [
      {
        id: 'sn-1',
        title: 'Axiom 1',
        content: '0 <= P(E) <= 1 for all events',
        sourcePage: 1,
        sourceLabel: 'Page 1',
        color: 'yellow'
      }
    ]
  });

  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.byteLength > 800);
  const header = new TextDecoder().decode(pdfBytes.slice(0, 5));
  assert.equal(header, '%PDF-');
});

test('generateAnnotatedDocumentPdfBytes embeds annotations into a real PDF binary', async () => {
  const doc: StudyDocument = {
    id: 'doc-test-1',
    title: 'Probability Notes.pdf',
    sourceType: 'pdf',
    pageCount: 2,
    createdAt: new Date().toISOString(),
    lastStudiedAt: new Date().toISOString(),
    topics: [],
    overview: 'Overview',
    pages: [
      { pageNumber: 1, title: 'Page 1', content: 'Page 1: Sample Spaces and Axioms of Probability' },
      { pageNumber: 2, title: 'Page 2', content: 'Page 2: Conditional Probability and Bayes Theorem' }
    ]
  };

  const annotations: PdfAnnotationItem[] = [
    {
      id: 'ann-1',
      pageNumber: 1,
      tool: 'highlight',
      color: 'yellow',
      strokeWidth: 2,
      x: 0.1,
      y: 0.2,
      width: 0.5,
      height: 0.05,
      quoteText: 'Sample Spaces and Axioms',
      text: 'Must revise before exam',
      createdAt: new Date().toISOString()
    },
    {
      id: 'ann-2',
      pageNumber: 1,
      tool: 'text_note',
      color: 'blue',
      strokeWidth: 2,
      x: 0.2,
      y: 0.4,
      width: 0.3,
      height: 0.08,
      text: 'Remember P(Omega) = 1',
      createdAt: new Date().toISOString()
    }
  ];

  const annotatedBytes = await generateAnnotatedDocumentPdfBytes(doc, annotations, true);
  const originalBytes = await generateAnnotatedDocumentPdfBytes(doc, annotations, false);

  assert.equal(new TextDecoder().decode(annotatedBytes.slice(0, 5)), '%PDF-');
  assert.equal(new TextDecoder().decode(originalBytes.slice(0, 5)), '%PDF-');
  assert.ok(annotatedBytes.byteLength > originalBytes.byteLength);
});
