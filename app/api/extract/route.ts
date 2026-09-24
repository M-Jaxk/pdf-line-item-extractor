import { extractDocument } from "@/lib/extraction/extractor";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const PDF_SIGNATURE = "%PDF-";

function apiError(code: string, message: string, status: number): Response {
  return Response.json(
    { ok: false, error: { code, message } },
    { status },
  );
}

function safeFileName(name: string): string {
  const baseName = name.split(/[\\/]/).at(-1) ?? "document.pdf";
  const safeName = baseName.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return safeName || "document.pdf";
}

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : ".";
    return apiError(
      "invalid_multipart_body",
      `The upload form could not be read${detail}`,
      400,
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return apiError(
      "missing_file",
      'Choose a PDF file and submit it in the "file" field.',
      400,
    );
  }

  if (file.size === 0) {
    return apiError("empty_file", "The selected file is empty.", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return apiError(
      "file_too_large",
      "The PDF is larger than the 20 MB upload limit.",
      413,
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : ".";
    return apiError(
      "file_read_failed",
      `The uploaded file could not be read${detail}`,
      400,
    );
  }

  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return apiError(
      "file_too_large",
      "The PDF is larger than the 20 MB upload limit.",
      413,
    );
  }

  const signature = new TextDecoder().decode(bytes.slice(0, PDF_SIGNATURE.length));
  if (signature !== PDF_SIGNATURE) {
    return apiError(
      "unsupported_file_type",
      "The selected file does not have a PDF signature. Upload a PDF document.",
      415,
    );
  }

  try {
    const result = await extractDocument(bytes, safeFileName(file.name));
    return Response.json({ ok: true, result });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown extraction failure.";
    return apiError(
      "extraction_failed",
      `The PDF could not be processed: ${detail}`,
      500,
    );
  }
}
