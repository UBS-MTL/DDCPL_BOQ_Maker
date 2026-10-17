"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, CalendarClock, AlertTriangle, Clock3 } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  quotationId?: string | null;
  dueDate?: string | null;
  readAt?: string | null;
  createdAt: string;
  quotation?: { id: string; quoteNumber: string } | null;
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  follow_up: CalendarClock,
  expiry: Clock3,
  expired: AlertTriangle,
};

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    apiFetch<{ notifications: Notification[]; unreadCount: number }>("/api/notifications")
      .then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {
        /* ignore polling errors */
      });
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAllRead = async () => {
    try {
      await apiFetch("/api/notifications", { method: "POST" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    } catch {
      /* noop */
    }
  };

  const openItem = async (n: Notification) => {
    if (!n.readAt) {
      try {
        await apiFetch(`/api/notifications/${n.id}`, { method: "PUT" });
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        /* noop */
      }
    }
    setOpen(false);
    if (n.quotationId) router.push(`/dashboard/quotations/${n.quotationId}`);
  };

  const shown = notifications.slice(0, 20);

  return (
    <div ref={rootRef} className="relative z-40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
        title="Notifications"
      >
        <Bell className="w-4.5 h-4.5 text-gray-600" style={{ width: 18, height: 18 }} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {shown.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No notifications yet</p>
            ) : (
              shown.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                const unread = !n.readAt;
                return (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 ${
                      unread ? "bg-indigo-50/40" : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        n.type === "expired" ? "bg-red-50 text-red-500" : "bg-indigo-50 text-indigo-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${unread ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                          {n.title}
                        </p>
                        {unread && <span className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />}
                      </div>
                      {n.body && <p className="text-xs text-gray-500 truncate mt-0.5">{n.body}</p>}
                      <p className="text-[11px] text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
