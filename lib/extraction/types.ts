export interface PdfTextToken {
  text: string;
  x: number;
  y: number;
  width: number;
}

export interface PdfLine {
  pageNumber: number;
  tokens: PdfTextToken[];
  sourceText: string;
}

export interface PdfPageText {
  pageNumber: number;
  lines: PdfLine[];
  characterCount: number;
}

export interface PageReadFailure {
  pageNumber: number;
  message: string;
}

export interface PdfTextDocument {
  pageCount: number;
  pages: PdfPageText[];
  failedPages: PageReadFailure[];
}

export type NumericField = "quantity" | "unitPrice" | "lineAmount";

export interface HeaderColumns {
  quantityX: number;
  weightX: number | null;
  unitPriceX: number | null;
  amountX: number | null;
  unitX: number | null;
}
