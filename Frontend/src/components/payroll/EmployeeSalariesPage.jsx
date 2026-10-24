// Frontend/src/components/payroll/EmployeeSalariesPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard, Search, Filter, Plus, Edit2, Building,
  CheckCircle2, X, FileText, AlertCircle, Eye,
  Calculator, ChevronDown, ChevronUp, Info, RefreshCw,
  TrendingUp, Shield, Zap, MapPin,
} from "lucide-react";
import payrollService from "../../services/payrollService";
import { toast } from "sonner";

// ─────────────────────────────────────────────
//  Pure-math CTC breakup engine (client-side)
//  Mirrors the backend formula exactly so HR
//  sees live results before hitting Save.
// ─────────────────────────────────────────────
function computeCtcBreakup({ annualCtc, pfCeilingMode = "15000", hraType = "METRO", basicPercent = 50, month = new Date().getMonth() + 1, gender = "Male" }) {
  const annual = Math.max(0, Number(annualCtc) || 0);
  if (!annual) return null;

  const monthlyCtc = Math.round(annual / 12);
  const basicPct = Math.min(70, Math.max(30, Number(basicPercent) || 50));
  const basic = Math.round(monthlyCtc * (basicPct / 100));
  const hraPct = hraType === "METRO" ? 0.5 : 0.4;
  const hra = Math.round(basic * hraPct);
  const gratuity = Math.round(basic * 0.0481);

  // PF ceiling
  let wageCeiling = pfCeilingMode === "25000" ? 25000 : pfCeilingMode === "ACTUAL" ? basic : 15000;
  const pfWage = Math.min(basic, wageCeiling);
  const employeePF = Math.round(pfWage * 0.12);
  const epsWage = Math.min(basic, 15000);
  const employerEPS = Math.round(epsWage * 0.0833);
  const employerEPF = Math.max(0, Math.round(pfWage * 0.12) - employerEPS);
  const employerEDLI = Math.round(epsWage * 0.005);
  const employerAdmin = Math.round(pfWage * 0.005);
  const employerPF = employerEPS + employerEPF + employerEDLI + employerAdmin;

  // ESIC on estimated gross (before special)
  const estimatedGross = basic + hra;
  const esicEligible = estimatedGross <= 21000;
  const employerESIC = esicEligible ? Math.round(estimatedGross * 0.0325) : 0;
  const employeeESIC = esicEligible ? Math.ceil(estimatedGross * 0.0075) : 0;

  // Special allowance — balancing figure
  const special = Math.max(0, monthlyCtc - basic - hra - employerPF - employerESIC - gratuity);
  const grossPay = basic + hra + special;

  // PT (Maharashtra)
  let pt = 0;
  const isFemale = gender.toLowerCase().startsWith("f");
  if (isFemale && grossPay <= 25000) pt = 0;
  else if (grossPay <= 7500) pt = 0;
  else if (grossPay <= 10000) pt = 175;
  else pt = month === 2 ? 300 : 200;

  // TDS estimate (new regime)
  const annualGross = grossPay * 12;
  const taxable = Math.max(0, annualGross - 75000);
  let tax = 0;
  if (taxable > 700000) {
    if (taxable > 1500000) { tax += (taxable - 1500000) * 0.3; tax += 300000 * 0.2 + 200000 * 0.15 + 300000 * 0.1 + 400000 * 0.05; }
    else if (taxable > 1200000) { tax += (taxable - 1200000) * 0.2; tax += 200000 * 0.15 + 300000 * 0.1 + 400000 * 0.05; }
    else if (taxable > 1000000) { tax += (taxable - 1000000) * 0.15; tax += 300000 * 0.1 + 400000 * 0.05; }
    else { tax += (taxable - 700000) * 0.1; tax += 400000 * 0.05; }
  }
  const annualTax = Math.round(tax * 1.04);
  const monthlyTDS = Math.round(annualTax / 12);

  const totalDeductions = employeePF + employeeESIC + pt + monthlyTDS;
  const netInHand = grossPay - totalDeductions;
  const reconstructedCtc = basic + hra + special + employerPF + employerESIC + gratuity;
  const ctcVariance = Math.abs(monthlyCtc - reconstructedCtc);

  return {
    annual, monthlyCtc, basic, hra, special, grossPay,
    employeePF, employeeESIC, pt, monthlyTDS, totalDeductions, netInHand,
    employerPF, employerESIC, gratuity,
    pfWage, wageCeiling,
    ctcVariance, ctcMatchOk: ctcVariance <= 1,
    basicPct, hraType, pfCeilingMode,
  };
}

function fmt(n) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

// ─────────────────────────────────────────────
//  CTC Breakup Preview Card
// ─────────────────────────────────────────────
function CtcBreakupCard({ result }) {
  const [expanded, setExpanded] = useState(false);
  if (!result) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-600 text-white">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wide">CTC BREAKUP ANALYSIS</span>
        </div>
        {result.ctcMatchOk ? (
          <span className="flex items-center gap-1 text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> ✓ Zero Variance
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-bold bg-red-500/30 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-3.5 h-3.5" /> Δ ₹{result.ctcVariance}
          </span>
        )}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 divide-x divide-emerald-100 border-b border-emerald-100">
        {[
          { label: "Monthly CTC", value: fmt(result.monthlyCtc), sub: "Cost to Company" },
          { label: "Monthly Gross", value: fmt(result.grossPay), sub: "Earnings before deductions" },
          { label: "Net In-Hand", value: fmt(result.netInHand), sub: "Monthly bank credit" },
          { label: "Annual Net", value: fmt(result.netInHand * 12), sub: "Annualised take-home" },
        ].map((item) => (
          <div key={item.label} className="p-3 text-center">
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">{item.label}</div>
            <div className="text-sm font-bold text-slate-900 tabular-nums">{item.value}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Earnings + Deductions two-column */}
      <div className="grid grid-cols-2 gap-0 divide-x divide-emerald-100">
        {/* Earnings */}
        <div className="p-3 space-y-1.5 text-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Earnings (Monthly)
          </div>
          {[
            { label: `Basic (${result.basicPct}%)`, value: result.basic },
            { label: `HRA (${result.hraType === "METRO" ? "50%" : "40%"} of Basic)`, value: result.hra },
            { label: "Special Allowance", value: result.special, highlight: true },
          ].map((r) => (
            <div key={r.label} className={`flex justify-between ${r.highlight ? "font-semibold text-emerald-700" : "text-slate-700"}`}>
              <span>{r.label}</span>
              <span className="font-mono">{fmt(r.value)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-1.5 mt-1.5">
            <span>Gross Pay</span>
            <span className="font-mono">{fmt(result.grossPay)}</span>
          </div>
        </div>

        {/* Deductions */}
        <div className="p-3 space-y-1.5 text-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Deductions (Monthly)
          </div>
          {[
            { label: `Employee PF (12% of ${fmt(result.pfWage)})`, value: result.employeePF },
            { label: "Employee ESIC (0.75%)", value: result.employeeESIC },
            { label: "Professional Tax", value: result.pt },
            { label: "TDS (Est. New Regime)", value: result.monthlyTDS },
          ].map((r) => (
            <div key={r.label} className="flex justify-between text-slate-700">
              <span className="text-slate-600">{r.label}</span>
              <span className="font-mono text-rose-600">{fmt(r.value)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-1.5 mt-1.5">
            <span>Net In-Hand</span>
            <span className="font-mono text-emerald-700">{fmt(result.netInHand)}</span>
          </div>
        </div>
      </div>

      {/* Employer contributions (toggle) */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition border-t border-emerald-100 cursor-pointer"
      >
        <span>Employer Statutory Contributions (CTC components)</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 grid grid-cols-3 gap-3 text-xs border-t border-emerald-100 bg-slate-50/50">
          {[
            { label: "Employer PF (incl. EPS+EDLI+Admin)", value: result.employerPF },
            { label: "Employer ESIC (3.25%)", value: result.employerESIC },
            { label: "Gratuity Provision (4.81%)", value: result.gratuity },
          ].map((r) => (
            <div key={r.label} className="pt-3">
              <div className="text-[10px] text-slate-500 font-semibold">{r.label}</div>
              <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">{fmt(r.value)}</div>
            </div>
          ))}
          <div className="col-span-3 border-t border-slate-100 pt-2 text-[10px] text-slate-400 flex items-center gap-1">
            <Info className="w-3 h-3" />
            EPS wage ceiling is always ₹15,000 per EPFO statute (EPS-95 Act). PF ceiling applies to employee & employer EPF contributions only.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main Page Component
// ─────────────────────────────────────────────
export const EmployeeSalariesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // CTC calculator state
  const [ctcInputs, setCtcInputs] = useState({
    annualCtc: "",
    pfCeilingMode: "15000",
    hraType: "METRO",
    basicPercent: 50,
    gender: "Male",
  });
  const [ctcResult, setCtcResult] = useState(null);

  // Assign form
  const [assignForm, setAssignForm] = useState({
    employee_id: "",
    structure_id: "",
    from_date: new Date().toISOString().split("T")[0],
    base_monthly_salary: "",
    ctc_annual: "",
    notes: "",
  });

  // Bank form
  const [bankForm, setBankForm] = useState({
    pan_number: "", bank_name: "", bank_account_no: "", ifsc_code: "",
    uan_number: "", pf_number: "", esi_number: "", tax_regime: "New", payment_mode: "Bank",
  });

  useEffect(() => { loadData(); }, []);

  // Live CTC calculation
  useEffect(() => {
    if (ctcInputs.annualCtc && Number(ctcInputs.annualCtc) > 0) {
      const result = computeCtcBreakup(ctcInputs);
      setCtcResult(result);
      // Auto-fill base salary
      if (result) {
        setAssignForm((f) => ({
          ...f,
          base_monthly_salary: String(result.basic),
          ctc_annual: String(ctcInputs.annualCtc),
        }));
      }
    } else {
      setCtcResult(null);
    }
  }, [ctcInputs]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [asgnRes, structRes] = await Promise.all([
        payrollService.getAssignments(),
        payrollService.getStructures(),
      ]);
      setEmployees(asgnRes.data || []);
      setStructures(structRes.data || []);
    } catch (err) {
      console.error("Error loading employee salaries:", err);
      toast.error("Failed to load employee salary profiles");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignModal = (emp = null) => {
    setCtcResult(null);
    setCtcInputs({ annualCtc: "", pfCeilingMode: "15000", hraType: "METRO", basicPercent: 50, gender: "Male" });
    if (emp) {
      setSelectedEmp(emp);
      const annual = emp.ctc_annual || "";
      setAssignForm({
        employee_id: emp.employee_id,
        structure_id: emp.structure_id || (structures[0]?.id || ""),
        from_date: new Date().toISOString().split("T")[0],
        base_monthly_salary: emp.base_monthly_salary || "",
        ctc_annual: annual,
        notes: `Salary assignment revision for ${emp.employee_code}`,
      });
      if (annual) {
        setCtcInputs((p) => ({ ...p, annualCtc: String(annual) }));
      }
    } else {
      setSelectedEmp(null);
      setAssignForm({
        employee_id: employees[0]?.employee_id || "",
        structure_id: structures[0]?.id || "",
        from_date: new Date().toISOString().split("T")[0],
        base_monthly_salary: "",
        ctc_annual: "",
        notes: "New compensation assignment",
      });
    }
    setIsAssignModalOpen(true);
  };

  const handleOpenBankModal = (emp) => {
    setSelectedEmp(emp);
    setBankForm({
      pan_number: emp.pan_number || "",
      bank_name: emp.bank_name || "HDFC Bank Ltd",
      bank_account_no: emp.bank_account_no || "",
      ifsc_code: emp.ifsc_code || "HDFC0000123",
      uan_number: emp.uan_number || "",
      pf_number: emp.pf_number || "",
      esi_number: emp.esi_number || "",
      tax_regime: emp.tax_regime || "New",
      payment_mode: emp.payment_mode || "Bank",
    });
    setIsBankModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.employee_id || !assignForm.structure_id || !assignForm.base_monthly_salary) {
      toast.error("Please fill in all mandatory compensation fields");
      return;
    }
    try {
      await payrollService.createAssignment({
        ...assignForm,
        base_monthly_salary: Number(assignForm.base_monthly_salary),
        ctc_annual: Number(assignForm.ctc_annual) || Number(assignForm.base_monthly_salary) * 24,
      });
      toast.success("Compensation structure assigned successfully");
      setIsAssignModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to assign salary structure");
    }
  };

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;
    try {
      await payrollService.updateEmployeeStatutoryBanking(selectedEmp.employee_id, bankForm);
      toast.success("Banking & statutory details updated successfully");
      setIsBankModalOpen(false);
      loadData();
    } catch (err) {
      toast.error("Failed to update employee details");
    }
  };

  // Filter
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.designation && emp.designation.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = deptFilter === "ALL" || String(emp.department) === String(deptFilter);
    return matchesSearch && matchesDept;
  });

  const departments = [...new Set(employees.map((e) => e.department_name).filter(Boolean))];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
              Employee Salaries & Statutory Setup
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-violet-100 text-[#6558D9]">
              CTC Engine v2
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reverse CTC calculator with zero-mismatch guarantee · Configurable PF ceiling (₹15K / ₹25K / Actual) · Effective-dated compensation
          </p>
        </div>
        <button
          onClick={() => handleOpenAssignModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#111827] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Assign / Revise Salary</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by code, name, designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#6558D9] transition"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 outline-hidden cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept, idx) => (
              <option key={idx} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Department & Role</th>
                <th className="px-4 py-3.5">Salary Structure</th>
                <th className="px-4 py-3.5 text-right">Base Salary</th>
                <th className="px-4 py-3.5 text-right">Annual CTC</th>
                <th className="px-4 py-3.5">Bank & IFSC</th>
                <th className="px-4 py-3.5">PAN / UAN</th>
                <th className="px-4 py-3.5 text-center">Tax Regime</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading salary records…
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400 text-xs">
                    No matching employee records found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-50/75 transition">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900">{emp.first_name} {emp.last_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{emp.employee_code}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800">{emp.department_name || "Engineering"}</div>
                      <div className="text-[11px] text-slate-400">{emp.designation || "Staff"}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      {emp.structure_name ? (
                        <span className="px-2 py-0.5 rounded-md bg-violet-50 text-[#6558D9] font-medium text-[11px] border border-violet-100">
                          {emp.structure_name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-rose-500 font-semibold">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {fmt(emp.base_monthly_salary)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-700 tabular-nums">
                      {fmt(emp.ctc_annual)}
                    </td>
                    <td className="px-4 py-3.5 text-[11px]">
                      {emp.bank_account_no ? (
                        <div>
                          <div className="font-mono text-slate-800">{emp.bank_name || "Bank"}</div>
                          <div className="text-slate-400 font-mono">
                            •••• {emp.bank_account_no.slice(-4)} ({emp.ifsc_code})
                          </div>
                        </div>
                      ) : (
                        <span className="text-rose-500 font-medium">Missing Bank</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px]">
                      <div>{emp.pan_number || <span className="text-amber-600 font-semibold">No PAN</span>}</div>
                      <div className="text-slate-400">{emp.uan_number ? `UAN: ${emp.uan_number}` : ""}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                        {emp.tax_regime || "New"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenBankModal(emp)}
                          title="Edit Banking & Statutory"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenAssignModal(emp)}
                          title="Revise Salary Structure"
                          className="p-1.5 rounded-lg text-violet-600 hover:text-violet-900 hover:bg-violet-50 transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal 1: Assign / Revise Salary — with CTC Calculator ─── */}
      {isAssignModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
          data-lenis-prevent="true"
        >
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {selectedEmp ? `Revise Salary: ${selectedEmp.first_name} ${selectedEmp.last_name}` : "Assign Salary Structure"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Enter Annual CTC below — the system auto-calculates the full statutory breakup with zero mismatch
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* ── CTC Calculator Panel ── */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Reverse CTC Calculator</div>
                    <div className="text-[11px] text-slate-500">Auto-derives Basic, HRA & Special Allowance from Annual CTC</div>
                  </div>
                </div>

                {/* Inputs row */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block font-semibold text-slate-700 mb-1">Annual CTC (₹) *</label>
                    <input
                      type="number"
                      step="10000"
                      placeholder="e.g. 1200000"
                      value={ctcInputs.annualCtc}
                      onChange={(e) => setCtcInputs((p) => ({ ...p, annualCtc: e.target.value }))}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" /> PF Wage Ceiling
                      </span>
                    </label>
                    <select
                      value={ctcInputs.pfCeilingMode}
                      onChange={(e) => setCtcInputs((p) => ({ ...p, pfCeilingMode: e.target.value }))}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer text-slate-700"
                    >
                      <option value="15000">₹15,000 — Legacy (pre-amendment)</option>
                      <option value="25000">₹25,000 — Enhanced (2025 proposal)</option>
                      <option value="ACTUAL">Actual Basic — Full wage PF</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> HRA City Type
                      </span>
                    </label>
                    <select
                      value={ctcInputs.hraType}
                      onChange={(e) => setCtcInputs((p) => ({ ...p, hraType: e.target.value }))}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer text-slate-700"
                    >
                      <option value="METRO">Metro (50% of Basic)</option>
                      <option value="NON_METRO">Non-Metro (40% of Basic)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Basic % of Monthly CTC</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="30"
                        max="70"
                        step="5"
                        value={ctcInputs.basicPercent}
                        onChange={(e) => setCtcInputs((p) => ({ ...p, basicPercent: Number(e.target.value) }))}
                        className="flex-1 accent-violet-600"
                      />
                      <span className="font-bold text-violet-700 w-8 text-center">{ctcInputs.basicPercent}%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Gender (PT exemption)</label>
                    <select
                      value={ctcInputs.gender}
                      onChange={(e) => setCtcInputs((p) => ({ ...p, gender: e.target.value }))}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer text-slate-700"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female (PT exempt ≤₹25K)</option>
                    </select>
                  </div>
                </div>

                {/* Live Breakup Card */}
                {ctcResult && <CtcBreakupCard result={ctcResult} />}
              </div>

              {/* ── Assignment Form ── */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Compensation Assignment</div>

                {!selectedEmp && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Select Employee *</label>
                    <select
                      value={assignForm.employee_id}
                      onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      required
                    >
                      {employees.map((e) => (
                        <option key={e.employee_id} value={e.employee_id}>
                          {e.employee_code} — {e.first_name} {e.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Salary Structure Template *</label>
                    <select
                      value={assignForm.structure_id}
                      onChange={(e) => setAssignForm({ ...assignForm, structure_id: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      required
                    >
                      {structures.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Effective Start Date *</label>
                    <input
                      type="date"
                      value={assignForm.from_date}
                      onChange={(e) => setAssignForm({ ...assignForm, from_date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Base Monthly Salary (₹)
                      {ctcResult && <span className="ml-1 text-emerald-600 font-normal">(auto-filled from CTC)</span>}
                    </label>
                    <input
                      type="number"
                      step="100"
                      placeholder="e.g. 50000"
                      value={assignForm.base_monthly_salary}
                      onChange={(e) => setAssignForm({ ...assignForm, base_monthly_salary: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Annual CTC (₹)</label>
                    <input
                      type="number"
                      step="1000"
                      placeholder="e.g. 1200000"
                      value={assignForm.ctc_annual}
                      onChange={(e) => {
                        setAssignForm({ ...assignForm, ctc_annual: e.target.value });
                        setCtcInputs((p) => ({ ...p, annualCtc: e.target.value }));
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Revision Notes / Reason</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Annual appraisal, promotion, or restructuring"
                    value={assignForm.notes}
                    onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Footer */}
              <form onSubmit={handleAssignSubmit}>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#111827] text-white rounded-xl font-semibold hover:bg-slate-800 cursor-pointer transition"
                  >
                    Save Salary Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Banking & Statutory Details ─── */}
      {isBankModalOpen && selectedEmp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
          data-lenis-prevent="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Banking & Statutory Details</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedEmp.employee_code} — {selectedEmp.first_name} {selectedEmp.last_name}
                </p>
              </div>
              <button
                onClick={() => setIsBankModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBankSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankForm.bank_name}
                    onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="e.g. HDFC Bank"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={bankForm.bank_account_no}
                    onChange={(e) => setBankForm({ ...bankForm, bank_account_no: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    placeholder="e.g. 5010012345678"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={bankForm.ifsc_code}
                    onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                    placeholder="e.g. HDFC0000123"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={bankForm.payment_mode}
                    onChange={(e) => setBankForm({ ...bankForm, payment_mode: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Bank">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Indian Statutory Identifiers
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">PAN Number</label>
                    <input
                      type="text"
                      value={bankForm.pan_number}
                      onChange={(e) => setBankForm({ ...bankForm, pan_number: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                      placeholder="e.g. ABCDE1234F"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tax Regime</label>
                    <select
                      value={bankForm.tax_regime}
                      onChange={(e) => setBankForm({ ...bankForm, tax_regime: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="New">New Regime (Section 115BAC)</option>
                      <option value="Old">Old Regime</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Universal A/C No. (UAN)</label>
                    <input
                      type="text"
                      value={bankForm.uan_number}
                      onChange={(e) => setBankForm({ ...bankForm, uan_number: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      placeholder="e.g. 101234567890"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">PF Account Number</label>
                    <input
                      type="text"
                      value={bankForm.pf_number}
                      onChange={(e) => setBankForm({ ...bankForm, pf_number: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      placeholder="e.g. MH/BAN/0012345/001"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#111827] text-white rounded-xl font-semibold hover:bg-slate-800 cursor-pointer transition"
                >
                  Save Banking Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeSalariesPage;
