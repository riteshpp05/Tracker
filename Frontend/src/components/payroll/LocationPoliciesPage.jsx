// Frontend/src/components/payroll/LocationPoliciesPage.jsx
import React, { useState, useEffect } from "react";
import {
  Sliders,
  Plus,
  Edit2,
  Trash2,
  History,
  Users,
  CheckCircle2,
  AlertTriangle,
  Building,
  ShieldCheck,
  X,
  FileText,
  Percent,
  Coins,
  ChevronRight,
  Info,
} from "lucide-react";
import payrollService from "../../services/payrollService";
import { toast } from "sonner";

const DEFAULT_POLICY_FORM = {
  name: "",
  code: "",
  description: "",
  state_code: "MH",
  basic_calculation_mode: "PERCENT_OF_NET",
  basic_percent_of_net: 50.0,
  basic_percent_of_ctc: 40.0,
  da_fixed_amount: 0.0,
  hra_percent_of_basic_da: 5.0,
  washing_allowance: 1000.0,
  education_allowance: 1200.0,
  conveyance_allowance: 1750.0,
  medical_allowance: 1000.0,
  books_periodicals: 1000.0,
  pf_ceiling_mode: "ACTUAL",
  employee_pf_rate: 0.12,
  employer_pf_rate: 0.13,
  bonus_rate: 0.0833,
  gratuity_rate: 0.0481,
  default_assessment_year: "AY_2026_27",
  default_tax_regime: "NEW",
  esic_employer_rate: 0.0325,
  esic_employee_rate: 0.0075,
};

export const LocationPoliciesPage = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [activePolicy, setActivePolicy] = useState(null);
  const [form, setForm] = useState(DEFAULT_POLICY_FORM);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await payrollService.getLocationPolicies(true);
      setPolicies(res.data || []);
    } catch (err) {
      console.error("Error loading location policies:", err);
      toast.error("Failed to load location policies");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setForm(DEFAULT_POLICY_FORM);
    setActivePolicy(null);
    setModalMode("create");
  };

  const handleOpenEdit = (policy) => {
    setActivePolicy(policy);
    setForm({
      name: policy.name || "",
      code: policy.code || "",
      description: policy.description || "",
      state_code: policy.state_code || "MH",
      basic_calculation_mode: policy.basic_calculation_mode || "PERCENT_OF_NET",
      basic_percent_of_net: Number(policy.basic_percent_of_net) || 50.0,
      basic_percent_of_ctc: Number(policy.basic_percent_of_ctc) || 40.0,
      da_fixed_amount: Number(policy.da_fixed_amount) || 0.0,
      hra_percent_of_basic_da: Number(policy.hra_percent_of_basic_da) || 5.0,
      washing_allowance: Number(policy.washing_allowance) || 1000.0,
      education_allowance: Number(policy.education_allowance) || 1200.0,
      conveyance_allowance: Number(policy.conveyance_allowance) || 1750.0,
      medical_allowance: Number(policy.medical_allowance) || 1000.0,
      books_periodicals: Number(policy.books_periodicals) || 1000.0,
      pf_ceiling_mode: policy.pf_ceiling_mode || "ACTUAL",
      employee_pf_rate: Number(policy.employee_pf_rate) || 0.12,
      employer_pf_rate: Number(policy.employer_pf_rate) || 0.13,
      bonus_rate: Number(policy.bonus_rate) || 0.0833,
      gratuity_rate: Number(policy.gratuity_rate) || 0.0481,
      default_assessment_year: policy.default_assessment_year || "AY_2026_27",
      default_tax_regime: policy.default_tax_regime || "NEW",
      esic_employer_rate: Number(policy.esic_employer_rate) || 0.0325,
      esic_employee_rate: Number(policy.esic_employee_rate) || 0.0075,
    });
    setModalMode("edit");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Policy Name and Unique Code are required");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "create") {
        await payrollService.createLocationPolicy(form);
        toast.success("Location policy created successfully");
      } else {
        await payrollService.updateLocationPolicy(activePolicy.id, form);
        toast.success("Location policy updated successfully");
      }
      setModalMode(null);
      await loadPolicies();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.error || "Failed to save location policy");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (policy) => {
    if (!window.confirm(`Are you sure you want to deactivate policy "${policy.name}"?`)) return;
    try {
      await payrollService.deleteLocationPolicy(policy.id);
      toast.success("Location policy deactivated");
      await loadPolicies();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to deactivate policy");
    }
  };

  const handleViewHistory = async (policy) => {
    setActivePolicy(policy);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await payrollService.getLocationPolicyHistory(policy.id);
      setHistoryRecords(res.data || []);
    } catch (err) {
      toast.error("Failed to load policy change history");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Location Payroll Policies</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Configure branch-specific statutory rates, fixed allowances, Dearness Allowance (DA), and matching criteria without code deployment.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Location Policy
        </button>
      </div>

      {/* Info Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">Dynamic Statutory Configuration</p>
          <p className="mt-0.5">
            All formula percentages and state professional tax rules are managed dynamically. When tax slabs or policy criteria change, updating this panel will immediately update the Mode-A Net-to-CTC engine and monthly payroll calculations for linked employees.
          </p>
        </div>
      </div>

      {/* Policies Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-500" />
            Configured Branch Policies ({policies.length})
          </h2>
          <span className="text-xs text-slate-500">Supports 300+ employees across multi-branch networks</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading location policies...</div>
        ) : policies.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Building className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">No Location Policies Configured</p>
            <p className="text-sm text-slate-400 mt-1">Create your first branch policy to configure custom DA, allowances, and statutory rules.</p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" /> Create Location Policy
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
                  <th className="py-3 px-4">Policy / Code</th>
                  <th className="py-3 px-4">State (PT)</th>
                  <th className="py-3 px-4">Basic Salary Mode</th>
                  <th className="py-3 px-4">Fixed DA</th>
                  <th className="py-3 px-4">HRA %</th>
                  <th className="py-3 px-4">PF Ceiling</th>
                  <th className="py-3 px-4">Cost Rates (PF/Bonus/Grat)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        {p.code}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {p.state_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {p.basic_calculation_mode === "PERCENT_OF_NET"
                        ? `${p.basic_percent_of_net}% of Net In-Hand`
                        : p.basic_calculation_mode === "PERCENT_OF_CTC"
                        ? `${p.basic_percent_of_ctc}% of CTC`
                        : "Fixed Grade"}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                      ₹{Number(p.da_fixed_amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {p.hra_percent_of_basic_da}% of (B+DA)
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                        p.pf_ceiling_mode === "ACTUAL"
                          ? "bg-emerald-50 text-emerald-700"
                          : p.pf_ceiling_mode === "25000"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {p.pf_ceiling_mode === "ACTUAL" ? "Uncapped (Actual)" : `₹${Number(p.pf_ceiling_mode).toLocaleString("en-IN")}`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                      <div>PF: {(Number(p.employer_pf_rate) * 100).toFixed(1)}%</div>
                      <div>Bonus: {(Number(p.bonus_rate) * 100).toFixed(2)}%</div>
                      <div>Gratuity: {(Number(p.gratuity_rate) * 100).toFixed(2)}%</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {p.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleViewHistory(p)}
                        title="View Audit History"
                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 inline-flex items-center"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        title="Edit Policy"
                        className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 inline-flex items-center"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {p.is_active && (
                        <button
                          onClick={() => handleDelete(p)}
                          title="Deactivate Policy"
                          className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 inline-flex items-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {modalMode === "create" ? "Create Location Payroll Policy" : `Edit Policy: ${activePolicy?.name}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define customized statutory percentages, allowances, and matching engine rules.
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Identity & Branch Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <Building className="w-4 h-4" /> 1. Policy Identification
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Policy Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Branch Alpha"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Unique Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BRANCH-ALPHA"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "-") })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      State for PT Slabs
                    </label>
                    <select
                      value={form.state_code}
                      onChange={(e) => setForm({ ...form, state_code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="MH">Maharashtra (MH Act XIX/2023)</option>
                      <option value="MP">Madhya Pradesh (MP PT Act 1995)</option>
                      <option value="GJ">Gujarat (GJ PT Act 1976)</option>
                      <option value="KA">Karnataka (KA PT Act 1976)</option>
                      <option value="TN">Tamil Nadu (No PT)</option>
                      <option value="NONE">None / Exempt</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Description / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Primary manufacturing plant staff structure"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Basic Salary & DA */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <Percent className="w-4 h-4" /> 2. Basic Pay & Dearness Allowance (DA)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Basic Calculation Mode</label>
                    <select
                      value={form.basic_calculation_mode}
                      onChange={(e) => setForm({ ...form, basic_calculation_mode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="PERCENT_OF_NET">% of Net In-Hand (Plant Standard)</option>
                      <option value="PERCENT_OF_CTC">% of Monthly CTC (Corporate Standard)</option>
                      <option value="FIXED_GRADE">Fixed Grade Scale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {form.basic_calculation_mode === "PERCENT_OF_NET" ? "Basic % of Net In-Hand" : "Basic % of CTC"}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="100"
                      value={form.basic_calculation_mode === "PERCENT_OF_NET" ? form.basic_percent_of_net : form.basic_percent_of_ctc}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (form.basic_calculation_mode === "PERCENT_OF_NET") {
                          setForm({ ...form, basic_percent_of_net: val });
                        } else {
                          setForm({ ...form, basic_percent_of_ctc: val });
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Dearness Allowance (DA Fixed ₹/mo)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={form.da_fixed_amount}
                      onChange={(e) => setForm({ ...form, da_fixed_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      HRA % of (Basic + DA)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={form.hra_percent_of_basic_da}
                      onChange={(e) => setForm({ ...form, hra_percent_of_basic_da: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <p>Formula: HRA = (Basic + DA) × {form.hra_percent_of_basic_da}%. In plant sheets, this is 5% of B+DA.</p>
                  </div>
                </div>
              </div>

              {/* Fixed Monthly Allowances */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <Coins className="w-4 h-4" /> 3. Fixed Monthly Allowances (₹)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Washing</label>
                    <input
                      type="number"
                      min="0"
                      value={form.washing_allowance}
                      onChange={(e) => setForm({ ...form, washing_allowance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Education</label>
                    <input
                      type="number"
                      min="0"
                      value={form.education_allowance}
                      onChange={(e) => setForm({ ...form, education_allowance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Conveyance</label>
                    <input
                      type="number"
                      min="0"
                      value={form.conveyance_allowance}
                      onChange={(e) => setForm({ ...form, conveyance_allowance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Medical</label>
                    <input
                      type="number"
                      min="0"
                      value={form.medical_allowance}
                      onChange={(e) => setForm({ ...form, medical_allowance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Books/Periodicals</label>
                    <input
                      type="number"
                      min="0"
                      value={form.books_periodicals}
                      onChange={(e) => setForm({ ...form, books_periodicals: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Total fixed allowances: ₹{(
                    form.washing_allowance +
                    form.education_allowance +
                    form.conveyance_allowance +
                    form.medical_allowance +
                    form.books_periodicals
                  ).toLocaleString("en-IN")}/month. "Other Allowance" balances the remaining net pay.
                </p>
              </div>

              {/* Statutory Rules & CTC Multipliers */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> 4. Statutory Ceilings & CTC Multipliers
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">PF Ceiling Mode</label>
                    <select
                      value={form.pf_ceiling_mode}
                      onChange={(e) => setForm({ ...form, pf_ceiling_mode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="ACTUAL">ACTUAL (Uncapped)</option>
                      <option value="25000">₹25,000 (Exec Cap)</option>
                      <option value="15000">₹15,000 (Statutory Cap)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Employer PF Rate</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      max="1"
                      value={form.employer_pf_rate}
                      onChange={(e) => setForm({ ...form, employer_pf_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Default 0.1300 (13% combined)</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Bonus Rate</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      max="1"
                      value={form.bonus_rate}
                      onChange={(e) => setForm({ ...form, bonus_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Default 0.0833 (8.33% Bonus Act)</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Gratuity Cost Rate</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      max="1"
                      value={form.gratuity_rate}
                      onChange={(e) => setForm({ ...form, gratuity_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Default 0.0481 (4.81% AS 15 accrual)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Default Assessment Year</label>
                    <select
                      value={form.default_assessment_year}
                      onChange={(e) => setForm({ ...form, default_assessment_year: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="AY_2026_27">AY 2026-27 (₹12 Lakh Rebate w.e.f. Budget 2025)</option>
                      <option value="AY_2025_26">AY 2025-26 (₹7 Lakh Rebate Legacy)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Default Tax Regime</label>
                    <select
                      value={form.default_tax_regime}
                      onChange={(e) => setForm({ ...form, default_tax_regime: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="NEW">New Tax Regime (Default Section 115BAC)</option>
                      <option value="OLD">Old Tax Regime (With Chapter VI-A deductions)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-6 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? "Saving Policy..." : modalMode === "create" ? "Create Policy" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900">Audit History: {activePolicy?.name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Code: {activePolicy?.code}</p>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {historyLoading ? (
                <div className="text-center py-8 text-slate-500">Loading audit history...</div>
              ) : historyRecords.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No change history recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {historyRecords.map((h) => (
                    <div key={h.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-indigo-700 uppercase">{h.change_type}</span>
                        <span className="text-slate-400 font-mono">
                          {new Date(h.changed_at).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-slate-700">{h.change_summary || "Policy snapshot saved"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPoliciesPage;
