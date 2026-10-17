"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  FileText,
  CheckCircle,
  Send,
  Clock,
  XCircle,
  TrendingUp,
  Eye,
  ArrowUpRight,
  BarChart3,
  Plus,
  X,
  Trash2,
  KeyRound,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiFetch, getStoredUser } from "@/lib/api";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  stats: {
    totalQuotations: number;
    approved: number;
    sent: number;
    rejected: number;
    draft: number;
    totalRevenue: number;
    pendingValue: number;
    conversionRate: number;
  };
  recentQuotations: {
    id: string;
    quoteNumber: string;
    title: string;
    status: string;
    customerName: string;
    createdAt: string;
    rejectionReason?: string | null;
  }[];
}

export default function TeamPage() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resetPwId, setResetPwId] = useState<string | null>(null);
  const [resetPwName, setResetPwName] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
    fetchTeam();
  }, [router]);

  function fetchTeam() {
    apiFetch("/api/team")
      .then((data) => { setTeam(data as never); setLoading(false); })
      .catch(() => setLoading(false));
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({ ...form, role: "sales_person" }),
      });
      setShowModal(false);
      setForm({ name: "", email: "", phone: "", password: "" });
      fetchTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the team? Their quotations will be reassigned to admin.`)) return;
    try {
      await apiFetch(`/api/users/${id}`, { method: "DELETE" });
      fetchTeam();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwId) return;
    setSubmitting(true);
    setError("");
    try {
      await apiFetch(`/api/users/${resetPwId}`, {
        method: "PUT",
        body: JSON.stringify({ password: newPassword }),
      });
      setResetPwId(null);
      setNewPassword("");
      fetchTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const totalTeamRevenue = team.reduce((sum, m) => sum + m.stats.totalRevenue, 0);
  const totalTeamQuotations = team.reduce((sum, m) => sum + m.stats.totalQuotations, 0);
  const totalApproved = team.reduce((sum, m) => sum + m.stats.approved, 0);

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
    draft: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
    sent: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Send },
    approved: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
    rejected: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fadeIn">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Team</h1>
          <p className="text-gray-500 mt-1.5">Track sales person performance and quotation activity.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-md shadow-indigo-200/50 hover:shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all btn-lift"
        >
          <Plus className="w-5 h-5" />
          Add Member
        </button>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 stagger-children">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200/50">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{team.length}</div>
              <div className="text-sm text-gray-500">Sales Persons</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200/50">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalTeamRevenue)}</div>
              <div className="text-sm text-gray-500">Team Revenue</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200/50">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {totalTeamQuotations > 0 ? Math.round((totalApproved / totalTeamQuotations) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-500">Team Conversion</div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : team.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 text-lg font-medium">No team members yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">Add your first sales person to get started</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Add Member
          </button>
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {team.map((member) => {
            const isExpanded = expandedId === member.id;
            return (
              <div key={member.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Member Header */}
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : member.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 via-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-200/50">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{member.name}</h3>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{member.stats.totalQuotations}</div>
                        <div className="text-xs text-gray-500">Quotes</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-600">{member.stats.conversionRate}%</div>
                        <div className="text-xs text-gray-500">Conversion</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{formatCurrency(member.stats.totalRevenue)}</div>
                        <div className="text-xs text-gray-500">Revenue</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-amber-600">{formatCurrency(member.stats.pendingValue)}</div>
                        <div className="text-xs text-gray-500">Pending</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /> {member.stats.approved}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Send className="w-3 h-3" /> {member.stats.sent}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="w-3 h-3" /> {member.stats.rejected}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> {member.stats.draft}
                        </span>
                      </div>

                      <ArrowUpRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 pb-5">
                    {/* Actions Bar */}
                    <div className="flex items-center justify-between mt-4 mb-3">
                      <span className="text-xs font-medium text-gray-500">Performance Breakdown</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setResetPwId(member.id);
                            setResetPwName(member.name);
                            setNewPassword("");
                            setError("");
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Reset Password
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(member.id, member.name); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>

                    {/* Status Bar */}
                    <div className="mb-4">
                      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 gap-0.5">
                        {member.stats.totalQuotations > 0 && (
                          <>
                            <div
                              className="bg-emerald-500 transition-all"
                              style={{ width: `${(member.stats.approved / member.stats.totalQuotations) * 100}%` }}
                              title={`Approved: ${member.stats.approved}`}
                            />
                            <div
                              className="bg-blue-500 transition-all"
                              style={{ width: `${(member.stats.sent / member.stats.totalQuotations) * 100}%` }}
                              title={`Sent: ${member.stats.sent}`}
                            />
                            <div
                              className="bg-amber-500 transition-all"
                              style={{ width: `${(member.stats.draft / member.stats.totalQuotations) * 100}%` }}
                              title={`Draft: ${member.stats.draft}`}
                            />
                            <div
                              className="bg-red-500 transition-all"
                              style={{ width: `${(member.stats.rejected / member.stats.totalQuotations) * 100}%` }}
                              title={`Rejected: ${member.stats.rejected}`}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Recent Quotations */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Quotations</h4>
                      <div className="space-y-2">
                        {member.recentQuotations.map((q) => {
                          const config = statusConfig[q.status] || statusConfig.draft;
                          const StatusIcon = config.icon;
                          return (
                            <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <div>
                                  <Link href={`/dashboard/quotations/${q.id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                                    {q.quoteNumber} — {q.title}
                                  </Link>
                                  <p className="text-xs text-gray-500">{q.customerName} · {formatDate(q.createdAt)}</p>
                                  {q.rejectionReason && q.status === "rejected" && (
                                    <p className="text-xs text-red-500 mt-0.5 italic">Reason: {q.rejectionReason}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                                </span>
                                <Link href={`/dashboard/quotations/${q.id}`} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                  <Eye className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl mx-4 animate-slideUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Add Team Member</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahul Verma"
                  required
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. rahul@company.com"
                  required
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Contact Number <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-md shadow-indigo-200/50 hover:shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Add Member"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl mx-4 animate-slideUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Reset Password</h2>
              <button
                onClick={() => setResetPwId(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <p className="text-sm text-gray-500">
                Setting a new password for <span className="font-semibold text-gray-700">{resetPwName}</span>.
              </p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  autoFocus
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPwId(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-md shadow-indigo-200/50 hover:shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
