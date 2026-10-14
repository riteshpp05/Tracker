// Frontend/src/components/payroll/MonthlyPayrollPage.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Play,
  Send,
  Lock,
  Download,
  FileSpreadsheet,
  Building2,
  Users,
  Eye,
  CreditCard,
  Printer,
  ChevronRight,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import payrollService from "../../services/payrollService";
import { PayslipModal } from "./PayslipModal";
import { toast } from "sonner";

export const MonthlyPayrollPage = () => {
  const [searchParams] = useSearchParams();
  const initialMonth = Number(searchParams.get("month")) || new Date().getMonth() + 1;
  const initialYear = Number(searchParams.get("year")) || new Date().getFullYear();

  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Data states
  const [readinessData, setReadinessData] = useState(null);
  const [runData, setRunData] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState("");

  // Payslip Modal State
  const [selectedSlipData, setSelectedSlipData] = useState(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    handleCheckReadiness();
  }, [month, year]);

  const handleCheckReadiness = async () => {
    setLoading(true);
    try {
      const res = await payrollService.checkReadiness(month, year);
      setReadinessData(res.data);

      // Check if existing run exists
      const runsRes = await payrollService.getPayrollRuns();
      const existingRun = (runsRes.data || []).find((r) => r.month === month && r.year === year);
      if (existingRun) {
        const detailRes = await payrollService.getPayrollRunById(existingRun.id);
        setRunData(detailRes.data);
        if (existingRun.status === "FINALIZED" || existingRun.status === "PAID") {
          setCurrentStep(5); // Finalized
        } else if (existingRun.status === "APPROVED") {
          setCurrentStep(4);
        } else if (existingRun.status === "SUBMITTED") {
          setCurrentStep(4);
        } else {
          setCurrentStep(3); // Draft reviewed
        }
      } else {
        setRunData(null);
        setCurrentStep(2); // Ready to calculate
      }
    } catch (err) {
      console.error("Readiness check error:", err);
      toast.error("Failed to verify payroll readiness");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateDraft = async () => {
    setLoading(true);
    try {
      const res = await payrollService.calculateDraftRun(month, year);
      toast.success(res.message || "Draft payroll calculated successfully");
      const detailRes = await payrollService.getPayrollRunById(res.data.runId);
      setRunData(detailRes.data);
      setCurrentStep(3);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to calculate draft payroll");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApproval = async () => {
    if (!runData?.run?.id) return;
    setLoading(true);
    try {
      await payrollService.submitPayrollRun(runData.run.id);
      toast.success("Payroll run submitted for maker-checker review");
      const detailRes = await payrollService.getPayrollRunById(runData.run.id);
      setRunData(detailRes.data);
      setCurrentStep(4);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit payroll run");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!runData?.run?.id) return;
    setLoading(true);
    try {
      await payrollService.approvePayrollRun(runData.run.id, approvalNotes || "Approved by HR Admin");
      toast.success("Payroll run approved successfully");
      const detailRes = await payrollService.getPayrollRunById(runData.run.id);
      setRunData(detailRes.data);
      setCurrentStep(4);
    } catch (err) {
      toast.error(err.response?.data?.error || "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!runData?.run?.id) return;
    if (!window.confirm("Finalizing will permanently LOCK this payroll period and publish salary slips. Confirm?")) {
      return;
    }
    setLoading(true);
    try {
      await payrollService.finalizePayrollRun(runData.run.id);
      toast.success("Payroll run finalized and locked! Payslips published.");
      const detailRes = await payrollService.getPayrollRunById(runData.run.id);
      setRunData(detailRes.data);
      setCurrentStep(5);
    } catch (err) {
      toast.error(err.response?.data?.error || "Finalization failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBankFile = async () => {
    if (!runData?.run?.id) return;
    try {
      await payrollService.downloadBankExport(
        runData.run.id,
        `Bank_Payment_${runData.run.month}_${runData.run.year}.csv`
      );
      toast.success("Bank payment NEFT CSV file downloaded");
    } catch (err) {
      toast.error("Failed to download bank payment file");
    }
  };

  const handleViewPayslip = async (slipId) => {
    try {
      const res = await payrollService.getSalarySlip(slipId);
      setSelectedSlipData(res.data);
      setIsPayslipOpen(true);
    } catch (err) {
      toast.error("Failed to load payslip details");
    }
  };

  const steps = [
    { num: 1, label: "Select Month" },
    { num: 2, label: "Readiness Check" },
    { num: 3, label: "Review Calculations" },
    { num: 4, label: "Approvals" },
    { num: 5, label: "Lock & Payment" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Wizard Breadcrumbs */}
      <div>
        <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
          Monthly Payroll Processing Wizard
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          End-to-end guided flow: Validate Inputs → Calculate Draft → Reconcile → Maker-Checker Approval → Lock & Export.
        </p>
      </div>

      {/* Guided Progress Steps Indicator */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {steps.map((st, i) => (
            <React.Fragment key={st.num}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    currentStep >= st.num
                      ? "bg-[#111827] text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {currentStep > st.num ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : st.num}
                </div>
                <span
                  className={`text-xs font-semibold hidden sm:inline ${
                    currentStep >= st.num ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {st.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-3 ${
                    currentStep > st.num ? "bg-[#111827]" : "bg-slate-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STEP 1 & 2: MONTH SELECTION & READINESS SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Month Selector Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-[#6558D9]" />
            <span>Select Payroll Period</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
              >
                {monthNames.map((name, i) => i > 0 && (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Start Date:</span>
              <span className="font-mono font-medium text-slate-900">{readinessData?.startDate || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>End Date:</span>
              <span className="font-mono font-medium text-slate-900">{readinessData?.endDate || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>Calendar Days:</span>
              <span className="font-mono font-medium text-slate-900">{readinessData?.totalCalendarDays || 30} Days</span>
            </div>
          </div>

          <button
            onClick={handleCheckReadiness}
            disabled={loading}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Readiness</span>
          </button>
        </div>

        {/* Readiness Checklist Card */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Input Validation & Compliance Audit</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {readinessData?.employeeCount || 0} Eligible Population
            </span>
          </div>

          {/* Warnings & Errors Box */}
          {readinessData?.readiness?.blockingCount > 0 ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Calculation Blocked ({readinessData.readiness.blockingCount} issues)</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px]">
                {readinessData.readiness.blockingErrors.map((err, idx) => (
                  <li key={idx}>{err.message}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Ready for Processing</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1">
                All {readinessData?.readiness?.readyEmployees || 0} employees have active salary structure assignments and approved records.
              </p>
            </div>
          )}

          {readinessData?.readiness?.warningCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <span className="font-bold block text-[11px]">Audit Warnings (Non-blocking):</span>
              <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                {readinessData.readiness.warnings.slice(0, 3).map((w, idx) => (
                  <li key={idx}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Calculation Trigger Button */}
          <div className="pt-2 flex justify-end">
            {runData?.run?.is_locked ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                <Lock className="w-4 h-4" />
                <span>Finalized & Locked (Ref: {runData.run.run_code})</span>
              </div>
            ) : (
              <button
                onClick={handleCalculateDraft}
                disabled={loading || !readinessData?.readiness?.isValid}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#111827] hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Calculate Draft Payroll ({monthNames[month]} {year})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* STEP 3 & 4: CALCULATED RESULTS & RECONCILIATION */}
      {runData && (
        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Total Employees</span>
              <div className="text-xl font-bold text-slate-900 mt-1">{runData.run.total_employees}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Gross Pay</span>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                ₹{Number(runData.run.total_gross_pay).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Total Deductions</span>
              <div className="text-xl font-bold text-rose-600 mt-1 font-mono">
                ₹{Number(runData.run.total_deductions).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Net Salary Payable</span>
              <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">
                ₹{Number(runData.run.total_net_pay).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Slips Reconciliation Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Employee Salary Slips Breakdown ({runData.slips?.length || 0})
                </h3>
                <p className="text-xs text-slate-500">
                  Itemized gross, deductions, employer contributions, and net payable.
                </p>
              </div>

              {/* Action Buttons for Current Status */}
              <div className="flex items-center gap-2">
                {runData.run.status === "DRAFT" && (
                  <button
                    onClick={handleSubmitApproval}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#111827] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit for Approval</span>
                  </button>
                )}

                {runData.run.status === "SUBMITTED" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Approval comment..."
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                    <button
                      onClick={handleApprove}
                      disabled={loading}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Approve Run
                    </button>
                  </div>
                )}

                {runData.run.status === "APPROVED" && (
                  <button
                    onClick={handleFinalize}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Finalize & Lock Period</span>
                  </button>
                )}

                {(runData.run.status === "FINALIZED" || runData.run.status === "PAID") && (
                  <button
                    onClick={handleDownloadBankFile}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Bank Payment CSV</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Employee</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5 text-center">Days / LOP</th>
                    <th className="px-4 py-3.5 text-right">Gross Pay</th>
                    <th className="px-4 py-3.5 text-right">Deductions</th>
                    <th className="px-4 py-3.5 text-right">Employer Cost</th>
                    <th className="px-4 py-3.5 text-right">Net Payable</th>
                    <th className="px-6 py-3.5 text-right">View Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runData.slips?.map((slip) => (
                    <tr key={slip.id} className="hover:bg-slate-50/75 transition">
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-slate-900">{slip.first_name} {slip.last_name}</div>
                        <div className="font-mono text-[11px] text-slate-400">{slip.employee_code}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium">
                        {slip.department_name || "Engineering"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-medium text-slate-800">{slip.payment_days}d</span>
                        {Number(slip.lwp_days) > 0 && (
                          <span className="text-[10px] text-rose-500 font-bold ml-1">({slip.lwp_days} LOP)</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        ₹{Number(slip.gross_pay).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-rose-600 font-medium tabular-nums">
                        ₹{Number(slip.total_deductions).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-violet-700 tabular-nums">
                        ₹{Number(slip.employer_contributions).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 tabular-nums text-sm">
                        ₹{Number(slip.rounded_net_pay).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => handleViewPayslip(slip.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-[#6558D9] hover:underline ml-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Payslip</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payslip View Modal */}
      <PayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        slipData={selectedSlipData}
      />
    </div>
  );
};

export default MonthlyPayrollPage;
