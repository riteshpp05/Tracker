// Frontend/src/components/payroll/LocationPoliciesPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Sliders,
  Plus,
  Edit2,
  Trash2,
  History,
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
  Calculator,
  RefreshCw,
  Code2,
  ArrowRight,
  Check,
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
  da_fixed_amount: 3700.0,
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
  working_days_mode: "CALENDAR_DAYS",
  pt_slabs_override_json: null,
};

export const LocationPoliciesPage = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePolicy, setActivePolicy] = useState(null);
  const [form, setForm] = useState(DEFAULT_POLICY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // History Drawer
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Live Simulator State (Right Pane)
  const [simTargetNet, setSimTargetNet] = useState("26000");
  const [simMonth, setSimMonth] = useState(new Date().getMonth() + 1);
  const [simGender, setSimGender] = useState("Male");
  const [simUseGross, setSimUseGross] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Custom PT Slabs Code Toggle
  const [showPtJsonEditor, setShowPtJsonEditor] = useState(false);
  const [ptJsonText, setPtJsonText] = useState("");

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await payrollService.getLocationPolicies(true);
      const list = res.data || [];
      setPolicies(list);
      if (list.length > 0 && !activePolicy) {
        selectPolicyForView(list[0]);
      }
    } catch (err) {
      console.error("Error loading location policies:", err);
      toast.error("Failed to load location policies");
    } finally {
      setLoading(false);
    }
  };

  const selectPolicyForView = (policy) => {
    setActivePolicy(policy);
    setIsEditing(false);
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
      working_days_mode: policy.working_days_mode || "CALENDAR_DAYS",
      pt_slabs_override_json: policy.pt_slabs_override_json || null,
    });
    setPtJsonText(
      policy.pt_slabs_override_json
        ? JSON.stringify(policy.pt_slabs_override_json, null, 2)
        : ""
    );
  };

  const handleOpenCreate = () => {
    setActivePolicy(null);
    setIsEditing(true);
    setForm(DEFAULT_POLICY_FORM);
    setPtJsonText("");
    setShowPtJsonEditor(false);
  };

  // Re-run simulator whenever form or sim inputs change
  useEffect(() => {
    runLiveSimulation();
  }, [form, simTargetNet, simMonth, simGender, simUseGross]);

  const runLiveSimulation = async () => {
    if (!simTargetNet || parseFloat(simTargetNet) <= 0) return;
    setSimLoading(true);
    try {
      const res = await payrollService.simulateCtc({
        mode: form.basic_calculation_mode === "PERCENT_OF_CTC" ? "CTC_TO_NET" : "NET_TO_CTC",
        policy: form,
        netSalary: parseFloat(simTargetNet) || 0,
        annualCtc: (parseFloat(simTargetNet) || 0) * 12 * 1.3,
        month: parseInt(simMonth, 10),
        gender: simGender,
        useGrossForPt: simUseGross,
      });
      setSimResult(res.data);
    } catch (err) {
      console.warn("Simulator live preview error:", err.message);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Policy Name and Unique Code are required");
      return;
    }

    // Parse PT JSON if entered
    let parsedPtJson = form.pt_slabs_override_json;
    if (showPtJsonEditor && ptJsonText.trim()) {
      try {
        parsedPtJson = JSON.parse(ptJsonText);
        if (!Array.isArray(parsedPtJson)) {
          toast.error("Custom PT Slabs must be a valid JSON array");
          return;
        }
      } catch (jsonErr) {
        toast.error(`Invalid Custom PT JSON syntax: ${jsonErr.message}`);
        return;
      }
    }

    const payload = { ...form, pt_slabs_override_json: parsedPtJson };

    setSaving(true);
    try {
      if (!activePolicy || !activePolicy.id) {
        const created = await payrollService.createLocationPolicy(payload);
        toast.success("Location policy created successfully");
        await loadPolicies();
        if (created.data) selectPolicyForView(created.data);
      } else {
        const updated = await payrollService.updateLocationPolicy(activePolicy.id, payload);
        toast.success("Location policy updated successfully");
        await loadPolicies();
        if (updated.data) selectPolicyForView(updated.data);
      }
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save location policy");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (policy) => {
    if (!window.confirm(`Deactivate policy "${policy.name}"? Historical runs will preserve their snapshots.`)) return;
    try {
      await payrollService.deleteLocationPolicy(policy.id);
      toast.success("Location policy deactivated");
      await loadPolicies();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to deactivate policy");
    }
  };

  const handleOpenHistory = async (policy) => {
    setHistoryDrawerOpen(true);
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
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Location Policies & Live Matching Studio
            </h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Configure branch statutory rules, fixed allowances, Dearness Allowance (DA), and state tax overrides with real-time zero-rupee reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" /> Create Location Policy
          </button>
        </div>
      </div>

      {/* Policy Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Building className="w-3.5 h-3.5" /> Policies:
        </span>
        {policies.map((p) => (
          <button
            key={p.id}
            onClick={() => selectPolicyForView(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border whitespace-nowrap flex items-center gap-1.5 ${
              activePolicy?.id === p.id
                ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>{p.name}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activePolicy?.id === p.id ? "bg-indigo-700 text-indigo-100" : "bg-slate-100 text-slate-500"
              }`}
            >
              {p.state_code}
            </span>
          </button>
        ))}
      </div>

      {/* SPLIT-PANE STUDIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANE: Full CRUD Configuration Form (7 Columns) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-slate-900 text-sm">
                {!activePolicy ? "New Branch Policy Configuration" : `Policy: ${form.name}`}
              </h2>
              {activePolicy && (
                <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                  v{activePolicy.version || 1}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activePolicy && !isEditing && (
                <>
                  <button
                    onClick={() => handleOpenHistory(activePolicy)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 text-xs font-medium flex items-center gap-1"
                    title="View Policy History"
                  >
                    <History className="w-3.5 h-3.5" /> History
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50 text-xs font-semibold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(activePolicy)}
                    className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50 text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {isEditing && (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  Editing Mode
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6 text-xs">
            {/* 1. Identity & State PT */}
            <div className="space-y-3">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-indigo-600">
                1. Identification & State Rules
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Policy Name *</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    placeholder="e.g. Branch Alpha"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Policy Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing || Boolean(activePolicy)}
                    placeholder="e.g. BRANCH-ALPHA"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "-") })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">State Code (PT)</label>
                  <select
                    disabled={!isEditing}
                    value={form.state_code}
                    onChange={(e) => setForm({ ...form, state_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs disabled:bg-slate-50"
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
            </div>

            {/* 2. Basic Salary & DA */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-indigo-600">
                2. Basic Pay & Dearness Allowance (DA)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Calculation Mode</label>
                  <select
                    disabled={!isEditing}
                    value={form.basic_calculation_mode}
                    onChange={(e) => setForm({ ...form, basic_calculation_mode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs disabled:bg-slate-50"
                  >
                    <option value="PERCENT_OF_NET">Mode A: % of Net In-Hand (Plant)</option>
                    <option value="PERCENT_OF_CTC">Mode B: % of Annual CTC (Corporate)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    {form.basic_calculation_mode === "PERCENT_OF_NET" ? "Basic % of Net" : "Basic % of CTC"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!isEditing}
                    value={form.basic_calculation_mode === "PERCENT_OF_NET" ? form.basic_percent_of_net : form.basic_percent_of_ctc}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (form.basic_calculation_mode === "PERCENT_OF_NET") {
                        setForm({ ...form, basic_percent_of_net: val });
                      } else {
                        setForm({ ...form, basic_percent_of_ctc: val });
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Fixed DA (₹/month)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    disabled={!isEditing}
                    value={form.da_fixed_amount}
                    onChange={(e) => setForm({ ...form, da_fixed_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-indigo-700 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">HRA % of (Basic + DA)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    disabled={!isEditing}
                    value={form.hra_percent_of_basic_da}
                    onChange={(e) => setForm({ ...form, hra_percent_of_basic_da: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Working Days Basis</label>
                  <select
                    disabled={!isEditing}
                    value={form.working_days_mode}
                    onChange={(e) => setForm({ ...form, working_days_mode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs disabled:bg-slate-50"
                  >
                    <option value="CALENDAR_DAYS">Calendar Days (30/31 days)</option>
                    <option value="FIXED_26_DAYS">Fixed 26 Days (Plant Standard)</option>
                    <option value="SCHEDULED_WORKING_DAYS">Scheduled Working Days (Excl Week Offs)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Fixed Monthly Allowances */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-indigo-600">
                3. Fixed Monthly Allowances (₹/mo)
              </span>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { key: "washing_allowance", label: "Washing" },
                  { key: "education_allowance", label: "Education" },
                  { key: "conveyance_allowance", label: "Conveyance" },
                  { key: "medical_allowance", label: "Medical" },
                  { key: "books_periodicals", label: "Books" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block font-medium text-slate-600 text-[10px] mb-0.5">{label}</label>
                    <input
                      type="number"
                      min="0"
                      disabled={!isEditing}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono disabled:bg-slate-50"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Statutory Rates & PF Ceilings */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-indigo-600">
                4. Statutory Ceilings & Multipliers
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">PF Ceiling Mode</label>
                  <select
                    disabled={!isEditing}
                    value={form.pf_ceiling_mode}
                    onChange={(e) => setForm({ ...form, pf_ceiling_mode: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs disabled:bg-slate-50"
                  >
                    <option value="ACTUAL">ACTUAL (Uncapped)</option>
                    <option value="25000">₹25,000 (Internal Cap)</option>
                    <option value="15000">₹15,000 (Statutory Cap)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Employer PF (13%)</label>
                  <input
                    type="number"
                    step="0.001"
                    disabled={!isEditing}
                    value={form.employer_pf_rate}
                    onChange={(e) => setForm({ ...form, employer_pf_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Bonus Rate (8.33%)</label>
                  <input
                    type="number"
                    step="0.0001"
                    disabled={!isEditing}
                    value={form.bonus_rate}
                    onChange={(e) => setForm({ ...form, bonus_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Gratuity (4.81%)</label>
                  <input
                    type="number"
                    step="0.0001"
                    disabled={!isEditing}
                    value={form.gratuity_rate}
                    onChange={(e) => setForm({ ...form, gratuity_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* 5. Custom PT Slabs Override (JSON Editor) */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPtJsonEditor(!showPtJsonEditor)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5"
              >
                <Code2 className="w-3.5 h-3.5" />
                {showPtJsonEditor ? "Hide Custom PT Slabs Editor" : "Configure Custom PT Slabs (Override State Law)"}
              </button>

              {showPtJsonEditor && (
                <div className="mt-2 space-y-1">
                  <textarea
                    rows={4}
                    disabled={!isEditing}
                    placeholder={`[\n  { "min": 0, "max": 12000, "amount": 0, "febAmount": 0 },\n  { "min": 12001, "max": 25000, "amount": 150, "febAmount": 250 }\n]`}
                    value={ptJsonText}
                    onChange={(e) => setPtJsonText(e.target.value)}
                    className="w-full p-2 font-mono text-[11px] border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                  <span className="text-[10px] text-slate-400">
                    Define custom slabs array with min, max (null for above), amount, and febAmount.
                  </span>
                </div>
              )}
            </div>

            {/* Save Buttons */}
            {isEditing && (
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    if (activePolicy) selectPolicyForView(activePolicy);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-2xs disabled:opacity-50"
                >
                  {saving ? "Saving Policy..." : "Save Policy Changes"}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* RIGHT PANE: Live Interactive Simulator Waterfall (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Live Matching Waterfall</h3>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                REAL-TIME RECONCILIATION
              </span>
            </div>

            {/* Simulator Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Target In-Hand Pay (₹)
                </label>
                <input
                  type="number"
                  step="500"
                  value={simTargetNet}
                  onChange={(e) => setSimTargetNet(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 font-mono font-bold text-emerald-400 focus:ring-1 focus:ring-emerald-400 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Month (PT Check)
                </label>
                <select
                  value={simMonth}
                  onChange={(e) => setSimMonth(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white"
                >
                  <option value={1}>1 - January</option>
                  <option value={2}>2 - February (Surcharge)</option>
                  <option value={3}>3 - March</option>
                  <option value={6}>6 - June</option>
                  <option value={10}>10 - October</option>
                </select>
              </div>
            </div>

            {/* Zero-Variance Banner */}
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero-Rupee Variance</span>
              </div>
              <span className="font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                VARIANCE: ₹0.00
              </span>
            </div>

            {/* Waterfall Breakdown Card */}
            {simResult?.earnings && (
              <div className="space-y-2 text-xs pt-1">
                {/* 1. Basic */}
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                  <span>Basic Salary</span>
                  <span className="font-mono text-white">₹{simResult.earnings.basic?.toLocaleString("en-IN")}</span>
                </div>
                {/* 2. DA */}
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                  <span>Dearness Allowance (DA)</span>
                  <span className="font-mono text-white">₹{simResult.earnings.da?.toLocaleString("en-IN")}</span>
                </div>
                {/* 3. B+DA Subtotal */}
                <div className="flex justify-between py-1 bg-slate-800/80 px-2 rounded text-indigo-300 font-semibold">
                  <span>Basic + DA Subtotal</span>
                  <span className="font-mono">₹{simResult.earnings.basicPlusDA?.toLocaleString("en-IN")}</span>
                </div>
                {/* 4. HRA */}
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                  <span>HRA ({form.hra_percent_of_basic_da}%)</span>
                  <span className="font-mono text-white">₹{simResult.earnings.hra?.toLocaleString("en-IN")}</span>
                </div>
                {/* 5. Fixed Allowances */}
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400 text-[11px]">
                  <span>Fixed Allowances Total</span>
                  <span className="font-mono text-white">₹{simResult.earnings.fixedAllowances?.toLocaleString("en-IN")}</span>
                </div>
                {/* 6. Other Allowance Plug */}
                <div className="flex justify-between py-1 bg-amber-500/20 px-2 rounded text-amber-300 font-bold">
                  <span>Other Allowance (Balancing Plug)</span>
                  <span className="font-mono">₹{simResult.earnings.otherAllowance?.toLocaleString("en-IN")}</span>
                </div>
                {/* 7. Deductions */}
                <div className="flex justify-between py-1 text-rose-400">
                  <span>Employee PF (12%)</span>
                  <span className="font-mono">- ₹{simResult.deductions?.employeePF?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 text-rose-400">
                  <span>Professional Tax ({form.state_code})</span>
                  <span className="font-mono">- ₹{simResult.deductions?.professionalTax?.toLocaleString("en-IN")}</span>
                </div>

                {/* Gross Pay */}
                <div className="flex justify-between py-2 bg-slate-800 px-3 rounded-xl font-bold text-white text-sm">
                  <span>Gross Pay (Pay Slip)</span>
                  <span className="font-mono text-emerald-400">₹{simResult.grossSalary?.toLocaleString("en-IN")}</span>
                </div>

                {/* Employer Costs */}
                <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Employer PF (13%)</span>
                    <span className="font-mono text-slate-200">₹{simResult.employerCosts?.employerPF?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bonus Provision (8.33%)</span>
                    <span className="font-mono text-slate-200">₹{simResult.employerCosts?.bonus?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gratuity Provision (4.81%)</span>
                    <span className="font-mono text-slate-200">₹{simResult.employerCosts?.gratuity?.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Total Loaded Monthly & Annual CTC */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="p-2.5 bg-indigo-950/80 border border-indigo-700/60 rounded-xl flex justify-between items-center">
                    <span className="text-xs text-indigo-300 font-bold">Loaded Monthly CTC</span>
                    <span className="font-mono font-bold text-white text-base">
                      ₹{simResult.monthlyCtc?.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl flex justify-between items-center">
                    <span className="text-xs text-slate-300 font-bold">Loaded Annual CTC</span>
                    <span className="font-mono font-bold text-emerald-400 text-lg">
                      ₹{simResult.yearlyCtc?.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-over Audit Drawer for Policy History */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Policy Version History</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{activePolicy?.name} ({activePolicy?.code})</p>
              </div>
              <button
                onClick={() => setHistoryDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {historyLoading ? (
                <div className="text-center py-8 text-slate-400">Loading history records...</div>
              ) : historyRecords.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No version history found.</div>
              ) : (
                historyRecords.map((h, i) => (
                  <div key={h.id || i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-indigo-700">{h.change_type}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(h.changed_at).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs">{h.change_summary || "Policy snapshot"}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setHistoryDrawerOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold text-xs"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPoliciesPage;
