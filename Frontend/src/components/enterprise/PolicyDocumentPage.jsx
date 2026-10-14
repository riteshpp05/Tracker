// Frontend/src/components/enterprise/PolicyDocumentPage.jsx
import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Eye,
  ShieldCheck,
  FolderOpen,
  Search,
  BookOpen,
  X,
  ExternalLink,
  Award
} from "lucide-react";
import enterpriseService from "../../services/enterpriseService";
import { toast } from "sonner";

export const PolicyDocumentPage = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeDocPreview, setActiveDocPreview] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await enterpriseService.getDocuments(
        selectedCategory === "ALL" ? null : selectedCategory
      );
      if (res.success) {
        setDocuments(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
      toast.error("Failed to load policy documents");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (doc) => {
    const textContent = `${doc.title}\nVersion: ${doc.version}\nCategory: ${doc.category}\n\n${doc.description || ""}\n\nOfficial corporate policy issued by PatilOne Human Resources & Legal Compliance.`;
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.title.replace(/\s+/g, "_")}_v${doc.version}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${doc.title}`);
  };

  const filteredDocs = documents.filter((doc) => {
    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      (doc.description && doc.description.toLowerCase().includes(query))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-[#6558D9]" />
            Policy & Compliance Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Official employee handbooks, statutory benefits manuals, travel policies, and standard operating procedures.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {["ALL", "HR", "TRAVEL", "CODE_OF_CONDUCT", "STATUTORY"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-[#6558D9] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat === "ALL" ? "All Policies" : cat.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6558D9] w-full md:w-64"
          />
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-400 text-sm">
            Loading policy library...
          </div>
        ) : filteredDocs.length > 0 ? (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-purple-50 text-[#6558D9] rounded-lg">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {doc.category}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {doc.description || "Official corporate guideline and policy manual."}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono">v{doc.version || "1.0"}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveDocPreview(doc)}
                    className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-50 transition"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="inline-flex items-center gap-1 text-[#6558D9] hover:text-[#5245c4] font-medium px-2 py-1 rounded hover:bg-purple-50 transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            No policy documents found in this section.
          </div>
        )}
      </div>

      {/* Document Preview Modal with data-lenis-prevent="true" */}
      {activeDocPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div
            data-lenis-prevent="true"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#6558D9]" />
                <h3 className="font-semibold text-slate-900 text-base">
                  {activeDocPreview.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveDocPreview(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center gap-3 text-xs text-slate-500 pb-3 border-b border-slate-100">
                <span>Category: <strong className="text-slate-700">{activeDocPreview.category}</strong></span>
                <span>•</span>
                <span>Version: <strong className="text-slate-700">{activeDocPreview.version}</strong></span>
                <span>•</span>
                <span>Last Updated: <strong className="text-slate-700 font-mono">{activeDocPreview.updated_at ? new Date(activeDocPreview.updated_at).toLocaleDateString("en-IN") : "Oct 2026"}</strong></span>
              </div>

              <div className="text-sm text-slate-700 space-y-3 leading-relaxed">
                <p className="font-semibold text-slate-900">Summary & Scope:</p>
                <p>{activeDocPreview.description}</p>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
                  <p className="font-bold text-slate-800">Compliance & Regulatory Notice:</p>
                  <p>
                    All employees, contractors, and managers of PatilOne (Shende Industries) are required to strictly adhere to this documentation in accordance with Indian statutory requirements, internal audits, and workplace standards.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-400">PatilOne Corporate Policy Repository</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveDocPreview(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-white transition"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownload(activeDocPreview)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6558D9] hover:bg-[#5245c4] text-white text-sm font-semibold rounded-lg shadow-sm transition"
                >
                  <Download className="w-4 h-4" /> Download Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyDocumentPage;
