import type { Evidence } from "@/lib/extraction/schema";
import type { PdfLine } from "@/lib/extraction/types";

export function evidenceForLine(line: PdfLine): Evidence {
  return {
    page: line.pageNumber,
    sourceText: line.sourceText,
  };
}

export function roundToCurrencyPrecision(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
