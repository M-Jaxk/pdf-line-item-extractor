import type { LineItem } from "@/lib/extraction/schema";
import { Evidence } from "@/components/evidence";
import type { ReactNode } from "react";

function formatQuantity(value: number | null): string {
  return value === null ? "—" : new Intl.NumberFormat("en-NZ", { maximumFractionDigits: 20 }).format(value);
}

function formatMoney(value: number | null, currency: string | null): string {
  if (value === null) return "Not shown";
  if (currency) {
    try {
      return new Intl.NumberFormat("en-NZ", {
        style: "currency",
        currency,
        maximumFractionDigits: 20,
      }).format(value);
    } catch {
      // A currency supplied by the source may be unfamiliar to the browser runtime.
    }
  }
  return new Intl.NumberFormat("en-NZ", { maximumFractionDigits: 20 }).format(value);
}

function ValueCell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 sm:block">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:hidden">{label}</dt>
      <dd className="text-sm tabular-nums text-slate-800">{children}</dd>
    </div>
  );
}

export function LineItemList({ items }: { items: LineItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center">
        <p className="text-sm font-semibold text-slate-800">No line items were extracted.</p>
        <p className="mt-1 text-sm text-slate-500">See the notes below for the lines that need review.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[minmax(12rem,1fr)_6rem_8rem_8rem] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
        <span>Item</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Unit price</span>
        <span className="text-right">Line amount</span>
      </div>

      <ol className="divide-y divide-slate-100">
        {items.map((item, index) => (
          <li key={item.id} className="px-4 py-4 sm:px-5 sm:py-5">
            <div className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_6rem_8rem_8rem] sm:items-start sm:gap-4">
              <div className="min-w-0">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-900">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold leading-5 text-slate-900">{item.description}</p>
                    {item.unit && <p className="mt-1 text-xs text-slate-500">Unit: {item.unit}</p>}
                  </div>
                </div>
                <div className="pl-7 sm:pl-0 sm:ml-7">
                  <Evidence evidence={item.evidence} />
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:contents sm:border-0 sm:pt-0">
                <ValueCell label="Quantity">{formatQuantity(item.quantity)}{item.unit ? ` ${item.unit}` : ""}</ValueCell>
                <ValueCell label="Unit price">{formatMoney(item.unitPrice, item.currency)}</ValueCell>
                <ValueCell label="Line amount">{formatMoney(item.lineAmount, item.currency)}</ValueCell>
              </dl>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
