import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ExtractionResultView } from "@/components/extraction-result";
import type { ExtractionResult } from "@/lib/extraction/schema";

describe("extraction result presentation", () => {
  it("shows refusal messages, page references, and source text in plain language", () => {
    const result: ExtractionResult = {
      document: { fileName: "delivery-docket.pdf", pageCount: 2 },
      items: [
        {
          id: "item-1",
          description: "Fence panel",
          quantity: 4,
          unit: "ea",
          unitPrice: 312,
          lineAmount: 1248,
          currency: null,
          evidence: { page: 1, sourceText: "Fence panel 4 ea $312.00 $1,248.00" },
        },
      ],
      refusals: [
        {
          id: "refusal-1",
          page: 2,
          sourceText: "Gate fitting — quantity shown as a dash",
          reason: "missing_numeric_field",
          field: "quantity",
          message: "The quantity is missing on page 2. It was left blank rather than estimated.",
        },
        {
          id: "refusal-weight",
          page: 2,
          sourceText: "Bolt pack 3 20kg 12.00",
          reason: "unsupported_numeric_field",
          fieldLabel: "Weight",
          message: "The Weight on page 2 is shown in the source but is not included as a quote value by this extractor.",
        },
      ],
      warnings: [
        {
          id: "warning-1",
          page: 2,
          sourceText: "Subtotal $1,248.00",
          reason: "subtotal_mismatch",
          message: "The printed subtotal does not match the line amount we could read.",
        },
        {
          id: "warning-count-conflict",
          page: 2,
          sourceText: "Summary: 9 cartons dispatched",
          conflictingPage: 2,
          conflictingSourceText: "Warehouse notes: 11 cartons loaded",
          reason: "conflicting_document_counts",
          message: "The document lists 9 cartons and 11 cartons. Review both notes; no count was chosen.",
        },
      ],
      stats: { pagesRead: 2, linesRead: 8, candidateRows: 2 },
    };

    const html = renderToStaticMarkup(<ExtractionResultView result={result} />);

    expect(html).toContain("Quantity not read");
    expect(html).toContain("The quantity is missing on page 2. It was left blank rather than estimated.");
    expect(html).toContain("Gate fitting — quantity shown as a dash");
    expect(html).toContain("Weight not included");
    expect(html).toContain("The Weight on page 2 is shown in the source but is not included as a quote value by this extractor.");
    expect(html).toContain("Page 2");
    expect(html).toContain("The totals don’t match");
    expect(html).toContain("Subtotal $1,248.00");
    expect(html).toContain("The document lists different counts");
    expect(html).toContain("Summary: 9 cartons dispatched");
    expect(html).toContain("Warehouse notes: 11 cartons loaded");
    expect(html).toContain("Fence panel 4 ea $312.00 $1,248.00");
    expect(html).toContain("$1,248.00");
    expect(html).toContain(">Qty</span>");
    expect(html).toContain(">Unit</span>");
    expect(html).toContain(">Unit price</span>");
    expect(html).toContain(">Line amount</span>");
  });
});
