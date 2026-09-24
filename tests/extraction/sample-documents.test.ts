import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractDocument } from "@/lib/extraction/extractor";

const sampleDirectory = resolve(process.cwd(), "public/PDF");
const sampleNames = [
  "IB-55871.pdf",
  "IB-55902.pdf",
  "IB-56010.pdf",
  "IB-56088.pdf",
  "IB-56150.pdf",
  "IB-STMT47.pdf",
];
const samplesAvailable = sampleNames.every((name) =>
  existsSync(resolve(sampleDirectory, name)),
);

describe.skipIf(!samplesAvailable)("provided assessment PDFs", () => {
  async function extractSample(fileName: string) {
    const bytes = await readFile(resolve(sampleDirectory, fileName));
    return extractDocument(Uint8Array.from(bytes), fileName);
  }

  it("extracts all clear line items from IB-55871 and ignores payment terms", async () => {
    const result = await extractSample("IB-55871.pdf");

    expect(result.items).toHaveLength(4);
    expect(result.refusals).toEqual([]);
    expect(result.items[2]).toMatchObject({
      description: "RF-330 Roofing screws Type 17, 65mm",
      quantity: 10,
      unitPrice: 46.5,
      lineAmount: 465,
    });
  });

  it("refuses the image-only IB-55902 document with a readable explanation", async () => {
    const result = await extractSample("IB-55902.pdf");

    expect(result.items).toEqual([]);
    expect(result.refusals).toContainEqual(
      expect.objectContaining({
        reason: "no_text_layer",
        message: expect.stringContaining("no readable text layer"),
      }),
    );
  });

  it("keeps quantity and price but refuses missing line amounts and unmodeled weights", async () => {
    const result = await extractSample("IB-56010.pdf");

    expect(result.items).toHaveLength(4);
    expect(result.items[0]).toMatchObject({
      quantity: 3,
      unitPrice: 74,
      lineAmount: null,
    });
    expect(result.refusals.filter((refusal) => refusal.reason === "missing_numeric_field"))
      .toHaveLength(4);
    expect(result.refusals.filter((refusal) => refusal.reason === "unsupported_numeric_field"))
      .toHaveLength(4);
  });

  it("extracts IB-56088 items and surfaces the conflicting carton counts", async () => {
    const result = await extractSample("IB-56088.pdf");

    expect(result.items).toHaveLength(3);
    expect(result.refusals).toEqual([]);
    expect(result.items.map((item) => item.lineAmount)).toEqual([1360, 312, 378]);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        reason: "conflicting_document_counts",
        sourceText: expect.stringContaining("9 cartons"),
        conflictingSourceText: expect.stringContaining("11 cartons"),
      }),
    );
  });

  it("extracts the IB-56150 items and reconciles its printed subtotal", async () => {
    const result = await extractSample("IB-56150.pdf");

    expect(result.items).toHaveLength(4);
    expect(result.refusals).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.items.reduce((sum, item) => sum + (item.lineAmount ?? 0), 0)).toBe(1270);
  });

  it("extracts text pages in IB-STMT47 and refuses its image-only page 4", async () => {
    const result = await extractSample("IB-STMT47.pdf");

    expect(result.items).toHaveLength(21);
    expect(result.items.every((item) => item.evidence.page >= 1 && item.evidence.page <= 8)).toBe(true);
    expect(result.refusals).toContainEqual(
      expect.objectContaining({
        page: 4,
        reason: "no_text_layer",
        message: expect.stringContaining("image-only content"),
      }),
    );
    expect(result.refusals.filter((refusal) => refusal.reason === "ambiguous_columns")).toEqual([]);
  });
});
