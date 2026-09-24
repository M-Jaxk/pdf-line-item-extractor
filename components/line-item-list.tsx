import type { LineItem } from "@/lib/extraction/schema";
import { Evidence } from "@/components/evidence";
import type { ReactNode } from "react";

function groupIntegerDigits(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatQuantity(value: number | null): string {
  if (value === null) return "—";

  const raw = Math.abs(value).toString();
  const [integer, fraction] = raw.split(".");
  const sign = value < 0 ? "-" : "";
  return `${sign}${groupIntegerDigits(integer)}${fraction ? `.${fraction}` : ""}`;
}

function formatMoney(value: number | null): string {
  if (value === null) return "Not shown";

  const [integer, fraction] = Math.abs(value).toFixed(2).split(".");
  const sign = value < 0 ? "-" : "";
  return `${sign}$${groupIntegerDigits(integer)}.${fraction}`;
}

function ValueCell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 md:block">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 md:hidden">{label}</dt>
      <dd className="text-right text-sm tabular-nums text-slate-800">{children}</dd>
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
      <div className="hidden grid-cols-[minmax(12rem,1fr)_4rem_5rem_7rem_7rem] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
        <span>Item</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Unit</span>
        <span className="text-right">Unit price</span>
        <span className="text-right">Line amount</span>
      </div>

      <ol className="divide-y divide-slate-100">
        {items.map((item, index) => (
          <li key={item.id} className="px-4 py-4 sm:px-5 sm:py-5">
            <div className="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_4rem_5rem_7rem_7rem] md:items-start md:gap-4">
              <div className="min-w-0">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-900">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold leading-5 text-slate-900">{item.description}</p>
                  </div>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 md:contents md:border-0 md:pt-0">
                <ValueCell label="Qty">{formatQuantity(item.quantity)}</ValueCell>
                <ValueCell label="Unit">{item.unit ?? "—"}</ValueCell>
                <ValueCell label="Unit price">{formatMoney(item.unitPrice)}</ValueCell>
                <ValueCell label="Line amount">{formatMoney(item.lineAmount)}</ValueCell>
              </dl>
            </div>
            <div className="mt-2 pl-7">
              <Evidence evidence={item.evidence} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
