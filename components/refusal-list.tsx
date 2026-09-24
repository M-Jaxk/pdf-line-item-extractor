import type { ExtractionRefusal } from "@/lib/extraction/schema";

const FIELD_LABELS: Record<NonNullable<ExtractionRefusal["field"]>, string> = {
  quantity: "Quantity not read",
  unitPrice: "Unit price not read",
  lineAmount: "Line amount not read",
};

function RefusalCard({ refusal }: { refusal: ExtractionRefusal }) {
  const title = refusal.field
    ? FIELD_LABELS[refusal.field]
    : refusal.fieldLabel
      ? `${refusal.fieldLabel} not included`
    : refusal.page === null
      ? "Document needs a closer look"
      : "Line not extracted";

  return (
    <li className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
      <div className="flex gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-5">
            <path d="M10 2.5 18 17H2L10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M10 7v4.5m0 2v.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-amber-950">{title}</h4>
            {refusal.page !== null && (
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-amber-900">
                Page {refusal.page}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-6 text-amber-950">{refusal.message}</p>
          {refusal.sourceText && (
            <blockquote className="mt-3 rounded-xl border border-amber-200/80 bg-white/70 px-3 py-2.5 text-sm leading-6 text-slate-700">
              “{refusal.sourceText}”
            </blockquote>
          )}
        </div>
      </div>
    </li>
  );
}

export function RefusalList({ refusals }: { refusals: ExtractionRefusal[] }) {
  if (refusals.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
        <span aria-hidden="true" className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold">✓</span>
        <p>No lines needed to be held back. You can still review the source text for each extracted item.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3" aria-label="Lines that could not be extracted">
      {refusals.map((refusal) => <RefusalCard key={refusal.id} refusal={refusal} />)}
    </ul>
  );
}
