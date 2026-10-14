import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Briefcase,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import api from "../../services/api";
import { toast } from "sonner";

export const HRDashboard = () => {
  const [stats, setStats] = useState({
    activeEmployees: 6,
    newJoiners: 2,
    onLeaveToday: 1,
    openJobs: 3,
    totalApplicants: 3,
    pendingLeaves: 1,
  });
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [recentApplicants, setRecentApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHRData = async () => {
      try {
        setLoading(true);
        const [leaveRes, appRes, empRes] = await Promise.allSettled([
          api.get("/leaves/pending-approvals"),
          api.get("/recruitment/applications"),
          api.get("/employees"),
        ]);

        if (leaveRes.status === "fulfilled" && Array.isArray(leaveRes.value.data)) {
          setPendingLeaves(leaveRes.value.data);
          setStats((prev) => ({ ...prev, pendingLeaves: leaveRes.value.data.length }));
        }

        if (appRes.status === "fulfilled" && Array.isArray(appRes.value.data)) {
          setRecentApplicants(appRes.value.data.slice(0, 5));
          setStats((prev) => ({ ...prev, totalApplicants: appRes.value.data.length }));
        }

        if (empRes.status === "fulfilled" && Array.isArray(empRes.value.data)) {
          setStats((prev) => ({ ...prev, activeEmployees: empRes.value.data.length }));
        }
      } catch (err) {
        console.warn("Error fetching HR dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHRData();
  }, []);

  const handleApproveLeave = async (id) => {
    try {
      await api.post(`/leaves/approve/${id}`, { comments: "Approved by HR" });
      toast.success("Leave approved successfully.");
      setPendingLeaves((prev) => prev.filter((l) => l.id !== id));
      setStats((prev) => ({ ...prev, pendingLeaves: Math.max(0, prev.pendingLeaves - 1) }));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to approve leave.");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-[#172033] tracking-tight">
            HR Operations Control
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Workforce directory, recruitment pipeline, and pending employee leave approvals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/hr/recruitment"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#111827] hover:bg-[#1f2937] transition-colors"
          >
            Manage ATS Pipeline
          </Link>
          <Link
            to="/admin/users"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#172033] bg-white border border-[#E5E7EB] hover:bg-[#F7F8FA] transition-colors"
          >
            Employee Directory
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Workforce",
            val: stats.activeEmployees,
            sub: "Active employees",
            icon: Users,
          },
          {
            label: "Open Job Postings",
            val: stats.openJobs,
            sub: "Live on careers board",
            icon: Briefcase,
          },
          {
            label: "Candidate Pipeline",
            val: stats.totalApplicants,
            sub: "In screening or interview",
            icon: TrendingUp,
          },
          {
            label: "Pending Leaves",
            val: stats.pendingLeaves,
            sub: "Awaiting review",
            icon: Clock,
            highlight: stats.pendingLeaves > 0,
          },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-5 min-h-[148px] flex flex-col justify-between shadow-xs transition-all hover:border-[#6558D9]/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#667085]">
                  {c.label}
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#F7F8FA] border border-[#E5E7EB] flex items-center justify-center text-[#667085]">
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-[28px] font-bold text-[#172033] tracking-tight tabular-nums my-1 leading-none">
                {c.val}
              </div>
              <p className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7]">{c.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Pending Leaves & Recent Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Leave Requests */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <h3 className="font-bold text-sm text-[#172033] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#6558D9]" /> Pending Leave Approvals
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {pendingLeaves.length} Requiring Review
            </span>
          </div>

          <div className="space-y-3">
            {pendingLeaves.map((l) => (
              <div
                key={l.id}
                className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="font-bold text-xs text-[#172033]">{l.employee_name}</h4>
                  <p className="text-[11px] text-[#667085] mt-0.5">
                    {l.leave_type_name} ({l.total_days} days) • {l.start_date} to {l.end_date}
                  </p>
                </div>
                <button
                  onClick={() => handleApproveLeave(l.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#111827] hover:bg-[#1f2937] transition-colors shrink-0"
                >
                  Approve
                </button>
              </div>
            ))}

            {pendingLeaves.length === 0 && (
              <p className="text-xs text-[#667085] text-center py-6">
                All employee leave requests are up to date.
              </p>
            )}
          </div>
        </div>

        {/* Recent Applicants */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <h3 className="font-bold text-sm text-[#172033] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#6558D9]" /> Active Candidate Pipeline
            </h3>
            <Link
              to="/hr/recruitment"
              className="text-xs font-semibold text-[#6558D9] hover:underline"
            >
              Open ATS Board &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {recentApplicants.map((app) => (
              <div
                key={app.id}
                className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="font-bold text-xs text-[#172033]">{app.candidate_name}</h4>
                  <p className="text-[11px] text-[#667085] mt-0.5">
                    {app.job_title} • Applied {app.applied_at ? app.applied_at.split("T")[0] : "Recently"}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-[#6558D9] border border-indigo-100">
                  {app.stage || "Screening"}
                </span>
              </div>
            ))}

            {recentApplicants.length === 0 && (
              <p className="text-xs text-[#667085] text-center py-6">
                No active applicants in queue.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
