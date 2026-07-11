"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, CheckCheck, Loader2, Inbox, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  entityType?: string | null;
  entityId?: string | null;
  notificationType?: {
    name: string;
  } | null;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications?unread=true");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.length);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 hover:text-[var(--navy)] dark:hover:text-white transition-all focus:outline-none"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white dark:ring-black">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[var(--border-subtle)] bg-white dark:bg-[var(--bg-secondary)] shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3 bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]/40">
              <span className="text-xs font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--gold)] hover:text-[var(--gold-dim)] transition-colors"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[350px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
              {loading && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--gold)]" />
                  <span className="text-xs mt-2 font-medium">Loading notifications...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--gold-light-bg)] dark:bg-white/5 flex items-center justify-center text-[var(--gold)] mb-3">
                    <Inbox size={20} />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-[var(--navy)] dark:text-white">
                    All caught up!
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    You have no unread notifications.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="group flex gap-3 p-4 hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 transition-colors relative"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                          {notif.title}
                        </p>
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded text-[var(--text-muted)] hover:text-red-500 transition-all"
                          title="Mark as read"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 break-words">
                        {notif.body}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {notif.notificationType?.name && (
                          <span className="text-[8px] font-black uppercase tracking-widest text-[var(--gold)] border border-[var(--border-subtle)] px-1 py-0.5 rounded-sm">
                            {notif.notificationType.name}
                          </span>
                        )}
                        <span className="text-[9px] text-[var(--text-muted)]">
                          {new Date(notif.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
