"use client";

import { Calculator } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { QuotationTotals } from "@/lib/calc";

export interface SummaryValues {
  discountType: string;
  discountValue: number;
  additionalCharges: number;
  shippingCharges: number;
  installationCharge: number;
}

const inputCls =
  "w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function Row({
  label,
  value,
  muted,
  className = "",
}: {
  label: string;
  value: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 text-sm ${className}`}>
      <span className="text-gray-500">{label}</span>
      <span className={`tabular-nums ${muted ? "text-gray-500 font-medium" : "font-semibold text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}

function ChargeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
          ₹
        </span>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={cn(inputCls, "pl-6")}
        />
      </div>
    </div>
  );
}

export function SummaryPanel({
  totals,
  values,
  onChange,
  itemCount = 0,
  optionalCount = 0,
}: {
  totals: QuotationTotals;
  values: SummaryValues;
  onChange: (patch: Partial<SummaryValues>) => void;
  itemCount?: number;
  optionalCount?: number;
}) {
  const gstLines =
    totals.gstBreakup.length > 0
      ? totals.gstBreakup.map((s) => ({ label: `GST @ ${s.rate}%`, amount: s.gstAmount }))
      : totals.totalGst > 0
        ? [{ label: "GST", amount: totals.totalGst }]
        : [];

  const itemInstall = totals.installationCharge - values.installationCharge;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm sticky top-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2.5">
        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
          <Calculator className="w-4 h-4 text-emerald-500" />
        </div>
        Summary
      </h2>

      <div className="space-y-2.5">
        <Row
          label={itemCount > 0 ? `Items (${itemCount})` : "Subtotal"}
          value={formatCurrency(totals.subtotal)}
        />
        {gstLines.map((g) => (
          <Row key={g.label} label={g.label} value={formatCurrency(g.amount)} muted />
        ))}
        {optionalCount > 0 && (
          <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
            {optionalCount} optional item{optionalCount > 1 ? "s" : ""} excluded from total
          </p>
        )}

        <div className="pt-2.5 border-t border-gray-100">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">Discount</label>
          <div className="flex items-center gap-2">
            <select
              value={values.discountType}
              onChange={(e) => onChange({ discountType: e.target.value })}
              className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="percentage">% </option>
              <option value="fixed">₹</option>
            </select>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                {values.discountType === "fixed" ? "₹" : "%"}
              </span>
              <input
                type="number"
                min={0}
                value={values.discountValue}
                onChange={(e) => onChange({ discountValue: parseFloat(e.target.value) || 0 })}
                className={cn(inputCls, "pl-6")}
                placeholder="0"
              />
            </div>
          </div>
          <div className="mt-1.5">
            <Row label="Discount amount" value={`− ${formatCurrency(totals.discountAmount)}`} />
          </div>
        </div>

        <div className="pt-2.5 border-t border-gray-100 space-y-2.5">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Other charges</p>
          <ChargeInput
            label="Additional charges"
            value={values.additionalCharges}
            onChange={(v) => onChange({ additionalCharges: v })}
          />
          <ChargeInput
            label="Shipping"
            value={values.shippingCharges}
            onChange={(v) => onChange({ shippingCharges: v })}
          />
          <ChargeInput
            label="Installation & Integration"
            value={values.installationCharge}
            onChange={(v) => onChange({ installationCharge: v })}
          />
          {itemInstall > 0 && (
            <Row label="↳ From item Unit Installation" value={formatCurrency(itemInstall)} muted className="!text-xs" />
          )}
          {totals.gstOnServices > 0 && (
            <Row
              label={`↳ GST on services @ ${totals.servicesGstRate}%`}
              value={formatCurrency(totals.gstOnServices)}
              muted
              className="!text-xs"
            />
          )}
        </div>

        {totals.roundOff !== 0 && (
          <div className="pt-2.5 border-t border-gray-100 space-y-2.5">
            <Row
              label="Round off"
              value={`${totals.roundOff >= 0 ? "+ " : "− "}${formatCurrency(Math.abs(totals.roundOff))}`}
              muted
            />
          </div>
        )}

        <div className="pt-3 border-t-2 border-indigo-100">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-900">Grand Total</span>
            <span className="text-2xl font-bold gradient-text tabular-nums">
              {formatCurrency(totals.grandTotalRounded)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
