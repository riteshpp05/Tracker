import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Receipt,
  IndianRupee,
  AlertCircle,
  Eye,
} from "lucide-react";
import payrollService from "../../services/payrollService";
import { PayslipModal } from "./PayslipModal";

export const EmployeePayslipsPage = () => {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlipData, setSelectedSlipData] = useState(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [fetchingSlipId, setFetchingSlipId] = useState(null);

  const monthNames = [
    "",
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fetchMySlips = async () => {
    setLoading(true);
    try {
      const res = await payrollService.getMySalarySlips();
      setSlips(res.data || []);
    } catch (err) {
      console.error("Failed to load employee salary slips:", err);
      toast.error(err.response?.data?.error || "Failed to load salary slips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySlips();
  }, []);

  const handleOpenSlip = async (slipId) => {
    setFetchingSlipId(slipId);
    try {
      const res = await payrollService.getSalarySlip(slipId);
      setSelectedSlipData(res.data);
      setIsPayslipOpen(true);
    } catch (err) {
      console.error("Failed to fetch slip details:", err);
      toast.error(err.response?.data?.error || "Failed to load salary slip details");
    } finally {
      setFetchingSlipId(null);
    }
  };

  const latestSlip = slips.length > 0 ? slips[0] : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-600 uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Employee Self-Service</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Salary Slips & Payout History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View, verify, and download your monthly salary statements, statutory deductions, and tax breakdowns.
          </p>
        </div>

        {latestSlip && (
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-violet-600 text-white rounded-lg">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider">
                Latest Payout ({monthNames[latestSlip.month]} {latestSlip.year})
              </div>
              <div className="text-lg font-bold text-slate-900">
                ₹{Number(latestSlip.rounded_net_pay || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Statements Available
          </div>
          <div className="text-2xl font-bold text-slate-900">{slips.length}</div>
          <div className="text-xs text-slate-400 mt-2">
            Archived historical records published by HR
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Disbursement Mode
          </div>
          <div className="text-2xl font-bold text-slate-900">Bank Transfer</div>
          <div className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Direct NEFT/RTGS Credit</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Statutory Compliance
          </div>
          <div className="text-2xl font-bold text-slate-900">EPF, PT & TDS</div>
          <div className="text-xs text-slate-400 mt-2">
            Automated statutory tax withholding enabled
          </div>
        </div>
      </div>

      {/* Salary Slips Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Published Salary Statements</h2>
          <span className="text-xs font-medium text-slate-500">
            {slips.length} {slips.length === 1 ? "statement" : "statements"} on record
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium text-slate-500">Loading your salary statements...</p>
          </div>
        ) : slips.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Salary Slips Available Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Your salary slips will be automatically published here each month once HR finalizes and approves the company payroll run.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" data-lenis-prevent="true">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Payroll Period</th>
                  <th className="py-3.5 px-4">Slip Number</th>
                  <th className="py-3.5 px-4 text-center">Payment Days</th>
                  <th className="py-3.5 px-4 text-right">Gross Earnings</th>
                  <th className="py-3.5 px-4 text-right">Total Deductions</th>
                  <th className="py-3.5 px-4 text-right font-bold text-slate-900">Net Take-Home Pay</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slips.map((slip) => {
                  const isBusy = fetchingSlipId === slip.id;
                  return (
                    <tr key={slip.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {monthNames[slip.month]} {slip.year}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {slip.slip_number}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          {slip.payment_days} Days
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800">
                        ₹{Number(slip.gross_pay || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-rose-600">
                        ₹{Number(slip.total_deductions || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                        ₹{Number(slip.rounded_net_pay || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          slip.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {slip.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenSlip(slip.id)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isBusy ? "Opening..." : "View / Print"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Salary Slip Modal */}
      <PayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        slipData={selectedSlipData}
      />
    </div>
  );
};

export default EmployeePayslipsPage;
