"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { apiErrorSchema, extractionResultSchema, type ExtractionResult } from "@/lib/extraction/schema";
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL } from "@/lib/extraction/constants";
import { ExtractionResultView } from "@/components/extraction-result";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected upload problem occurred.";
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15.5v3A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function validateSelection(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "That file does not look like a PDF. Choose a file with a .pdf extension.";
  }
  if (file.size === 0) return "That file is empty. Choose a PDF with content.";
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return `That PDF is larger than the ${MAX_PDF_SIZE_LABEL} upload limit.`;
  }
  return null;
}

async function readExtractionResponse(response: Response): Promise<ExtractionResult> {
  let responseText: string;
  try {
    responseText = await response.text();
  } catch (error) {
    throw new Error(`The server response could not be read: ${errorMessage(error)}`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(responseText);
  } catch {
    const detail = responseText.trim().slice(0, 240);
    throw new Error(
      `The extraction service returned an unreadable response (HTTP ${response.status})${detail ? `: ${detail}` : "."}`,
    );
  }

  const apiError = apiErrorSchema.safeParse(payload);
  if (apiError.success) {
    throw new Error(apiError.data.error.message);
  }

  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String(payload.message)
        : response.statusText || "No explanation was provided by the server.";
    throw new Error(`The extraction service could not process the upload (HTTP ${response.status}): ${detail}`);
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("ok" in payload) ||
    payload.ok !== true ||
    !("result" in payload)
  ) {
    throw new Error("The extraction service response did not contain a result. Please try again.");
  }

  const parsedResult = extractionResultSchema.safeParse(payload.result);
  if (!parsedResult.success) {
    throw new Error(
      `The extraction service returned a result in an unexpected format: ${parsedResult.error.issues[0]?.message ?? "the result could not be validated"}.`,
    );
  }

  return parsedResult.data;
}

export function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    setResult(null);
    setRequestError(null);
    setSelectionError(nextFile ? validateSelection(nextFile) : null);
  }

  function onFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0] ?? null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files[0] ?? null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || selectionError || isUploading) return;

    setIsUploading(true);
    setRequestError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      let response: Response;
      try {
        response = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });
      } catch (error) {
        throw new Error(
          `Could not reach the extraction service. Check your connection and try again. (${errorMessage(error)})`,
        );
      }

      setResult(await readExtractionResponse(response));
    } catch (error) {
      setRequestError(errorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }

  function reset() {
    chooseFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-8">
      {!result && (
        <form onSubmit={submit} className="space-y-4">
          <input
            ref={inputRef}
            id="pdf-file"
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            tabIndex={-1}
            onChange={onFileInputChange}
            disabled={isUploading}
            aria-describedby={`upload-help${selectionError || requestError ? " upload-error" : ""}`}
          />

          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setIsDragging(false);
              }
            }}
            onDrop={onDrop}
            aria-busy={isUploading}
            className={`rounded-2xl border border-dashed p-6 transition-colors sm:p-8 ${
              isDragging
                ? "border-emerald-500 bg-emerald-50/70"
                : "border-slate-300 bg-slate-50/70 hover:border-slate-400"
            } ${isUploading ? "pointer-events-none opacity-70" : ""}`}
          >
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                {isUploading ? (
                  <span className="size-5 animate-spin rounded-full border-2 border-emerald-800/25 border-t-emerald-800" aria-hidden="true" />
                ) : (
                  <UploadIcon />
                )}
              </span>

              <h2 aria-live="polite" className="text-base font-semibold text-slate-900">
                {isUploading ? "Reading your PDF…" : "Drop a PDF here to get started"}
              </h2>
              <p id="upload-help" className="mt-1 text-sm leading-6 text-slate-500">
                {isUploading
                  ? "We’re checking each line and keeping any uncertain values visible."
                  : `Invoices, packing lists, or delivery dockets · up to ${MAX_PDF_SIZE_LABEL}`}
              </p>

              {!isUploading && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  Browse files
                </button>
              )}

              {file && (
                <div className="mt-5 flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={reset}
                      className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                      aria-label="Remove selected PDF"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {selectionError && (
            <p id="upload-error" role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
              {selectionError}
            </p>
          )}

          {requestError && (
            <div id="upload-error" role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-950">
              <p className="font-semibold">The upload could not be completed.</p>
              <p className="mt-1">{requestError}</p>
            </div>
          )}

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs leading-5 text-slate-500">
              Your document is processed for this request and isn’t saved by this demo.
            </p>
            <button
              type="submit"
              disabled={!file || Boolean(selectionError) || isUploading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {isUploading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                  Reading PDF…
                </>
              ) : (
                "Extract line items"
              )}
            </button>
          </div>
        </form>
      )}

      {result && (
        <>
          <ExtractionResultView result={result} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Extract another PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
