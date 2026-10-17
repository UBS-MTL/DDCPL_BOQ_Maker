"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, TrendingUp, FileText, Users, Package, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiFetch, getStoredUser } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Stats {
  totalQuotations: number;
  draftQuotations: number;
  sentQuotations: number;
  approvedQuotations: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  monthlyTrend?: { label: string; quotations: number; revenue: number; won: number }[];
  statusCounts?: { status: string; count: number }[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "#f59e0b" },
  internal_review: { label: "Internal Review", color: "#f97316" },
  approved: { label: "Approved", color: "#10b981" },
  sent: { label: "Sent", color: "#6366f1" },
  follow_up: { label: "Follow Up", color: "#818cf8" },
  negotiation: { label: "Negotiation", color: "#a855f7" },
  won: { label: "Won", color: "#22c55e" },
  lost: { label: "Lost", color: "#ef4444" },
  expired: { label: "Expired", color: "#9ca3af" },
  cancelled: { label: "Cancelled", color: "#6b7280" },
  rejected: { label: "Rejected", color: "#dc2626" },
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.push("/login");
      return;
    }
    if (u.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    apiFetch<Stats>("/api/dashboard").then(setStats).catch(() => {});
  }, [router]);

  const statusData = (stats?.statusCounts || [])
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: STATUS_LABELS[s.status]?.label || s.status,
      value: s.count,
      color: STATUS_LABELS[s.status]?.color || "#6366f1",
    }));

  const barData = (stats?.monthlyTrend || []).map((m) => ({
    name: m.label,
    quotations: m.quotations,
    revenue: m.revenue,
    won: m.won,
  }));

  const statCards = [
    { label: "Total Revenue", value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign, gradient: "from-green-400 to-emerald-500" },
    { label: "Total Quotations", value: stats?.totalQuotations || 0, icon: FileText, gradient: "from-blue-400 to-indigo-500" },
    { label: "Customers", value: stats?.totalCustomers || 0, icon: Users, gradient: "from-violet-400 to-purple-500" },
    { label: "Products", value: stats?.totalProducts || 0, icon: Package, gradient: "from-pink-400 to-rose-500" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics</h1>
        <p className="text-gray-500 mt-1.5">Track your quotation performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${s.gradient} rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200/50`}>
                <s.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
            </div>
            Quotations & Revenue Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                formatter={(value: number, name: string) =>
                  name === "revenue" ? [formatCurrency(value), "Revenue"] : [value, name === "quotations" ? "Quotations" : "Won"]
                }
              />
              <Bar yAxisId="left" dataKey="quotations" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
              <Bar yAxisId="right" dataKey="revenue" fill="#34d399" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            {statusData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm text-gray-600">{entry.name}</span>
                <span className="text-xs text-gray-400">({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
