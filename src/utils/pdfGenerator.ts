import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import type {
  FlashcardItem,
  MindMapData,
  OnePageRevisionSheet,
  PdfAnnotationColor,
  PdfAnnotationItem,
  StickyNoteItem,
  StudyDocument,
} from '../types/study';

/**
 * Normalizes mathematical and Greek Unicode symbols into clean WinAnsi-compatible
 * mathematical notation so StandardFonts in pdf-lib never fail on special characters
 * while preserving full mathematical clarity.
 */
export function normalizePdfText(input: string): string {
  if (!input) return '';
  const map: Record<string, string> = {
    'Ω': 'Omega',
    'ω': 'omega',
    'Σ': 'Sum',
    '∑': 'Sum',
    'Π': 'Prod',
    '∏': 'Prod',
    'μ': 'mu',
    'σ': 'sigma',
    'λ': 'lambda',
    'Λ': 'Lambda',
    'α': 'alpha',
    'β': 'beta',
    'θ': 'theta',
    'Δ': 'Delta',
    'π': 'pi',
    'τ': 'tau',
    'ρ': 'rho',
    'ε': 'epsilon',
    '∞': 'infinity',
    '≥': '>=',
    '≤': '<=',
    '≠': '!=',
    '≈': '~=',
    '≡': '===',
    '⇔': '<=>',
    '⇒': '=>',
    '→': '->',
    '←': '<-',
    '↔': '<->',
    '►': '->',
    '─': '-',
    '∩': ' intersect ',
    '∪': ' union ',
    '⊂': ' subset ',
    '⊆': ' subset= ',
    '∈': ' in ',
    '∉': ' not-in ',
    '∅': '{}',
    '√': 'sqrt',
    '∫': 'Integral',
    '∂': 'd',
    '×': 'x',
    '·': '*',
    '÷': '/',
    '±': '+/-',
    '⁰': '^0',
    '¹': '^1',
    '²': '^2',
    '³': '^3',
    '⁴': '^4',
    '⁵': '^5',
    '⁶': '^6',
    '⁷': '^7',
    '⁸': '^8',
    '⁹': '^9',
    'ⁿ': '^n',
    'ᵀ': '^T',
    '⁺': '+',
    '⁻': '-',
    'ᶜ': '^c',
    '₀': '_0',
    '₁': '_1',
    '₂': '_2',
    '₃': '_3',
    '₄': '_4',
    '₅': '_5',
    'ᵢ': '_i',
    'ⱼ': '_j',
    'ₖ': '_k',
    'ₙ': '_n',
    'ₓ': '_x',
    '•': '-',
    '⚠': '[!]',
    '✓': '[OK]',
    '✔': '[OK]',
    '✗': '[X]',
    '“': '"',
    '”': '"',
    '‘': "'",
    '’': "'",
    '—': '--',
    '–': '-',
    '…': '...',
  };

  let out = input;
  for (const [k, v] of Object.entries(map)) {
    out = out.split(k).join(v);
  }
  out = out.normalize('NFKD');
  for (const [k, v] of Object.entries(map)) {
    out = out.split(k).join(v);
  }
  // Remove combining marks or remaining non-WinAnsi characters outside printable ASCII/Latin-1
  out = out.replace(/[\u0300-\u036f]/g, '');
  out = out.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '');
  return out;
}

/**
 * Wraps text into lines that fit within `maxWidth` using the given PDFFont and size.
 */
export function wrapPdfTextLines(
  rawText: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const safeText = normalizePdfText(rawText);
  const paragraphs = safeText.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, fontSize);
      if (width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        // Handle single very long word
        if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            const nextChunk = chunk + ch;
            if (font.widthOfTextAtSize(nextChunk, fontSize) > maxWidth && chunk) {
              lines.push(chunk);
              chunk = ch;
            } else {
              chunk = nextChunk;
            }
          }
          currentLine = chunk;
        } else {
          currentLine = word;
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [''];
}

export function buildRevisionPdfFilename(title: string, suffix = 'Revision_Notes'): string {
  const cleaned = title
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return `LearnMate_${suffix}_${cleaned || 'Study_Material'}.pdf`;
}

export interface GenerateRevisionPdfInput {
  document: StudyDocument;
  onePageRevision?: OnePageRevisionSheet | null;
  stickyNotes?: StickyNoteItem[];
  flashcards?: FlashcardItem[];
  mindMap?: MindMapData | null;
}

/**
 * Generates a real, multi-page formatted PDF document (.pdf binary) for LearnMate Revision Notes.
 * Preserves headings, subheadings, bullet points, numbered lists, formulas & definitions tables,
 * highlighted sticky notes, and active-recall questions with clean pagination and margins.
 */
export async function generateRevisionNotesPdfBytes(
  input: GenerateRevisionPdfInput
): Promise<Uint8Array> {
  const { document: studyDoc, onePageRevision, stickyNotes = [], flashcards = [] } = input;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${studyDoc.title} — LearnMate Revision Notes`);
  pdfDoc.setAuthor('LearnMate AI Study Companion');
  pdfDoc.setSubject(`Revision Sheet & Study Notes for ${studyDoc.title}`);
  pdfDoc.setCreator('LearnMate PDF Engine');

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const PAGE_WIDTH = 595.28; // A4 width in pt
  const PAGE_HEIGHT = 841.89; // A4 height in pt
  const MARGIN_X = 46;
  const MARGIN_TOP = 50;
  const MARGIN_BOTTOM = 54;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

  const pages: PDFPage[] = [];
  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(currentPage);
  let cursorY = PAGE_HEIGHT - MARGIN_TOP;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY - neededHeight < MARGIN_BOTTOM) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(currentPage);
      cursorY = PAGE_HEIGHT - MARGIN_TOP;
    }
  };

  // 1. Top Header Banner
  const bannerHeight = 68;
  currentPage.drawRectangle({
    x: MARGIN_X,
    y: cursorY - bannerHeight,
    width: CONTENT_WIDTH,
    height: bannerHeight,
    color: rgb(0.91, 0.95, 1.0),
    borderColor: rgb(0.26, 0.52, 0.96),
    borderWidth: 1.2,
  });

  currentPage.drawText('LEARNMATE STRUCTURED REVISION NOTES', {
    x: MARGIN_X + 16,
    y: cursorY - 22,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.45, 0.91),
  });

  const mainTitle = normalizePdfText(
    onePageRevision?.chapterTitle || studyDoc.title
  ).slice(0, 75);
  currentPage.drawText(mainTitle, {
    x: MARGIN_X + 16,
    y: cursorY - 42,
    size: 15,
    font: fontBold,
    color: rgb(0.09, 0.13, 0.2),
  });

  const metaLine = normalizePdfText(
    `Source: ${studyDoc.title} (${studyDoc.pageCount} ${
      studyDoc.pageCount === 1 ? 'Page' : 'Pages'
    })  |  Generated: ${new Date().toLocaleDateString()}`
  );
  currentPage.drawText(metaLine, {
    x: MARGIN_X + 16,
    y: cursorY - 57,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.39, 0.45, 0.55),
  });

  cursorY -= bannerHeight + 18;

  // Helper to draw a section heading with colored accent bar
  const drawSectionHeading = (
    title: string,
    accentRgb: [number, number, number]
  ) => {
    ensureSpace(36);
    cursorY -= 6;
    currentPage.drawRectangle({
      x: MARGIN_X,
      y: cursorY - 16,
      width: 4,
      height: 18,
      color: rgb(accentRgb[0], accentRgb[1], accentRgb[2]),
    });
    currentPage.drawText(normalizePdfText(title.toUpperCase()), {
      x: MARGIN_X + 12,
      y: cursorY - 12,
      size: 11,
      font: fontBold,
      color: rgb(0.09, 0.13, 0.2),
    });
    cursorY -= 24;
  };

  // Helper to draw wrapped paragraph lines
  const drawWrappedText = (
    text: string,
    options: {
      font?: PDFFont;
      size?: number;
      indent?: number;
      colorRgb?: [number, number, number];
      lineGap?: number;
    } = {}
  ) => {
    const f = options.font || fontRegular;
    const sz = options.size || 10;
    const indent = options.indent || 0;
    const col = options.colorRgb || [0.2, 0.25, 0.33];
    const lineHeight = sz + (options.lineGap ?? 4.5);

    const lines = wrapPdfTextLines(text, f, sz, CONTENT_WIDTH - indent);
    for (const line of lines) {
      ensureSpace(lineHeight + 4);
      if (line) {
        currentPage.drawText(line, {
          x: MARGIN_X + indent,
          y: cursorY - sz,
          size: sz,
          font: f,
          color: rgb(col[0], col[1], col[2]),
        });
      }
      cursorY -= lineHeight;
    }
  };

  // 2. Executive Chapter Overview
  const overviewText =
    onePageRevision?.overview ||
    studyDoc.overview ||
    'Comprehensive revision summary grounded in your uploaded study material.';
  drawSectionHeading('1. Chapter Overview & Summary', [0.26, 0.52, 0.96]);
  drawWrappedText(overviewText, { size: 10, colorRgb: [0.18, 0.23, 0.31] });
  cursorY -= 10;

  // 3. Essential Concepts
  const concepts =
    onePageRevision?.essentialConcepts && onePageRevision.essentialConcepts.length > 0
      ? onePageRevision.essentialConcepts
      : studyDoc.topics.map((t) => ({
          title: t.name,
          summary: t.summary,
          sourceLabel: `Page ${t.sourcePages[0] || 1}`,
          sourcePage: t.sourcePages[0] || 1,
        }));

  if (concepts.length > 0) {
    drawSectionHeading('2. Essential Concepts & Core Takeaways', [0.26, 0.52, 0.96]);
    concepts.forEach((item, idx) => {
      const titleLine = `${idx + 1}. ${item.title} [${item.sourceLabel}]`;
      const summaryLines = wrapPdfTextLines(
        item.summary,
        fontRegular,
        9.5,
        CONTENT_WIDTH - 24
      );
      const boxHeight = 22 + summaryLines.length * 13.5 + 8;
      ensureSpace(boxHeight + 8);

      currentPage.drawRectangle({
        x: MARGIN_X,
        y: cursorY - boxHeight,
        width: CONTENT_WIDTH,
        height: boxHeight,
        color: rgb(0.97, 0.98, 1.0),
        borderColor: rgb(0.86, 0.9, 0.96),
        borderWidth: 0.8,
      });

      currentPage.drawText(normalizePdfText(titleLine), {
        x: MARGIN_X + 10,
        y: cursorY - 15,
        size: 10,
        font: fontBold,
        color: rgb(0.09, 0.13, 0.2),
      });

      let innerY = cursorY - 30;
      for (const line of summaryLines) {
        currentPage.drawText(line, {
          x: MARGIN_X + 14,
          y: innerY,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.24, 0.3, 0.39),
        });
        innerY -= 13.5;
      }

      cursorY -= boxHeight + 7;
    });
    cursorY -= 6;
  }

  // 4. Key Formulas & Definitions (Table Layout)
  const formulas = onePageRevision?.formulasAndDefinitions || [];
  if (formulas.length > 0) {
    drawSectionHeading('3. Key Formulas, Theorems & Definitions', [0.2, 0.66, 0.33]);
    formulas.forEach((f) => {
      const termLines = wrapPdfTextLines(
        `${f.term} (${f.sourceLabel})`,
        fontBold,
        9.5,
        CONTENT_WIDTH * 0.36
      );
      const defLines = wrapPdfTextLines(
        f.formulaOrDef,
        fontMono,
        9,
        CONTENT_WIDTH * 0.58
      );
      const rowLines = Math.max(termLines.length, defLines.length);
      const rowHeight = Math.max(26, rowLines * 13 + 12);
      ensureSpace(rowHeight + 6);

      currentPage.drawRectangle({
        x: MARGIN_X,
        y: cursorY - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: rgb(0.95, 0.99, 0.96),
        borderColor: rgb(0.75, 0.91, 0.8),
        borderWidth: 0.8,
      });

      // Divider between term column and formula column
      const colSplitX = MARGIN_X + CONTENT_WIDTH * 0.39;
      currentPage.drawLine({
        start: { x: colSplitX, y: cursorY },
        end: { x: colSplitX, y: cursorY - rowHeight },
        thickness: 0.7,
        color: rgb(0.75, 0.91, 0.8),
      });

      termLines.forEach((tLine, i) => {
        currentPage.drawText(tLine, {
          x: MARGIN_X + 8,
          y: cursorY - 15 - i * 13,
          size: 9.5,
          font: fontBold,
          color: rgb(0.08, 0.45, 0.2),
        });
      });

      defLines.forEach((dLine, i) => {
        currentPage.drawText(dLine, {
          x: colSplitX + 10,
          y: cursorY - 15 - i * 13,
          size: 9,
          font: fontMono,
          color: rgb(0.1, 0.16, 0.24),
        });
      });

      cursorY -= rowHeight + 5;
    });
    cursorY -= 8;
  }

  // 5. Sticky Notes Highlights (if present)
  if (stickyNotes.length > 0) {
    drawSectionHeading('4. Highlighted Sticky Notes & Quick Takeaways', [0.96, 0.62, 0.04]);
    stickyNotes.forEach((note, idx) => {
      const header = `${idx + 1}. ${note.title} (${note.sourceLabel})`;
      drawWrappedText(header, {
        font: fontBold,
        size: 9.8,
        colorRgb: [0.55, 0.32, 0.02],
      });
      drawWrappedText(note.content, {
        font: fontRegular,
        size: 9.5,
        indent: 12,
        colorRgb: [0.2, 0.25, 0.33],
      });
      if (note.formula) {
        drawWrappedText(`Formula: ${note.formula}`, {
          font: fontMono,
          size: 9,
          indent: 12,
          colorRgb: [0.1, 0.35, 0.75],
        });
      }
      cursorY -= 5;
    });
    cursorY -= 6;
  }

  // 6. Concept Relationships & Common Mistakes to Avoid
  if (onePageRevision?.keyRelationships && onePageRevision.keyRelationships.length > 0) {
    drawSectionHeading('5. Key Concept Relationships', [0.98, 0.74, 0.02]);
    onePageRevision.keyRelationships.forEach((rel) => {
      drawWrappedText(`- ${rel}`, { size: 9.5, indent: 8 });
      cursorY -= 2;
    });
    cursorY -= 6;
  }

  if (
    onePageRevision?.commonMistakesToAvoid &&
    onePageRevision.commonMistakesToAvoid.length > 0
  ) {
    drawSectionHeading('6. Common Exam Pitfalls & Mistakes to Avoid', [0.92, 0.26, 0.21]);
    onePageRevision.commonMistakesToAvoid.forEach((mistake) => {
      drawWrappedText(`[!] ${mistake}`, {
        size: 9.5,
        indent: 8,
        colorRgb: [0.65, 0.12, 0.12],
      });
      cursorY -= 2;
    });
    cursorY -= 6;
  }

  // 7. Quick Recall Self-Check Questions & Active Recall Flashcards
  const recallQuestions = onePageRevision?.quickRecallQuestions || [];
  if (recallQuestions.length > 0) {
    drawSectionHeading('7. Quick Recall Self-Check Questions', [0.26, 0.52, 0.96]);
    recallQuestions.forEach((q, idx) => {
      drawWrappedText(`Q${idx + 1}: ${q.question}`, {
        font: fontBold,
        size: 9.5,
        colorRgb: [0.09, 0.13, 0.2],
      });
      drawWrappedText(`Answer: ${q.shortAnswer}`, {
        font: fontRegular,
        size: 9.5,
        indent: 12,
        colorRgb: [0.08, 0.45, 0.2],
      });
      cursorY -= 5;
    });
  } else if (flashcards.length > 0) {
    drawSectionHeading('7. Active-Recall Flashcards Summary', [0.26, 0.52, 0.96]);
    flashcards.slice(0, 8).forEach((card, idx) => {
      drawWrappedText(`Q${idx + 1} [${card.sourceLabel}]: ${card.frontQuestion}`, {
        font: fontBold,
        size: 9.5,
        colorRgb: [0.09, 0.13, 0.2],
      });
      drawWrappedText(`Answer: ${card.backAnswer}`, {
        font: fontRegular,
        size: 9.5,
        indent: 12,
        colorRgb: [0.08, 0.45, 0.2],
      });
      cursorY -= 5;
    });
  }

  // 8. Stamp page numbers and footer across all generated pages
  const totalPages = pages.length;
  pages.forEach((page, idx) => {
    page.drawLine({
      start: { x: MARGIN_X, y: 38 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: 38 },
      thickness: 0.6,
      color: rgb(0.85, 0.88, 0.93),
    });
    page.drawText(
      normalizePdfText(`LearnMate Revision Sheet • ${studyDoc.title}`),
      {
        x: MARGIN_X,
        y: 24,
        size: 8,
        font: fontRegular,
        color: rgb(0.45, 0.5, 0.58),
      }
    );
    const pageLabel = `Page ${idx + 1} of ${totalPages}`;
    const labelW = fontBold.widthOfTextAtSize(pageLabel, 8.5);
    page.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN_X - labelW,
      y: 24,
      size: 8.5,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.33),
    });
  });

  return pdfDoc.save();
}

function annotationColorToRgb(color: PdfAnnotationColor): [number, number, number] {
  switch (color) {
    case 'yellow':
      return [0.98, 0.82, 0.08];
    case 'green':
      return [0.2, 0.72, 0.36];
    case 'blue':
      return [0.26, 0.52, 0.96];
    case 'pink':
      return [0.93, 0.28, 0.6];
    case 'red':
      return [0.92, 0.26, 0.21];
    case 'navy':
    default:
      return [0.09, 0.13, 0.2];
  }
}

function decodeBase64DataUrl(dataUrl: string): Uint8Array | null {
  try {
    const commaIdx = dataUrl.indexOf(',');
    const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(base64, 'base64'));
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Generates an actual PDF binary (.pdf) for a StudyDocument in PDF Workspace,
 * optionally flattening all student annotations (highlights, underlines, freehand pen,
 * shapes, and text notes) directly onto the PDF pages.
 */
export async function generateAnnotatedDocumentPdfBytes(
  studyDoc: StudyDocument,
  annotations: PdfAnnotationItem[] = [],
  includeAnnotations = true
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument | null = null;

  if (studyDoc.pdfDataUrl) {
    const rawBytes = decodeBase64DataUrl(studyDoc.pdfDataUrl);
    if (rawBytes && rawBytes.length > 10) {
      try {
        pdfDoc = await PDFDocument.load(rawBytes);
      } catch {
        pdfDoc = null;
      }
    }
  }

  const isCreatedFromPages = !pdfDoc;
  if (!pdfDoc) {
    pdfDoc = await PDFDocument.create();
  }

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  if (isCreatedFromPages) {
    const PAGE_WIDTH = 595.28;
    const PAGE_HEIGHT = 841.89;
    const MARGIN_X = 48;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

    for (const p of studyDoc.pages) {
      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let y = PAGE_HEIGHT - 52;

      page.drawRectangle({
        x: MARGIN_X,
        y: y - 40,
        width: CONTENT_WIDTH,
        height: 40,
        color: rgb(0.95, 0.97, 1.0),
        borderColor: rgb(0.82, 0.88, 0.96),
        borderWidth: 0.8,
      });

      page.drawText(
        normalizePdfText(`${studyDoc.title} — Page ${p.pageNumber} of ${studyDoc.pageCount}`),
        {
          x: MARGIN_X + 12,
          y: y - 16,
          size: 8.5,
          font: fontBold,
          color: rgb(0.1, 0.45, 0.91),
        }
      );

      page.drawText(normalizePdfText(p.title || `Section ${p.pageNumber}`), {
        x: MARGIN_X + 12,
        y: y - 32,
        size: 12,
        font: fontBold,
        color: rgb(0.09, 0.13, 0.2),
      });

      y -= 60;

      const contentLines = wrapPdfTextLines(p.content, fontRegular, 10.5, CONTENT_WIDTH);
      for (const line of contentLines) {
        if (y < 52) break;
        if (line) {
          const isHeading = /^[0-9]+\.\s+/.test(line) || /^[A-Z\s—–-]{8,}$/.test(line);
          page.drawText(line, {
            x: MARGIN_X,
            y,
            size: isHeading ? 11 : 10.5,
            font: isHeading ? fontBold : fontRegular,
            color: isHeading ? rgb(0.09, 0.13, 0.2) : rgb(0.2, 0.25, 0.33),
          });
        }
        y -= 15.5;
      }

      page.drawText(`Page ${p.pageNumber} of ${studyDoc.pageCount}`, {
        x: PAGE_WIDTH - MARGIN_X - 65,
        y: 26,
        size: 8.5,
        font: fontBold,
        color: rgb(0.45, 0.5, 0.58),
      });
    }
  }

  // Draw student annotations if requested
  if (includeAnnotations && annotations.length > 0) {
    const pdfPages = pdfDoc.getPages();
    for (const ann of annotations) {
      const pageIdx = Math.max(0, Math.min(pdfPages.length - 1, ann.pageNumber - 1));
      const page = pdfPages[pageIdx];
      if (!page) continue;

      const { width: pw, height: ph } = page.getSize();
      const [r, g, b] = annotationColorToRgb(ann.color);

      const x = ann.x * pw;
      const w = (ann.width || 0.22) * pw;
      const h = (ann.height || 0.04) * ph;
      // PDF coordinate origin is bottom-left; normalized y is top-down (0 = top, 1 = bottom)
      const yTop = ph - ann.y * ph;
      const yBottom = yTop - h;

      if (ann.tool === 'highlight') {
        page.drawRectangle({
          x,
          y: yBottom,
          width: Math.max(24, w),
          height: Math.max(12, h),
          color: rgb(r, g, b),
          opacity: 0.35,
        });
      } else if (ann.tool === 'underline') {
        page.drawLine({
          start: { x, y: yBottom },
          end: { x: x + Math.max(36, w), y: yBottom },
          thickness: 2,
          color: rgb(r, g, b),
        });
      } else if (ann.tool === 'rectangle') {
        page.drawRectangle({
          x,
          y: yBottom,
          width: Math.max(24, w),
          height: Math.max(18, h),
          borderColor: rgb(r, g, b),
          borderWidth: ann.strokeWidth || 2,
          opacity: 0.9,
        });
      } else if (ann.tool === 'circle') {
        page.drawEllipse({
          x: x + Math.max(16, w) / 2,
          y: yBottom + Math.max(16, h) / 2,
          xScale: Math.max(16, w) / 2,
          yScale: Math.max(16, h) / 2,
          borderColor: rgb(r, g, b),
          borderWidth: ann.strokeWidth || 2,
        });
      } else if (ann.tool === 'arrow') {
        const endX = x + w;
        const endY = yBottom;
        page.drawLine({
          start: { x, y: yTop },
          end: { x: endX, y: endY },
          thickness: ann.strokeWidth || 2.2,
          color: rgb(r, g, b),
        });
        page.drawCircle({
          x: endX,
          y: endY,
          size: 3.5,
          color: rgb(r, g, b),
        });
      } else if (ann.tool === 'pen' && ann.points && ann.points.length > 1) {
        for (let i = 0; i < ann.points.length - 1; i++) {
          const p1 = ann.points[i];
          const p2 = ann.points[i + 1];
          page.drawLine({
            start: { x: p1.x * pw, y: ph - p1.y * ph },
            end: { x: p2.x * pw, y: ph - p2.y * ph },
            thickness: ann.strokeWidth || 2.2,
            color: rgb(r, g, b),
          });
        }
      } else if (ann.tool === 'text_note' && ann.text) {
        const noteLines = wrapPdfTextLines(ann.text, fontRegular, 8.5, 155);
        const boxW = 168;
        const boxH = Math.max(28, noteLines.length * 11 + 14);
        const clampedX = Math.min(pw - boxW - 12, Math.max(12, x));
        const clampedY = Math.min(ph - boxH - 12, Math.max(12, yTop - boxH));

        page.drawRectangle({
          x: clampedX,
          y: clampedY,
          width: boxW,
          height: boxH,
          color: rgb(1, 0.98, 0.86),
          borderColor: rgb(r, g, b),
          borderWidth: 1.2,
        });

        noteLines.forEach((nl, idx) => {
          page.drawText(nl, {
            x: clampedX + 6,
            y: clampedY + boxH - 12 - idx * 11,
            size: 8.5,
            font: fontRegular,
            color: rgb(0.1, 0.14, 0.2),
          });
        });
      }
    }
  }

  return pdfDoc.save();
}

/**
 * Triggers a browser download of a real PDF Uint8Array with `application/pdf` MIME type.
 */
export function triggerPdfDownload(pdfBytes: Uint8Array, filename: string): void {
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}
