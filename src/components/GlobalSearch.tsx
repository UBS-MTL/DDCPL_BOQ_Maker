"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Users, Package } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Results = {
  quotations: {
    id: string;
    quoteNumber: string;
    title: string;
    status: string;
    grandTotal: number;
    customer: { name: string };
  }[];
  customers: { id: string; name: string; company?: string | null; phone?: string | null }[];
  products: { id: string; name: string; sku?: string | null; brand?: string | null; rate: number }[];
};

const EMPTY: Results = { quotations: [], customers: [], products: [] };

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      Promise.resolve().then(() => {
        setResults(EMPTY);
        setLoading(false);
      });
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      apiFetch<Results>(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => {
          setResults(r);
          setOpen(true);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const hasResults =
    results.quotations.length > 0 || results.customers.length > 0 || results.products.length > 0;

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 w-52 lg:w-72 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all shadow-sm">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.quotations.length + results.customers.length + results.products.length > 0 && setOpen(true)}
          placeholder="Search quotes, customers…"
          className="w-full px-2 py-2 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
        {loading && (
          <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin flex-shrink-0" />
        )}
      </div>

      {open && (
        <div className="absolute right-0 mt-2 w-80 lg:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden z-50">
          <div className="max-h-96 overflow-y-auto">
            {!hasResults && !loading ? (
              <p className="text-sm text-gray-400 text-center py-6">No results</p>
            ) : (
              <>
                {results.quotations.length > 0 && (
                  <div className="py-1">
                    <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Quotations
                    </p>
                    {results.quotations.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => go(`/dashboard/quotations/${q.id}`)}
                        className="w-full text-left px-4 py-2 hover:bg-indigo-50/60 transition-colors flex items-center gap-3"
                      >
                        <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {q.quoteNumber} — {q.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{q.customer.name}</p>
                        </div>
                        <span className="text-xs font-medium text-gray-500 capitalize flex-shrink-0">
                          {q.status.replace("_", " ")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {results.customers.length > 0 && (
                  <div className="py-1 border-t border-gray-100">
                    <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Customers
                    </p>
                    {results.customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => go("/dashboard/customers")}
                        className="w-full text-left px-4 py-2 hover:bg-indigo-50/60 transition-colors flex items-center gap-3"
                      >
                        <Users className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {c.name}
                            {c.company ? ` · ${c.company}` : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {results.products.length > 0 && (
                  <div className="py-1 border-t border-gray-100">
                    <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Products
                    </p>
                    {results.products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => go("/dashboard/products")}
                        className="w-full text-left px-4 py-2 hover:bg-indigo-50/60 transition-colors flex items-center gap-3"
                      >
                        <Package className="w-4 h-4 text-pink-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {p.name}
                            {p.brand ? ` · ${p.brand}` : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
