// Frontend/src/components/payroll/KredilyPilotPage.jsx
import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Search,
  Check,
  Info,
  Layers,
} from "lucide-react";
import payrollService from "../../services/payrollService";
import { toast } from "sonner";

export const KredilyPilotPage = () => {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [loadingRuns, setLoadingRuns] = useState(true);

  const [kredilyFile, setKredilyFile] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [report, setReport] = useState(null);
  const [filterType, setFilterType] = useState("ALL"); // ALL | MATCHED | VARIANCE

  useEffect(() => {
    loadPayrollRuns();
  }, []);

  const loadPayrollRuns = async () => {
    setLoadingRuns(true);
    try {
      const res = await payrollService.getPayrollRuns();
      const list = res.data || [];
      setRuns(list);
      if (list.length > 0) {
        setSelectedRunId(list[0].id);
      }
    } catch (err) {
      toast.error("Failed to load payroll runs for comparison");
    } finally {
      setLoadingRuns(false);
    }
  };

  const handleFileUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setKredilyFile(f);
    toast.success(`Loaded external register: ${f.name}`);
  };

  const handleRunComparison = async () => {
    if (!selectedRunId) {
      toast.error("Please select a PatilOne payroll run");
      return;
    }
    if (!kredilyFile) {
      toast.error("Please upload the external Kredily CSV salary register");
      return;
    }

    setComparing(true);
    try {
      const text = await kredilyFile.text();
      // Simple parse of Kredily CSV into array of employee salary objects
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        toast.error("Uploaded CSV file must have at least one employee row");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""));
      const records = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(",");
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = (cells[idx] || "").trim();
        });
        if (obj.employee_code || obj.emp_code) {
          records.push({
            employee_code: obj.employee_code || obj.emp_code,
            gross_pay: parseFloat(obj.gross_pay || obj.gross || 0),
            net_pay: parseFloat(obj.net_pay || obj.net || 0),
            epf_employee: parseFloat(obj.epf_employee || obj.ee_pf || obj.pf || 0),
            epf_employer: parseFloat(obj.epf_employer || obj.er_pf || 0),
            esic_employee: parseFloat(obj.esic_employee || obj.esic || 0),
            professional_tax: parseFloat(obj.professional_tax || obj.pt || 0),
          });
        }
      }

      // Fetch PatilOne slips for the selected run
      const runDetail = await payrollService.getPayrollRunById(selectedRunId);
      const patilOneSlips = runDetail.data?.slips || [];

      // Send to pilot comparison endpoint
      const res = await payrollService.pilotCompareKredily({
        patilOneRecords: patilOneSlips.map((s) => ({
          employee_code: s.employee_code,
          gross_pay: s.gross_pay,
          net_pay: s.net_pay,
          epf_employee: s.component_breakdown?.employeePF || 0,
          epf_employer: s.employer_contributions?.employerPF || 0,
          esic_employee: s.component_breakdown?.employeeESIC || 0,
          professional_tax: s.component_breakdown?.professionalTax || 0,
        })),
        kredilyRecords: records,
      });

      setReport(res.data);
      toast.success("Parallel run delta analysis completed");
    } catch (err) {
      console.error("Comparison error:", err);
      toast.error(err.response?.data?.error || "Failed to execute shadow run comparison");
    } finally {
      setComparing(false);
    }
  };

  const filteredDeltas = (report?.employeeDeltas || []).filter((d) => {
    if (filterType === "MATCHED") return d.status === "EXACT_MATCH";
    if (filterType === "VARIANCE") return d.status !== "EXACT_MATCH";
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Parallel Run Pilot Comparator (Kredily vs PatilOne)
            </h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Conduct shadow comparison runs side-by-side with external registers to diagnose EPF ceiling, ESIC, and PT variances before live cutover.
          </p>
        </div>
      </div>

      {/* Control Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs">
          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              1. Select PatilOne Run
            </label>
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              disabled={loadingRuns}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.run_code} ({r.month}/{r.year}) — {r.status} (₹{Number(r.total_net_pay || 0).toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              2. Upload Kredily CSV Register
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <div>
            <button
              onClick={handleRunComparison}
              disabled={comparing || !kredilyFile}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${comparing ? "animate-spin" : ""}`} />
              <span>{comparing ? "Comparing Registers..." : "Execute Side-by-Side Delta Analysis"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      {report && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Total Matched</span>
              <div className="text-xl font-bold text-slate-900 mt-1">{report.summary?.matchedCount || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Exact Rupee Matches</span>
              <div className="text-xl font-bold text-emerald-600 mt-1">{report.summary?.exactMatchCount || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Variances Detected</span>
              <div className="text-xl font-bold text-rose-600 mt-1">{report.summary?.varianceCount || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Total Net Delta</span>
              <div className="text-xl font-bold text-indigo-700 font-mono mt-1">
                ₹{Number(report.summary?.totalNetDelta || 0).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Employee Register Comparison</span>
                <span className="text-slate-400 font-mono">({filteredDeltas.length} records)</span>
              </div>

              <div className="flex items-center gap-1">
                {["ALL", "VARIANCE", "MATCHED"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      filterType === t ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">Emp Code</th>
                    <th className="py-2.5 px-3">PatilOne Net</th>
                    <th className="py-2.5 px-3">Kredily Net</th>
                    <th className="py-2.5 px-3">Net Delta</th>
                    <th className="py-2.5 px-3">EPF Variance</th>
                    <th className="py-2.5 px-3">PT Variance</th>
                    <th className="py-2.5 px-3">Diagnostic Diagnosis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredDeltas.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 font-medium">
                      <td className="py-2 px-3 text-slate-900 font-bold">{d.employee_code}</td>
                      <td className="py-2 px-3">₹{Number(d.patilOneNet || 0).toLocaleString("en-IN")}</td>
                      <td className="py-2 px-3">₹{Number(d.kredilyNet || 0).toLocaleString("en-IN")}</td>
                      <td className={`py-2 px-3 font-bold ${d.netDelta === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {d.netDelta === 0 ? "₹0.00" : `₹${d.netDelta > 0 ? "+" : ""}${d.netDelta}`}
                      </td>
                      <td className="py-2 px-3 text-slate-700">₹{d.epfDelta || 0}</td>
                      <td className="py-2 px-3 text-slate-700">₹{d.ptDelta || 0}</td>
                      <td className="py-2 px-3 font-sans">
                        {d.diagnosis ? (
                          <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full inline-block">
                            {d.diagnosis.explanation}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Exact Match
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KredilyPilotPage;
