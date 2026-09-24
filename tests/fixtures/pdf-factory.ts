import { PDFDocument, StandardFonts } from "pdf-lib";

export interface PositionedText {
  x: number;
  text: string;
}

export async function createTextPdf(
  rows: readonly (readonly PositionedText[])[],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  rows.forEach((row, rowIndex) => {
    const y = 750 - rowIndex * 24;
    for (const fragment of row) {
      page.drawText(fragment.text, {
        x: fragment.x,
        y,
        size: 10,
        font,
      });
    }
  });

  return pdf.save();
}

export function tableHeader(): PositionedText[] {
  return [
    { x: 40, text: "Description" },
    { x: 300, text: "Qty" },
    { x: 350, text: "Unit" },
    { x: 390, text: "Unit Price" },
    { x: 500, text: "Amount" },
  ];
}

export function itemRow(options?: {
  quantity?: string;
  unitPrice?: string;
  lineAmount?: string;
  description?: string;
}): PositionedText[] {
  const {
    quantity = "2",
    unitPrice = "$10.00",
    lineAmount = "$20.00",
    description = "Copper pipe",
  } = options ?? {};

  return [
    { x: 40, text: description },
    { x: 300, text: quantity },
    { x: 350, text: "m" },
    { x: 420, text: unitPrice },
    { x: 515, text: lineAmount },
  ];
}
