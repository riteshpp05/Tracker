import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { toast } from "sonner";
import {
  Briefcase,
  Users,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  Clock,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Mail,
  Phone,
  Building,
  DollarSign,
  FileText,
  UserPlus,
  X,
  AlertCircle,
  Tag
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const STAGES = [
  "All",
  "Applied",
  "Screening",
  "Interview",
  "Assessment",
  "Offer",
  "Hired",
  "Rejected",
];

const STAGE_COLORS = {
  Applied: "bg-slate-100 text-slate-700 border-slate-200",
  Screening: "bg-sky-50 text-sky-700 border-sky-200",
  Interview: "bg-amber-50 text-amber-700 border-amber-200",
  Assessment: "bg-purple-50 text-purple-700 border-purple-200",
  Offer: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Hired: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function HRRecruitmentPage() {
  const [activeTab, setActiveTab] = useState("applications"); // 'applications' or 'jobs'
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState("All");
  const [selectedJobId, setSelectedJobId] = useState("All");

  // Modals
  const [selectedApp, setSelectedApp] = useState(null);
  const [onboardModalApp, setOnboardModalApp] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);

  // Forms
  const [onboardForm, setOnboardForm] = useState({
    designation: "",
    departmentId: "",
    managerId: "",
    initialPassword: "Welcome@Shende2026",
  });

  const [newJobForm, setNewJobForm] = useState({
    title: "",
    departmentId: "3",
    location: "Chicago, IL (Hybrid / On-site)",
    employmentType: "Full-time",
    experienceLevel: "Mid-Level",
    salaryRange: "$85,000 - $110,000",
    description: "",
    requirements: "",
    responsibilities: "",
    status: "Published",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [jobsRes, appsRes, deptsRes, empsRes] = await Promise.all([
        api.get("/recruitment/jobs").catch(() => ({ data: { jobs: [] } })),
        api.get("/recruitment/applications").catch(() => ({ data: { applications: [] } })),
        api.get("/employees/departments").catch(() => ({ data: [] })),
        api.get("/employees").catch(() => ({ data: [] })),
      ]);

      const jobList = Array.isArray(jobsRes.data) ? jobsRes.data : jobsRes.data?.jobs || [];
      const appList = Array.isArray(appsRes.data) ? appsRes.data : appsRes.data?.applications || [];
      setJobs(jobList);
      setApplications(appList);
      setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : deptsRes.data?.data || []);
      
      const empList = Array.isArray(empsRes.data) ? empsRes.data : empsRes.data?.employees || [];
      setManagers(empList.filter((e) => e.role_name === "MANAGER" || e.role === "MANAGER"));
    } catch (err) {
      console.error("Recruitment fetch error:", err);
      toast.error("Failed to load recruitment data");
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (appId, newStage) => {
    try {
      await api.put(`/recruitment/applications/${appId}/stage`, { stage: newStage });
      toast.success(`Candidate stage updated to ${newStage}`);
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, stage: newStage } : app))
      );
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp((prev) => ({ ...prev, stage: newStage }));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update candidate stage");
    }
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!onboardModalApp) return;

    try {
      const res = await api.post(`/recruitment/applications/${onboardModalApp.id}/onboard`, onboardForm);
      toast.success(res.data?.message || "Candidate onboarded successfully as employee!");
      setOnboardModalApp(null);
      setSelectedApp(null);
      fetchInitialData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to onboard candidate");
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await api.post("/recruitment/jobs", newJobForm);
      toast.success("Job posting published successfully!");
      setShowJobModal(false);
      setNewJobForm({
        title: "",
        departmentId: "3",
        location: "Chicago, IL (Hybrid / On-site)",
        employmentType: "Full-time",
        experienceLevel: "Mid-Level",
        salaryRange: "$85,000 - $110,000",
        description: "",
        requirements: "",
        responsibilities: "",
        status: "Published",
      });
      fetchInitialData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create job posting");
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.candidate_name?.toLowerCase().includes(search.toLowerCase()) ||
      app.email?.toLowerCase().includes(search.toLowerCase()) ||
      app.job_title?.toLowerCase().includes(search.toLowerCase());
    const matchesStage = selectedStage === "All" || app.stage === selectedStage;
    const matchesJob = selectedJobId === "All" || app.job_id === selectedJobId;
    return matchesSearch && matchesStage && matchesJob;
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto w-full min-w-0">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#172033]">
            Talent Acquisition & ATS
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Manage open job postings, track applicant pipelines, and onboard candidates in 1-click.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#F7F8FA] border border-[#E5E7EB] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("applications")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "applications"
                  ? "bg-white text-[#172033] shadow-xs"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              Candidates ({applications.length})
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "jobs"
                  ? "bg-white text-[#172033] shadow-xs"
                  : "text-[#667085] hover:text-[#172033]"
              }`}
            >
              Active Postings ({jobs.length})
            </button>
          </div>

          <Button
            onClick={() => setShowJobModal(true)}
            className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs h-9 px-4 gap-2 rounded-xl shadow-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            New Job Posting
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Applicants</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {applications.length}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-sky-600 font-medium">
            <Users className="w-3.5 h-3.5" />
            <span>Active in pipeline</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500">In Interview / Assessment</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {applications.filter((a) => a.stage === "Interview" || a.stage === "Assessment").length}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Under review</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Offers / Hired</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {applications.filter((a) => a.stage === "Offer" || a.stage === "Hired").length}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-medium">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Successful matches</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Active Openings</p>
          <p className="text-2xl font-bold text-[#635BFF] mt-1">
            {jobs.filter((j) => j.status === "Published").length}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-indigo-600 font-medium">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Careers portal live</span>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "applications" ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search candidates by name, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-slate-500 mr-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Job:</span>
              </div>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="h-9 px-3 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-700 dark:text-slate-200"
              >
                <option value="All">All Openings</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 text-xs text-slate-500 ml-2 mr-1">
                <span>Stage:</span>
              </div>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="h-9 px-3 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-700 dark:text-slate-200"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50/80 dark:bg-zinc-800/50 border-b border-slate-200/80 dark:border-zinc-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Applied Role</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Applied Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        No candidates found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((app) => (
                      <tr
                        key={app.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {app.candidate_name}
                          </div>
                          <div className="text-[11px] text-slate-400">{app.email}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {app.job_title || "General Application"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              STAGE_COLORS[app.stage] || "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {app.stage}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">
                          <div>{app.phone}</div>
                          {app.portfolio_url && (
                            <a
                              href={app.portfolio_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#635BFF] hover:underline inline-flex items-center gap-0.5"
                            >
                              Portfolio <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-400">
                          {new Date(app.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedApp(app)}
                            className="text-xs h-7 px-2.5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-zinc-700 hover:bg-slate-100"
                          >
                            View Details
                          </Button>

                          {!app.hired_employee_id && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setOnboardModalApp(app);
                                setOnboardForm({
                                  designation: app.job_title || "Engineering Associate",
                                  departmentId: app.department_id ? String(app.department_id) : "3",
                                  managerId: managers[0]?.employee_id || "",
                                  initialPassword: "Welcome@Shende2026",
                                });
                              }}
                              className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                              <UserPlus className="w-3 h-3" />
                              1-Click Onboard
                            </Button>
                          )}
                          {app.hired_employee_id && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 px-2 py-1 bg-emerald-50 rounded-md">
                              <CheckCircle2 className="w-3 h-3" /> Onboarded
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Jobs List Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                    {job.title}
                  </h3>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      job.status === "Published"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <p className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {job.department_name || "Manufacturing & Operations"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {job.employment_type} • {job.experience_level}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    {job.salary_range || "Competitive"}
                  </p>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-3 leading-relaxed">
                  {job.description}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                  {job.applications_count || 0} applications
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedJobId(job.id);
                    setActiveTab("applications");
                  }}
                  className="text-xs h-7 px-2.5"
                >
                  View Pipeline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Details & Stage Modal */}
      {selectedApp && (
        <div
          data-lenis-prevent="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedApp.candidate_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Applied for {selectedApp.job_title} on{" "}
                  {new Date(selectedApp.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pipeline Stage Selector */}
            <div className="bg-slate-50 dark:bg-zinc-800 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Current Pipeline Stage:
              </span>
              <select
                value={selectedApp.stage}
                onChange={(e) => handleStageChange(selectedApp.id, e.target.value)}
                className="h-8 px-2.5 text-xs bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-600 rounded-lg font-medium text-slate-900 dark:text-white"
              >
                {STAGES.filter((s) => s !== "All").map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-lg">
                <span className="text-slate-400 block text-[11px]">Email</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedApp.email}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-lg">
                <span className="text-slate-400 block text-[11px]">Phone</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedApp.phone}
                </span>
              </div>
            </div>

            {/* Resume / Portfolio Links */}
            {(selectedApp.resume_url || selectedApp.portfolio_url) && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Attachments & Portfolio
                </span>
                <div className="flex gap-2">
                  {selectedApp.resume_url && (
                    <a
                      href={selectedApp.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Resume
                    </a>
                  )}
                  {selectedApp.portfolio_url && (
                    <a
                      href={selectedApp.portfolio_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Portfolio
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Cover Letter */}
            {selectedApp.cover_letter && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Cover Letter / Notes
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {selectedApp.cover_letter}
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedApp(null)}
                className="text-xs"
              >
                Close
              </Button>
              {!selectedApp.hired_employee_id && (
                <Button
                  size="sm"
                  onClick={() => {
                    setOnboardModalApp(selectedApp);
                    setOnboardForm({
                      designation: selectedApp.job_title || "Engineering Associate",
                      departmentId: selectedApp.department_id ? String(selectedApp.department_id) : "3",
                      managerId: managers[0]?.employee_id || "",
                      initialPassword: "Welcome@Shende2026",
                    });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Proceed to Onboarding
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Candidate-to-Employee Onboarding Modal */}
      {onboardModalApp && (
        <div
          data-lenis-prevent="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  1-Click Employee Onboarding
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Instantly provision employee profile, credentials, and initial leave quota for{" "}
                  <strong>{onboardModalApp.candidate_name}</strong>.
                </p>
              </div>
              <button
                onClick={() => setOnboardModalApp(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Designation / Job Title
                </label>
                <Input
                  required
                  value={onboardForm.designation}
                  onChange={(e) =>
                    setOnboardForm({ ...onboardForm, designation: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Department
                  </label>
                  <select
                    value={onboardForm.departmentId}
                    onChange={(e) =>
                      setOnboardForm({ ...onboardForm, departmentId: e.target.value })
                    }
                    className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.department_name || d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Reporting Manager
                  </label>
                  <select
                    value={onboardForm.managerId}
                    onChange={(e) =>
                      setOnboardForm({ ...onboardForm, managerId: e.target.value })
                    }
                    className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg"
                  >
                    <option value="">None / Direct Admin</option>
                    {managers.map((m) => (
                      <option key={m.employee_id} value={m.employee_id}>
                        {m.first_name} {m.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Initial Temporary Password
                </label>
                <Input
                  required
                  value={onboardForm.initialPassword}
                  onChange={(e) =>
                    setOnboardForm({ ...onboardForm, initialPassword: e.target.value })
                  }
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Employee will be prompted to reset password on initial sign-in.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOnboardModalApp(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm & Provision Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Job Posting Modal */}
      {showJobModal && (
        <div
          data-lenis-prevent="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Create Job Posting
                </h3>
                <p className="text-xs text-slate-500">
                  Publish a new career opportunity to the Shende Industries public website.
                </p>
              </div>
              <button
                onClick={() => setShowJobModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Job Title
                </label>
                <Input
                  required
                  placeholder="e.g. Senior Manufacturing Engineer"
                  value={newJobForm.title}
                  onChange={(e) => setNewJobForm({ ...newJobForm, title: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Department
                  </label>
                  <select
                    value={newJobForm.departmentId}
                    onChange={(e) =>
                      setNewJobForm({ ...newJobForm, departmentId: e.target.value })
                    }
                    className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.department_name || d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Employment Type
                  </label>
                  <select
                    value={newJobForm.employmentType}
                    onChange={(e) =>
                      setNewJobForm({ ...newJobForm, employmentType: e.target.value })
                    }
                    className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Location
                  </label>
                  <Input
                    required
                    value={newJobForm.location}
                    onChange={(e) => setNewJobForm({ ...newJobForm, location: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Salary Range
                  </label>
                  <Input
                    placeholder="e.g. $90,000 - $120,000"
                    value={newJobForm.salaryRange}
                    onChange={(e) => setNewJobForm({ ...newJobForm, salaryRange: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Job Description
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Overview of the position, scope, and objectives..."
                  value={newJobForm.description}
                  onChange={(e) => setNewJobForm({ ...newJobForm, description: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Candidate Requirements
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Qualifications, skills, experience required..."
                  value={newJobForm.requirements}
                  onChange={(e) => setNewJobForm({ ...newJobForm, requirements: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowJobModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#635BFF] hover:bg-[#5248e3] text-white text-xs gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Publish Job Posting
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
