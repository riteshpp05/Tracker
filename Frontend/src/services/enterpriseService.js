// Frontend/src/services/enterpriseService.js
import api from "./api";

export const enterpriseService = {
  // Geofences
  async getGeofences() {
    const res = await api.get("/enterprise/geofences", { skipCache: true });
    return res.data;
  },

  // Daily Punch & Breaks
  async getTodayStatus() {
    const res = await api.get("/attendance/today", { skipCache: true });
    return res.data;
  },

  async checkIn(coordinates) {
    const res = await api.post("/attendance/check-in", {
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
    });
    return res.data;
  },

  async checkOut(coordinates) {
    const res = await api.post("/attendance/check-out", {
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
    });
    return res.data;
  },

  async startBreak(breakType) {
    const res = await api.post("/attendance/break/start", { breakType });
    return res.data;
  },

  async endBreak() {
    const res = await api.post("/attendance/break/end");
    return res.data;
  },

  async getMyAttendanceHistory(month, year) {
    const params = new URLSearchParams();
    if (month) params.append("month", month);
    if (year) params.append("year", year);
    const res = await api.get(`/attendance/my-history?${params.toString()}`, { skipCache: true });
    return res.data;
  },

  // Regularization
  async requestRegularization(data) {
    const res = await api.post("/attendance/regularization", data);
    return res.data;
  },

  async getRegularizations() {
    const res = await api.get("/attendance/regularizations", { skipCache: true });
    return res.data;
  },

  async reviewRegularization(id, status, reviewNotes) {
    const res = await api.put(`/attendance/regularizations/${id}/review`, { status, reviewNotes });
    return res.data;
  },

  // Master Attendance Register (Management)
  async getAttendanceMaster(params = {}) {
    const query = new URLSearchParams();
    if (params.date) query.append("date", params.date);
    if (params.department) query.append("department", params.department);
    if (params.workMode) query.append("workMode", params.workMode);
    if (params.status) query.append("status", params.status);
    const res = await api.get(`/attendance/master?${query.toString()}`, { skipCache: true });
    return res.data;
  },

  // Holidays
  async getHolidays(year) {
    const params = year ? `?year=${year}` : "";
    const res = await api.get(`/enterprise/holidays${params}`, { skipCache: true });
    return res.data;
  },

  async addHoliday(data) {
    const res = await api.post("/enterprise/holidays", data);
    return res.data;
  },

  // Announcements
  async getAnnouncements() {
    const res = await api.get("/enterprise/announcements", { skipCache: true });
    return res.data;
  },

  async createAnnouncement(data) {
    const res = await api.post("/enterprise/announcements", data);
    return res.data;
  },

  // Policy Documents
  async getDocuments(category) {
    const params = category ? `?category=${encodeURIComponent(category)}` : "";
    const res = await api.get(`/enterprise/documents${params}`, { skipCache: true });
    return res.data;
  },
};

export default enterpriseService;
