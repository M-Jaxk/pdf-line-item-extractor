import { describe, expect, it } from "vitest";
import { extractDocument } from "@/lib/extraction/extractor";
import { createTextPdf, itemRow, tableHeader } from "@/tests/fixtures/pdf-factory";

  describe("line item evidence", () => {
    it("points to the source page and includes every extracted numeric value", async () => {
      const pdf = await createTextPdf([tableHeader(), itemRow()]);
      const result = await extractDocument(pdf, "evidence.pdf");

      for (const item of result.items) {
        expect(item.evidence.page).toBeGreaterThanOrEqual(1);
        expect(item.evidence.page).toBeLessThanOrEqual(result.document.pageCount);
        for (const value of [item.quantity, item.unitPrice, item.lineAmount]) {
          if (value !== null) {
            expect(item.evidence.sourceText).toContain(String(value));
          }
        }
      }
    });
  });
