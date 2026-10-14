// Frontend/src/components/enterprise/NoticeBoardPage.jsx
import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Plus,
  Pin,
  Calendar,
  User,
  Tag,
  AlertTriangle,
  Info,
  X,
  CheckCircle2,
  Bell
} from "lucide-react";
import enterpriseService from "../../services/enterpriseService";
import { toast } from "sonner";

export const NoticeBoardPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "GENERAL",
    priority: "NORMAL",
    isPinned: false,
    validUntil: "",
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await enterpriseService.getAnnouncements();
      if (res.success) {
        setAnnouncements(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load announcements:", err);
      toast.error("Failed to load company announcements");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Please provide both title and content");
      return;
    }
    setActionLoading(true);
    try {
      const res = await enterpriseService.createAnnouncement(formData);
      if (res.success) {
        toast.success("Broadcast announcement published successfully");
        setIsCreateModalOpen(false);
        setFormData({
          title: "",
          content: "",
          category: "GENERAL",
          priority: "NORMAL",
          isPinned: false,
          validUntil: "",
        });
        fetchAnnouncements();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to publish announcement");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    if (selectedCategory === "ALL") return true;
    return a.category === selectedCategory;
  });

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "URGENT":
        return "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
      case "HIGH":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "LOW":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "NORMAL":
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-[#6558D9]" />
            Enterprise Notice Board
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Company-wide broadcasts, HR communications, circulars, and strategic announcements.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#6558D9] hover:bg-[#5245c4] text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Publish Notice
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {["ALL", "GENERAL", "HR", "POLICY", "EVENTS"].map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedCategory === c
                ? "bg-[#6558D9] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {c === "ALL" ? "All Notices" : c}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Loading announcements...
          </div>
        ) : filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-6 shadow-xs hover:shadow-md transition relative ${
                item.is_pinned
                  ? "border-[#6558D9]/40 bg-purple-50/20"
                  : "border-slate-200/80"
              }`}
            >
              {/* Top Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  {item.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#6558D9] bg-purple-100/80 px-2.5 py-0.5 rounded-full border border-purple-200">
                      <Pin className="w-3 h-3 fill-[#6558D9]" /> Pinned Notice
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${getPriorityBadge(
                      item.priority
                    )}`}
                  >
                    {item.priority}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {item.category}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(item.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {item.first_name && (
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <User className="w-3.5 h-3.5" />
                      {item.first_name} {item.last_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Body */}
              <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                {item.content}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            No announcements found in this category.
          </div>
        )}
      </div>

      {/* Publish Notice Modal with data-lenis-prevent="true" */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div
            data-lenis-prevent="true"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-base">Broadcast New Announcement</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Announcement Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Annual Company Offsite 2026"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                  >
                    <option value="GENERAL">General</option>
                    <option value="HR">Human Resources</option>
                    <option value="POLICY">Policy & Compliance</option>
                    <option value="EVENTS">Events & Celebrations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notice Content
                </label>
                <textarea
                  rows="4"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write announcement body..."
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="rounded border-slate-300 text-[#6558D9] focus:ring-[#6558D9]"
                />
                <label htmlFor="pinCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Pin this announcement to top of the notice board
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#6558D9] hover:bg-[#5245c4] text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? "Publishing..." : "Broadcast Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticeBoardPage;
