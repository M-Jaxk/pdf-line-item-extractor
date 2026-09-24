import { z } from "zod";

export const evidenceSchema = z.object({
  page: z.number().int().positive(),
  sourceText: z.string().min(1),
});

export const lineItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().finite().nullable(),
  unit: z.string().nullable(),
  unitPrice: z.number().finite().nullable(),
  lineAmount: z.number().finite().nullable(),
  currency: z.string().length(3).nullable(),
  evidence: evidenceSchema,
});

export const refusalReasonSchema = z.enum([
  "no_text_layer",
  "no_line_items_found",
  "ambiguous_columns",
  "ambiguous_number_format",
  "missing_numeric_field",
  "unsupported_numeric_field",
  "line_total_mismatch",
  "row_parse_failed",
  "page_read_failed",
  "encrypted_pdf",
  "corrupt_pdf",
  "too_many_pages",
]);

export const refusalSchema = z.object({
  id: z.string().min(1),
  page: z.number().int().positive().nullable(),
  sourceText: z.string().nullable(),
  reason: refusalReasonSchema,
  field: z.enum(["quantity", "unitPrice", "lineAmount"]).optional(),
  fieldLabel: z.string().optional(),
  message: z.string().min(1),
});

export const warningSchema = z.object({
  id: z.string().min(1),
  page: z.number().int().positive(),
  sourceText: z.string().min(1),
  conflictingPage: z.number().int().positive().optional(),
  conflictingSourceText: z.string().min(1).optional(),
  reason: z.enum(["subtotal_mismatch", "conflicting_document_counts"]),
  message: z.string().min(1),
});

export const extractionResultSchema = z.object({
  document: z.object({
    fileName: z.string().min(1),
    pageCount: z.number().int().nonnegative(),
  }),
  items: z.array(lineItemSchema),
  refusals: z.array(refusalSchema),
  warnings: z.array(warningSchema),
  stats: z.object({
    pagesRead: z.number().int().nonnegative(),
    linesRead: z.number().int().nonnegative(),
    candidateRows: z.number().int().nonnegative(),
  }),
});

export const apiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type Evidence = z.infer<typeof evidenceSchema>;
export type LineItem = z.infer<typeof lineItemSchema>;
export type RefusalReason = z.infer<typeof refusalReasonSchema>;
export type ExtractionRefusal = z.infer<typeof refusalSchema>;
export type ExtractionWarning = z.infer<typeof warningSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
