"use client";

import { useState } from "react";

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount);
}

const RECUR_LABEL: Record<string, string> = { monthly: "/mo", yearly: "/yr", one_time: "" };

// Interactive pricing table: client toggles optional items and totals update
// live, split by one-time / monthly / yearly, with an optional discount.
export function InteractivePricing({ section, currency }: { section: any; currency: string }) {
  const rows: any[] = section.rows || [];
  const discount = Number(section.discountPercent || 0);

  const [chosen, setChosen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    rows.forEach((r) => { if (r.optional) init[r.id] = r.selected === true; });
    return init;
  });
  const included = (r: any) => !r.optional || chosen[r.id];

  const totals = { one_time: 0, monthly: 0, yearly: 0 } as Record<string, number>;
  rows.forEach((r) => { if (included(r)) totals[r.recurrence || "one_time"] += r.qty * r.unitPrice; });
  const applyDisc = (n: number) => (discount ? n * (1 - discount / 100) : n);

  return (
    <div className="py-10 border-b border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{section.heading}</h2>
      <table className="w-full border-collapse text-sm">
        <thead><tr className="border-b-2 border-gray-200">
          <th className="text-left py-3 pr-4 font-semibold text-gray-700">Service</th>
          <th className="text-left py-3 pr-4 font-semibold text-gray-700">Description</th>
          <th className="text-right py-3 pr-4 font-semibold text-gray-700">Qty</th>
          <th className="text-right py-3 pr-4 font-semibold text-gray-700">Unit Price</th>
          <th className="text-right py-3 font-semibold text-gray-700">Total</th>
        </tr></thead>
        <tbody>
          {rows.map((row: any) => {
            const on = included(row);
            const rec = RECUR_LABEL[row.recurrence || "one_time"];
            return (
              <tr key={row.id} className={`border-b border-gray-100 ${row.optional && !on ? "opacity-50" : ""}`}>
                <td className="py-3 pr-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    {row.optional && (
                      <input type="checkbox" checked={!!chosen[row.id]} onChange={(e) => setChosen((p) => ({ ...p, [row.id]: e.target.checked }))} className="h-4 w-4 accent-gray-900" />
                    )}
                    <span>{row.service}{row.optional && <span className="ml-1 text-xs text-gray-400">(optional)</span>}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-gray-500">{row.description}</td>
                <td className="py-3 pr-4 text-right text-gray-700">{row.qty}</td>
                <td className="py-3 pr-4 text-right text-gray-700">{fmt(row.unitPrice, currency)}{rec && <span className="text-xs text-gray-400"> {rec}</span>}</td>
                <td className="py-3 text-right text-gray-900">{fmt(row.qty * row.unitPrice, currency)}{rec && <span className="text-xs text-gray-400"> {rec}</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-4 flex flex-col items-end gap-1 text-sm">
        {discount > 0 && <div className="text-gray-500">Discount: {discount}% applied</div>}
        {totals.one_time > 0 && <div className="flex gap-6"><span className="text-gray-600">One-time total</span><span className="font-bold text-gray-900 text-lg w-32 text-right">{fmt(applyDisc(totals.one_time), currency)}</span></div>}
        {totals.monthly > 0 && <div className="flex gap-6"><span className="text-gray-600">Monthly</span><span className="font-bold text-gray-900 text-lg w-32 text-right">{fmt(applyDisc(totals.monthly), currency)}/mo</span></div>}
        {totals.yearly > 0 && <div className="flex gap-6"><span className="text-gray-600">Yearly</span><span className="font-bold text-gray-900 text-lg w-32 text-right">{fmt(applyDisc(totals.yearly), currency)}/yr</span></div>}
      </div>
    </div>
  );
}
