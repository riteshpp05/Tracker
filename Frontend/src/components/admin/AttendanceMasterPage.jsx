// Frontend/src/components/admin/AttendanceMasterPage.jsx
import React, { useState, useEffect } from "react";
import {
  Users,
  Calendar,
  Building2,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Filter,
  Search,
  Check,
  X,
  ShieldCheck,
  MapPin,
  RefreshCw
} from "lucide-react";
import enterpriseService from "../../services/enterpriseService";
import { toast } from "sonner";

export const AttendanceMasterPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedMode, setSelectedMode] = useState("ALL");
  const [activeTab, setActiveTab] = useState("DAILY_LOGS"); // DAILY_LOGS, REGULARIZATIONS
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [masterData, setMasterData] = useState([]);
  const [regularizations, setRegularizations] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Review modal state
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    item: null,
    action: "APPROVED",
    notes: "",
  });

  useEffect(() => {
    fetchMasterData();
  }, [selectedDate, selectedDept, selectedMode]);

  useEffect(() => {
    if (activeTab === "REGULARIZATIONS") {
      fetchRegularizations();
    }
  }, [activeTab]);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const res = await enterpriseService.getAttendanceMaster({
        date: selectedDate,
        department: selectedDept,
        workMode: selectedMode,
      });
      if (res.success) {
        setMasterData(res.data?.records || (Array.isArray(res.data) ? res.data : []));
      }
    } catch (err) {
      console.error("Failed to load master attendance:", err);
      toast.error("Failed to load attendance master register");
    } finally {
      setLoading(false);
    }
  };

  const fetchRegularizations = async () => {
    try {
      const res = await enterpriseService.getRegularizations();
      if (res.success) {
        setRegularizations(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load regularizations:", err);
      toast.error("Failed to load regularization requests");
    }
  };

  const handleReviewAction = async (e) => {
    e.preventDefault();
    if (!reviewModal.item) return;

    setActionLoading(true);
    try {
      const res = await enterpriseService.reviewRegularization(
        reviewModal.item.id,
        reviewModal.action,
        reviewModal.notes
      );
      if (res.success) {
        toast.success(`Regularization request ${reviewModal.action.toLowerCase()} successfully`);
        setReviewModal({ isOpen: false, item: null, action: "APPROVED", notes: "" });
        fetchRegularizations();
        fetchMasterData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to process review");
    } finally {
      setActionLoading(false);
    }
  };

  const exportCSV = () => {
    if (!masterData.length) {
      toast.error("No records available to export");
      return;
    }
    const headers = [
      "Employee ID",
      "Name",
      "Department",
      "Date",
      "Check In",
      "Check Out",
      "Work Minutes",
      "Break Minutes",
      "Work Mode",
      "Geofence Compliant",
      "Status",
    ];
    const rows = masterData.map((row) => [
      row.employee_code,
      `"${row.first_name} ${row.last_name}"`,
      `"${row.department_name || row.department || ""}"`,
      row.punch_date ? row.punch_date.split("T")[0] : selectedDate,
      row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString("en-IN") : "",
      row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString("en-IN") : "",
      row.total_work_minutes || 0,
      row.total_break_minutes || 0,
      row.work_mode || "OFFICE",
      row.is_geofence_compliant ? "YES" : "NO",
      row.status || "ABSENT",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ShendeIndustries_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance CSV exported successfully");
  };

  const filteredMasterData = masterData.filter((emp) => {
    const fullName = `${emp.first_name} ${emp.last_name} ${emp.employee_code}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const presentCount = masterData.filter((e) => e.status === "PRESENT" || e.status === "LATE").length;
  const officeCount = masterData.filter((e) => e.work_mode === "OFFICE" && e.check_in_time).length;
  const remoteCount = masterData.filter((e) => e.work_mode === "REMOTE" && e.check_in_time).length;
  const lateCount = masterData.filter((e) => e.status === "LATE").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-[#6558D9]" />
            Enterprise Attendance Register
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time workforce attendance tracking, geofence compliance verification, and regularization desk.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Present
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {presentCount} / {masterData.length}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {masterData.length > 0 ? Math.round((presentCount / masterData.length) * 100) : 0}% workforce present
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Office Attendance
            </span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {officeCount}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Inside verified geofence</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Remote / WFH
            </span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Laptop className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {remoteCount}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Authorized external punch</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Late Arrivals
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2 font-mono">
            {lateCount}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Checked in post 09:45 AM</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("DAILY_LOGS")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition ${
            activeTab === "DAILY_LOGS"
              ? "border-[#6558D9] text-[#6558D9]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Daily Register
        </button>
        <button
          onClick={() => setActiveTab("REGULARIZATIONS")}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === "REGULARIZATIONS"
              ? "border-[#6558D9] text-[#6558D9]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Regularization Requests
          {regularizations.filter((r) => r.status === "PENDING").length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold">
              {regularizations.filter((r) => r.status === "PENDING").length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "DAILY_LOGS" ? (
        <>
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                />
              </div>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
              >
                <option value="ALL">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Quality Assurance">Quality Assurance</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
              </select>

              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
              >
                <option value="ALL">All Work Modes</option>
                <option value="OFFICE">Office Only</option>
                <option value="REMOTE">Remote Only</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee name or ID..."
                className="pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9] w-full md:w-64"
              />
            </div>
          </div>

          {/* Master Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Check In</th>
                    <th className="py-3 px-4">Check Out</th>
                    <th className="py-3 px-4">Work Time</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Geofence Compliance</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400 text-sm">
                        Loading attendance register...
                      </td>
                    </tr>
                  ) : filteredMasterData.length > 0 ? (
                    filteredMasterData.map((emp) => (
                      <tr key={emp.employee_id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {emp.employee_code} • {emp.designation_name || emp.designation || "Staff"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {emp.department_name || emp.department || "General"}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {emp.check_in_time
                            ? new Date(emp.check_in_time).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "--:--"}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {emp.check_out_time
                            ? new Date(emp.check_out_time).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "--:--"}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          {emp.total_work_minutes ? `${Math.floor(emp.total_work_minutes / 60)}h ${emp.total_work_minutes % 60}m` : "--"}
                        </td>
                        <td className="py-3 px-4">
                          {emp.work_mode ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                emp.work_mode === "OFFICE"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                              }`}
                            >
                              {emp.work_mode === "OFFICE" ? (
                                <Building2 className="w-3 h-3" />
                              ) : (
                                <Laptop className="w-3 h-3" />
                              )}
                              {emp.work_mode}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">--</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {emp.is_geofence_compliant ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified In-Office
                            </span>
                          ) : emp.check_in ? (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                              Remote / Outside Fence
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">--</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              emp.status === "PRESENT"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : emp.status === "LATE"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {emp.status || "ABSENT"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-400 text-sm">
                        No attendance records found for this filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Regularizations Tab */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Regularization Submissions</h3>
              <p className="text-xs text-slate-500">
                Staff requests for missed check-in/out or field duty rectifications.
              </p>
            </div>
            <button
              onClick={fetchRegularizations}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Target Date</th>
                  <th className="py-3 px-4">Requested Punch</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {regularizations.length > 0 ? (
                  regularizations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {reg.first_name} {reg.last_name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {reg.employee_code} • {reg.department}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {new Date(reg.punch_date || reg.attendance_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        <div>
                          In: {reg.requested_check_in
                            ? new Date(reg.requested_check_in).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "--:--"}
                        </div>
                        <div>
                          Out: {reg.requested_check_out
                            ? new Date(reg.requested_check_out).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "--:--"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {reg.reason}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            reg.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : reg.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {reg.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {reg.status === "PENDING" && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                setReviewModal({
                                  isOpen: true,
                                  item: reg,
                                  action: "APPROVED",
                                  notes: "",
                                })
                              }
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded shadow-xs transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                setReviewModal({
                                  isOpen: true,
                                  item: reg,
                                  action: "REJECTED",
                                  notes: "",
                                })
                              }
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded shadow-xs transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400 text-sm">
                      No regularization requests submitted.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Confirmation Modal with data-lenis-prevent="true" */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div
            data-lenis-prevent="true"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-base">
                {reviewModal.action === "APPROVED" ? "Approve Regularization" : "Reject Regularization"}
              </h3>
              <button
                onClick={() => setReviewModal({ ...reviewModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewAction} className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                You are about to mark this regularization as{" "}
                <span className="font-bold">{reviewModal.action}</span> for{" "}
                <span className="font-semibold">
                  {reviewModal.item?.first_name} {reviewModal.item?.last_name}
                </span>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reviewer Notes (Optional)
                </label>
                <textarea
                  rows="3"
                  value={reviewModal.notes}
                  onChange={(e) => setReviewModal({ ...reviewModal, notes: e.target.value })}
                  placeholder="Provide comments or remarks..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModal({ ...reviewModal, isOpen: false })}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2 text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50 ${
                    reviewModal.action === "APPROVED"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {actionLoading ? "Processing..." : `Confirm ${reviewModal.action}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceMasterPage;
