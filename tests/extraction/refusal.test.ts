import { describe, expect, it } from "vitest";
import { extractDocument } from "@/lib/extraction/extractor";
import { createTextPdf, itemRow, tableHeader } from "@/tests/fixtures/pdf-factory";

describe("conservative extraction refusals", () => {
    it("refuses an ambiguous decimal/thousands separator instead of converting it", async () => {
      const pdf = await createTextPdf([
        tableHeader(),
        itemRow({ unitPrice: "$1.234", lineAmount: "$2.47" }),
      ]);

      const result = await extractDocument(pdf, "ambiguous-number.pdf");

      expect(result.items).toEqual([]);
      expect(result.refusals).toHaveLength(1);
      expect(result.refusals[0]).toMatchObject({
        reason: "ambiguous_number_format",
        page: 1,
        sourceText: expect.stringContaining("$1.234"),
      });
  });

  it("keeps an absent quantity null and explains that it was not estimated", async () => {
    const pdf = await createTextPdf([
      tableHeader(),
      itemRow({ quantity: "—" }),
    ]);

    const result = await extractDocument(pdf, "missing-quantity.pdf");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBeNull();
    expect(result.refusals).toContainEqual(
      expect.objectContaining({
        reason: "missing_numeric_field",
        field: "quantity",
        sourceText: expect.stringContaining("—"),
      }),
    );
    expect(result.items[0].lineAmount).toBe(20);
  });

  it("refuses rows without headers when the number roles cannot be established", async () => {
    const pdf = await createTextPdf([
      [
        { x: 40, text: "Timber pack" },
        { x: 300, text: "4" },
        { x: 420, text: "$12.00" },
      ],
    ]);

    const result = await extractDocument(pdf, "headerless.pdf");

    expect(result.items).toEqual([]);
    expect(result.refusals[0]).toMatchObject({
      reason: "ambiguous_columns",
      page: 1,
    });
  });

  it("returns an explicit refusal for a PDF without a text layer", async () => {
    const pdf = await createTextPdf([]);
    const result = await extractDocument(pdf, "scan.pdf");

    expect(result.items).toEqual([]);
    expect(result.refusals).toContainEqual(
      expect.objectContaining({
        reason: "no_text_layer",
        page: null,
      }),
    );
  });
});
