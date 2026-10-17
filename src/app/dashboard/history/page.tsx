"use client";

import { useEffect, useState } from "react";
import { History as HistoryIcon, FileText, Clock, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

interface Activity {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

interface QuotationWithRevisions {
  id: string;
  quoteNumber: string;
  createdAt: string;
  revisions: { id: string; revision: number; changeNotes?: string; createdAt: string }[];
}

export default function HistoryPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<QuotationWithRevisions[]>("/api/quotations")
      .then((quotations) => {
        const allActivities: Activity[] = [];
        quotations.forEach((q) => {
          allActivities.push({
            id: q.id + "-created",
            action: "created",
            entity: q.quoteNumber,
            entityId: q.id,
            details: "Quotation created",
            createdAt: q.createdAt,
          });
          q.revisions?.forEach((r) => {
            allActivities.push({
              id: `${q.id}-rev-${r.id}`,
              action: "revised",
              entity: q.quoteNumber,
              entityId: q.id,
              details: r.changeNotes || `Revision v${r.revision}`,
              createdAt: r.createdAt,
            });
          });
        });
        allActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActivities(allActivities);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const actionConfig: Record<string, { color: string; bg: string; border: string }> = {
    created: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    revised: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    sent: { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
    approved: { color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
    deleted: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Activity History</h1>
        <p className="text-gray-500 mt-1.5">Track all changes and activities</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HistoryIcon className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No activity history yet</p>
            <p className="text-gray-400 text-sm mt-1">Activities will appear here as you work</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const config = actionConfig[activity.action] || actionConfig.created;
              return (
                <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50/80 transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg} border ${config.border} group-hover:scale-105 transition-transform`}>
                    <FileText className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{activity.entity}</span>
                      <ArrowRight className="w-3 h-3 text-gray-300" />
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                        {activity.action}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{activity.details}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0 bg-gray-50 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3 h-3" />
                    {formatDate(activity.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
