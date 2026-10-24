// Frontend/src/components/payroll/PayslipModal.jsx
import React, { useRef } from "react";
import { X, Printer, Download, Building2, UserCheck, ShieldCheck } from "lucide-react";

export const PayslipModal = ({ isOpen, onClose, slipData }) => {
  const printRef = useRef(null);

  if (!isOpen || !slipData) return null;

  const { slip, earnings = [], deductions = [], employerContributions = [] } = slipData;

  const handlePrint = () => {
    window.print();
  };

  const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      data-lenis-prevent="true"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600 rounded-lg text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Salary Slip Statement</h3>
              <p className="text-xs text-slate-300">
                {monthNames[slip.month]} {slip.year} — {slip.slip_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Document Container */}
        <div ref={printRef} className="p-8 print:p-6 bg-white text-slate-900 font-sans print:text-black">
          {/* Company Branding & Letterhead */}
          <div className="border-b-2 border-slate-900 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
                  Shende Industries Private Limited
                </h1>
                <p className="text-xs text-slate-600 mt-1 max-w-md">
                  Precision Industrial Automation & Aerospace Motion Controls Engineering<br />
                  Plot 14-B, MIDC Industrial Area, Pune, Maharashtra 411018, India
                </p>
                <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2 font-mono">
                  <span>CIN: U29253PN2020PTC123456</span>
                  <span>GSTIN: 27AABCS1234F1Z5</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded tracking-wider uppercase mb-1">
                  Payslip
                </span>
                <p className="text-sm font-semibold text-slate-900">
                  {monthNames[slip.month]} {slip.year}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Ref: {slip.slip_number}
                </p>
              </div>
            </div>
          </div>

          {/* Employee & Statutory Grid */}
          <div className="bg-slate-50/75 rounded-xl border border-slate-200 p-4 mb-6 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Employee ID</span>
                <span className="font-bold text-slate-900 font-mono">{slip.employee_code}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Legal Name</span>
                <span className="font-semibold text-slate-900">{slip.first_name} {slip.last_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Department</span>
                <span className="font-medium text-slate-800">{slip.department_name || "Engineering"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Designation</span>
                <span className="font-medium text-slate-800">{slip.designation || "Staff"}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Bank Name</span>
                <span className="font-medium text-slate-800">{slip.bank_name || "HDFC Bank"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Bank A/C No.</span>
                <span className="font-mono text-slate-800">{slip.bank_account_no || "N/A"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">IFSC Code</span>
                <span className="font-mono text-slate-800">{slip.ifsc_code || "N/A"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Income Tax Regime</span>
                <span className="font-medium text-violet-700">{slip.tax_regime || "New"} Regime</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">PAN Number</span>
                <span className="font-mono font-medium text-slate-800">{slip.pan_number || "N/A"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">UAN / PF No.</span>
                <span className="font-mono text-slate-800">{slip.uan_number || slip.pf_number || "N/A"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Total Days / Paid Days</span>
                <span className="font-medium text-slate-800">{slip.total_working_days} / {slip.payment_days} Days</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Loss of Pay (LOP)</span>
                <span className={`font-semibold ${Number(slip.lwp_days) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {slip.lwp_days} Days
                </span>
              </div>
            </div>
          </div>

          {/* Earnings & Deductions Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Earnings Column */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-800">Earnings</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Amount (INR)</span>
              </div>
              <div className="divide-y divide-slate-100 min-h-[160px]">
                {earnings.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center px-4 py-2 text-xs">
                    <div>
                      <span className="font-medium text-slate-800 block">{item.component_name}</span>
                      {item.description && (
                        <span className="text-[10px] text-slate-400 block">{item.description}</span>
                      )}
                    </div>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      ₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-900">
                <span>Total Gross Earnings (A)</span>
                <span className="font-mono text-emerald-700 text-sm tabular-nums">
                  ₹{Number(slip.gross_pay).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-800">Deductions</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Amount (INR)</span>
              </div>
              <div className="divide-y divide-slate-100 min-h-[160px]">
                {deductions.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center px-4 py-2 text-xs">
                    <div>
                      <span className="font-medium text-slate-800 block">{item.component_name}</span>
                      {item.description && (
                        <span className="text-[10px] text-slate-400 block">{item.description}</span>
                      )}
                    </div>
                    <span className="font-mono font-semibold text-rose-600 tabular-nums">
                      ₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-900">
                <span>Total Deductions (B)</span>
                <span className="font-mono text-rose-600 text-sm tabular-nums">
                  ₹{Number(slip.total_deductions).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Net Salary Highlight Box */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-violet-900 block">
                  Net Salary Payable (A - B)
                </span>
                <p className="text-xs text-violet-700 italic mt-0.5">
                  {slip.net_pay_in_words || "Amount in words"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-violet-950 font-mono tabular-nums">
                  ₹{Number(slip.rounded_net_pay).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Employer Statutory Contributions (Information Only) */}
          {employerContributions.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 mb-6 text-xs">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Employer Statutory Contributions (Not deducted from employee pay)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employerContributions.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-600">{item.component_name}</span>
                    <span className="font-mono font-medium text-slate-800">
                      ₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-slate-500 font-mono">
                <span>PF Wage Ceiling: ₹25,000 / ₹15,000 Configurable | EPS-95 Statutory Wage Ceiling: ₹15,000</span>
                <span className="font-semibold text-slate-700">Total Employer CTC Burden: ₹{(Number(slip.gross_pay) + employerContributions.reduce((s, i) => s + Number(i.amount || 0), 0)).toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}

          {/* Disclaimer & Authorization Footer */}
          <div className="border-t border-slate-200 pt-6 mt-6 flex flex-col md:flex-row justify-between items-end text-[11px] text-slate-500">
            <div className="max-w-md">
              <p className="font-medium text-slate-700 mb-1">
                Note & Security Notice:
              </p>
              <p className="text-slate-500 leading-relaxed">
                This document is a computer-generated salary slip and does not require a physical signature when viewed electronically within Shende Industries Enterprise Portal. Confidential property of Shende Industries Pvt. Ltd.
              </p>
            </div>
            <div className="text-right mt-4 md:mt-0">
              <div className="w-36 border-b border-slate-400 mb-1"></div>
              <span className="font-semibold text-slate-800 block">Authorized Signatory</span>
              <span className="text-[10px] text-slate-400">Finance & Payroll Operations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
