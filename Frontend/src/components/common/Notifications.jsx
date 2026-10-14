import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Bell, Check, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import notificationService from "../../services/notificationService";

export function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      const notifs = Array.isArray(data) ? data : data?.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          (n.id === id || n.notification_id === id) ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) =>
        prev.filter((n) => (n.id !== id && n.notification_id !== id))
      );
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-[26px] font-bold text-[#172033] tracking-tight">
            Notifications Center
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Stay informed with system updates, project changes, and approvals.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs h-9 px-3.5 border-[#E5E7EB] hover:border-[#6558D9] gap-1.5"
          >
            <Check className="h-3.5 w-3.5 text-[#6558D9]" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-sm font-bold text-[#172033]">
            Recent Notifications
          </h2>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F7F8FA] border border-[#E5E7EB] text-[#667085]">
            {unreadCount} unread
          </span>
        </div>

        <div className="divide-y divide-[#E5E7EB]">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#667085]">
              Loading notifications…
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <Bell className="h-10 w-10 mx-auto text-[#D1D5DB]" />
              <p className="text-sm font-medium text-[#172033]">No notifications</p>
              <p className="text-xs text-[#667085]">
                You're completely up to date with your activities.
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const notifId = notification.id || notification.notification_id;
              return (
                <div
                  key={notifId}
                  className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                    !notification.is_read
                      ? "bg-indigo-50/30 hover:bg-indigo-50/50"
                      : "hover:bg-[#F7F8FA]"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-[#172033]">
                        {notification.title}
                      </h4>
                      {!notification.is_read && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-[#6558D9] border border-indigo-100">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#667085] leading-relaxed">
                      {notification.message}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] mt-2">
                      {notification.created_at
                        ? new Date(notification.created_at).toLocaleString()
                        : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notifId)}
                        className="h-8 w-8 p-0 text-[#667085] hover:text-[#172033] hover:bg-white"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notifId)}
                      className="h-8 w-8 p-0 text-[#9CA3AF] hover:text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Notifications;
