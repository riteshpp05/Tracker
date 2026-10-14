// Frontend/src/components/payroll/EmployeeSalariesPage.jsx
import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  Edit2,
  Building,
  CheckCircle2,
  X,
  FileText,
  AlertCircle,
  Eye,
} from "lucide-react";
import payrollService from "../../services/payrollService";
import { toast } from "sonner";

export const EmployeeSalariesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Forms state
  const [assignForm, setAssignForm] = useState({
    employee_id: "",
    structure_id: "",
    from_date: new Date().toISOString().split("T")[0],
    base_monthly_salary: "",
    ctc_annual: "",
    notes: "",
  });

  const [bankForm, setBankForm] = useState({
    pan_number: "",
    bank_name: "",
    bank_account_no: "",
    ifsc_code: "",
    uan_number: "",
    pf_number: "",
    esi_number: "",
    tax_regime: "New",
    payment_mode: "Bank",
  });

  useEffect(() => {
    loadData();
  }, []);

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
    if (emp) {
      setSelectedEmp(emp);
      setAssignForm({
        employee_id: emp.employee_id,
        structure_id: emp.structure_id || (structures[0]?.id || ""),
        from_date: new Date().toISOString().split("T")[0],
        base_monthly_salary: emp.base_monthly_salary || "",
        ctc_annual: emp.ctc_annual || "",
        notes: `Salary assignment revision for ${emp.employee_code}`,
      });
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

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
            Employee Salaries & Statutory Setup
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Effective-dated compensation assignments, Indian banking details (IFSC/A/C), and statutory identifiers (PAN, UAN, PF).
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

      {/* Filter and Search Bar */}
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

      {/* Employees Salary Directory Table */}
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
              {filteredEmployees.length === 0 ? (
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
                      ₹{Number(emp.base_monthly_salary || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-700 tabular-nums">
                      ₹{Number(emp.ctc_annual || 0).toLocaleString("en-IN")}
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

      {/* Modal 1: Assign / Revise Salary Structure */}
      {isAssignModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 overflow-y-auto"
          data-lenis-prevent="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-sm text-slate-900">
                {selectedEmp ? `Revise Salary: ${selectedEmp.first_name} ${selectedEmp.last_name}` : "Assign Salary Structure"}
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              {!selectedEmp && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Employee</label>
                  <select
                    value={assignForm.employee_id}
                    onChange={(e) => setAssignForm({ ...assignForm, employee_id: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Salary Structure Template</label>
                <select
                  value={assignForm.structure_id}
                  onChange={(e) => setAssignForm({ ...assignForm, structure_id: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                >
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Monthly Salary (₹)</label>
                  <input
                    type="number"
                    step="100"
                    placeholder="e.g. 50000"
                    value={assignForm.base_monthly_salary}
                    onChange={(e) => setAssignForm({ ...assignForm, base_monthly_salary: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
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
                    onChange={(e) => setAssignForm({ ...assignForm, ctc_annual: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Effective Start Date</label>
                <input
                  type="date"
                  value={assignForm.from_date}
                  onChange={(e) => setAssignForm({ ...assignForm, from_date: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Revision Notes / Reason</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Annual appraisal or restructuring"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#111827] text-white rounded-xl font-semibold hover:bg-slate-800"
                >
                  Save Salary Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Banking & Statutory Details */}
      {isBankModalOpen && selectedEmp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 overflow-y-auto"
          data-lenis-prevent="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Banking & Statutory Details
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedEmp.employee_code} — {selectedEmp.first_name} {selectedEmp.last_name}
                </p>
              </div>
              <button
                onClick={() => setIsBankModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
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
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="e.g. HDFC Bank"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={bankForm.bank_account_no}
                    onChange={(e) => setBankForm({ ...bankForm, bank_account_no: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
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
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                    placeholder="e.g. HDFC0000123"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={bankForm.payment_mode}
                    onChange={(e) => setBankForm({ ...bankForm, payment_mode: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
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
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                      placeholder="e.g. ABCDE1234F"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tax Regime</label>
                    <select
                      value={bankForm.tax_regime}
                      onChange={(e) => setBankForm({ ...bankForm, tax_regime: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="New">New Regime (Section 115BAC - Default)</option>
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
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      placeholder="e.g. 101234567890"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">PF Account Number</label>
                    <input
                      type="text"
                      value={bankForm.pf_number}
                      onChange={(e) => setBankForm({ ...bankForm, pf_number: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      placeholder="e.g. MH/BAN/0012345/001"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#111827] text-white rounded-xl font-semibold hover:bg-slate-800"
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
