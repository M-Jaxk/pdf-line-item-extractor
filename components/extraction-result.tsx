import type { ExtractionResult, ExtractionWarning } from "@/lib/extraction/schema";
import { LineItemList } from "@/components/line-item-list";
import { RefusalList } from "@/components/refusal-list";

function WarningCard({ warning }: { warning: ExtractionWarning }) {
  const isCountConflict = warning.reason === "conflicting_document_counts";
  return (
    <li className="rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:p-5">
      <div className="flex gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-800">
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-5">
            <path d="M10 2.5 18 17H2L10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M10 7v4.5m0 2v.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-orange-950">
              {isCountConflict ? "The document lists different counts" : "The totals don’t match"}
            </h4>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-orange-900">Page {warning.page}</span>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-orange-950">{warning.message}</p>
          <div className="mt-3 space-y-2">
            <blockquote className="rounded-xl border border-orange-200/80 bg-white/70 px-3 py-2.5 text-sm leading-6 text-slate-700">
              “{warning.sourceText}”
            </blockquote>
            {warning.conflictingSourceText && (
              <blockquote className="rounded-xl border border-orange-200/80 bg-white/70 px-3 py-2.5 text-sm leading-6 text-slate-700">
                {warning.conflictingPage && warning.conflictingPage !== warning.page && (
                  <span className="mb-1 block text-xs font-medium text-slate-500">Page {warning.conflictingPage}</span>
                )}
                “{warning.conflictingSourceText}”
              </blockquote>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function ExtractionResultView({ result }: { result: ExtractionResult }) {
  const refusalCount = result.refusals.length;
  const hasProblems = refusalCount > 0 || result.warnings.length > 0;

  return (
    <section aria-labelledby="result-title" className="space-y-8" aria-live="polite">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
                <path d="M6 3.75h8l4 4v12.5H6a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M14 4v4h4M8 13h8M8 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 id="result-title" className="truncate text-base font-semibold text-slate-900">{result.document.fileName}</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {result.document.pageCount} {result.document.pageCount === 1 ? "page" : "pages"} in document · {result.stats.pagesRead} read
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-900">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-600" />
              {result.items.length} {result.items.length === 1 ? "item" : "items"} extracted
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${refusalCount > 0 ? "bg-amber-50 text-amber-950" : "bg-slate-100 text-slate-600"}`}>
              {refusalCount} {refusalCount === 1 ? "review note" : "review notes"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-200 bg-slate-50/70">
          <div className="px-4 py-3 text-center sm:px-5">
            <p className="text-lg font-semibold tabular-nums text-slate-900">{result.stats.pagesRead}<span className="text-sm font-medium text-slate-500">/{result.document.pageCount}</span></p>
            <p className="mt-0.5 text-xs text-slate-500">pages read</p>
          </div>
          <div className="px-4 py-3 text-center sm:px-5">
            <p className="text-lg font-semibold tabular-nums text-slate-900">{result.stats.candidateRows}</p>
            <p className="mt-0.5 text-xs text-slate-500">possible item rows</p>
          </div>
          <div className="px-4 py-3 text-center sm:px-5">
            <p className="text-lg font-semibold tabular-nums text-slate-900">{result.warnings.length}</p>
            <p className="mt-0.5 text-xs text-slate-500">total warnings</p>
          </div>
        </div>
      </div>

      <section aria-labelledby="items-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">What we could read</p>
            <h3 id="items-heading" className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Extracted line items</h3>
          </div>
          <p className="text-xs text-slate-500">Each value links to its source</p>
        </div>
        <LineItemList items={result.items} />
      </section>

      {result.warnings.length > 0 && (
        <section aria-labelledby="warnings-heading" className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-800">Please check</p>
            <h3 id="warnings-heading" className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Document totals</h3>
          </div>
          <ul className="space-y-3" aria-label="Document total warnings">
            {result.warnings.map((warning) => <WarningCard key={warning.id} warning={warning} />)}
          </ul>
        </section>
      )}

      <section aria-labelledby="refusals-heading" className="space-y-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${refusalCount ? "text-amber-800" : "text-emerald-800"}`}>
            {hasProblems ? "Nothing hidden" : "Confidence check"}
          </p>
          <h3 id="refusals-heading" className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            {refusalCount > 0 ? "Needs your review" : "No lines held back"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {refusalCount > 0
              ? "These values were left out because the document did not make them clear enough to trust. Nothing was filled in by guesswork."
              : "Any line we could not read confidently would appear here with its source and the reason."}
          </p>
        </div>
        <RefusalList refusals={result.refusals} />
      </section>

      <p className="border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
        Source text is shown as read from the PDF. Check the original document before using extracted values in a quote.
      </p>
    </section>
  );
}
