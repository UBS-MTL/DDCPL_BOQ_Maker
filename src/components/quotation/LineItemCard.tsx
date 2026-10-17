"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export interface QuoteItem {
  id: string;
  productId?: string | null;
  itemType: string;
  description: string;
  brand?: string;
  modelNumber?: string;
  specifications?: string;
  hsnCode: string;
  unit: string;
  quantity: number;
  rate: number;
  discount: number;
  gstRate: number;
  installationRate?: number;
  isOptional?: boolean;
}

export interface ProductOption {
  id: string;
  name: string;
  unit: string;
  rate: number;
  gstRate: number;
  hsnCode?: string;
  brand?: string;
  modelNumber?: string;
  specifications?: string;
}

export interface LineCalcView {
  baseAmount: number;
  gstAmount: number;
  lineTotal: number;
}

const inputCls =
  "w-full min-w-0 px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors";

const labelCls = "block text-[11px] font-semibold text-gray-500 mb-1 h-4 leading-4 whitespace-nowrap overflow-hidden";

const numProps = {
  type: "number" as const,
  min: 0,
  className: cn(inputCls, "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"),
};

function RowButtons({
  isFirst,
  isLast,
  onMove,
  onRemove,
}: {
  isFirst: boolean;
  isLast: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={isFirst}
        aria-label="Move up"
        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={isLast}
        aria-label="Move down"
        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Delete"
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export function SectionRow({
  item,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  item: QuoteItem;
  isFirst: boolean;
  isLast: boolean;
  onChange: (value: string) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-indigo-100/70 border border-indigo-200 rounded-xl px-4 py-3">
      <span className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide bg-indigo-600 text-white rounded-md shrink-0">
        Section
      </span>
      <input
        type="text"
        value={item.description}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Section heading (e.g. CCTV Surveillance Kit)"
        className="flex-1 min-w-0 bg-transparent border-none px-1 py-0.5 text-lg font-bold text-indigo-950 placeholder:text-indigo-400/70 focus:outline-none"
      />
      <RowButtons isFirst={isFirst} isLast={isLast} onMove={onMove} onRemove={onRemove} />
    </div>
  );
}

export function LineItemCard({
  item,
  srNo,
  products,
  line,
  isFirst,
  isLast,
  onChange,
  onSelectProduct,
  onMove,
  onRemove,
}: {
  item: QuoteItem;
  srNo: number;
  products: ProductOption[];
  line: LineCalcView;
  isFirst: boolean;
  isLast: boolean;
  onChange: (field: string, value: string | number | boolean) => void;
  onSelectProduct: (productId: string) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const disc = Number(item.discount) || 0;
  const gst = Number(item.gstRate) || 0;
  const install = Number(item.installationRate) || 0;
  const installTotal = qty * install;

  const breakdown = [
    `${qty} × ${formatCurrency(rate)}`,
    disc > 0 ? `− ${disc}%` : null,
    installTotal > 0 ? `+ install ${formatCurrency(installTotal)}` : null,
    `GST ${gst}% ${formatCurrency(line.gstAmount)}`,
  ]
    .filter(Boolean)
    .join("   ·   ");

  return (
    <div
      className={cn(
        "rounded-xl border bg-white transition-all overflow-hidden",
        item.isOptional
          ? "border-amber-200 bg-amber-50/40"
          : "border-gray-200 hover:border-indigo-200 hover:shadow-sm"
      )}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-6 h-6 bg-indigo-500 text-white rounded-md flex items-center justify-center text-xs font-bold shrink-0">
            {srNo}
          </span>
          <span className="text-sm font-semibold text-gray-800">Item {srNo}</span>
          {item.isOptional && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 rounded">
              Optional
            </span>
          )}
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none ml-1">
            <input
              type="checkbox"
              checked={!!item.isOptional}
              onChange={(e) => onChange("isOptional", e.target.checked)}
              className="w-3.5 h-3.5 accent-amber-500"
            />
            Optional
          </label>
        </div>
        <RowButtons isFirst={isFirst} isLast={isLast} onMove={onMove} onRemove={onRemove} />
      </div>

      <div className="px-4 pb-4 pt-1 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Choose from catalog</label>
            <select
              value={item.productId || ""}
              onChange={(e) => onSelectProduct(e.target.value)}
              className={inputCls}
            >
              <option value="">— Custom item (type below) —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCurrency(p.rate)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Item description *</label>
            <input
              type="text"
              value={item.description}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="What is this item?"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className={labelCls}>Brand</label>
            <input
              type="text"
              value={item.brand || ""}
              onChange={(e) => onChange("brand", e.target.value)}
              placeholder="e.g. Hikvision"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Model</label>
            <input
              type="text"
              value={item.modelNumber || ""}
              onChange={(e) => onChange("modelNumber", e.target.value)}
              placeholder="e.g. DS-2CD2143G2-IS"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Specifications</label>
            <input
              type="text"
              value={item.specifications || ""}
              onChange={(e) => onChange("specifications", e.target.value)}
              placeholder="Key specs"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <div>
            <label className={labelCls}>Qty</label>
            <input
              {...numProps}
              value={item.quantity}
              onChange={(e) => onChange("quantity", parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={labelCls}>Unit</label>
            <select
              value={item.unit}
              onChange={(e) => onChange("unit", e.target.value)}
              className={inputCls}
            >
              <option value="nos">Nos</option>
              <option value="pcs">Pcs</option>
              <option value="kg">Kg</option>
              <option value="m">M</option>
              <option value="sqft">Sqft</option>
              <option value="set">Set</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Rate (₹)</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                ₹
              </span>
              <input
                {...numProps}
                value={item.rate}
                onChange={(e) => onChange("rate", parseFloat(e.target.value) || 0)}
                className={cn(numProps.className, "pl-6")}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Disc %</label>
            <input
              {...numProps}
              value={item.discount}
              min={0}
              max={100}
              onChange={(e) => onChange("discount", parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={labelCls}>GST %</label>
            <select
              value={item.gstRate}
              onChange={(e) => onChange("gstRate", parseFloat(e.target.value))}
              className={inputCls}
            >
              <option value={0}>0%</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
              <option value={28}>28%</option>
            </select>
          </div>
          <div>
            <label className={labelCls} title="Installation charge per unit">Install ₹/unit</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                ₹
              </span>
              <input
                {...numProps}
                value={item.installationRate ?? 0}
                onChange={(e) => onChange("installationRate", parseFloat(e.target.value) || 0)}
                className={cn(numProps.className, "pl-6")}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>HSN Code</label>
            <input
              type="text"
              value={item.hsnCode}
              onChange={(e) => onChange("hsnCode", e.target.value)}
              placeholder="e.g. 8525"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-2 border-t border-dashed border-gray-200 pt-2.5">
          <p className="text-[11px] text-gray-400 leading-relaxed max-w-[60%]">{breakdown}</p>
          <div className="text-right">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Line total (incl. GST)
            </span>
            <span className="text-base font-bold text-indigo-700 tabular-nums">
              {formatCurrency(line.lineTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
