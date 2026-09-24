import type { NumericField } from "@/lib/extraction/types";
import type {
  ExtractionRefusal,
  RefusalReason,
} from "@/lib/extraction/schema";

export class DocumentReadError extends Error {
  constructor(
    public readonly reason: "encrypted_pdf" | "corrupt_pdf" | "too_many_pages",
    message: string,
    public readonly pageCount?: number,
  ) {
    super(message);
    this.name = "DocumentReadError";
  }
}

export interface RefusalInput {
  id: string;
  page: number | null;
  sourceText: string | null;
  reason: RefusalReason;
  field?: NumericField;
  fieldLabel?: string;
  detail?: string;
}

const FIELD_LABELS: Record<NumericField, string> = {
  quantity: "quantity",
  unitPrice: "unit price",
  lineAmount: "line amount",
};

export function createRefusal(input: RefusalInput): ExtractionRefusal {
  const { reason, page, field, detail } = input;
  const pageLabel = page === null ? "the document" : `page ${page}`;
  let message: string;

  switch (reason) {
    case "no_text_layer":
      message =
        page === null
          ? "This PDF has no readable text layer. It may be a scan; OCR is not available, so no values were extracted."
          : `Page ${page} has no readable text layer. It may be a scan or blank page; no values were extracted from this page.`;
      break;
    case "no_line_items_found":
      message = "No line items could be identified confidently. Check that the document contains a readable item table.";
      break;
    case "ambiguous_columns":
      message = `The numbers on ${pageLabel} could not be matched confidently to quantity, unit price, and line amount columns. No values from this row were used.`;
      break;
    case "ambiguous_number_format":
      message = `A number on ${pageLabel} uses a format that could have more than one meaning. It was not converted.`;
      break;
    case "missing_numeric_field":
      message = `The ${FIELD_LABELS[field ?? "lineAmount"]} is missing on ${pageLabel}. It was left blank rather than estimated.`;
      break;
    case "unsupported_numeric_field":
      message = `The ${input.fieldLabel ?? "measurement"} on ${pageLabel} is shown in the source but is not included as a quote value by this extractor.`;
      break;
    case "line_total_mismatch":
      message = `The quantity and unit price on ${pageLabel} do not agree with the printed line amount${detail ? ` (${detail})` : ""}. This row was not extracted.`;
      break;
    case "row_parse_failed":
      message = `This line on ${pageLabel} could not be processed${detail ? `: ${detail}` : "."} Other rows were still processed.`;
      break;
    case "page_read_failed":
      message = `Text could not be read from ${pageLabel}${detail ? `: ${detail}` : "."} Other pages were still processed.`;
      break;
    case "encrypted_pdf":
      message = "This PDF is password-protected and could not be read. Provide an unlocked copy to continue.";
      break;
    case "corrupt_pdf":
      message = "This file could not be read as a valid PDF. Try exporting or downloading the PDF again.";
      break;
    case "too_many_pages":
      message = detail ?? "This document exceeds the supported page limit.";
      break;
  }

  return {
    id: input.id,
    page,
    sourceText: input.sourceText,
    reason,
    ...(field ? { field } : {}),
    ...(input.fieldLabel ? { fieldLabel: input.fieldLabel } : {}),
    message,
  };
}
