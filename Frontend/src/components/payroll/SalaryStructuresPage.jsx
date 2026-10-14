// Frontend/src/components/payroll/SalaryStructuresPage.jsx
import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  CheckCircle2,
  HelpCircle,
  X,
  FileText,
  Percent,
  Calculator,
} from "lucide-react";
import payrollService from "../../services/payrollService";
import { toast } from "sonner";

export const SalaryStructuresPage = () => {
  const [structures, setStructures] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("structures"); // 'structures' or 'components'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Structure Form
  const [newStructure, setNewStructure] = useState({
    name: "",
    code: "",
    description: "",
    selectedComponents: {},
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [structRes, compRes] = await Promise.all([
        payrollService.getStructures(),
        payrollService.getComponents(),
      ]);
      setStructures(structRes.data || []);
      setComponents(compRes.data || []);
    } catch (err) {
      console.error("Error loading structures:", err);
      toast.error("Failed to load salary structure details");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    const initialSelected = {};
    components.forEach((c) => {
      // Default auto-check Basic, HRA, PF, PT
      const isDefault = ["BASIC", "HRA", "PF_EMPLOYEE", "PT_MAHARASHTRA", "PF_EMPLOYER"].includes(c.code);
      initialSelected[c.id] = {
        enabled: isDefault,
        calculation_type: c.calculation_type || "PERCENTAGE_OF_BASIC",
        percentage_or_amount: c.code === "HRA" ? 50 : c.code.includes("PF") ? 12 : 0,
      };
    });

    setNewStructure({
      name: "",
      code: "",
      description: "",
      selectedComponents: initialSelected,
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newStructure.name || !newStructure.code) {
      toast.error("Please provide structure name and code");
      return;
    }

    const items = [];
    Object.entries(newStructure.selectedComponents).forEach(([compId, cfg]) => {
      if (cfg.enabled) {
        items.push({
          component_id: Number(compId),
          calculation_type: cfg.calculation_type,
          percentage_or_amount: Number(cfg.percentage_or_amount) || 0,
        });
      }
    });

    if (items.length === 0) {
      toast.error("Please select at least one component");
      return;
    }

    try {
      await payrollService.createStructure({
        name: newStructure.name,
        code: newStructure.code,
        description: newStructure.description,
        items,
      });
      toast.success("Salary structure template created successfully");
      setIsCreateModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create structure");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
            Salary Structures & Component Rules
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Reusable compensation packages, calculation percentages, statutory rules, and pro-ration conditions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab("structures")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "structures" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Salary Structures ({structures.length})
            </button>
            <button
              onClick={() => setActiveTab("components")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "components" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Component Catalog ({components.length})
            </button>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#111827] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Structure</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SALARY STRUCTURES VIEW */}
      {activeTab === "structures" && (
        <div className="grid grid-cols-1 gap-6">
          {structures.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-base text-slate-900">{s.name}</h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                      {s.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{s.description || "Default compensation package"}</p>
                </div>
                <div className="text-xs text-slate-400">
                  {s.items?.length || 0} Components linked
                </div>
              </div>

              {/* Components breakdown grid inside structure */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Earnings Column */}
                <div className="bg-emerald-50/40 rounded-xl p-3.5 border border-emerald-100">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block mb-2">
                    Earnings
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {s.items?.filter((i) => i.type === "EARNING").map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="font-medium text-slate-800">{item.name}</span>
                        <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                          {item.calculation_type === "PERCENTAGE_OF_BASIC" ? `${item.percentage_or_amount}% Basic` : "Fixed"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deductions Column */}
                <div className="bg-rose-50/40 rounded-xl p-3.5 border border-rose-100">
                  <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider block mb-2">
                    Employee Deductions
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {s.items?.filter((i) => i.type === "DEDUCTION").map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-rose-100">
                        <span className="font-medium text-slate-800">{item.name}</span>
                        <span className="font-mono text-[11px] text-rose-600 font-semibold">
                          {item.calculation_type === "PERCENTAGE_OF_BASIC" ? `${item.percentage_or_amount}% Basic` : "Statutory"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Employer Contributions Column */}
                <div className="bg-violet-50/40 rounded-xl p-3.5 border border-violet-100">
                  <span className="text-[11px] font-bold text-violet-900 uppercase tracking-wider block mb-2">
                    Employer Contributions
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {s.items?.filter((i) => i.type === "EMPLOYER_CONTRIBUTION").map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-violet-100">
                        <span className="font-medium text-slate-800">{item.name}</span>
                        <span className="font-mono text-[11px] text-violet-700 font-semibold">
                          {item.calculation_type === "PERCENTAGE_OF_BASIC" ? `${item.percentage_or_amount}% Basic` : "Statutory"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: COMPONENT CATALOG VIEW */}
      {activeTab === "components" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Component</th>
                  <th className="px-4 py-3.5">Code</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5 text-center">Pro-rated (LOP)</th>
                  <th className="px-4 py-3.5 text-center">Taxable</th>
                  <th className="px-4 py-3.5 text-center">Statutory</th>
                  <th className="px-6 py-3.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {components.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/75 transition">
                    <td className="px-6 py-3.5 font-bold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 font-semibold">{c.code}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.type === "EARNING" ? "bg-emerald-100 text-emerald-800" :
                        c.type === "DEDUCTION" ? "bg-rose-100 text-rose-800" :
                        "bg-violet-100 text-violet-800"
                      }`}>
                        {c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {c.depends_on_payment_days ? (
                        <span className="text-emerald-600 font-bold">Yes</span>
                      ) : (
                        <span className="text-slate-400">Fixed</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {c.is_tax_applicable ? (
                        <span className="text-slate-700 font-semibold">Yes</span>
                      ) : (
                        <span className="text-slate-400">Exempt</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {c.is_statutory ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[10px] border border-amber-200">
                          Law
                        </span>
                      ) : (
                        <span className="text-slate-400">Custom</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-[11px] max-w-xs truncate">
                      {c.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Salary Structure Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 overflow-y-auto"
          data-lenis-prevent="true"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Create Salary Structure</h3>
                <p className="text-xs text-slate-500">Define a reusable formula package for employee compensation</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Structure Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Technical Specialist"
                    value={newStructure.name}
                    onChange={(e) => setNewStructure({ ...newStructure, name: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. TECH-SR-01"
                    value={newStructure.code}
                    onChange={(e) => setNewStructure({ ...newStructure, code: e.target.value.toUpperCase() })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Standard monthly compensation package with bonus eligibility"
                  value={newStructure.description}
                  onChange={(e) => setNewStructure({ ...newStructure, description: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <span className="block font-bold text-slate-900 mb-2 uppercase tracking-wider text-[11px]">
                  Select & Configure Included Components
                </span>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  {components.map((c) => {
                    const cfg = newStructure.selectedComponents[c.id] || { enabled: false, calculation_type: "PERCENTAGE_OF_BASIC", percentage_or_amount: 0 };
                    return (
                      <div key={c.id} className="py-2 px-2 flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={cfg.enabled}
                            onChange={(e) => {
                              const updated = { ...newStructure.selectedComponents };
                              updated[c.id] = { ...cfg, enabled: e.target.checked };
                              setNewStructure({ ...newStructure, selectedComponents: updated });
                            }}
                            className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                          <div>
                            <span className="font-semibold text-slate-800">{c.name}</span>
                            <span className="font-mono text-[10px] text-slate-400 ml-1.5">({c.code})</span>
                          </div>
                        </label>

                        {cfg.enabled && (
                          <div className="flex items-center gap-2">
                            <select
                              value={cfg.calculation_type}
                              onChange={(e) => {
                                const updated = { ...newStructure.selectedComponents };
                                updated[c.id] = { ...cfg, calculation_type: e.target.value };
                                setNewStructure({ ...newStructure, selectedComponents: updated });
                              }}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px]"
                            >
                              <option value="PERCENTAGE_OF_BASIC">% of Basic</option>
                              <option value="FIXED">Fixed Amount</option>
                            </select>
                            <input
                              type="number"
                              placeholder="Value / %"
                              value={cfg.percentage_or_amount}
                              onChange={(e) => {
                                const updated = { ...newStructure.selectedComponents };
                                updated[c.id] = { ...cfg, percentage_or_amount: e.target.value };
                                setNewStructure({ ...newStructure, selectedComponents: updated });
                              }}
                              className="w-20 p-1 bg-white border border-slate-200 rounded-lg text-right font-mono text-[11px]"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#111827] text-white rounded-xl font-semibold hover:bg-slate-800"
                >
                  Save Salary Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryStructuresPage;
