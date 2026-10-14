import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, ExternalLink } from "lucide-react";
import notificationService from "../../services/notificationService";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";
import { toast } from "sonner";

export function NotificationPopover() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      const list = Array.isArray(data) ? data : data?.notifications || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.is_read).length);
    } catch (err) {
      console.warn("Could not load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All marked as read");
    } catch (err) {
      toast.error("Failed to mark all as read");
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg text-[#667085] hover:text-[#172033] hover:bg-[#F7F8FA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6558D9]"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-[#6558D9] text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 bg-white border border-[#E5E7EB] rounded-xl shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] bg-white">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#172033]">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-semibold">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-[11px] font-medium text-[#6558D9] hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Content list */}
        <div className="max-h-80 overflow-y-auto" data-lenis-prevent="true">
          {loading && notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#667085]">
              Loading updates…
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#667085] space-y-1">
              <Bell className="w-6 h-6 mx-auto text-[#D1D5DB] mb-1.5" />
              <p className="font-medium text-[#172033]">All caught up</p>
              <p className="text-[11px] text-[#667085]">No new notifications at this time</p>
            </div>
          ) : (
            recentNotifications.map((n, idx) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.is_read) handleMarkAsRead(n.id);
                  if (n.link) {
                    setOpen(false);
                    navigate(n.link);
                  }
                }}
                className={`p-3.5 transition-colors flex items-start gap-3 cursor-pointer ${
                  idx > 0 ? "border-t border-[#F1F3F5]" : ""
                } ${
                  !n.is_read ? "bg-indigo-50/40 hover:bg-indigo-50/70" : "hover:bg-[#F7F8FA]"
                }`}
              >
                <div className="pt-0.5">
                  <span
                    className={`block w-2 h-2 rounded-full ${
                      !n.is_read ? "bg-[#6558D9]" : "bg-transparent"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#172033] leading-snug truncate">
                    {n.title}
                  </p>
                  <p className="text-[11px] text-[#667085] mt-0.5 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                  <span className="text-[10px] text-[#9CA3AF] mt-1 block">
                    {n.created_at ? new Date(n.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : ""}
                  </span>
                </div>
                {!n.is_read && (
                  <button
                    onClick={(e) => handleMarkAsRead(n.id, e)}
                    className="p-1 rounded text-[#9CA3AF] hover:text-[#172033] hover:bg-white transition-colors shrink-0"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-[#E5E7EB] bg-[#FAFBFC] text-center">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-[#6558D9] hover:text-indigo-800 py-1"
          >
            View all notifications
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationPopover;
