import { createRefusal, DocumentReadError } from "@/lib/errors/refusal";
import { extractionResultSchema, type ExtractionResult } from "@/lib/extraction/schema";
import type { PdfTextDocument } from "@/lib/extraction/types";
import { extractLineItems } from "@/lib/pdf/extract-line-items";
import { extractPdfText } from "@/lib/pdf/extract-text";

function emptyResult(
  fileName: string,
  pageCount: number,
  reason: DocumentReadError["reason"],
  message?: string,
): ExtractionResult {
  return extractionResultSchema.parse({
    document: { fileName, pageCount },
    items: [],
    refusals: [
      createRefusal({
        id: `document-${reason}`,
        page: null,
        sourceText: null,
        reason,
        detail: message,
      }),
    ],
    warnings: [],
    stats: { pagesRead: 0, linesRead: 0, candidateRows: 0 },
  });
}

function resultFromText(fileName: string, pdf: PdfTextDocument): ExtractionResult {
  const linesRead = pdf.pages.reduce((count, page) => count + page.lines.length, 0);
  const pageRefusals = pdf.failedPages.map((failure) =>
    createRefusal({
      id: `page-${failure.pageNumber}-read-failed`,
      page: failure.pageNumber,
      sourceText: null,
      reason: "page_read_failed",
      detail: failure.message,
    }),
  );
  const textCharacterCount = pdf.pages.reduce(
    (count, page) => count + page.characterCount,
    0,
  );

  if (textCharacterCount === 0) {
    return extractionResultSchema.parse({
      document: { fileName, pageCount: pdf.pageCount },
      items: [],
      refusals: [
        ...pageRefusals,
        createRefusal({
          id: "document-no-text-layer",
          page: null,
          sourceText: null,
          reason: "no_text_layer",
        }),
      ],
      warnings: [],
      stats: {
        pagesRead: pdf.pages.length,
        linesRead,
        candidateRows: 0,
      },
    });
  }

  const parsed = extractLineItems(pdf.pages);
  return extractionResultSchema.parse({
    document: { fileName, pageCount: pdf.pageCount },
    items: parsed.items,
    refusals: [...pageRefusals, ...parsed.refusals],
    warnings: parsed.warnings,
    stats: {
      pagesRead: pdf.pages.length,
      linesRead,
      candidateRows: parsed.candidateRows,
    },
  });
}

export async function extractDocument(
  data: Uint8Array,
  fileName: string,
): Promise<ExtractionResult> {
  try {
    const pdf = await extractPdfText(data);
    return resultFromText(fileName, pdf);
  } catch (error) {
    if (error instanceof DocumentReadError) {
      return emptyResult(fileName, error.pageCount ?? 0, error.reason, error.message);
    }
    throw error;
  }
}
