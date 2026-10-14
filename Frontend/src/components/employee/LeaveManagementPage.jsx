import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "sonner";
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Filter,
  Check,
  X,
  User,
  Building
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function LeaveManagementPage() {
  const { user } = useAuth();
  const isApprover = ["ADMIN", "HR", "MANAGER"].includes(user?.role);

  const [activeTab, setActiveTab] = useState("my-leaves"); // 'my-leaves' or 'approvals'
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Apply Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    totalDays: "1",
    reason: "",
  });

  // Action (Approve / Reject) Modal
  const [actionModal, setActionModal] = useState(null); // { request, type: 'Approve' | 'Reject' }
  const [actionComments, setActionComments] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [balRes, typesRes, reqRes] = await Promise.all([
        api.get("/leaves/my-balances").catch(() => ({ data: [] })),
        api.get("/leaves/types").catch(() => ({ data: [] })),
        api.get("/leaves/my-requests").catch(() => ({ data: [] })),
      ]);

      setBalances(Array.isArray(balRes.data) ? balRes.data : []);
      const types = Array.isArray(typesRes.data) ? typesRes.data : [];
      setLeaveTypes(types);
      if (types.length > 0 && !applyForm.leaveTypeId) {
        setApplyForm((prev) => ({ ...prev, leaveTypeId: String(types[0].id) }));
      }
      setMyRequests(Array.isArray(reqRes.data) ? reqRes.data : []);

      if (isApprover) {
        const appRes = await api.get("/leaves/pending-approvals").catch(() => ({ data: [] }));
        setPendingApprovals(Array.isArray(appRes.data) ? appRes.data : []);
      }
    } catch (err) {
      console.error("Leave data fetch error:", err);
      toast.error("Failed to load leave records");
    } finally {
      setLoading(false);
    }
  };

  const handleDatesChange = (start, end) => {
    let days = 1;
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = e - s;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      days = diffDays > 0 ? diffDays : 1;
    }
    setApplyForm((prev) => ({
      ...prev,
      startDate: start,
      endDate: end,
      totalDays: String(days),
    }));
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/leaves/apply", {
        leaveTypeId: parseInt(applyForm.leaveTypeId, 10),
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        totalDays: parseFloat(applyForm.totalDays),
        reason: applyForm.reason,
      });

      toast.success("Leave application submitted successfully!");
      setShowApplyModal(false);
      setApplyForm({
        leaveTypeId: leaveTypes[0]?.id ? String(leaveTypes[0].id) : "",
        startDate: "",
        endDate: "",
        totalDays: "1",
        reason: "",
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit leave request");
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!actionModal) return;

    try {
      const endpoint =
        actionModal.type === "Approve"
          ? `/leaves/approve/${actionModal.request.id}`
          : `/leaves/reject/${actionModal.request.id}`;

      await api.post(endpoint, { comments: actionComments });
      toast.success(`Leave request ${actionModal.type.toLowerCase()}d successfully!`);
      setActionModal(null);
      setActionComments("");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${actionModal.type.toLowerCase()} request`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-[#172033] tracking-tight">
            Leave & Time-Off Management
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Track annual leave balances, submit time-off requests, and review pending approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isApprover && (
            <div className="flex bg-[#F7F8FA] border border-[#E5E7EB] p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("my-leaves")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "my-leaves"
                    ? "bg-white text-[#172033] shadow-xs"
                    : "text-[#667085] hover:text-[#172033]"
                }`}
              >
                My Leaves
              </button>
              <button
                onClick={() => setActiveTab("approvals")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "approvals"
                    ? "bg-white text-[#172033] shadow-xs"
                    : "text-[#667085] hover:text-[#172033]"
                }`}
              >
                Approvals
                {pendingApprovals.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#6558D9] text-white text-[10px] flex items-center justify-center font-bold">
                    {pendingApprovals.length}
                  </span>
                )}
              </button>
            </div>
          )}

          <Button
            onClick={() => setShowApplyModal(true)}
            className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-semibold h-9 px-4 gap-2 rounded-xl shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Apply for Leave
          </Button>
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {balances.map((b) => (
          <div
            key={b.id || b.leave_type_id}
            className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                {b.leave_type_name}
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#F7F8FA] text-[#667085] border border-[#E5E7EB]">
                {b.leave_type_code}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[28px] font-bold text-[#172033] leading-none">
                {parseFloat(b.remaining_days || 0).toFixed(1)}
              </span>
              <span className="text-xs text-[#667085] font-medium">days left</span>
            </div>
            <div className="pt-2 mt-2 border-t border-[#F7F8FA] flex justify-between text-[11px] text-[#667085]">
              <span>Allocated: {parseFloat(b.total_allocated || 0)}</span>
              <span>Used: {parseFloat(b.used_days || 0)}</span>
              {parseFloat(b.pending_days) > 0 && (
                <span className="text-amber-600 font-semibold">
                  Pending: {parseFloat(b.pending_days)}
                </span>
              )}
            </div>
          </div>
        ))}
        {balances.length === 0 && (
          <div className="col-span-4 bg-white p-6 rounded-2xl border border-[#E5E7EB] text-center text-[#667085] text-xs">
            No active leave balance records found for the current period.
          </div>
        )}
      </div>

      {/* Main Tabs */}
      {activeTab === "my-leaves" ? (
        /* My Leave Requests Table */
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB]">
            <h2 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
              My Leave Requests History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#172033]">
              <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Approver Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {myRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      You haven't submitted any leave requests yet.
                    </td>
                  </tr>
                ) : (
                  myRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {req.leave_type_name}
                      </td>
                      <td className="py-3 px-4">
                        {new Date(req.start_date).toLocaleDateString()} –{" "}
                        {new Date(req.end_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {parseFloat(req.total_days)} {parseFloat(req.total_days) === 1 ? "day" : "days"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {req.reason}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            req.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : req.status === "Rejected"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {req.status === "Approved" && <CheckCircle2 className="w-3 h-3" />}
                          {req.status === "Rejected" && <XCircle className="w-3 h-3" />}
                          {req.status === "Pending" && <Clock className="w-3 h-3" />}
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {req.manager_comments || req.approver_name ? (
                          <div>
                            {req.manager_comments && <div>"{req.manager_comments}"</div>}
                            {req.approver_name && (
                              <div className="text-slate-400">by {req.approver_name}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Approvals Queue Tab */
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Team Pending Leave Approvals
            </h2>
            <span className="text-xs text-slate-500">
              {pendingApprovals.length} requests awaiting your review
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-zinc-800/50 border-b border-slate-200/80 dark:border-zinc-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Dates Requested</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {pendingApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No pending leave applications in your approval queue.
                    </td>
                  </tr>
                ) : (
                  pendingApprovals.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {req.employee_name}
                        <div className="text-[11px] text-slate-400 font-normal">
                          {req.employee_code}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {req.department_name || "Operations"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {req.leave_type_name}
                      </td>
                      <td className="py-3 px-4">
                        {new Date(req.start_date).toLocaleDateString()} –{" "}
                        {new Date(req.end_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        {parseFloat(req.total_days)} d
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {req.reason}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setActionModal({ request: req, type: "Approve" });
                            setActionComments("Approved");
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5 gap-1"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setActionModal({ request: req, type: "Reject" });
                            setActionComments("");
                          }}
                          className="text-xs h-7 px-2.5 gap-1"
                        >
                          <X className="w-3 h-3" /> Reject
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div
          data-lenis-prevent="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-[#635BFF]" />
                  Apply for Time-Off
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Submit a leave request for manager approval.
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Leave Type
                </label>
                <select
                  required
                  value={applyForm.leaveTypeId}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, leaveTypeId: e.target.value })
                  }
                  className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) — {t.days_allowed_per_year} days/yr
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Date
                  </label>
                  <Input
                    required
                    type="date"
                    value={applyForm.startDate}
                    onChange={(e) => handleDatesChange(e.target.value, applyForm.endDate)}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    End Date
                  </label>
                  <Input
                    required
                    type="date"
                    value={applyForm.endDate}
                    onChange={(e) => handleDatesChange(applyForm.startDate, e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Total Working Days Requested
                </label>
                <Input
                  required
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={applyForm.totalDays}
                  onChange={(e) => setApplyForm({ ...applyForm, totalDays: e.target.value })}
                  className="h-9 text-xs font-mono font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Leave
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide context or coverage arrangements for your team..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApplyModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#635BFF] hover:bg-[#5248e3] text-white text-xs gap-1.5"
                >
                  Submit Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve / Reject Modal */}
      {actionModal && (
        <div
          data-lenis-prevent="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {actionModal.type} Leave Request
            </h3>
            <p className="text-xs text-slate-500">
              Candidate: <strong>{actionModal.request.employee_name}</strong>
              <br />
              Requested: {actionModal.request.total_days} days of{" "}
              {actionModal.request.leave_type_name} ({actionModal.request.start_date} to{" "}
              {actionModal.request.end_date})
            </p>

            <form onSubmit={handleActionSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Comments / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    actionModal.type === "Approve"
                      ? "Approved. Enjoy your time off."
                      : "Reason for rejection or request for reschedule..."
                  }
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActionModal(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className={`text-xs ${
                    actionModal.type === "Approve"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-rose-600 hover:bg-rose-700 text-white"
                  }`}
                >
                  Confirm {actionModal.type}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
