import { FileUpload } from "@/components/file-upload";

function BrandMark() {
  return (
    <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold tracking-tight text-white">
      IQ
    </span>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <a href="#upload-heading" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:shadow-lg">
        Skip to upload
      </a>
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-slate-200/80 pb-5">
          <div className="inline-flex items-center gap-3">
            <BrandMark />
            <span className="text-sm font-semibold tracking-tight text-slate-800">Insta Quote AI</span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
            Document review
          </span>
        </header>

        <div className="mx-auto max-w-3xl py-10 sm:py-14">
          <section className="mb-8 sm:mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">PDF line item extractor</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Clear numbers.
              <span className="block text-slate-500">With their source attached.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Upload an invoice, packing list, or delivery docket. We’ll show what we could read and call out anything that needs a person to check it.
            </p>
          </section>

          <section aria-labelledby="upload-heading" className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)] sm:p-7">
            <div className="mb-5 flex items-start gap-3">
              <span aria-hidden="true" className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-900">1</span>
              <div>
                <h2 id="upload-heading" tabIndex={-1} className="text-base font-semibold text-slate-900 outline-none">Choose a document</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Only values that can be traced to the PDF will be included.</p>
              </div>
            </div>
            <FileUpload />
          </section>

          <footer className="mt-6 flex flex-col gap-2 px-1 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Unclear values are left out, never filled in by guesswork.</p>
            <p>PDF text extraction only · Scanned images need OCR</p>
          </footer>
        </div>
      </div>
    </main>
  );
}
