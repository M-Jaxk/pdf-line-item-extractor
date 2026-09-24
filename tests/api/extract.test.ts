import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/extract/route";
import { createTextPdf, itemRow, tableHeader } from "@/tests/fixtures/pdf-factory";

describe("POST /api/extract", () => {
  it("rejects non-PDF uploads with a readable client error", async () => {
    const form = new FormData();
    form.append("file", new File(["not a PDF"], "invoice.txt", { type: "text/plain" }));

    const response = await POST(
      new Request("http://localhost/api/extract", { method: "POST", body: form }),
    );
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body).toMatchObject({
      ok: false,
      error: {
        code: "unsupported_file_type",
        message: expect.stringContaining("does not have a PDF signature"),
      },
    });
  });

  it("returns a successful structured response for a PDF upload", async () => {
    const pdf = await createTextPdf([tableHeader(), itemRow()]);
    const form = new FormData();
    const bytes = Uint8Array.from(pdf);
    form.append(
      "file",
      new File([bytes.buffer as ArrayBuffer], "invoice.pdf", { type: "application/pdf" }),
    );

    const response = await POST(
      new Request("http://localhost/api/extract", { method: "POST", body: form }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      result: {
        document: { fileName: "invoice.pdf", pageCount: 1 },
        items: [
          {
            description: "Copper pipe",
            quantity: 2,
            unitPrice: 10,
            lineAmount: 20,
            evidence: { page: 1 },
          },
        ],
        refusals: [],
      },
    });
  });

  it("returns a document refusal for a malformed file with a PDF signature", async () => {
    const form = new FormData();
    form.append(
      "file",
      new File(["%PDF-not-a-real-document"], "broken.pdf", {
        type: "application/pdf",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/extract", { method: "POST", body: form }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      result: {
        items: [],
        refusals: [
          {
            reason: "corrupt_pdf",
            message: expect.stringContaining("valid PDF"),
          },
        ],
      },
    });
  });
});
