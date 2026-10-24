// Frontend/src/services/payrollService.js
import api from "./api";

export const payrollService = {
  // 1. Components & Structures
  async getComponents() {
    const res = await api.get("/payroll/components");
    return res.data;
  },

  async getStructures() {
    const res = await api.get("/payroll/structures");
    return res.data;
  },

  async createStructure(data) {
    const res = await api.post("/payroll/structures", data);
    return res.data;
  },

  // 2. Employee Compensation & Statutory Banking
  async getAssignments() {
    const res = await api.get("/payroll/assignments");
    return res.data;
  },

  async createAssignment(data) {
    const res = await api.post("/payroll/assignments", data);
    return res.data;
  },

  async updateEmployeeStatutoryBanking(employeeId, data) {
    const res = await api.put(`/payroll/employees/${employeeId}/statutory-banking`, data);
    return res.data;
  },

  // 3. Monthly Payroll Runs
  async checkReadiness(month, year) {
    const res = await api.get(`/payroll/readiness?month=${month}&year=${year}`);
    return res.data;
  },

  async calculateDraftRun(month, year) {
    const res = await api.post("/payroll/runs/draft", { month, year });
    return res.data;
  },

  async getPayrollRuns() {
    const res = await api.get("/payroll/runs");
    return res.data;
  },

  async getPayrollRunById(id) {
    const res = await api.get(`/payroll/runs/${id}`);
    return res.data;
  },

  async submitPayrollRun(id) {
    const res = await api.post(`/payroll/runs/${id}/submit`);
    return res.data;
  },

  async approvePayrollRun(id, approvalNotes) {
    const res = await api.post(`/payroll/runs/${id}/approve`, { approvalNotes });
    return res.data;
  },

  async finalizePayrollRun(id) {
    const res = await api.post(`/payroll/runs/${id}/finalize`);
    return res.data;
  },

  async recordPayment(id, data) {
    const res = await api.post(`/payroll/runs/${id}/record-payment`, data);
    return res.data;
  },

  // 4. Payslips & Bank Payment Export
  async getSalarySlip(id) {
    const res = await api.get(`/payroll/slips/${id}`);
    return res.data;
  },

  async downloadBankExport(runId, filename = "salary_payment.csv") {
    const res = await api.get(`/payroll/runs/${runId}/bank-export`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 2000);
  },

  async getStatutoryReports(month, year) {
    const res = await api.get(`/payroll/reports/statutory?month=${month}&year=${year}`);
    return res.data;
  },

  // 6. CTC Breakup Calculator — Zero-mismatch reverse engine
  async calculateCtcBreakup(params) {
    const res = await api.post("/payroll/calculate-ctc-breakup", params);
    return res.data;
  },

  // 5. Employee Self-Service
  async getMySalarySlips() {
    const res = await api.get("/payroll/my-slips");
    return res.data;
  },
};

export default payrollService;
