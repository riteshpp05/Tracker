// Frontend/src/components/attendance/AttendanceDashboard.jsx
import React, { useState, useEffect } from "react";
import {
  Clock,
  MapPin,
  CheckCircle2,
  Coffee,
  Calendar,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  History,
  Send,
  Timer,
  Navigation,
  Laptop,
  Building2,
  X
} from "lucide-react";
import enterpriseService from "../../services/enterpriseService";
import { toast } from "sonner";

export const AttendanceDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [todayData, setTodayData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("detecting"); // detecting, granted, denied
  const [geofences, setGeofences] = useState([]);
  const [nearestOffice, setNearestOffice] = useState(null);

  // Regularization modal state
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regForm, setRegForm] = useState({
    attendanceDate: new Date().toISOString().split("T")[0],
    requestedCheckIn: "09:30",
    requestedCheckOut: "18:30",
    reason: "",
  });

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial data & location
  useEffect(() => {
    fetchInitialData();
    detectGeolocation();
  }, []);

  const detectGeolocation = () => {
    setLocationStatus("detecting");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(coords);
          setLocationStatus("granted");
        },
        (error) => {
          console.warn("Geolocation denied or unavailable:", error.message);
          setLocationStatus("denied");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    } else {
      setLocationStatus("denied");
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [todayRes, historyRes, geofenceRes] = await Promise.all([
        enterpriseService.getTodayStatus(),
        enterpriseService.getMyAttendanceHistory(),
        enterpriseService.getGeofences(),
      ]);

      if (todayRes.success) setTodayData(todayRes.data);
      if (historyRes.success) setHistoryData(historyRes.data);
      if (geofenceRes.success) setGeofences(geofenceRes.data);
    } catch (err) {
      console.error("Failed to load attendance info:", err);
      toast.error("Failed to load attendance details");
    } finally {
      setLoading(false);
    }
  };

  // Compute nearest office distance on location change
  useEffect(() => {
    if (userLocation && geofences.length > 0) {
      let closest = null;
      let minDistance = Infinity;

      geofences.forEach((geo) => {
        const d = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          parseFloat(geo.latitude),
          parseFloat(geo.longitude)
        );
        if (d < minDistance) {
          minDistance = d;
          closest = { ...geo, distanceMeters: Math.round(d) };
        }
      });
      setNearestOffice(closest);
    }
  }, [userLocation, geofences]);

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) *
        Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Punch actions
  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await enterpriseService.checkIn(userLocation);
      if (res.success) {
        toast.success(res.message || "Checked in successfully!");
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to check in");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm("Are you sure you want to Check Out for today?")) return;
    setActionLoading(true);
    try {
      const res = await enterpriseService.checkOut(userLocation);
      if (res.success) {
        toast.success(res.message || "Checked out successfully!");
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to check out");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async (breakType) => {
    setActionLoading(true);
    try {
      const res = await enterpriseService.startBreak(breakType);
      if (res.success) {
        toast.success(`Started ${breakType.toLowerCase()} break`);
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start break");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setActionLoading(true);
    try {
      const res = await enterpriseService.endBreak();
      if (res.success) {
        toast.success("Break ended. Resumed work timer.");
        fetchInitialData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to end break");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegularizationSubmit = async (e) => {
    e.preventDefault();
    if (!regForm.reason.trim()) {
      toast.error("Please provide a reason for regularization");
      return;
    }
    setActionLoading(true);
    try {
      const res = await enterpriseService.requestRegularization({
        ...regForm,
        punchDate: regForm.attendanceDate,
      });
      if (res.success) {
        toast.success("Regularization request submitted to HR");
        setIsRegModalOpen(false);
        setRegForm({
          attendanceDate: new Date().toISOString().split("T")[0],
          requestedCheckIn: "09:30",
          requestedCheckOut: "18:30",
          reason: "",
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit request");
    } finally {
      setActionLoading(false);
    }
  };

  const isCheckedIn = !!todayData?.hasCheckedIn;
  const isCheckedOut = !!todayData?.hasCheckedOut;
  const isOnBreak = !!todayData?.isOnBreak;

  const formatHoursMins = (minutes) => {
    if (!minutes && minutes !== 0) return "--";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-7 h-7 text-[#6558D9]" />
            Attendance & Punch Desk
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time geolocation-verified daily punch clock, break tracking, and monthly attendance logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRegModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
          >
            <History className="w-4 h-4 text-slate-500" />
            Request Regularization
          </button>
        </div>
      </div>

      {/* Hero Punch Clock & Geofence Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Punch Clock Action Box */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Official Working Hours: 09:30 AM – 06:30 PM IST
              </span>
              <div className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight mt-1">
                {currentTime.toLocaleTimeString("en-IN", { hour12: true })}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                {currentTime.toLocaleDateString("en-IN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>

            {/* Geolocation Status Pill */}
            <div className="flex flex-col items-start sm:items-end gap-1.5">
              {locationStatus === "detecting" && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  <Navigation className="w-3.5 h-3.5 animate-spin" />
                  Detecting Geolocation...
                </div>
              )}
              {locationStatus === "granted" && nearestOffice && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    nearestOffice.distanceMeters <= nearestOffice.radius_meters
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {nearestOffice.distanceMeters <= nearestOffice.radius_meters ? (
                    <span>In Geofence: {nearestOffice.name}</span>
                  ) : (
                    <span>Remote / External ({nearestOffice.distanceMeters}m to {nearestOffice.name})</span>
                  )}
                </div>
              )}
              {locationStatus === "denied" && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  <Laptop className="w-3.5 h-3.5 text-slate-500" />
                  <span>Remote Work Mode (Location Denied)</span>
                </div>
              )}
              <span className="text-xs text-slate-400">
                Lat: {userLocation?.latitude?.toFixed(4) || "--"} | Lon: {userLocation?.longitude?.toFixed(4) || "--"}
              </span>
            </div>
          </div>

          {/* Interactive Punch & Break Controls */}
          <div className="py-6 flex flex-wrap items-center gap-4">
            {!isCheckedIn ? (
              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#6558D9] hover:bg-[#5245c4] text-white text-base font-semibold rounded-xl shadow-md transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                {actionLoading ? "Recording Punch..." : "Web Check-In"}
              </button>
            ) : isCheckedOut ? (
              <div className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium border border-slate-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Daily Shift Completed & Logged
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleCheckOut}
                  disabled={actionLoading || isOnBreak}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {actionLoading ? "Processing..." : "Web Check-Out"}
                </button>

                {/* Break Controls */}
                {!isOnBreak ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartBreak("TEA")}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition text-sm"
                    >
                      <Coffee className="w-4 h-4 text-amber-600" />
                      Tea Break
                    </button>
                    <button
                      onClick={() => handleStartBreak("LUNCH")}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition text-sm"
                    >
                      <Coffee className="w-4 h-4 text-orange-600" />
                      Lunch Break
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleEndBreak}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl shadow-sm transition animate-pulse"
                  >
                    <Timer className="w-5 h-5" />
                    End Active {todayData?.activeBreak?.break_type} Break
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
            <div>
              <span className="text-xs text-slate-500 block">Check In</span>
              <span className="text-sm font-semibold text-slate-800">
                {todayData?.checkInTime
                  ? new Date(todayData.checkInTime).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Check Out</span>
              <span className="text-sm font-semibold text-slate-800">
                {todayData?.checkOutTime
                  ? new Date(todayData.checkOutTime).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Work Time</span>
              <span className="text-sm font-semibold text-emerald-600 font-mono">
                {formatHoursMins(todayData?.totalWorkMinutes)}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Break Taken</span>
              <span className="text-sm font-semibold text-amber-600 font-mono">
                {formatHoursMins(todayData?.totalBreakMinutes)}
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Summary Statistics */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Monthly Attendance Pulse</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                October 2026
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Total Present
                </span>
                <span className="font-bold text-slate-900 font-mono">
                  {historyData?.stats?.presentCount || 0} Days
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" /> Office Working
                </span>
                <span className="font-bold text-slate-900 font-mono">
                  {historyData?.stats?.officeCount || 0} Days
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-indigo-500" /> Remote Working
                </span>
                <span className="font-bold text-slate-900 font-mono">
                  {historyData?.stats?.remoteCount || 0} Days
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Late Arrivals
                </span>
                <span className="font-bold text-amber-600 font-mono">
                  {historyData?.stats?.lateCount || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Statutory Attendance Ledger strictly bound to PF/ESI compliance.
          </div>
        </div>
      </div>

      {/* Monthly Attendance Records Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">Monthly Punch History</h3>
            <p className="text-xs text-slate-500">
              Detailed audit trail of check-ins, check-outs, break times, and geofence verification.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Check In</th>
                <th className="py-3 px-4">Check Out</th>
                <th className="py-3 px-4">Work Hours</th>
                <th className="py-3 px-4">Break</th>
                <th className="py-3 px-4">Work Mode</th>
                <th className="py-3 px-4">Geofence Compliance</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {historyData?.logs?.length > 0 ? (
                historyData.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-medium text-slate-900 font-mono">
                      {new Date(log.punch_date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {log.check_in_time
                        ? new Date(log.check_in_time).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {log.check_out_time
                        ? new Date(log.check_out_time).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {formatHoursMins(log.total_work_minutes)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {formatHoursMins(log.total_break_minutes)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.work_mode === "OFFICE"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {log.work_mode === "OFFICE" ? (
                          <Building2 className="w-3 h-3" />
                        ) : (
                          <Laptop className="w-3 h-3" />
                        )}
                        {log.work_mode}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {log.is_geofence_compliant ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Inside Office
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          External / WFH
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          log.status === "PRESENT"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : log.status === "LATE"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400 text-sm">
                    No attendance records logged for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regularization Request Modal with data-lenis-prevent="true" */}
      {isRegModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div
            data-lenis-prevent="true"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#6558D9]" />
                <h3 className="font-semibold text-slate-900 text-base">Request Attendance Regularization</h3>
              </div>
              <button
                onClick={() => setIsRegModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegularizationSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Use this form to rectify missed check-in/out or network discrepancies. All submissions are forwarded to HR for review.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attendance Date
                </label>
                <input
                  type="date"
                  value={regForm.attendanceDate}
                  onChange={(e) => setRegForm({ ...regForm, attendanceDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Requested Check-In
                  </label>
                  <input
                    type="time"
                    value={regForm.requestedCheckIn}
                    onChange={(e) => setRegForm({ ...regForm, requestedCheckIn: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Requested Check-Out
                  </label>
                  <input
                    type="time"
                    value={regForm.requestedCheckOut}
                    onChange={(e) => setRegForm({ ...regForm, requestedCheckOut: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Regularization
                </label>
                <textarea
                  rows="3"
                  value={regForm.reason}
                  onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })}
                  placeholder="e.g. Client onsite meeting, biometric machine failure, network loss..."
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRegModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#6558D9] hover:bg-[#5245c4] text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Submit to HR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;
