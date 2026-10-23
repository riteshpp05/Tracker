import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Plus,
  Trash2,
  Send,
  Pencil,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Clock,
  Briefcase,
  Layers,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import timesheetService from "../../services/timesheetService";
import projectService from "../../services/projectService";
import ticketService from "../../services/ticketService";
import taskService from "../../services/taskService";
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";

// ============================================
// TIME UTILITIES
// ============================================
const hhmmToMinutes = (value) => {
  if (!value) return null;
  const str = String(value).trim();
  if (!str.includes(":")) return null;
  const [hStr, mStr] = str.split(":");
  const hours = Number(hStr);
  const minutes = Number(mStr);
  if (isNaN(hours) || isNaN(minutes)) return null;
  if (minutes < 0 || minutes >= 60) return null;
  return hours * 60 + minutes;
};

const normalizeToMinutes = (val) => {
  if (!val) return 0;
  const num = Number(val);
  if (isNaN(num) || num <= 0) return 0;
  // If value <= 24, it was stored in decimal hours (e.g. 8.00) -> convert to minutes (8 * 60 = 480)
  // If value > 24, it is already stored in minutes (e.g. 480)
  return num <= 24 ? Math.round(num * 60) : Math.round(num);
};

const minutesToHHMM = (val) => {
  if (val === null || val === undefined) return "0:00";
  const totalMinutes = normalizeToMinutes(val);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
};

const minutesToDisplayHours = (val) => {
  const totalMinutes = normalizeToMinutes(val);
  if (totalMinutes === 0) return "0h";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const getHHMMError = (value, maxMinutes = 1440) => {
  if (!value || value.trim() === "") return "Time is required";
  const str = String(value).trim();
  if (!str.includes(":")) return "Invalid format. Use HH:MM";
  const [hStr, mStr] = str.split(":");
  const hours = Number(hStr);
  const minutes = Number(mStr);
  if (isNaN(hours) || isNaN(minutes)) return "Invalid time format";
  if (minutes < 0 || minutes >= 60) return "Minutes must be between 0 and 59";
  if (hours < 0) return "Hours cannot be negative";
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes === 0) return "Time must be greater than 0";
  if (totalMinutes > maxMinutes) return "Maximum 24h allowed";
  return null;
};

// ============================================
// CONSTANTS & HELPERS
// ============================================
const MAX_ENTRY_MINUTES = 24 * 60;
const MAX_DAILY_MINUTES = 24 * 60;
const MIN_DAILY_MINUTES = 8 * 60;
const SELECTED_DATE_KEY = "shende_timesheet_selected_date";

const STATUS_MAP = {
  1: "Draft",
  2: "Submitted",
  3: "Manager_Approved",
  4: "Manager_Rejected",
  5: "Locked",
  6: "Admin_Approved",
  7: "Admin_Rejected",
  8: "Partially_Approved",
};

function getStatusName(status) {
  if (typeof status === "string") return status;
  if (typeof status === "number") return STATUS_MAP[status] || "Unknown";
  return "Unknown";
}

function toIso(date) {
  if (typeof date === "string") return date.split("T")[0];
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekDatesFrom(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = addDays(start, 6);
  return { start, end, dates };
}

const getUser = () => {
  try {
    const userData = localStorage.getItem("user");
    if (userData) return JSON.parse(userData);
  } catch (error) {
    console.error("Failed to get user:", error);
  }
  return null;
};

export function EmployeeTimesheetEntry() {
  const [projects, setProjects] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [viewMode, setViewMode] = useState("weekly"); // 'weekly' | 'daily'

  const [selectedDay, setSelectedDay] = useState(() => {
    const saved = sessionStorage.getItem(SELECTED_DATE_KEY);
    return saved ? new Date(saved) : new Date();
  });

  const {
    dates: weekDates,
    start: weekStart,
    end: weekEnd,
  } = useMemo(() => getWeekDatesFrom(selectedDay), [selectedDay]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const [form, setForm] = useState({
    projectId: "",
    ticketId: "",
    taskId: "",
    ticketNumber: "",
    description: "",
    hours: "",
  });
  const [errors, setErrors] = useState({ hours: "" });

  const user = getUser();

  useEffect(() => {
    sessionStorage.setItem(SELECTED_DATE_KEY, selectedDay.toISOString());
  }, [selectedDay]);

  const weekKey = useMemo(
    () => `${toIso(weekStart)}_${toIso(weekEnd)}`,
    [weekStart, weekEnd],
  );

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map = {};
    weekDates.forEach((d) => {
      map[toIso(d)] = [];
    });
    entries.forEach((e) => {
      const d = e.entry_date?.split("T")[0] || e.entry_date;
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return map;
  }, [entries, weekDates]);

  // Daily totals in minutes
  const dailyTotals = useMemo(() => {
    const totals = {};
    weekDates.forEach((d) => {
      const iso = toIso(d);
      const dayEntries = entriesByDate[iso] || [];
      totals[iso] = dayEntries.reduce(
        (sum, e) => sum + normalizeToMinutes(e.hours_logged ?? e.total_hours ?? 0),
        0,
      );
    });
    return totals;
  }, [entriesByDate, weekDates]);

  const weekTotalMinutes = useMemo(
    () => entries.reduce((sum, e) => sum + normalizeToMinutes(e.hours_logged ?? e.total_hours ?? 0), 0),
    [entries],
  );

  const selectedDayIso = toIso(selectedDay);
  const entriesForSelectedDay = entriesByDate[selectedDayIso] || [];

  // Submit validation: Mon-Sat 8-24h each
  const isWeekValidForSubmit = useMemo(() => {
    if (entries.length === 0) return false;
    const weekdays = weekDates.filter((d) => d.getDay() !== 0);
    return weekdays.every((d) => {
      const mins = dailyTotals[toIso(d)] || 0;
      return mins >= MIN_DAILY_MINUTES && mins <= MAX_DAILY_MINUTES;
    });
  }, [entries, weekDates, dailyTotals]);

  const isWeekSubmitted = useMemo(() => {
    if (entries.length === 0) return false;
    return entries
      .map((e) => getStatusName(e.status))
      .every(
        (s) =>
          !["Draft", "Locked", "Saved", "Manager_Rejected", "Admin_Rejected"].includes(s),
      );
  }, [entries]);

  const isCurrentWeek = useMemo(() => {
    const nowStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return isSameDay(nowStart, weekStart);
  }, [weekStart]);

  // Load entries for current week
  const loadEntries = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const [projData, entriesResp] = await Promise.all([
        projectService.getAssignedProjectsForTimesheet(user.id),
        timesheetService.getEntriesByDateRange(toIso(weekStart), toIso(weekEnd)),
      ]);

      setProjects(projData.projects || []);

      const loadedEntries = (entriesResp?.entries ?? []).map((entry) => ({
        ...entry,
        id: entry.id || entry.entry_id,
        entry_id: entry.entry_id || entry.id,
        entry_date: entry.entry_date.split("T")[0],
        ticket_name: entry.ticket_name || entry.activity_name,
        task_name: entry.task_name,
        hours_logged: normalizeToMinutes(entry.hours_logged ?? entry.total_hours ?? 0),
        billable_hours: normalizeToMinutes(entry.billable_hours),
        non_billable_hours: normalizeToMinutes(entry.non_billable_hours),
      }));
      setEntries(loadedEntries);
    } catch (err) {
      console.error("Load error:", err);
      toast.error("Failed to load timesheet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [weekKey]);

  useEffect(() => {
    if (form.projectId) {
      ticketService
        .getAssignedTicketsForTimesheet(form.projectId, toIso(selectedDay))
        .then((data) => {
          const list = data.tickets || [];
          setTickets(list);
          if (list.length > 0 && !form.ticketId) {
            const first = list[0];
            const tId = String(first.id || first.ticket_id);
            const tNum = first.zoho_crm_code || first.ticket_number || "";
            setForm((prev) => ({
              ...prev,
              ticketId: tId,
              ticketNumber: tNum,
            }));
          }
        })
        .catch(() => setTickets([]));
    }
  }, [selectedDay, form.projectId]);

  useEffect(() => {
    async function fetchTasks() {
      const dept = user?.departmentId || user?.department_id || user?.department;
      if (form.projectId) {
        try {
          let data = null;
          if (dept) {
            data = await taskService.getTasksByDepartmentAndProject(
              dept,
              form.projectId,
            );
          }
          if (data?.tasks && data.tasks.length > 0) {
            setTasks(data.tasks);
            if (!form.taskId) {
              setForm((prev) => ({
                ...prev,
                taskId: String(data.tasks[0].task_id || data.tasks[0].id),
              }));
            }
          } else {
            const all = await taskService.getAllTasks();
            const list = all?.tasks || [];
            setTasks(list);
            if (!form.taskId && list.length > 0) {
              setForm((prev) => ({
                ...prev,
                taskId: String(list[0].task_id || list[0].id),
              }));
            }
          }
        } catch {
          try {
            const all = await taskService.getAllTasks();
            setTasks(all?.tasks || []);
          } catch {
            setTasks([]);
          }
        }
      } else {
        setTasks([]);
      }
    }
    fetchTasks();
  }, [form.projectId]);

  const handlePrevWeek = () => {
    setSelectedDay((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setSelectedDay((prev) => addWeeks(prev, 1));
  };

  const handleCurrentWeek = () => {
    setSelectedDay(new Date());
  };

  const handleOpenAdd = (day) => {
    if (day) setSelectedDay(day);
    setEditingEntry(null);
    setForm({
      projectId: projects[0]?.id || projects[0]?.project_id || "",
      ticketId: "",
      taskId: "",
      ticketNumber: "",
      description: "",
      hours: "08:00",
    });
    setErrors({ hours: "" });
    setDialogOpen(true);
  };

  const handleOpenEdit = (entry) => {
    setEditingEntry(entry);
    setForm({
      projectId: entry.project_id || entry.projectId || "",
      ticketId: entry.ticket_id || entry.ticketId || "",
      taskId: entry.task_id || entry.taskId || "",
      ticketNumber: entry.ticket_number || entry.ticketNumber || "",
      description: entry.description || "",
      hours: minutesToHHMM(entry.hours_logged || entry.total_hours),
    });
    setErrors({ hours: "" });
    setDialogOpen(true);
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    const hrErr = getHHMMError(form.hours, MAX_ENTRY_MINUTES);
    if (hrErr) {
      setErrors({ hours: hrErr });
      return;
    }
    const minutes = hhmmToMinutes(form.hours);

    try {
      setSubmitting(true);
      const entryData = {
        projectId: form.projectId,
        ticketId: form.ticketId || null,
        taskId: form.taskId || null,
        ticketNumber: form.ticketNumber || null,
        entryDate: selectedDayIso,
        hoursLogged: minutes,
        description: form.description,
        billable: true,
      };

      if (editingEntry) {
        await timesheetService.updateTimesheetEntry(editingEntry.id, entryData);
        toast.success("Timesheet entry updated");
      } else {
        await timesheetService.createTimesheetEntry(entryData);
        toast.success("Timesheet entry created");
      }

      setDialogOpen(false);
      loadEntries();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm("Delete this timesheet entry?")) return;
    try {
      await timesheetService.deleteTimesheetEntry(id);
      toast.success("Entry deleted");
      loadEntries();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to delete entry");
    }
  };

  const handleSubmitWeek = async () => {
    try {
      setSubmitting(true);
      await timesheetService.submitWeek(toIso(weekStart), toIso(weekEnd));
      toast.success("Weekly timesheet submitted successfully");
      setConfirmDialogOpen(false);
      loadEntries();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to submit timesheet");
    } finally {
      setSubmitting(false);
    }
  };

  const getDayEmoji = (project) => {
    const p = (project || "").toLowerCase();
    if (p.includes("bench")) return "🪑";
    if (p.includes("learn")) return "📘";
    if (p.includes("internal")) return "⚙️";
    return "💼";
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header: Title + Weekly/Daily Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-[#172033] tracking-tight">
            Timesheet
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Track your work hours
          </p>
        </div>

        {/* View Mode Pill Toggle */}
        <div className="inline-flex items-center p-1 bg-[#F7F8FA] border border-[#E5E7EB] rounded-full self-start sm:self-auto">
          <button
            onClick={() => setViewMode("weekly")}
            className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
              viewMode === "weekly"
                ? "bg-white text-[#172033] shadow-xs"
                : "text-[#667085] hover:text-[#172033]"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setViewMode("daily")}
            className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
              viewMode === "daily"
                ? "bg-white text-[#172033] shadow-xs"
                : "text-[#667085] hover:text-[#172033]"
            }`}
          >
            Daily
          </button>
        </div>
      </div>

      {/* Week Navigator Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-between shadow-xs">
        <button
          onClick={handlePrevWeek}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[#667085] hover:text-[#172033] px-3 py-1.5 rounded-lg hover:bg-[#F7F8FA] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev week
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-[#172033]">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </span>
          {isCurrentWeek ? (
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[#6558D9] text-[11px] font-semibold">
              Current week
            </span>
          ) : (
            <button
              onClick={handleCurrentWeek}
              className="text-[11px] text-[#6558D9] hover:underline"
            >
              Go to current week
            </button>
          )}
        </div>

        <button
          onClick={handleNextWeek}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[#667085] hover:text-[#172033] px-3 py-1.5 rounded-lg hover:bg-[#F7F8FA] transition-colors"
        >
          Next week
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── 7-DAY HORIZONTAL CALENDAR GRID ── Matches Cloudstine Reference ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
        {weekDates.map((day) => {
          const iso = toIso(day);
          const dayName = format(day, "EEE");
          const dayNum = format(day, "d");
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const dayEntries = entriesByDate[iso] || [];
          const totalMins = dailyTotals[iso] || 0;
          const isSelected = isSameDay(day, selectedDay);
          const isMissing = !isWeekend && totalMins === 0;

          return (
            <div
              key={iso}
              onClick={() => setSelectedDay(day)}
              className={`cursor-pointer bg-white rounded-2xl border transition-all p-3.5 flex flex-col justify-between min-h-[175px] ${
                isSelected
                  ? "border-[#6558D9] ring-2 ring-[#6558D9]/20 shadow-xs"
                  : "border-[#E5E7EB] hover:border-[#6558D9]/50 hover:bg-[#F7F8FA]/50"
              }`}
            >
              {/* Day Header */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[12px] font-semibold text-[#667085] block">
                      {dayName}
                    </span>
                    <span className="text-[22px] font-bold text-[#172033] leading-tight block">
                      {dayNum}
                    </span>
                  </div>
                  {isWeekend && (
                    <span className="px-2 py-0.5 rounded-full bg-[#F7F8FA] text-[#667085] text-[10px] font-semibold border border-[#E5E7EB]">
                      Day off
                    </span>
                  )}
                </div>

                {/* Day content badges */}
                <div className="mt-3 space-y-1.5">
                  {isWeekend && dayEntries.length === 0 ? (
                    <p className="text-[11px] text-[#667085] mt-4">Day off</p>
                  ) : isMissing ? (
                    <div className="pt-2">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-semibold">
                        Missing Log
                      </span>
                    </div>
                  ) : (
                    dayEntries.map((e, idx) => (
                      <div
                        key={e.id || e.entry_id || `${iso}-${idx}`}
                        className="px-2 py-1 rounded-lg bg-indigo-50/70 border border-indigo-100/80 text-[11px] font-medium text-[#172033] flex items-center justify-between gap-1 truncate"
                        title={`${e.project_name || "Project"} - ${e.ticket_name || e.description || ""}`}
                      >
                        <span className="truncate flex items-center gap-1">
                          <span>{getDayEmoji(e.project_name)}</span>
                          <span className="truncate">{e.project_name || "Work"}</span>
                        </span>
                        <span className="text-[10px] text-[#6558D9] font-bold shrink-0">
                          {minutesToDisplayHours(e.hours_logged || e.total_hours)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Day Footer total */}
              <div className="pt-3 mt-2 border-t border-[#F7F8FA] flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#172033]">
                  {totalMins > 0 ? minutesToDisplayHours(totalMins) : ""}
                </span>
                {!isWeekSubmitted && (
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleOpenAdd(day);
                    }}
                    className="w-5 h-5 rounded-full hover:bg-indigo-50 text-[#667085] hover:text-[#6558D9] flex items-center justify-center text-[12px] font-bold"
                    title={`Add entry for ${dayName} ${dayNum}`}
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── WEEK TOTAL & ACTION BAR ── */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        {/* Left: Week Total + 7 bar indicators */}
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[11px] text-[#667085] font-semibold uppercase tracking-wider block">
              Week total
            </span>
            <span className="text-[24px] font-bold text-[#172033] leading-tight">
              {minutesToDisplayHours(weekTotalMinutes)}
            </span>
          </div>

          {/* 7 mini indicator dots for M T W T F S S */}
          <div className="flex items-center gap-1.5 pl-4 border-l border-[#E5E7EB]">
            {weekDates.map((d, i) => {
              const iso = toIso(d);
              const hasHours = (dailyTotals[iso] || 0) >= MIN_DAILY_MINUTES;
              const isWknd = d.getDay() === 0 || d.getDay() === 6;
              const dayLetters = ["M", "T", "W", "T", "F", "S", "S"];
              return (
                <div key={iso} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-2.5 h-6 rounded-full transition-all ${
                      hasHours
                        ? "bg-[#111827]"
                        : isWknd
                        ? "bg-[#E5E7EB]"
                        : "bg-rose-200"
                    }`}
                  />
                  <span className="text-[9px] font-bold text-[#667085]">
                    {dayLetters[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right actions: Log entry + Submit */}
        <div className="flex items-center gap-3">
          {!isWeekSubmitted && (
            <Button
              onClick={() => handleOpenAdd(selectedDay)}
              className="bg-[#111827] hover:bg-[#1f2937] text-white text-[13px] font-semibold rounded-xl h-10 px-4 gap-2"
            >
              <Plus className="w-4 h-4" />
              Log Hours
            </Button>
          )}

          {!isWeekSubmitted ? (
            <Button
              onClick={() => setConfirmDialogOpen(true)}
              disabled={!isWeekValidForSubmit || submitting}
              className="bg-[#6558D9] hover:bg-[#5248e3] text-white text-[13px] font-semibold rounded-xl h-10 px-4 gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Submit Week
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-semibold">
              <CheckCircle className="w-4 h-4" />
              Week Submitted
            </div>
          )}
        </div>
      </div>

      {/* ── SELECTED DAY DETAIL TABLE ── */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <div>
            <h3 className="text-[15px] font-bold text-[#172033]">
              Entries for {format(selectedDay, "EEEE, MMMM d, yyyy")}
            </h3>
            <p className="text-[12px] text-[#667085]">
              {entriesForSelectedDay.length} {entriesForSelectedDay.length === 1 ? "entry" : "entries"} ·{" "}
              {minutesToDisplayHours(dailyTotals[selectedDayIso] || 0)} total
            </p>
          </div>

          {!isWeekSubmitted && (
            <button
              onClick={() => handleOpenAdd(selectedDay)}
              className="text-[12px] font-semibold text-[#6558D9] hover:text-indigo-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add entry for today
            </button>
          )}
        </div>

        {entriesForSelectedDay.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-[13px] text-[#667085]">No hours logged for this date.</p>
            {!isWeekSubmitted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAdd(selectedDay)}
                className="text-[12px] rounded-lg"
              >
                Log Entry
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[#667085] text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Task / Ticket</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {entriesForSelectedDay.map((e, idx) => (
                  <tr key={e.id || e.entry_id || `entry-${idx}`} className="hover:bg-[#F7F8FA] transition-colors">
                    <td className="py-3 px-3 font-semibold text-[#172033]">
                      <div className="flex items-center gap-2">
                        <span>{getDayEmoji(e.project_name)}</span>
                        <span>{e.project_name || "General"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#667085]">
                      {e.ticket_name || e.task_name || "—"}
                    </td>
                    <td className="py-3 px-3 text-[#667085] max-w-xs truncate">
                      {e.description || "—"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#172033]">
                      {minutesToDisplayHours(e.hours_logged || e.total_hours)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                        {getStatusName(e.status)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {!isWeekSubmitted && (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(e)}
                            className="p-1 rounded hover:bg-gray-100 text-[#667085]"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(e.id)}
                            className="p-1 rounded hover:bg-red-50 text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      {/* Critical Lenis scroll rule: data-lenis-prevent="true" added to modal content */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-lenis-prevent="true"
          className="bg-white border-[#E5E7EB] rounded-2xl max-w-md p-6"
        >
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold text-[#172033]">
              {editingEntry ? "Edit Timesheet Entry" : "Log Work Hours"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEntry} className="space-y-4 pt-2">
            {/* Date Indicator */}
            <div className="p-2.5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] text-[12px] font-semibold text-[#172033] flex items-center justify-between">
              <span>Date:</span>
              <span>{format(selectedDay, "EEEE, MMMM d, yyyy")}</span>
            </div>

            {/* Project Select */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-[#172033] block">
                Project *
              </label>
              <Select
                value={form.projectId}
                onValueChange={(val) => setForm((prev) => ({ ...prev, projectId: val }))}
              >
                <SelectTrigger className="h-9 text-[13px] bg-white border-[#E5E7EB]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent data-lenis-prevent="true">
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ticket Select */}
            {tickets.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#172033] block">
                  Assigned Ticket
                </label>
                <Select
                  value={String(form.ticketId || "")}
                  onValueChange={(val) => {
                    const selected = tickets.find(
                      (t) => String(t.id || t.ticket_id) === String(val)
                    );
                    setForm((prev) => ({
                      ...prev,
                      ticketId: val,
                      ticketNumber:
                        selected?.zoho_crm_code || selected?.ticket_number || "",
                    }));
                  }}
                >
                  <SelectTrigger className="h-9 text-[13px] bg-white border-[#E5E7EB]">
                    <SelectValue placeholder="Select ticket" />
                  </SelectTrigger>
                  <SelectContent data-lenis-prevent="true">
                    {tickets.map((t) => {
                      const tId = String(t.id || t.ticket_id);
                      const tName = t.title || t.ticket_name;
                      const tNum = t.zoho_crm_code || t.ticket_number;
                      return (
                        <SelectItem key={tId} value={tId}>
                          {tNum ? `#${tNum}: ` : ""}
                          {tName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Task Select */}
            {tasks.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#172033] block">
                  Task *
                </label>
                <Select
                  value={String(form.taskId || "")}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, taskId: val }))}
                >
                  <SelectTrigger className="h-9 text-[13px] bg-white border-[#E5E7EB]">
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>
                  <SelectContent data-lenis-prevent="true">
                    {tasks.map((tsk) => {
                      const tskId = String(tsk.task_id || tsk.id);
                      const tskName = tsk.task_name || tsk.name || tsk.title;
                      return (
                        <SelectItem key={tskId} value={tskId}>
                          {tskName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Time field (HH:MM) */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-[#172033] block">
                Time (HH:MM) *
              </label>
              <Input
                type="text"
                placeholder="08:00"
                value={form.hours}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, hours: e.target.value }));
                  setErrors({ hours: "" });
                }}
                className={`h-9 text-[13px] bg-white border-[#E5E7EB] ${
                  errors.hours ? "border-red-500" : ""
                }`}
                required
              />
              {errors.hours && (
                <p className="text-[11px] text-red-500">{errors.hours}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-[#172033] block">
                Work Summary *
              </label>
              <Textarea
                placeholder="Briefly describe what you worked on..."
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="text-[13px] bg-white border-[#E5E7EB] min-h-[80px]"
                required
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="text-[13px] rounded-xl h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#111827] hover:bg-[#1f2937] text-white text-[13px] rounded-xl h-9"
              >
                {submitting ? "Saving..." : editingEntry ? "Save Changes" : "Log Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── SUBMIT CONFIRMATION DIALOG ── */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent data-lenis-prevent="true" className="bg-white rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[16px] font-bold text-[#172033]">
              Submit Weekly Timesheet?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-[#667085]">
              You have logged {minutesToDisplayHours(weekTotalMinutes)} across 6 mandatory workdays.
              Once submitted, your timesheet will be locked and routed to your manager for approval.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-[13px] rounded-xl h-9">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitWeek}
              disabled={submitting}
              className="bg-[#6558D9] hover:bg-[#5248e3] text-white text-[13px] rounded-xl h-9"
            >
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default EmployeeTimesheetEntry;
