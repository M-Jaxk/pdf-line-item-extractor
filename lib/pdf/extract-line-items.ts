import { createRefusal } from "@/lib/errors/refusal";
import type {
  ExtractionRefusal,
  ExtractionWarning,
  LineItem,
} from "@/lib/extraction/schema";
import type {
  HeaderColumns,
  NumericField,
  PdfLine,
  PdfPageText,
  PdfTextToken,
} from "@/lib/extraction/types";
import { evidenceForLine, roundToCurrencyPrecision } from "@/lib/pdf/evidence";

interface ParsedNumber {
  x: number;
  value: number | null;
  ambiguous: boolean;
  currency: string | null;
}

interface ParseLineItemsResult {
  items: LineItem[];
  refusals: ExtractionRefusal[];
  warnings: ExtractionWarning[];
  candidateRows: number;
}

const UNIT_PATTERN = /^(?:ea|each|unit|units|pc|pcs|piece|pieces|m|lm|m2|m3|sqm|kg|g|hr|hrs|hour|hours|day|days|box|bag|tonne|tonnes)$/i;
const META_LINE_PATTERN = /^(?:invoice|tax invoice|delivery docket|packing slip|packing list|purchase order|customer|supplier|date|due date|invoice number|invoice no\.?|order no\.?|po no\.?|abn|gst number|phone|tel|email|www\.)\b/i;
const SUMMARY_LINE_PATTERN = /^(?:sub\s*total|subtotal|net total|gst|tax|grand total|total(?: due)?|amount due|balance due)\b/i;
const PAGE_NUMBER_PATTERN = /^page\s+\d+(?:\s+of\s+\d+)?\s*$/i;

function tokenizeLine(line: PdfLine): PdfTextToken[] {
  const result: PdfTextToken[] = [];

  for (const token of line.tokens) {
    const parts = [...token.text.matchAll(/\S+/g)];
    if (parts.length <= 1) {
      result.push({ ...token, text: token.text.trim() });
      continue;
    }

    const characterWidth = token.width / Math.max(token.text.length, 1);
    for (const part of parts) {
      const start = part.index ?? 0;
      const text = part[0];
      result.push({
        text,
        x: token.x + start * characterWidth,
        y: token.y,
        width: text.length * characterWidth,
      });
    }
  }

  return result.sort((a, b) => a.x - b.x);
}

function headerAnchor(tokens: readonly PdfTextToken[], pattern: RegExp): number | null {
  return (
    tokens.find((token) =>
      pattern.test(token.text.trim().toLowerCase().replace(/[.:#]/g, "")),
    )?.x ?? null
  );
}

function detectHeaderColumns(lines: readonly PdfLine[]): {
  line: PdfLine;
  columns: HeaderColumns;
} | null {
  for (const line of lines) {
    const tokens = tokenizeLine(line);
    const text = line.sourceText.toLowerCase();
    const quantityX = headerAnchor(tokens, /^(?:qty|quantity|quantities)$/i);
    const amountX = headerAnchor(
      tokens,
      /^(?:amount|line\s*total|extended|extension|total)$/i,
    );

    if (
      quantityX === null ||
      amountX === null ||
      !/(?:description|details|item|product|service)/i.test(text)
    ) {
      continue;
    }

    const unitPriceX = headerAnchor(
      tokens,
      /^(?:(?:unit\s*)?price|rate|each)$/i,
    );
    const unitX = headerAnchor(tokens, /^unit$/i);

    return {
      line,
      columns: { quantityX, unitPriceX, amountX, unitX },
    };
  }
  return null;
}

function parseNumber(raw: string, x: number): ParsedNumber | null {
  const trimmed = raw.trim();
  if (!trimmed || /%$/.test(trimmed) || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(trimmed)) {
    return null;
  }

  const currencyMatch = trimmed.match(/\b(NZD|AUD|USD)\b/i);
  const currency = currencyMatch?.[1]?.toUpperCase() ?? null;
  let valueText = trimmed
    .replace(/\b(?:NZD|AUD|USD)\b/gi, "")
    .replace(/[\p{Sc}\s]/gu, "");
  let negative = false;

  if (valueText.startsWith("(") && valueText.endsWith(")")) {
    negative = true;
    valueText = valueText.slice(1, -1);
  } else if (valueText.endsWith("-")) {
    negative = true;
    valueText = valueText.slice(0, -1);
  }

  if (valueText.startsWith("-")) {
    negative = !negative;
    valueText = valueText.slice(1);
  }

  if (!/^\d[\d.,]*$/.test(valueText)) return null;

  const hasComma = valueText.includes(",");
  const hasDot = valueText.includes(".");
  let normalized = valueText;

  if (hasComma && hasDot) {
    const commaDecimalPattern = /^\d{1,3}(?:\.\d{3})+,\d{1,2}$/;
    if (commaDecimalPattern.test(valueText)) {
      return { x, value: null, ambiguous: true, currency };
    }
    if (!/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(valueText)) {
      return { x, value: null, ambiguous: true, currency };
    }
    normalized = valueText.replaceAll(",", "");
  } else if (hasComma) {
    if (!/^\d{1,3}(?:,\d{3})+$/.test(valueText)) {
      return { x, value: null, ambiguous: true, currency };
    }
    normalized = valueText.replaceAll(",", "");
  } else if (hasDot) {
    if (!/^\d+(?:\.\d+)?$/.test(valueText)) {
      return { x, value: null, ambiguous: true, currency };
    }
    if (/\.\d{3}$/.test(valueText)) {
      return { x, value: null, ambiguous: true, currency };
    }
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  return {
    x,
    value: negative ? -value : value,
    ambiguous: false,
    currency,
  };
}

function parseNumbers(tokens: readonly PdfTextToken[]): ParsedNumber[] {
  return tokens
    .map((token) => parseNumber(token.text, token.x))
    .filter((number): number is ParsedNumber => number !== null);
}

function isMissingCell(token: PdfTextToken): boolean {
  return /^(?:-|–|—|n\/a)$/i.test(token.text.trim());
}

function nearestNumericField(
  x: number,
  columns: HeaderColumns,
): NumericField | null {
  const anchors: Array<{ field: NumericField; x: number }> = [
    { field: "quantity", x: columns.quantityX },
    ...(columns.unitPriceX === null
      ? []
      : [{ field: "unitPrice" as const, x: columns.unitPriceX }]),
    { field: "lineAmount", x: columns.amountX },
  ];
  const nearest = anchors
    .map((anchor) => ({ ...anchor, distance: Math.abs(anchor.x - x) }))
    .sort((a, b) => a.distance - b.distance);
  // A token close to two headings has no defensible column assignment.
  if (
    nearest[0].distance > 90 ||
    (nearest[1] && nearest[1].distance - nearest[0].distance < 4)
  ) {
    return null;
  }

  // Reject tokens placed to the left of the first numeric column (often item/SKU codes).
  if (x < columns.quantityX - 15) return null;
  return nearest[0].field;
}

function cleanDescription(tokens: readonly PdfTextToken[], columns?: HeaderColumns): string {
  const cutoff = columns?.quantityX ?? Number.POSITIVE_INFINITY;
  return tokens
    .filter((token) => token.x < cutoff - 4)
    .filter((token) => parseNumber(token.text, token.x) === null)
    .filter((token) => !isMissingCell(token) && !UNIT_PATTERN.test(token.text))
    .map((token) => token.text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function findUnit(tokens: readonly PdfTextToken[], columns: HeaderColumns): string | null {
  if (columns.unitX === null) return null;
  return (
    tokens.find(
      (token) =>
        Math.abs(token.x - columns.unitX!) < 70 && UNIT_PATTERN.test(token.text.trim()),
    )?.text.trim() ?? null
  );
}

function isHeaderLine(line: PdfLine, header: PdfLine | null): boolean {
  return header === line;
}

function refusalForRow(
  id: string,
  line: PdfLine,
  reason: "ambiguous_columns" | "ambiguous_number_format" | "line_total_mismatch",
  detail?: string,
): ExtractionRefusal {
  return createRefusal({
    id,
    page: line.pageNumber,
    sourceText: line.sourceText,
    reason,
    detail,
  });
}

function classifyTotal(line: PdfLine): { subtotal: number; token: string } | null {
  if (!/^\s*(?:sub\s*total|subtotal)\b/i.test(line.sourceText)) return null;
  const tokens = tokenizeLine(line);
  const numbers = parseNumbers(tokens).filter((number) => !number.ambiguous && number.value !== null);
  const last = numbers.at(-1);
  return last?.value === null || last === undefined
    ? null
    : { subtotal: last.value, token: line.sourceText };
}

function parseMappedRow(
  line: PdfLine,
  columns: HeaderColumns,
  rowId: string,
): { item?: LineItem; refusals: ExtractionRefusal[] } {
  const tokens = tokenizeLine(line);
  const numbers = parseNumbers(tokens);
  const ambiguousNumber = numbers.find((number) => number.ambiguous);
  if (ambiguousNumber) {
    return {
      refusals: [refusalForRow(rowId, line, "ambiguous_number_format")],
    };
  }

  const values: Partial<Record<NumericField, ParsedNumber>> = {};
  for (const number of numbers) {
    const field = nearestNumericField(number.x, columns);
    if (!field || values[field]) {
      return {
        refusals: [refusalForRow(rowId, line, "ambiguous_columns")],
      };
    }
    values[field] = number;
  }

  const quantity = values.quantity?.value ?? null;
  const unitPrice = values.unitPrice?.value ?? null;
  const lineAmount = values.lineAmount?.value ?? null;

  if (
    quantity !== null &&
    unitPrice !== null &&
    lineAmount !== null &&
    Math.abs(roundToCurrencyPrecision(quantity * unitPrice) - lineAmount) > 0.02
  ) {
    return {
      refusals: [
        refusalForRow(
          rowId,
          line,
          "line_total_mismatch",
          `printed ${lineAmount.toFixed(2)}; quantity × unit price is ${roundToCurrencyPrecision(quantity * unitPrice).toFixed(2)}`,
        ),
      ],
    };
  }

  const description = cleanDescription(tokens, columns);
  if (!description || numbers.length === 0) {
    return {
      refusals: [refusalForRow(rowId, line, "ambiguous_columns")],
    };
  }

  const refusals: ExtractionRefusal[] = [];
  const expectedFields: NumericField[] = ["quantity"];
  if (columns.unitPriceX !== null) expectedFields.push("unitPrice");
  expectedFields.push("lineAmount");

  for (const field of expectedFields) {
    if (values[field]) continue;
    refusals.push(
      createRefusal({
        id: `${rowId}-${field}`,
        page: line.pageNumber,
        sourceText: line.sourceText,
        reason: "missing_numeric_field",
        field,
      }),
    );
  }

  const currency =
    values.lineAmount?.currency ??
    values.unitPrice?.currency ??
    values.quantity?.currency ??
    null;

  return {
    item: {
      id: rowId,
      description,
      quantity,
      unit: findUnit(tokens, columns),
      unitPrice,
      lineAmount,
      currency,
      evidence: evidenceForLine(line),
    },
    refusals,
  };
}

function parseHeaderlessRow(
  line: PdfLine,
  rowId: string,
): { item?: LineItem; refusals: ExtractionRefusal[] } {
  const tokens = tokenizeLine(line);
  const numbers = parseNumbers(tokens);
  if (numbers.some((number) => number.ambiguous)) {
    return {
      refusals: [refusalForRow(rowId, line, "ambiguous_number_format")],
    };
  }

  const validNumbers = numbers.filter(
    (number): number is ParsedNumber & { value: number } => number.value !== null,
  );
  const description = cleanDescription(tokens);

  // Without a header, only accept an unambiguous three-number row whose arithmetic agrees.
  if (validNumbers.length !== 3 || !description) {
    return {
      refusals: [refusalForRow(rowId, line, "ambiguous_columns")],
    };
  }

  const [quantity, unitPrice, lineAmount] = validNumbers;
  if (Math.abs(roundToCurrencyPrecision(quantity.value * unitPrice.value) - lineAmount.value) > 0.02) {
    return {
      refusals: [
        refusalForRow(
          rowId,
          line,
          "line_total_mismatch",
          `printed ${lineAmount.value.toFixed(2)}; the first two values multiply to ${roundToCurrencyPrecision(quantity.value * unitPrice.value).toFixed(2)}`,
        ),
      ],
    };
  }

  const unit = tokens.find((token) => UNIT_PATTERN.test(token.text))?.text ?? null;
  return {
    item: {
      id: rowId,
      description,
      quantity: quantity.value,
      unit,
      unitPrice: unitPrice.value,
      lineAmount: lineAmount.value,
      currency: lineAmount.currency ?? unitPrice.currency ?? null,
      evidence: evidenceForLine(line),
    },
    refusals: [],
  };
}

function isCandidateLine(line: PdfLine): boolean {
  return parseNumbers(tokenizeLine(line)).length > 0;
}

export function extractLineItems(pages: readonly PdfPageText[]): ParseLineItemsResult {
  const allLines = pages.flatMap((page) => page.lines);
  const items: LineItem[] = [];
  const refusals: ExtractionRefusal[] = [];
  const warnings: ExtractionWarning[] = [];
  const totals: Array<{ page: number; value: number; sourceText: string }> = [];
  let candidateRows = 0;
  let rowNumber = 0;

  for (const page of pages) {
    const detectedHeader = detectHeaderColumns(page.lines);
    for (const line of page.lines) {
      if (isHeaderLine(line, detectedHeader?.line ?? null)) continue;
      if (
        META_LINE_PATTERN.test(line.sourceText.trim()) ||
        PAGE_NUMBER_PATTERN.test(line.sourceText.trim())
      ) {
        continue;
      }

      const total = classifyTotal(line);
      if (total) {
        totals.push({
          page: line.pageNumber,
          value: total.subtotal,
          sourceText: total.token,
        });
        continue;
      }
      if (SUMMARY_LINE_PATTERN.test(line.sourceText.trim())) continue;

      if (!isCandidateLine(line)) continue;
      candidateRows += 1;
      rowNumber += 1;
      const rowId = `item-${line.pageNumber}-${rowNumber}`;

      try {
        const parsed = detectedHeader
          ? parseMappedRow(line, detectedHeader.columns, rowId)
          : parseHeaderlessRow(line, rowId);
        if (parsed.item) items.push(parsed.item);
        refusals.push(...parsed.refusals);
      } catch (error) {
        refusals.push(
          createRefusal({
            id: `${rowId}-parse-failed`,
            page: line.pageNumber,
            sourceText: line.sourceText,
            reason: "row_parse_failed",
            detail: error instanceof Error ? error.message : "Unexpected row parsing error.",
          }),
        );
      }
    }
  }

  const subtotal = totals.find((total) => /subtotal/i.test(total.sourceText));
  const hasIncompleteRows = refusals.some((refusal) =>
    [
      "missing_numeric_field",
      "ambiguous_columns",
      "ambiguous_number_format",
      "line_total_mismatch",
    ].includes(refusal.reason),
  );
  if (
    subtotal &&
    items.length > 0 &&
    !hasIncompleteRows &&
    items.every((item) => item.lineAmount !== null)
  ) {
    const extractedSum = roundToCurrencyPrecision(
      items.reduce((sum, item) => sum + (item.lineAmount ?? 0), 0),
    );
    if (Math.abs(extractedSum - subtotal.value) > 0.02) {
      warnings.push({
        id: `subtotal-mismatch-${subtotal.page}`,
        page: subtotal.page,
        sourceText: subtotal.sourceText,
        reason: "subtotal_mismatch",
        message: `The printed subtotal is ${subtotal.value.toFixed(2)}, but the extracted line amounts add up to ${extractedSum.toFixed(2)}. Review the document totals.`,
      });
    }
  }

  if (candidateRows === 0 && allLines.some((line) => line.sourceText.trim())) {
    refusals.push(
      createRefusal({
        id: "no-line-items",
        page: null,
        sourceText: null,
        reason: "no_line_items_found",
      }),
    );
  }

  return { items, refusals, warnings, candidateRows };
}
