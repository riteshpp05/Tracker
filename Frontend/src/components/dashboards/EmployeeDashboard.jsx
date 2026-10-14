import { useEffect, useState } from "react";
import {
  Clock,
  AlertCircle,
  TrendingUp,
  FolderKanban,
  Calendar,
  ArrowRight,
  Briefcase,
  FileCheck2,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import dashboardService from "../../services/dashboardService";
import timesheetService from "../../services/timesheetService";
import projectService from "../../services/projectService";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";

export function EmployeeDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    weeklyHours: 0,
    pendingTimesheets: 0,
    approvedTimesheets: 0,
    rejectedTimesheets: 0,
  });
  const [projects, setProjects] = useState([]);
  const [dailyHours, setDailyHours] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [projectBreakdown, setProjectBreakdown] = useState([]);

  const today = new Date();
  const todayStr = format(today, "EEEE, MMMM d, yyyy");
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const toIso = (d) => format(d, "yyyy-MM-dd");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [dashData, projData, entriesResp] = await Promise.all([
          dashboardService.getEmployeeDashboard().catch(() => ({
            weeklyHours: 0,
            pendingTimesheets: 0,
            approvedTimesheets: 0,
            rejectedTimesheets: 0,
          })),
          user?.id
            ? projectService.getAssignedProjectsForTimesheet(user.id).catch(() => ({ projects: [] }))
            : Promise.resolve({ projects: [] }),
          timesheetService
            .getEntriesByDateRange(toIso(weekStart), toIso(weekEnd))
            .catch(() => ({ entries: [] })),
        ]);

        setStats(dashData);
        const projList = projData.projects || [];
        setProjects(projList);

        // Process real entries
        const entries = entriesResp?.entries || [];
        const daysMap = [0, 0, 0, 0, 0, 0, 0];
        const projHoursMap = {};

        entries.forEach((e) => {
          const entryDate = (e.entry_date || "").split("T")[0];
          const rawMins = Number(e.hours_logged || e.total_hours || 0);
          const mins = rawMins > 0 && rawMins <= 24 ? rawMins * 60 : rawMins;

          // Find day index 0..6
          const dayIdx = weekDates.findIndex((wd) => toIso(wd) === entryDate);
          if (dayIdx >= 0) {
            daysMap[dayIdx] += mins / 60;
          }

          const pName = e.project_name || "General Work";
          projHoursMap[pName] = (projHoursMap[pName] || 0) + mins / 60;
        });

        setDailyHours(daysMap);

        const totalWeekH = Object.values(projHoursMap).reduce((a, b) => a + b, 0);
        const breakdown = Object.entries(projHoursMap).map(([name, h]) => ({
          name,
          hours: Math.round(h * 10) / 10,
          pct: totalWeekH > 0 ? Math.round((h / totalWeekH) * 100) : 0,
        }));
        setProjectBreakdown(breakdown);
      } catch (err) {
        console.error("Dashboard load error:", err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#6558D9] border-t-transparent" />
          <p className="text-[13px] text-[#667085]">Loading portal overview...</p>
        </div>
      </div>
    );
  }

  const todayIso = toIso(today);
  const todayIdx = weekDates.findIndex((wd) => toIso(wd) === todayIso);
  const todayHours = todayIdx >= 0 ? Math.round(dailyHours[todayIdx] * 10) / 10 : 0;
  const weeklyHoursTotal = Math.round(dailyHours.reduce((a, b) => a + b, 0) * 10) / 10;
  const weeklyProgress = Math.min((weeklyHoursTotal / 40) * 100, 100);

  const metricCards = [
    {
      label: "Today's Logged Hours",
      value: `${todayHours}h`,
      sub: todayHours >= 8 ? "Daily 8h target met" : `${Math.max(0, 8 - todayHours)}h remaining for target`,
      badge: todayHours >= 8 ? "On Track" : todayHours > 0 ? "In Progress" : "Not Logged",
      badgeColor:
        todayHours >= 8
          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
          : todayHours > 0
          ? "text-blue-700 bg-blue-50 border-blue-200"
          : "text-amber-700 bg-amber-50 border-amber-200",
      icon: Clock,
      iconBg: "bg-indigo-50 text-[#6558D9]",
    },
    {
      label: "Weekly Logged Hours",
      value: `${weeklyHoursTotal}h`,
      sub: `${Math.round(weeklyProgress)}% of 40h standard week`,
      badge: weeklyHoursTotal >= 40 ? "Goal Met" : `${Math.max(0, Math.round((40 - weeklyHoursTotal) * 10) / 10)}h left`,
      badgeColor:
        weeklyHoursTotal >= 40
          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
          : "text-amber-700 bg-amber-50 border-amber-200",
      icon: TrendingUp,
      iconBg: "bg-violet-50 text-[#6558D9]",
    },
    {
      label: "Assigned Projects",
      value: String(projects.length),
      sub: "Active deliverables in queue",
      badge: projects.length > 0 ? `${projects.length} Active` : "None",
      badgeColor:
        projects.length > 0
          ? "text-blue-700 bg-blue-50 border-blue-200"
          : "text-slate-600 bg-slate-50 border-slate-200",
      icon: FolderKanban,
      iconBg: "bg-blue-50 text-blue-600",
    },
    {
      label: "Pending Approvals",
      value: String(stats.pendingTimesheets),
      sub: "Submitted weeks in review",
      badge: stats.pendingTimesheets > 0 ? "Under Review" : "Up to date",
      badgeColor:
        stats.pendingTimesheets > 0
          ? "text-amber-700 bg-amber-50 border-amber-200"
          : "text-emerald-700 bg-emerald-50 border-emerald-200",
      icon: FileCheck2,
      iconBg: "bg-amber-50 text-amber-600",
    },
  ];

  const daysLabel = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxDayH = Math.max(...dailyHours, 8);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Refined Enterprise Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-[#172033] tracking-tight">
            {greeting}, {user?.first_name || user?.name?.split(" ")[0] || "Team Member"}
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            {todayStr} · Overview of your scheduled projects and timesheet submission
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/employee/timesheet"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#111827] hover:bg-[#1f2937] transition-colors shadow-xs"
          >
            <Clock className="w-4 h-4" />
            Enter Timesheet
          </Link>
        </div>
      </div>

      {/* 4 Clean Metric Cards — Symmetric layout & tabular numerals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-5 flex flex-col justify-between min-h-[148px] shadow-xs transition-all hover:border-[#6558D9]/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {card.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${card.badgeColor}`}
                  >
                    {card.badge}
                  </span>
                )}
              </div>
              <div className="my-2">
                <div className="text-[28px] font-bold text-[#172033] tracking-tight tabular-nums leading-none">
                  {card.value}
                </div>
                <div className="text-[12px] font-medium text-[#667085] mt-1.5">{card.label}</div>
              </div>
              <p className="text-[11px] text-[#667085] pt-2 border-t border-[#F2F4F7] flex items-center justify-between">
                <span>{card.sub}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Weekly Activity chart + Project Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Activity Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-[14px] font-bold text-[#172033]">Weekly Time Distribution</h3>
              <p className="text-[12px] text-[#667085]">
                {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[#667085]">Total:</span>
              <span className="text-[16px] font-bold text-[#172033] font-mono tabular-nums">
                {weeklyHoursTotal}h
              </span>
              <span className="text-[11px] text-[#98A2B3]">/ 40h target</span>
            </div>
          </div>

          {/* Bar Chart Container with Target Guideline */}
          <div className="relative h-44 pt-5 pb-1">
            {/* 8h Target Guideline */}
            <div className="absolute inset-x-0 top-9 flex items-center gap-2 pointer-events-none">
              <div className="flex-1 border-b border-dashed border-[#E5E7EB]" />
              <span className="text-[10px] font-medium text-[#98A2B3] tracking-wide shrink-0">
                8h target
              </span>
            </div>
            {/* 4h Half-day Guideline */}
            <div className="absolute inset-x-0 top-[58%] flex items-center gap-2 pointer-events-none">
              <div className="flex-1 border-b border-dashed border-[#F2F4F7]" />
              <span className="text-[10px] font-medium text-[#D0D5DD] tracking-wide shrink-0">
                4h
              </span>
            </div>

            {/* Columns */}
            <div className="relative z-10 flex items-end justify-between gap-2.5 h-full">
              {weekDates.map((dayDate, i) => {
                const h = dailyHours[i] || 0;
                const scaleMax = Math.max(maxDayH, 10);
                const heightPct = Math.min((h / scaleMax) * 100, 100);
                const isWeekend = i >= 5;
                const isCurrentDay = isSameDay(dayDate, today);

                return (
                  <div
                    key={i}
                    className={`flex-1 flex flex-col items-center h-full rounded-xl transition-all ${
                      isCurrentDay
                        ? "bg-[#EEEDFB]/50 border border-[#6558D9]/25 p-1 pb-1"
                        : "hover:bg-[#F7F8FA] p-1 pb-1 border border-transparent"
                    }`}
                  >
                    {/* Hour badge / label */}
                    <span className="text-[10px] font-mono font-semibold h-4 flex items-center">
                      {h > 0 ? (
                        <span className={isCurrentDay ? "text-[#6558D9]" : "text-[#172033]"}>
                          {Math.round(h * 10) / 10}h
                        </span>
                      ) : (
                        <span className="text-transparent">-</span>
                      )}
                    </span>

                    {/* Bar track and fill */}
                    <div className="w-full flex-1 flex items-end justify-center px-1">
                      <div className="w-full max-w-[32px] h-full flex items-end">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            h > 0
                              ? isCurrentDay
                                ? "bg-[#6558D9] shadow-xs"
                                : "bg-[#111827]"
                              : isWeekend
                              ? "bg-[#F2F4F7] h-2"
                              : "bg-[#E5E7EB] h-2"
                          }`}
                          style={{
                            height: h > 0 ? `${Math.max(heightPct, 10)}%` : undefined,
                          }}
                        />
                      </div>
                    </div>

                    {/* Day label */}
                    <div className="text-center mt-2 pt-1 border-t border-[#F2F4F7] w-full">
                      <div
                        className={`text-[11px] font-semibold ${
                          isCurrentDay ? "text-[#6558D9]" : "text-[#172033]"
                        }`}
                      >
                        {daysLabel[i]}
                      </div>
                      <div className="text-[10px] text-[#667085]">
                        {format(dayDate, "d")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clean Legend */}
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#6558D9]" />
              <span className="text-[11px] font-medium text-[#667085]">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#111827]" />
              <span className="text-[11px] font-medium text-[#667085]">Logged Hours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#E5E7EB]" />
              <span className="text-[11px] font-medium text-[#667085]">Empty / Weekend</span>
            </div>
          </div>
        </div>

        {/* Project Breakdown & Shortcuts */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-[#172033] mb-1">Project Allocation</h3>
            <p className="text-[12px] text-[#667085] mb-4">
              Hours logged this week across client deliverables
            </p>

            {projectBreakdown.length > 0 ? (
              <div className="space-y-3.5">
                {projectBreakdown.map((proj) => (
                  <div key={proj.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-[#172033] truncate max-w-[150px]">
                        {proj.name}
                      </span>
                      <span className="text-[#667085] font-mono">
                        {proj.hours}h ({proj.pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#F7F8FA] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#6558D9] rounded-full"
                        style={{ width: `${proj.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-7 px-4 border border-dashed border-[#E5E7EB] rounded-xl bg-[#F7F8FA]/50">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center mx-auto mb-2 text-[#98A2B3] shadow-xs">
                  <Briefcase className="w-4 h-4" />
                </div>
                <p className="text-[12px] font-medium text-[#172033]">No hours logged yet this week</p>
                <p className="text-[11px] text-[#667085] mt-0.5">Submit entries to see distribution</p>
                <Link
                  to="/employee/timesheet"
                  className="text-[12px] text-[#6558D9] font-semibold hover:underline mt-2 inline-flex items-center gap-1"
                >
                  Create entry <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#E5E7EB] space-y-2">
            <Link
              to="/employee/timesheet"
              className="group flex items-center justify-between p-2.5 rounded-xl border border-[#E5E7EB] hover:border-[#6558D9]/30 hover:bg-[#F7F8FA] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#6558D9] flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#172033] group-hover:text-[#6558D9] transition-colors leading-tight">
                    Weekly Timesheet
                  </div>
                  <div className="text-[11px] text-[#667085] leading-tight mt-0.5">
                    Log and submit hours
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#6558D9] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/employee/my-tickets"
              className="group flex items-center justify-between p-2.5 rounded-xl border border-[#E5E7EB] hover:border-[#6558D9]/30 hover:bg-[#F7F8FA] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#172033] group-hover:text-[#6558D9] transition-colors leading-tight">
                    Assigned Tickets &amp; Tasks
                  </div>
                  <div className="text-[11px] text-[#667085] leading-tight mt-0.5">
                    Track sprint backlog items
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#6558D9] group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              to="/employee/leaves"
              className="group flex items-center justify-between p-2.5 rounded-xl border border-[#E5E7EB] hover:border-[#6558D9]/30 hover:bg-[#F7F8FA] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#172033] group-hover:text-[#6558D9] transition-colors leading-tight">
                    Request Time Off
                  </div>
                  <div className="text-[11px] text-[#667085] leading-tight mt-0.5">
                    Submit leave or vacation
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#6558D9] group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
