// Frontend/src/components/payroll/BulkImportPage.jsx
import React, { useState, useEffect } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Users,
  RefreshCw,
  FileText,
  Search,
  Check,
  X,
  Filter,
} from "lucide-react";
import payrollService from "../../services/payrollService";
import { toast } from "sonner";

export const BulkImportPage = () => {
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' | 'staging'
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Staging list
  const [stagedRecords, setStagedRecords] = useState([]);
  const [stagedTotal, setStagedTotal] = useState(0);
  const [stagingLoading, setStagingLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (activeTab === "staging") {
      loadStagingRecords();
    }
  }, [activeTab, statusFilter]);

  const loadStagingRecords = async () => {
    setStagingLoading(true);
    try {
      const statusParam = statusFilter === "ALL" ? null : statusFilter;
      const res = await payrollService.getStagedImports(statusParam, 200, 0);
      setStagedRecords(res.data || []);
      setStagedTotal(res.total || 0);
    } catch (err) {
      toast.error("Failed to load staged import records");
    } finally {
      setStagingLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setImportResult(null);

    setPreviewLoading(true);
    try {
      const buffer = await selected.arrayBuffer();
      const res = await payrollService.previewBulkImport(buffer);
      setPreviewData(res);
      toast.success(`Parsed ${res.summary?.totalRows || 0} rows from ${selected.name}`);
    } catch (err) {
      console.error("Preview error:", err);
      toast.error(err.response?.data?.error || "Failed to parse import file");
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteImport = async (force = false) => {
    if (!file) return;
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const res = await payrollService.executeBulkImport(buffer, force);
      setImportResult(res);
      toast.success(res.message || "Import completed successfully");
      setPreviewData(null);
      setFile(null);
    } catch (err) {
      console.error("Import error:", err);
      toast.error(err.response?.data?.error || "Failed to execute bulk import");
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await payrollService.downloadBulkImportTemplate("payroll_bulk_import_template.csv");
      toast.success("CSV import template downloaded");
    } catch (err) {
      toast.error("Failed to download template");
    }
  };

  const filteredStaged = stagedRecords.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.employee_code?.toLowerCase().includes(q) ||
      r.first_name?.toLowerCase().includes(q) ||
      r.last_name?.toLowerCase().includes(q) ||
      r.pan_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Bulk Employee Onboarding & Payroll Staging
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Import 300+ employee records across multiple branches with automated statutory and PAN/UAN/IFSC validation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Download CSV Template
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab("upload")}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "upload"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Upload className="w-4 h-4" /> Upload & Validate Batch
        </button>
        <button
          onClick={() => setActiveTab("staging")}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "staging"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> Staged Records Review ({stagedTotal})
        </button>
      </div>

      {activeTab === "upload" && (
        <div className="space-y-6">
          {/* File Upload Zone */}
          <div className="bg-white p-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 text-center transition-colors">
            <input
              type="file"
              id="bulk-file-input"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="bulk-file-input" className="cursor-pointer block">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                <Upload className="w-7 h-7" />
              </div>
              <p className="font-semibold text-slate-800 text-base">
                {file ? file.name : "Click to select CSV or XLSX spreadsheet"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports up to 500 rows per batch. Required columns: employee_code, first_name, last_name, target_net_salary, location_code.
              </p>
            </label>
          </div>

          {previewLoading && (
            <div className="bg-white p-12 text-center text-slate-500 rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
              <p className="text-sm font-medium">Validating file contents against statutory formatting rules...</p>
            </div>
          )}

          {/* Validation Summary */}
          {previewData && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Pre-Import Validation Summary</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Total: {previewData.summary?.totalRows} | Valid: {previewData.summary?.validRows} | Invalid Rows: {previewData.summary?.invalidRows} | Errors: {previewData.summary?.errorCount}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {previewData.summary?.errorCount > 0 ? (
                    <>
                      <button
                        onClick={() => handleExecuteImport(true)}
                        disabled={importing || previewData.summary?.validRows === 0}
                        className="px-4 py-2 border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-semibold"
                      >
                        {importing ? "Importing..." : "Force Import Valid Rows Only"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleExecuteImport(false)}
                      disabled={importing}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                    >
                      {importing ? "Importing..." : "Confirm & Import to Staging"}
                    </button>
                  )}
                </div>
              </div>

              {/* Error List */}
              {previewData.errors && previewData.errors.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                    Validation Errors Detected ({previewData.errors.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
                    {previewData.errors.map((err, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-rose-800">
                        <span className="font-mono font-bold bg-rose-200/60 px-1.5 py-0.5 rounded text-[11px]">
                          Row {err.row}
                        </span>
                        <span className="font-mono text-slate-700 font-medium">[{err.field}]</span>
                        <span>{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Rows Preview Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">Emp Code</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Location Code</th>
                      <th className="py-2.5 px-3">Net Salary (₹)</th>
                      <th className="py-2.5 px-3">PAN</th>
                      <th className="py-2.5 px-3">UAN</th>
                      <th className="py-2.5 px-3">Bank IFSC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.validRows?.slice(0, 15).map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">{r.employee_code}</td>
                        <td className="py-2 px-3">{r.first_name} {r.last_name}</td>
                        <td className="py-2 px-3 font-mono text-indigo-600">{r.location_policy_id ? "Linked" : r.location_code || "Default"}</td>
                        <td className="py-2 px-3 font-mono font-medium">₹{Number(r.target_net_salary || 0).toLocaleString("en-IN")}</td>
                        <td className="py-2 px-3 font-mono">{r.pan_number || "—"}</td>
                        <td className="py-2 px-3 font-mono">{r.uan_number || "—"}</td>
                        <td className="py-2 px-3 font-mono">{r.ifsc_code || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.validRows?.length > 15 && (
                  <p className="text-center text-xs text-slate-400 py-2">
                    Showing first 15 of {previewData.validRows.length} valid rows...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Import Result Banner */}
          {importResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                {importResult.message}
              </div>
              <p className="text-xs text-emerald-800">
                {importResult.note}
              </p>
              <button
                onClick={() => setActiveTab("staging")}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg"
              >
                View Staged Records <Users className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "staging" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
              {["ALL", "PENDING", "PROMOTED", "FAILED"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search code, name, PAN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Staging Table */}
          {stagingLoading ? (
            <div className="p-12 text-center text-slate-500">Loading staging records...</div>
          ) : filteredStaged.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-700">No staged records found</p>
              <p className="text-xs text-slate-400 mt-0.5">Upload a CSV or spreadsheet to populate the staging area.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">Emp Code</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Designation / Dept</th>
                    <th className="py-2.5 px-3">Target Net Salary</th>
                    <th className="py-2.5 px-3">Target Annual CTC</th>
                    <th className="py-2.5 px-3">PAN</th>
                    <th className="py-2.5 px-3">UAN</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Imported On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaged.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{r.employee_code}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{r.first_name} {r.last_name}</div>
                        <div className="text-[11px] text-slate-400">{r.personal_email || "No email"}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div>{r.designation || "—"}</div>
                        <div className="text-[10px] text-slate-400">{r.department || "—"}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700">
                        {r.target_net_salary ? `₹${Number(r.target_net_salary).toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {r.target_annual_ctc ? `₹${Number(r.target_annual_ctc).toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{r.pan_number || "—"}</td>
                      <td className="py-2.5 px-3 font-mono">{r.uan_number || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.import_status === "PROMOTED"
                              ? "bg-emerald-50 text-emerald-700"
                              : r.import_status === "PENDING"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {r.import_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {new Date(r.imported_at).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkImportPage;
