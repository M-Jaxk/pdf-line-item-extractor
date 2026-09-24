import {
  getDocument,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import { DocumentReadError } from "@/lib/errors/refusal";
import type {
  PdfLine,
  PdfPageText,
  PdfTextDocument,
  PdfTextToken,
} from "@/lib/extraction/types";

const MAX_PAGES = 100;
const SAME_LINE_Y_TOLERANCE = 2.5;

interface PdfJsTextItem {
  str: string;
  transform: number[];
  width: number;
  hasEOL?: boolean;
}

function isPdfJsTextItem(value: unknown): value is PdfJsTextItem {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Partial<PdfJsTextItem>;
  return (
    typeof item.str === "string" &&
    Array.isArray(item.transform) &&
    typeof item.width === "number"
  );
}

function groupIntoLines(
  pageNumber: number,
  textItems: readonly unknown[],
): PdfLine[] {
  const tokens: PdfTextToken[] = textItems
    .filter(isPdfJsTextItem)
    .filter((item) => item.str.trim().length > 0)
    .map((item) => ({
      text: item.str,
      x: item.transform[4] ?? 0,
      y: item.transform[5] ?? 0,
      width: item.width,
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const grouped: PdfTextToken[][] = [];
  for (const token of tokens) {
    const currentLine = grouped.at(-1);
    if (currentLine && Math.abs(currentLine[0].y - token.y) <= SAME_LINE_Y_TOLERANCE) {
      currentLine.push(token);
    } else {
      grouped.push([token]);
    }
  }

  return grouped
    .map((lineTokens) => {
      const sortedTokens = lineTokens.sort((a, b) => a.x - b.x);
      const sourceText = sortedTokens
        .map((token) => token.text.trim())
        .filter(Boolean)
        .join(" ");

      return {
        pageNumber,
        tokens: sortedTokens,
        sourceText,
      };
    })
    .filter((line) => line.sourceText.length > 0)
    .sort((a, b) => b.tokens[0].y - a.tokens[0].y);
}

function mapDocumentError(error: unknown): DocumentReadError | null {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "Unknown PDF parsing error.";

  if (name === "PasswordException") {
    return new DocumentReadError("encrypted_pdf", "The PDF requires a password.");
  }
  if (name === "InvalidPDFException" || name === "FormatError") {
    return new DocumentReadError("corrupt_pdf", `The PDF could not be parsed: ${message}`);
  }
  return null;
}

export async function extractPdfText(data: Uint8Array): Promise<PdfTextDocument> {
  let loadingTask: PDFDocumentLoadingTask | undefined;
  let document: PDFDocumentProxy;

  try {
    loadingTask = getDocument({
      data: Uint8Array.from(data),
      useSystemFonts: true,
    });
    document = await loadingTask.promise;
  } catch (error) {
    await loadingTask?.destroy().catch(() => undefined);
    const documentError = mapDocumentError(error);
    if (documentError) throw documentError;
    throw error;
  }

  if (!loadingTask) {
    throw new DocumentReadError("corrupt_pdf", "The PDF loading task was not created.");
  }

  if (document.numPages > MAX_PAGES) {
    await loadingTask.destroy().catch(() => undefined);
    throw new DocumentReadError(
      "too_many_pages",
      `This PDF has ${document.numPages} pages; the maximum supported is ${MAX_PAGES}.`,
      document.numPages,
    );
  }

  const pages: PdfPageText[] = [];
  const failedPages: PdfTextDocument["failedPages"] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      let page: Awaited<ReturnType<PDFDocumentProxy["getPage"]>> | undefined;
      try {
        page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const lines = groupIntoLines(pageNumber, content.items);
        pages.push({
          pageNumber,
          lines,
          characterCount: lines.reduce((total, line) => total + line.sourceText.length, 0),
        });
      } catch (error) {
        failedPages.push({
          pageNumber,
          message: error instanceof Error ? error.message : "Unknown page parsing error.",
        });
      } finally {
        try {
          page?.cleanup();
        } catch {
          // Page cleanup is best-effort and must not invalidate other pages.
        }
      }
    }
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }

  return {
    pageCount: document.numPages,
    pages,
    failedPages,
  };
}
