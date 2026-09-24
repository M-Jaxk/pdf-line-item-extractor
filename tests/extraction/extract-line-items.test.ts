import { describe, expect, it } from "vitest";
import { extractDocument } from "@/lib/extraction/extractor";
import { createTextPdf, itemRow, tableHeader } from "@/tests/fixtures/pdf-factory";

describe("extractDocument", () => {
  it("extracts values from a headed table and attaches source evidence", async () => {
    const pdf = await createTextPdf([
      [{ x: 40, text: "Tax Invoice" }],
      tableHeader(),
      itemRow(),
      [
        { x: 420, text: "Subtotal" },
        { x: 515, text: "$20.00" },
      ],
      [
        { x: 420, text: "Total due" },
        { x: 515, text: "$23.00" },
      ],
    ]);

    const result = await extractDocument(pdf, "invoice.pdf");

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      description: "Copper pipe",
      quantity: 2,
      unit: "m",
      unitPrice: 10,
      lineAmount: 20,
      currency: null,
    });
    expect(result.items[0].evidence).toMatchObject({
      page: 1,
      sourceText: expect.stringContaining("Copper pipe"),
    });
    expect(result.refusals).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("continues extracting supported rows when a neighboring row is contradictory", async () => {
    const pdf = await createTextPdf([
      tableHeader(),
      itemRow(),
      itemRow({ description: "Steel bracket", lineAmount: "$25.00" }),
    ]);

    const result = await extractDocument(pdf, "mixed-invoice.pdf");

    expect(result.items.map((item) => item.description)).toEqual(["Copper pipe"]);
    expect(result.refusals).toHaveLength(1);
    expect(result.refusals[0]).toMatchObject({
      reason: "line_total_mismatch",
      page: 1,
    });
    expect(result.refusals[0].message).toContain("do not agree");
  });

  it("surfaces a printed subtotal that disagrees with the extracted line amounts", async () => {
    const pdf = await createTextPdf([
      tableHeader(),
      itemRow(),
      [
        { x: 420, text: "Subtotal" },
        { x: 515, text: "$21.00" },
      ],
    ]);

    const result = await extractDocument(pdf, "subtotal-conflict.pdf");

    expect(result.items).toHaveLength(1);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        reason: "subtotal_mismatch",
        sourceText: expect.stringContaining("$21.00"),
        message: expect.stringContaining("add up to 20.00"),
      }),
    );
  });
});
