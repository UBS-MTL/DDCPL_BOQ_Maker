"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Package,
  Users,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle,
  Send,
  Plus,
  ArrowRight,
  XCircle,
  UserCheck,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CalendarClock } from "lucide-react";

interface Stats {
  totalQuotations: number;
  draftQuotations: number;
  sentQuotations: number;
  approvedQuotations: number;
  rejectedQuotations: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  conversionRate: number;
  monthlyTrend?: { label: string; quotations: number; revenue: number; won: number }[];
  upcomingFollowUps?: {
    id: string;
    quoteNumber: string;
    title: string;
    status: string;
    followUpDate?: string | null;
    grandTotal: number;
    customer: { name: string };
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [user, setUser] = useState<{ name: string; email: string; role: string; id: string } | null>(null);
  const [nowTs, setNowTs] = useState(0);

  useEffect(() => {
    Promise.resolve().then(() => setNowTs(Date.now()));
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      Promise.resolve().then(() => setUser(u));

      apiFetch<Stats>("/api/dashboard")
        .then(setStats)
        .catch(() => {});
    }
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user.role === "admin";

  const statCards = [
    {
      label: "Total Quotations",
      value: stats?.totalQuotations || 0,
      icon: FileText,
      gradient: "from-blue-500 to-indigo-500",
      bg: "bg-blue-50",
      text: "text-blue-600",
      change: isAdmin ? "All" : "Mine",
    },
    {
      label: "Draft",
      value: stats?.draftQuotations || 0,
      icon: Clock,
      gradient: "from-amber-400 to-orange-500",
      bg: "bg-amber-50",
      text: "text-amber-600",
      change: "Pending",
    },
    {
      label: "Sent",
      value: stats?.sentQuotations || 0,
      icon: Send,
      gradient: "from-violet-500 to-purple-600",
      bg: "bg-violet-50",
      text: "text-violet-600",
      change: "Active",
    },
    {
      label: "Approved",
      value: stats?.approvedQuotations || 0,
      icon: CheckCircle,
      gradient: "from-emerald-400 to-green-500",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      change: `${stats?.conversionRate || 0}%`,
    },
  ];

  if (isAdmin) {
    statCards.push({
      label: "Rejected",
      value: stats?.rejectedQuotations || 0,
      icon: XCircle,
      gradient: "from-red-400 to-rose-500",
      bg: "bg-red-50",
      text: "text-red-600",
      change: "Lost",
    } as typeof statCards[0]);
  }

  const quickStats = [
    {
      label: "Total Revenue",
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: TrendingUp,
      gradient: "from-green-400 to-emerald-500",
      bg: "bg-green-50",
      text: "text-green-600",
    },
    {
      label: "Products",
      value: stats?.totalProducts || 0,
      icon: Package,
      gradient: "from-pink-400 to-rose-500",
      bg: "bg-pink-50",
      text: "text-pink-600",
    },
    {
      label: "Customers",
      value: stats?.totalCustomers || 0,
      icon: Users,
      gradient: "from-cyan-400 to-blue-500",
      bg: "bg-cyan-50",
      text: "text-cyan-600",
    },
    {
      label: "This Month",
      value: formatCurrency(stats?.monthlyRevenue || 0),
      icon: ArrowUpRight,
      gradient: "from-indigo-400 to-purple-500",
      bg: "bg-indigo-50",
      text: "text-indigo-600",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          {isAdmin ? "Admin Dashboard" : `Welcome, ${user?.name || "Sales Person"}`}
        </h1>
        <p className="text-gray-500 mt-1.5">
          {isAdmin
            ? "Overview of all sales persons and quotations."
            : "Here&apos;s your personal quotation overview."}
        </p>
      </div>

      {/* Stat Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-4 mb-6 stagger-children`}>
        {statCards.map((card) => (
          <div
            key={card.label}
            className="group bg-white rounded-2xl p-5 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-default"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 bg-gradient-to-br ${card.gradient} rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200/50 group-hover:scale-105 transition-transform`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${card.bg} ${card.text}`}>
                {card.change}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">{card.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger-children">
        {quickStats.map((stat) => (
          <div
            key={stat.label}
            className="group bg-white rounded-2xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-md shadow-gray-200/50 group-hover:scale-105 transition-transform`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-base font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trend + Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">6-Month Trend</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={(stats?.monthlyTrend || []).map((m) => ({ name: m.label, quotations: m.quotations }))} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                cursor={{ fill: "#f5f3ff" }}
              />
              <Bar dataKey="quotations" name="Quotations" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CalendarClock className="w-4.5 h-4.5 text-indigo-500" style={{ width: 18, height: 18 }} />
              Follow-ups
            </h2>
            <Link href="/dashboard/quotations" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View all
            </Link>
          </div>
          {(stats?.upcomingFollowUps || []).length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No follow-ups in the next 14 days</p>
          ) : (
            <ul className="space-y-2 max-h-[260px] overflow-y-auto">
              {(stats?.upcomingFollowUps || []).map((f) => {
                const due = f.followUpDate ? new Date(f.followUpDate) : null;
                const overdue = due ? due.getTime() < nowTs : false;
                return (
                  <li key={f.id}>
                    <Link
                      href={`/dashboard/quotations/${f.id}`}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{f.quoteNumber}</p>
                        <p className="text-xs text-gray-500 truncate">{f.customer.name}</p>
                      </div>
                      <span
                        className={`text-xs font-medium flex-shrink-0 px-2 py-1 rounded-lg ${
                          overdue ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600"
                        }`}
                      >
                        {due ? formatDate(due) : "—"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm animate-fadeIn">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <Link href="/dashboard/quotations" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/dashboard/quotations/new"
            className="group flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-200/50 btn-lift"
          >
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold block leading-tight">New Quotation</span>
              <span className="text-white/70 text-xs">Create from scratch</span>
            </div>
          </Link>
          {isAdmin && (
            <Link
              href="/dashboard/team"
              className="group flex items-center gap-3 p-4 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all btn-lift"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <span className="font-semibold block leading-tight">My Team</span>
                <span className="text-gray-400 text-xs">Sales performance</span>
              </div>
            </Link>
          )}
          <Link
            href="/dashboard/products"
            className="group flex items-center gap-3 p-4 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all btn-lift"
          >
            <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <span className="font-semibold block leading-tight">Add Product</span>
              <span className="text-gray-400 text-xs">Catalog item</span>
            </div>
          </Link>
          <Link
            href="/dashboard/customers"
            className="group flex items-center gap-3 p-4 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all btn-lift"
          >
            <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <span className="font-semibold block leading-tight">Add Customer</span>
              <span className="text-gray-400 text-xs">New contact</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
