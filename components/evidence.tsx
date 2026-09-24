import type { Evidence as EvidenceData } from "@/lib/extraction/schema";

export function Evidence({ evidence }: { evidence: EvidenceData }) {
  return (
    <details className="group mt-3 rounded-xl border border-slate-200 bg-slate-50">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-medium text-slate-700 marker:hidden hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4 text-slate-500">
            <path d="M3.5 4.5h13v11h-13zM6 7h8M6 10h5M6 13h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          View source · page {evidence.page}
        </span>
        <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <blockquote className="border-t border-slate-200 px-3 py-3 text-sm leading-6 text-slate-700">
        <p className="whitespace-pre-wrap break-words">“{evidence.sourceText}”</p>
        <p className="mt-2 text-xs text-slate-500">Text read from page {evidence.page} of the PDF.</p>
      </blockquote>
    </details>
  );
}
