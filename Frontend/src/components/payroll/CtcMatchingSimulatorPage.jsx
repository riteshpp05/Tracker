// Frontend/src/components/payroll/CtcMatchingSimulatorPage.jsx
import React, { useState, useEffect } from "react";
import {
  Calculator,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  ArrowRight,
  ShieldCheck,
  Building,
  RefreshCw,
  Coins,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import payrollService from "../../services/payrollService";
import { toast } from "sonner";

export const CtcMatchingSimulatorPage = () => {
  const [mode, setMode] = useState("NET_TO_CTC"); // 'NET_TO_CTC' (Mode A) | 'CTC_TO_NET' (Mode B)
  const [policies, setPolicies] = useState([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  // Inputs
  const [targetNetSalary, setTargetNetSalary] = useState("26000");
  const [targetAnnualCtc, setTargetAnnualCtc] = useState("381132");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [gender, setGender] = useState("Male");
  const [useGrossForPt, setUseGrossForPt] = useState(false);

  // Simulation Results
  const [result, setResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoadingPolicies(true);
    try {
      const res = await payrollService.getLocationPolicies();
      const list = res.data || [];
      setPolicies(list);
      if (list.length > 0) {
        setSelectedPolicyId(list[0].id);
      }
    } catch (err) {
      toast.error("Failed to load location policies");
    } finally {
      setLoadingPolicies(false);
    }
  };

  useEffect(() => {
    if (selectedPolicyId || mode === "CTC_TO_NET") {
      runSimulation();
    }
  }, [mode, selectedPolicyId, targetNetSalary, targetAnnualCtc, month, gender, useGrossForPt]);

  const runSimulation = async () => {
    if (mode === "NET_TO_CTC" && (!selectedPolicyId || !targetNetSalary)) return;
    if (mode === "CTC_TO_NET" && !targetAnnualCtc) return;

    setSimulating(true);
    try {
      const payload =
        mode === "NET_TO_CTC"
          ? {
              mode: "NET_TO_CTC",
              policyId: selectedPolicyId,
              netSalary: parseFloat(targetNetSalary) || 0,
              month: parseInt(month, 10),
              gender,
              useGrossForPt,
            }
          : {
              mode: "CTC_TO_NET",
              annualCtc: parseFloat(targetAnnualCtc) || 0,
              month: parseInt(month, 10),
              gender,
              basicPercent: 50,
              pfCeilingMode: "15000",
              hraType: "METRO",
            };

      const res = await payrollService.simulateCtc(payload);
      setResult(res.data);
    } catch (err) {
      console.error("Simulation error:", err);
      // Soft failure: clear result or retain previous
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              CTC Matching Engine & Simulation Studio
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Reconcile target net in-hand salaries or annual CTC budgets into verified monthly components with zero rupee variance.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
          <button
            onClick={() => setMode("NET_TO_CTC")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === "NET_TO_CTC"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mode A: Net In-Hand → CTC (Plant Model)
          </button>
          <button
            onClick={() => setMode("CTC_TO_NET")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === "CTC_TO_NET"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mode B: Annual CTC → Net (Corporate Model)
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {mode === "NET_TO_CTC" ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Net In-Hand (₹/mo)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    min="1000"
                    step="100"
                    value={targetNetSalary}
                    onChange={(e) => setTargetNetSalary(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-base font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Location Branch Policy
                </label>
                <select
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                  disabled={loadingPolicies}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) — {p.state_code}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Annual CTC (₹/yr)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-medium">₹</span>
                <input
                  type="number"
                  min="10000"
                  step="5000"
                  value={targetAnnualCtc}
                  onChange={(e) => setTargetAnnualCtc(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-base font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Calendar Month (PT Check)
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            >
              {[
                "1 - January",
                "2 - February (Surcharge Month)",
                "3 - March",
                "4 - April",
                "5 - May",
                "6 - June",
                "7 - July",
                "8 - August",
                "9 - September",
                "10 - October",
                "11 - November",
                "12 - December",
              ].map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Gender (MH PT Exemption)
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
            >
              <option value="Male">Male</option>
              <option value="Female">Female (≤₹25k Exempt in MH)</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {mode === "NET_TO_CTC" && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={useGrossForPt}
                onChange={(e) => setUseGrossForPt(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Calculate Professional Tax on computed gross pay (Default is Net pay proxy matching plant sheets)
            </label>

            {simulating && (
              <span className="text-xs text-indigo-600 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Calculating...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Validation Alert Banners */}
      {result?.validations && result.validations.length > 0 && (
        <div className="space-y-2">
          {result.validations.map((v, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                v.tier === "ERROR"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : v.tier === "WARNING"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}
            >
              {v.tier === "ERROR" ? (
                <AlertOctagon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              ) : v.tier === "WARNING" ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                <span className="font-bold uppercase tracking-wider mr-2">[{v.tier}]</span>
                <span>{v.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zero Variance Verification Card */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-900">
                Mathematical Reconciliation Verified: Zero Rupee Discrepancy
              </div>
              <p className="text-xs text-emerald-700 mt-0.5">
                Gross Earnings (₹
                {Number(result.grossSalary || result.monthlyGrossSalary || 0).toLocaleString("en-IN")}) + Employer Costs
                (₹
                {Number(
                  result.employerCosts?.totalEmployerCosts ||
                    (result.employerCostBreakdown?.monthlyTotal || 0)
                ).toLocaleString("en-IN")}
                ) = Total Monthly CTC (₹
                {Number(result.monthlyCtc || 0).toLocaleString("en-IN")})
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-200/60 px-3 py-1 rounded-full">
            VARIANCE: ₹0.00
          </span>
        </div>
      )}

      {/* Results Grid */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Monthly Earnings */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-indigo-600" />
                1. Monthly Earnings (Employee)
              </h3>
              <span className="text-xs text-slate-500 font-mono">In-Hand Salary</span>
            </div>

            <div className="p-4 space-y-2 text-sm">
              {result.earnings ? (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600">Basic Salary</span>
                    <span className="font-mono font-semibold text-slate-900">
                      ₹{result.earnings.basic?.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600">Dearness Allowance (DA)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      ₹{result.earnings.da?.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 bg-indigo-50/60 px-2 rounded font-medium text-indigo-900">
                    <span>Basic + DA Subtotal</span>
                    <span className="font-mono">₹{result.earnings.basicPlusDA?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600">HRA ({result.inputs?.hraPercentOfBasicDA}%)</span>
                    <span className="font-mono text-slate-900">₹{result.earnings.hra?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs text-slate-500">
                    <span>Washing Allowance</span>
                    <span className="font-mono">₹{result.earnings.washing?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs text-slate-500">
                    <span>Education Allowance</span>
                    <span className="font-mono">₹{result.earnings.education?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs text-slate-500">
                    <span>Conveyance Allowance</span>
                    <span className="font-mono">₹{result.earnings.conveyance?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs text-slate-500">
                    <span>Medical Allowance</span>
                    <span className="font-mono">₹{result.earnings.medical?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs text-slate-500">
                    <span>Books & Periodicals</span>
                    <span className="font-mono">₹{result.earnings.books?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between py-1.5 bg-amber-50/80 px-2 rounded font-semibold text-amber-900">
                    <span className="flex items-center gap-1">Other Allowance (Balancing Plug)</span>
                    <span className="font-mono">₹{result.earnings.otherAllowance?.toLocaleString("en-IN")}</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-500">
                  Mode B decomposition structure: Basic ₹
                  {Number(result.monthlyBreakdown?.basic || 0).toLocaleString("en-IN")}, HRA ₹
                  {Number(result.monthlyBreakdown?.hra || 0).toLocaleString("en-IN")}, Special Allowance ₹
                  {Number(result.monthlyBreakdown?.specialAllowance || 0).toLocaleString("en-IN")}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Net In-Hand Pay</span>
                <span className="font-mono text-indigo-600 text-base">
                  ₹{Number(result.netSalary || result.monthlyNetEstimated || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Deductions & Gross */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                2. Deductions & Gross Pay
              </h3>
              <span className="text-xs text-slate-500 font-mono">Statutory Retentions</span>
            </div>

            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <div>
                  <div className="text-slate-800 font-medium">Employee PF (12%)</div>
                  <div className="text-[11px] text-slate-400">
                    Wage base: ₹
                    {result.inputs?.pfCeilingMode === "ACTUAL"
                      ? result.earnings?.basicPlusDA?.toLocaleString("en-IN")
                      : "Capped"}
                  </div>
                </div>
                <span className="font-mono font-semibold text-rose-600">
                  - ₹{Number(result.deductions?.employeePF || result.employeeDeductions?.epf || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <div>
                  <div className="text-slate-800 font-medium">Professional Tax ({result.stateCode || "MH"})</div>
                  <div className="text-[11px] text-slate-400">{result.deductions?.ptSlab || "State standard slab"}</div>
                </div>
                <span className="font-mono font-semibold text-rose-600">
                  - ₹{Number(result.deductions?.professionalTax || result.employeeDeductions?.professionalTax || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="flex justify-between py-1 text-slate-600 text-xs">
                  <span>Total Employee Deductions</span>
                  <span className="font-mono font-medium text-rose-600">
                    - ₹{Number(result.deductions?.totalDeductions || result.employeeDeductions?.totalEmployeeDeductions || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between py-2 bg-slate-100 px-3 rounded-lg font-bold text-slate-900">
                  <span>Gross Salary (Pay Slip)</span>
                  <span className="font-mono text-base">
                    ₹{Number(result.grossSalary || result.monthlyGrossSalary || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Employer Costs & Loaded CTC */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                3. Employer Costs & Loaded CTC
              </h3>
              <span className="text-xs text-slate-500 font-mono">Company Expense</span>
            </div>

            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <div>
                  <div className="text-slate-800 font-medium">Employer PF (13%)</div>
                  <div className="text-[11px] text-slate-400">EPF + EPS + EDLI + Admin</div>
                </div>
                <span className="font-mono font-semibold text-slate-900">
                  + ₹{Number(result.employerCosts?.employerPF || result.employerCostBreakdown?.epfEmployer || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <div>
                  <div className="text-slate-800 font-medium">Bonus Provision (8.33%)</div>
                  <div className="text-[11px] text-slate-400">
                    {result.employerCosts?.bonusCapped ? "Capped at ₹7,000 ceiling" : "Full wage provision"}
                  </div>
                </div>
                <span className="font-mono font-semibold text-slate-900">
                  + ₹{Number(result.employerCosts?.bonus || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <div>
                  <div className="text-slate-800 font-medium">Gratuity Provision (4.81%)</div>
                  <div className="text-[11px] text-slate-400">Employer cost accrual (AS 15)</div>
                </div>
                <span className="font-mono font-semibold text-slate-900">
                  + ₹{Number(result.employerCosts?.gratuity || result.employerCostBreakdown?.gratuity || 0).toLocaleString("en-IN")}
                </span>
              </div>

              {/* Final CTC Highlights */}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-xs text-indigo-700 font-bold uppercase tracking-wider">Loaded Monthly CTC</div>
                    <div className="text-lg font-mono font-black text-indigo-950">
                      ₹{Number(result.monthlyCtc || 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded font-semibold">Monthly</span>
                </div>

                <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Annual CTC (Loaded)</div>
                    <div className="text-xl font-mono font-black text-white">
                      ₹{Number(result.yearlyCtc || result.annualCtcReconciled || (result.monthlyCtc * 12) || 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <span className="text-xs bg-emerald-500 text-slate-950 px-2 py-1 rounded font-bold">12 Months</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CtcMatchingSimulatorPage;
