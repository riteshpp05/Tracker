// Frontend/src/components/enterprise/CompanyHolidaysPage.jsx
import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Sparkles,
  MapPin,
  Clock,
  Tag,
  CheckCircle2,
  X,
  Flag,
  Sun,
  ShieldCheck
} from "lucide-react";
import enterpriseService from "../../services/enterpriseService";
import { toast } from "sonner";

export const CompanyHolidaysPage = () => {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedType, setSelectedType] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Holiday Form
  const [formData, setFormData] = useState({
    name: "",
    holidayDate: "",
    type: "STATE",
    description: "",
    isOptional: false,
  });

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await enterpriseService.getHolidays(selectedYear);
      if (res.success) {
        setHolidays(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load holidays:", err);
      toast.error("Failed to load company holidays");
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.holidayDate) {
      toast.error("Please fill in holiday name and date");
      return;
    }
    setActionLoading(true);
    try {
      const res = await enterpriseService.addHoliday(formData);
      if (res.success) {
        toast.success("Holiday added to corporate calendar");
        setIsAddModalOpen(false);
        setFormData({
          name: "",
          holidayDate: "",
          type: "STATE",
          description: "",
          isOptional: false,
        });
        fetchHolidays();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add holiday");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredHolidays = holidays.filter((h) => {
    if (selectedType === "ALL") return true;
    return h.type === selectedType;
  });

  // Calculate upcoming holiday
  const today = new Date().toISOString().split("T")[0];
  const upcomingHoliday = holidays.find((h) => h.holiday_date >= today);

  const getDayName = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { weekday: "long" });
  };

  const getMonthName = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { month: "short" });
  };

  const getDayNum = (dateStr) => {
    const d = new Date(dateStr);
    return d.getDate();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-[#6558D9]" />
            Corporate Holiday Calendar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Official annual company holidays, Indian statutory observances, and regional leaves for {selectedYear}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-white shadow-xs focus:ring-2 focus:ring-[#6558D9]"
          >
            <option value={2026}>Year 2026</option>
            <option value={2025}>Year 2025</option>
          </select>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#6558D9] hover:bg-[#5245c4] text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Holiday
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Paid Holidays
            </span>
            <div className="p-2 bg-purple-50 rounded-lg text-[#6558D9]">
              <Flag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
            {holidays.length} Days
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Approved calendar for {selectedYear}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Next Upcoming Holiday
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Sun className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 truncate">
            {upcomingHoliday ? upcomingHoliday.name : "None scheduled"}
          </div>
          <span className="text-xs text-emerald-600 font-medium mt-1 block">
            {upcomingHoliday
              ? `${getDayName(upcomingHoliday.holiday_date)}, ${new Date(
                  upcomingHoliday.holiday_date
                ).toLocaleDateString("en-IN", { day: "2-digit", month: "long" })}`
              : "--"}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Compliance Scope
            </span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-800 mt-2">
            Maharashtra Shops & Est.
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Aligned with National & Festival Holidays Act
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {["ALL", "NATIONAL", "STATE", "RESTRICTED"].map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedType === t
                ? "bg-[#6558D9] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t === "ALL" ? "All Holidays" : `${t.charAt(0) + t.slice(1).toLowerCase()} Holidays`}
          </button>
        ))}
      </div>

      {/* Holiday Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-400 text-sm">
            Loading holiday directory...
          </div>
        ) : filteredHolidays.length > 0 ? (
          filteredHolidays.map((holiday) => (
            <div
              key={holiday.id}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition flex items-start gap-4"
            >
              {/* Date Box */}
              <div className="flex flex-col items-center justify-center w-14 h-16 rounded-xl bg-purple-50 border border-purple-100 text-[#6558D9] shrink-0 font-mono">
                <span className="text-xs uppercase font-bold tracking-tight">
                  {getMonthName(holiday.holiday_date)}
                </span>
                <span className="text-2xl font-black leading-none mt-0.5">
                  {getDayNum(holiday.holiday_date)}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      holiday.type === "NATIONAL"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : holiday.type === "STATE"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {holiday.type}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {getDayName(holiday.holiday_date)}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                  {holiday.name}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-2">
                  {holiday.description || "Official company observed holiday."}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-12 text-slate-400 text-sm">
            No holidays recorded for this category.
          </div>
        )}
      </div>

      {/* Add Holiday Modal with data-lenis-prevent="true" */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div
            data-lenis-prevent="true"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-base">Add Company Holiday</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Holiday Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Maharashtra Day"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.holidayDate}
                    onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Holiday Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                  >
                    <option value="NATIONAL">National Holiday</option>
                    <option value="STATE">State / Regional</option>
                    <option value="RESTRICTED">Restricted / Festival</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief note or statutory reference..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#6558D9] hover:bg-[#5245c4] text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Add to Calendar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyHolidaysPage;
