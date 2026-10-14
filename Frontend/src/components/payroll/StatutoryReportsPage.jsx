// Frontend/src/components/payroll/StatutoryReportsPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  Users,
  ShieldCheck,
  Percent,
  TrendingUp,
  FileText,
  AlertCircle,
  ArrowRight,
  Printer,
  ChevronRight,
  Receipt,
  IndianRupee,
} from "lucide-react";
import payrollService from "../../services/payrollService";

export const StatutoryReportsPage = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [activeTab, setActiveTab] = useState("epf"); // "epf" | "esic" | "pt" | "dept"
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const monthNames = [
    "",
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await payrollService.getStatutoryReports(selectedMonth, selectedYear);
      setReportData(res.data);
    } catch (err) {
      console.error("Failed to load statutory reports:", err);
      toast.error(err.response?.data?.error || "Failed to load statutory reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedMonth, selectedYear]);

  const slips = reportData?.slips || [];

  // Parse calculations snapshot for individual slip breakdowns
  const parsedSlips = slips.map((s) => {
    let calc = {};
    try {
      calc = typeof s.calculation_snapshot === "string" 
        ? JSON.parse(s.calculation_snapshot) 
        : (s.calculation_snapshot || (typeof s.calculations_snapshot === "string" ? JSON.parse(s.calculations_snapshot) : s.calculations_snapshot) || {});
    } catch (e) {
      calc = {};
    }
    const rawStat = calc.statutoryDetails || calc.statutoryBreakdown || {};
    const statutory = {
      epf: {
        employeePf: rawStat.epf?.employeePF ?? rawStat.epf?.employeePf ?? 0,
        employerEpf: rawStat.epf?.employerEPF ?? rawStat.epf?.employerEpf ?? 0,
        employerEps: rawStat.epf?.employerEPS ?? rawStat.epf?.employerEps ?? 0,
        edli: rawStat.epf?.employerEDLI ?? rawStat.epf?.edli ?? 0,
        adminCharges: rawStat.epf?.employerAdmin ?? rawStat.epf?.adminCharges ?? 0,
      },
      esic: {
        employeeEsi: rawStat.esic?.employeeESIC ?? rawStat.esic?.employeeEsi ?? 0,
        employerEsi: rawStat.esic?.employerESIC ?? rawStat.esic?.employerEsi ?? 0,
        eligible: rawStat.esic?.eligible ?? false,
      },
      pt: {
        pt: rawStat.pt?.ptAmount ?? rawStat.pt?.pt ?? 0,
        slab: rawStat.pt?.slab ?? "",
      },
      tds: {
        tds: rawStat.tds?.monthlyTDS ?? rawStat.tds?.tds ?? 0,
        annualTax: rawStat.tds?.annualTax ?? 0,
      },
    };
    return {
      ...s,
      calc,
      statutory,
    };
  });

  // Calculate Aggregates
  const totalGross = parsedSlips.reduce((acc, s) => acc + Number(s.gross_pay || 0), 0);
  const totalNet = parsedSlips.reduce((acc, s) => acc + Number(s.rounded_net_pay || 0), 0);

  // EPF Aggregates
  const totalEpfEe = parsedSlips.reduce((acc, s) => acc + (s.statutory.epf?.employeePf || 0), 0);
  const totalEpfEr = parsedSlips.reduce((acc, s) => acc + (s.statutory.epf?.employerEpf || 0), 0);
  const totalEps = parsedSlips.reduce((acc, s) => acc + (s.statutory.epf?.employerEps || 0), 0);
  const totalEdli = parsedSlips.reduce((acc, s) => acc + (s.statutory.epf?.edli || 0), 0);
  const totalAdminCharges = parsedSlips.reduce((acc, s) => acc + (s.statutory.epf?.adminCharges || 0), 0);
  const totalEpfRemittance = totalEpfEe + totalEpfEr + totalEps + totalEdli + totalAdminCharges;

  // ESIC Aggregates
  const totalEsicEe = parsedSlips.reduce((acc, s) => acc + (s.statutory.esic?.employeeEsi || 0), 0);
  const totalEsicEr = parsedSlips.reduce((acc, s) => acc + (s.statutory.esic?.employerEsi || 0), 0);
  const totalEsicRemittance = totalEsicEe + totalEsicEr;

  // PT Aggregates
  const totalPt = parsedSlips.reduce((acc, s) => acc + (s.statutory.pt?.pt || 0), 0);

  // TDS Aggregates
  const totalTds = parsedSlips.reduce((acc, s) => acc + (s.statutory.tds?.tds || 0), 0);

  // Department Aggregates
  const deptMap = {};
  parsedSlips.forEach((s) => {
    const dept = s.department_name || "General";
    if (!deptMap[dept]) {
      deptMap[dept] = {
        name: dept,
        headcount: 0,
        gross: 0,
        deductions: 0,
        net: 0,
        employerCost: 0,
      };
    }
    deptMap[dept].headcount += 1;
    deptMap[dept].gross += Number(s.gross_pay || 0);
    deptMap[dept].deductions += Number(s.total_deductions || 0);
    deptMap[dept].net += Number(s.rounded_net_pay || 0);
    deptMap[dept].employerCost += Number(s.employer_contributions || 0);
  });
  const deptList = Object.values(deptMap);

  // CSV Export Generators
  const exportCsv = (filename, rows) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportEpf = () => {
    const headers = [
      "UAN",
      "Employee Code",
      "Member Name",
      "Gross Wages (INR)",
      "EPF Wages (INR)",
      "EPS Wages (INR)",
      "EDLI Wages (INR)",
      "EE Share 12% (INR)",
      "ER Share EPF 3.67% (INR)",
      "ER Share EPS 8.33% (INR)",
      "EDLI 0.5% (INR)",
      "Admin Charges 0.5% (INR)",
      "Total Remittance (INR)"
    ];
    const rows = [headers];
    parsedSlips.forEach((s) => {
      const epf = s.statutory.epf || {};
      const gross = Number(s.gross_pay || 0);
      const epfWage = Math.min(gross, 15000);
      const ee = epf.employeePf || 0;
      const erEpf = epf.employerEpf || 0;
      const erEps = epf.employerEps || 0;
      const edli = epf.edli || 0;
      const admin = epf.adminCharges || 0;
      const total = ee + erEpf + erEps + edli + admin;
      rows.push([
        s.uan_number || "NA",
        s.employee_code,
        `${s.first_name} ${s.last_name}`,
        gross.toFixed(2),
        epfWage.toFixed(2),
        epfWage.toFixed(2),
        epfWage.toFixed(2),
        ee.toFixed(2),
        erEpf.toFixed(2),
        erEps.toFixed(2),
        edli.toFixed(2),
        admin.toFixed(2),
        total.toFixed(2)
      ]);
    });
    exportCsv(`EPF_ECR_Register_${selectedMonth}_${selectedYear}.csv`, rows);
    toast.success("EPF ECR Register exported successfully");
  };

  const handleExportEsic = () => {
    const headers = [
      "IP Number (ESI No)",
      "Employee Code",
      "Employee Name",
      "Payment Days",
      "Gross Wages (INR)",
      "EE Share 0.75% (INR)",
      "ER Share 3.25% (INR)",
      "Total ESIC (INR)",
      "Eligibility Status"
    ];
    const rows = [headers];
    parsedSlips.forEach((s) => {
      const esic = s.statutory.esic || {};
      const gross = Number(s.gross_pay || 0);
      const ee = esic.employeeEsi || 0;
      const er = esic.employerEsi || 0;
      const status = gross <= 21000 ? "Eligible" : "Exempt (> ₹21,000)";
      rows.push([
        s.esi_number || "NA",
        s.employee_code,
        `${s.first_name} ${s.last_name}`,
        s.payment_days,
        gross.toFixed(2),
        ee.toFixed(2),
        er.toFixed(2),
        (ee + er).toFixed(2),
        status
      ]);
    });
    exportCsv(`ESIC_Monthly_Register_${selectedMonth}_${selectedYear}.csv`, rows);
    toast.success("ESIC Register exported successfully");
  };

  const handleExportPt = () => {
    const headers = [
      "Employee Code",
      "Employee Name",
      "Gender",
      "Gross Salary (INR)",
      "PT Deducted (INR)",
      "Maharashtra Slab Applied"
    ];
    const rows = [headers];
    parsedSlips.forEach((s) => {
      const pt = s.statutory.pt?.pt || 0;
      const gross = Number(s.gross_pay || 0);
      let slab = "Gross <= 7,500 (NIL)";
      if (gross > 10000) slab = selectedMonth === 2 ? "Gross > 10,000 (Feb ₹300)" : "Gross > 10,000 (₹200)";
      else if (gross > 7500) slab = "Gross 7,501-10,000 (₹175)";
      rows.push([
        s.employee_code,
        `${s.first_name} ${s.last_name}`,
        s.gender || "M",
        gross.toFixed(2),
        pt.toFixed(2),
        slab
      ]);
    });
    exportCsv(`Maharashtra_PT_Register_${selectedMonth}_${selectedYear}.csv`, rows);
    toast.success("Professional Tax Register exported successfully");
  };

  const handleExportDept = () => {
    const headers = [
      "Department",
      "Headcount",
      "Total Gross Earnings (INR)",
      "Employer Statutory Cost (INR)",
      "Total Company Cost CTC (INR)",
      "Total Employee Deductions (INR)",
      "Net Disbursed (INR)"
    ];
    const rows = [headers];
    deptList.forEach((d) => {
      rows.push([
        d.name,
        d.headcount,
        d.gross.toFixed(2),
        d.employerCost.toFixed(2),
        (d.gross + d.employerCost).toFixed(2),
        d.deductions.toFixed(2),
        d.net.toFixed(2)
      ]);
    });
    exportCsv(`Department_Payroll_Distribution_${selectedMonth}_${selectedYear}.csv`, rows);
    toast.success("Department Payroll Distribution exported successfully");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-600 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Statutory Compliance & Remittance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Indian Statutory & Payroll Registers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            EPF Electronic Challan (ECR), ESIC Form 5, Maharashtra Professional Tax & Cost Allocation
          </p>
        </div>

        {/* Month / Year Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-400 mr-2" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer pr-2"
            >
              {monthNames.map((name, idx) => {
                if (idx === 0) return null;
                return (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                );
              })}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer border-l border-slate-200 pl-2"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* 4 Statutory Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: EPF */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total EPF Remittance</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₹{totalEpfRemittance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between border-t border-slate-100 pt-2">
            <span>EE (12%): ₹{totalEpfEe.toLocaleString("en-IN")}</span>
            <span>ER (EPS+EPF+EDLI): ₹{(totalEpfEr + totalEps + totalEdli + totalAdminCharges).toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Card 2: ESIC */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total ESIC Remittance</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₹{totalEsicRemittance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between border-t border-slate-100 pt-2">
            <span>EE (0.75%): ₹{totalEsicEe.toLocaleString("en-IN")}</span>
            <span>ER (3.25%): ₹{totalEsicEr.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Card 3: Maharashtra PT */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Maharashtra Prof. Tax</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₹{totalPt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between border-t border-slate-100 pt-2">
            <span>Total Headcount: {parsedSlips.length}</span>
            <span>Month: {monthNames[selectedMonth]}</span>
          </div>
        </div>

        {/* Card 4: TDS Withheld */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Section 192 TDS</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₹{totalTds.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between border-t border-slate-100 pt-2">
            <span>Gross Payroll: ₹{(totalGross / 100000).toFixed(2)}L</span>
            <span>Net Payable: ₹{(totalNet / 100000).toFixed(2)}L</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 pt-2 rounded-t-2xl">
        <button
          onClick={() => setActiveTab("epf")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "epf"
              ? "border-violet-600 text-violet-600 bg-violet-50/50 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>EPF ECR Register</span>
        </button>
        <button
          onClick={() => setActiveTab("esic")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "esic"
              ? "border-violet-600 text-violet-600 bg-violet-50/50 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>ESIC Monthly Return</span>
        </button>
        <button
          onClick={() => setActiveTab("pt")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "pt"
              ? "border-violet-600 text-violet-600 bg-violet-50/50 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Maharashtra Professional Tax</span>
        </button>
        <button
          onClick={() => setActiveTab("dept")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "dept"
              ? "border-violet-600 text-violet-600 bg-violet-50/50 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Department Cost Allocation</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-b-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium text-slate-500">Compiling statutory registers for {monthNames[selectedMonth]} {selectedYear}...</p>
          </div>
        ) : parsedSlips.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Payroll Slips Found for this Period</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
              Statutory registers are compiled automatically once a monthly payroll run is calculated or finalized.
            </p>
            <Link
              to="/admin/payroll/process"
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
            >
              <span>Go to Monthly Payroll Processing</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div>
            {/* ============================================================== */}
            {/* 1. EPF ECR TAB */}
            {/* ============================================================== */}
            {activeTab === "epf" && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Employees' Provident Fund (EPF) & Pension (EPS) Register
                    </h2>
                    <p className="text-xs text-slate-500">
                      Wage ceiling ₹15,000 | EE: 12% | EPS: 8.33% (Max ₹1,250) | EPF ER: 3.67% | EDLI: 0.50% | Admin: 0.50%
                    </p>
                  </div>
                  <button
                    onClick={handleExportEpf}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download ECR CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto" data-lenis-prevent="true">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                        <th className="py-3 px-3">UAN</th>
                        <th className="py-3 px-3">Member Name</th>
                        <th className="py-3 px-3 text-right">Gross Wages</th>
                        <th className="py-3 px-3 text-right">EPF Wages</th>
                        <th className="py-3 px-3 text-right">EE Share (12%)</th>
                        <th className="py-3 px-3 text-right">ER EPS (8.33%)</th>
                        <th className="py-3 px-3 text-right">ER EPF (3.67%)</th>
                        <th className="py-3 px-3 text-right">EDLI (0.5%)</th>
                        <th className="py-3 px-3 text-right">Admin (0.5%)</th>
                        <th className="py-3 px-3 text-right font-bold text-slate-900">Total Remittance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedSlips.map((s) => {
                        const epf = s.statutory.epf || {};
                        const gross = Number(s.gross_pay || 0);
                        const epfWage = Math.min(gross, 15000);
                        const ee = epf.employeePf || 0;
                        const erEpf = epf.employerEpf || 0;
                        const erEps = epf.employerEps || 0;
                        const edli = epf.edli || 0;
                        const admin = epf.adminCharges || 0;
                        const lineTotal = ee + erEpf + erEps + edli + admin;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3 font-mono font-medium text-slate-700">
                              {s.uan_number || <span className="text-amber-500 italic">Pending UAN</span>}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{s.first_name} {s.last_name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{s.employee_code}</div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono">₹{gross.toFixed(2)}</td>
                            <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">₹{epfWage.toFixed(2)}</td>
                            <td className="py-3 px-3 text-right font-mono font-semibold text-rose-600">₹{ee.toFixed(2)}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-700">₹{erEps.toFixed(2)}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-700">₹{erEpf.toFixed(2)}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-500">₹{edli.toFixed(2)}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-500">₹{admin.toFixed(2)}</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">₹{lineTotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                        <td colSpan={2} className="py-3 px-3">Total Remittance ({parsedSlips.length} Members)</td>
                        <td className="py-3 px-3 text-right font-mono">₹{totalGross.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono">—</td>
                        <td className="py-3 px-3 text-right font-mono text-rose-700">₹{totalEpfEe.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono">₹{totalEps.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono">₹{totalEpfEr.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono">₹{totalEdli.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono">₹{totalAdminCharges.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono text-violet-700">₹{totalEpfRemittance.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 2. ESIC MONTHLY RETURN TAB */}
            {/* ============================================================== */}
            {activeTab === "esic" && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Employees' State Insurance Corporation (ESIC) Form 5 Monthly Register
                    </h2>
                    <p className="text-xs text-slate-500">
                      Applicable to employees with monthly gross wages ≤ ₹21,000 | EE: 0.75% | ER: 3.25%
                    </p>
                  </div>
                  <button
                    onClick={handleExportEsic}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download ESIC CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto" data-lenis-prevent="true">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                        <th className="py-3 px-3">IP Number (ESI No)</th>
                        <th className="py-3 px-3">Employee Name</th>
                        <th className="py-3 px-3 text-center">Paid Days</th>
                        <th className="py-3 px-3 text-right">Gross Wages</th>
                        <th className="py-3 px-3 text-right">EE Share (0.75%)</th>
                        <th className="py-3 px-3 text-right">ER Share (3.25%)</th>
                        <th className="py-3 px-3 text-right font-bold text-slate-900">Total Contribution (4%)</th>
                        <th className="py-3 px-3 text-center">Eligibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedSlips.map((s) => {
                        const esic = s.statutory.esic || {};
                        const gross = Number(s.gross_pay || 0);
                        const ee = esic.employeeEsi || 0;
                        const er = esic.employerEsi || 0;
                        const isEligible = gross <= 21000;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3 font-mono font-medium text-slate-700">
                              {s.esi_number || <span className="text-slate-400 italic">Pending IP</span>}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{s.first_name} {s.last_name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{s.employee_code}</div>
                            </td>
                            <td className="py-3 px-3 text-center font-mono">{s.payment_days}</td>
                            <td className="py-3 px-3 text-right font-mono">₹{gross.toFixed(2)}</td>
                            <td className="py-3 px-3 text-right font-mono font-semibold text-rose-600">₹{ee.toFixed(2)}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-700">₹{er.toFixed(2)}</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">₹{(ee + er).toFixed(2)}</td>
                            <td className="py-3 px-3 text-center">
                              {isEligible ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  Eligible
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                                  Exempt (&gt; ₹21k)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                        <td colSpan={3} className="py-3 px-3">Total ESIC Remittance</td>
                        <td className="py-3 px-3 text-right font-mono">₹{totalGross.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono text-rose-700">₹{totalEsicEe.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono">₹{totalEsicEr.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono text-violet-700">₹{totalEsicRemittance.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 3. MAHARASHTRA PROFESSIONAL TAX (PT) TAB */}
            {/* ============================================================== */}
            {activeTab === "pt" && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Maharashtra State Professional Tax (PT) Statutory Register
                    </h2>
                    <p className="text-xs text-slate-500">
                      Governed by Maharashtra State Tax on Professions, Trades, Callings and Employments Act, 1975
                    </p>
                  </div>
                  <button
                    onClick={handleExportPt}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PT CSV</span>
                  </button>
                </div>

                {/* Statutory Slab Rules Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-bold text-slate-700">Slab 1: Gross ≤ ₹7,500</div>
                    <div className="text-lg font-bold text-emerald-600 mt-1">₹0 (NIL)</div>
                    <div className="text-[11px] text-slate-500 mt-1">Employees earning up to ₹7,500 monthly</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-bold text-slate-700">Slab 2: Gross ₹7,501 – ₹10,000</div>
                    <div className="text-lg font-bold text-amber-600 mt-1">₹175 / month</div>
                    <div className="text-[11px] text-slate-500 mt-1">Standard rate for mid-bracket earnings</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-bold text-slate-700">Slab 3: Gross &gt; ₹10,000</div>
                    <div className="text-lg font-bold text-violet-600 mt-1">₹200 (Feb: ₹300)</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {selectedMonth === 2 ? "Special February statutory rate of ₹300 applied" : "Regular monthly rate of ₹200 applied"}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto" data-lenis-prevent="true">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                        <th className="py-3 px-3">Emp Code</th>
                        <th className="py-3 px-3">Employee Name</th>
                        <th className="py-3 px-3">Department</th>
                        <th className="py-3 px-3 text-right">Gross Salary</th>
                        <th className="py-3 px-3">Statutory Slab Applied</th>
                        <th className="py-3 px-3 text-right font-bold text-slate-900">PT Deducted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedSlips.map((s) => {
                        const pt = s.statutory.pt?.pt || 0;
                        const gross = Number(s.gross_pay || 0);
                        let slabLabel = "Gross ≤ ₹7,500 (NIL)";
                        if (gross > 10000) {
                          slabLabel = selectedMonth === 2 ? "Gross > ₹10,000 (Feb rate: ₹300)" : "Gross > ₹10,000 (Regular: ₹200)";
                        } else if (gross > 7500) {
                          slabLabel = "Gross ₹7,501 – ₹10,000 (₹175)";
                        }
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3 font-mono font-medium text-slate-700">{s.employee_code}</td>
                            <td className="py-3 px-3 font-semibold text-slate-900">{s.first_name} {s.last_name}</td>
                            <td className="py-3 px-3 text-slate-600">{s.department_name || "General"}</td>
                            <td className="py-3 px-3 text-right font-mono font-medium">₹{gross.toFixed(2)}</td>
                            <td className="py-3 px-3 text-slate-600">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-slate-100 border border-slate-200">
                                {slabLabel}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">₹{pt.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                        <td colSpan={3} className="py-3 px-3">Total Maharashtra PT Liability</td>
                        <td className="py-3 px-3 text-right font-mono">₹{totalGross.toFixed(2)}</td>
                        <td></td>
                        <td className="py-3 px-3 text-right font-mono text-violet-700 font-bold">₹{totalPt.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 4. DEPARTMENT COST ALLOCATION TAB */}
            {/* ============================================================== */}
            {activeTab === "dept" && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Department-wise Payroll Cost & Budget Distribution
                    </h2>
                    <p className="text-xs text-slate-500">
                      Allocates total CTC cost including company statutory contributions across business units
                    </p>
                  </div>
                  <button
                    onClick={handleExportDept}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Distribution CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto" data-lenis-prevent="true">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4 text-center">Headcount</th>
                        <th className="py-3 px-4 text-right">Gross Earnings</th>
                        <th className="py-3 px-4 text-right">Employer Contributions</th>
                        <th className="py-3 px-4 text-right font-bold text-slate-900">Total Employer CTC</th>
                        <th className="py-3 px-4 text-right">Employee Deductions</th>
                        <th className="py-3 px-4 text-right font-semibold text-emerald-700">Net Disbursed</th>
                        <th className="py-3 px-4 text-right">% of Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deptList.map((d) => {
                        const totalCtc = d.gross + d.employerCost;
                        const grandCtc = totalGross + (totalEpfEr + totalEps + totalEdli + totalAdminCharges + totalEsicEr);
                        const pct = grandCtc > 0 ? (totalCtc / grandCtc) * 100 : 0;
                        return (
                          <tr key={d.name} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              <span>{d.name}</span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-medium">{d.headcount}</td>
                            <td className="py-3 px-4 text-right font-mono">₹{d.gross.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600">₹{d.employerCost.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{totalCtc.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono text-rose-600">₹{d.deductions.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">₹{d.net.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-800">
                                {pct.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                        <td className="py-3 px-4">All Departments ({parsedSlips.length} Total Employees)</td>
                        <td className="py-3 px-4 text-center font-mono">{parsedSlips.length}</td>
                        <td className="py-3 px-4 text-right font-mono">₹{totalGross.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono">
                          ₹{(totalEpfEr + totalEps + totalEdli + totalAdminCharges + totalEsicEr).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-violet-700">
                          ₹{(totalGross + totalEpfEr + totalEps + totalEdli + totalAdminCharges + totalEsicEr).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-700">
                          ₹{(totalEpfEe + totalEsicEe + totalPt + totalTds).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700">₹{totalNet.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono">100.0%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatutoryReportsPage;
