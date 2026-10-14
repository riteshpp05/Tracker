import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { toast } from "sonner";
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  User,
  Activity,
  X,
  FileCode,
  CheckCircle2
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (actionFilter !== "All") params.action = actionFilter;
      const res = await api.get("/audit", { params }).catch(() => ({ data: { logs: [], total: 0 } }));
      setLogs(res.data?.logs || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error("Audit log error:", err);
      toast.error("Failed to fetch audit records");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const csvContent =
        "data:text/csv;charset=utf-8," +
        ["ID,Timestamp,Actor,Action,Entity Type,Entity ID,IP Address"]
          .concat(
            logs.map(
              (l) =>
                `"${l.id}","${l.created_at}","${l.actor_name || l.employee_name || "System"}","${l.action}","${l.entity_type}","${l.entity_id || ""}","${l.ip_address || ""}"`
            )
          )
          .join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `shende_audit_logs_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Audit log export completed!");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  const filteredLogs = logs.filter((log) => {
    const actor = (log.actor_name || log.employee_name || "").toLowerCase();
    const action = (log.action || "").toLowerCase();
    const entity = (log.entity_type || "").toLowerCase();
    const q = search.toLowerCase();
    return actor.includes(q) || action.includes(q) || entity.includes(q);
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-[26px] font-bold text-[#172033] tracking-tight">Enterprise Audit Trail</h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Immutable log of all user access, role adjustments, approvals, and data mutations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            className="text-xs h-9 px-3.5 gap-1.5 border-[#E5E7EB] hover:bg-slate-50 text-[#172033] rounded-xl font-medium shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#667085]" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by actor, action type, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl border-[#E5E7EB] bg-[#F7F8FA] focus:bg-white text-[#172033]"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#667085]">
            <Filter className="w-3.5 h-3.5" />
            <span>Action Type:</span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl text-[#172033] focus:bg-white outline-none"
          >
            <option value="All">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CREATE_USER">CREATE_USER</option>
            <option value="ONBOARD_CANDIDATE">ONBOARD_CANDIDATE</option>
            <option value="SUBMIT_TIMESHEET">SUBMIT_TIMESHEET</option>
            <option value="APPROVE_LEAVE">APPROVE_LEAVE</option>
            <option value="APPROVE_EXPENSE">APPROVE_EXPENSE</option>
            <option value="UPDATE_PROJECT">UPDATE_PROJECT</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#172033]">
            <thead className="bg-[#FAFBFC] border-b border-[#E5E7EB] text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-sans">
                    No audit records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors font-sans"
                  >
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {log.actor_name || log.employee_name || "System"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {log.entity_type}
                      </span>
                      {log.entity_id && (
                        <span className="text-slate-400 text-[11px] ml-1 font-mono">
                          #{String(log.entity_id).substring(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {log.ip_address || "127.0.0.1"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="text-xs h-7 px-2 text-[#635BFF] hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Log Details Modal */}
      {selectedLog && (
        <div
          data-lenis-prevent="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#635BFF]" />
                  Audit Event Inspector
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Event ID: {selectedLog.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[11px]">Actor</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedLog.actor_name || selectedLog.employee_name || "System"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Action</span>
                  <span className="font-mono font-semibold text-[#635BFF]">
                    {selectedLog.action}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-400 block text-[11px]">Entity Target</span>
                  <span className="font-medium">
                    {selectedLog.entity_type} {selectedLog.entity_id && `(${selectedLog.entity_id})`}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-400 block text-[11px]">Timestamp</span>
                  <span>{new Date(selectedLog.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Recorded Payload / Changes:
                </span>
                <pre className="bg-slate-950 text-emerald-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56">
                  {JSON.stringify(selectedLog.changes || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
