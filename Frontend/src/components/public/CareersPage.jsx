import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  MapPin,
  Clock,
  Search,
  DollarSign,
  ArrowRight,
  X,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Layers,
  FileText,
  User,
  Mail,
  Phone,
  AlertCircle
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

export const CareersPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedLocation, setSelectedLocation] = useState("ALL");

  // Slide-over Apply Drawer State
  const [activeJobForApply, setActiveJobForApply] = useState(null);
  const [candidateForm, setCandidateForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    experienceYears: "3",
    portfolioUrl: "",
    resumeUrl: "https://drive.google.com/file/d/sample-resume.pdf",
    coverNote: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [applicationResult, setApplicationResult] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Status Tracking Drawer State
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackingCodeInput, setTrackingCodeInput] = useState("");
  const [trackedApplication, setTrackedApplication] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      // Try dedicated careers endpoint first
      let res;
      try {
        res = await axios.get("/api/public/careers/jobs");
      } catch {
        res = await axios.get("/api/public/jobs");
      }

      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setJobs(res.data);
      } else {
        setJobs([]);
      }
    } catch (err) {
      console.warn("Error fetching open positions:", err);
      toast.error("Could not load latest job postings.");
    } finally {
      setLoading(false);
    }
  };

  const departments = ["ALL", ...new Set(jobs.map((j) => j.department || j.department_name).filter(Boolean))];
  const locations = ["ALL", ...new Set(jobs.map((j) => j.location_name || j.location).filter(Boolean))];

  const filteredJobs = jobs.filter((job) => {
    const dept = job.department || job.department_name || "";
    const loc = job.location_name || job.location || "";
    const title = job.title || "";
    const desc = job.description || "";
    const code = job.job_code || "";

    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept === "ALL" || dept === selectedDept;
    const matchesLoc = selectedLocation === "ALL" || loc === selectedLocation;

    return matchesSearch && matchesDept && matchesLoc;
  });

  const handleOpenApply = (job) => {
    setActiveJobForApply(job);
    setApplicationResult(null);
    setCandidateForm({
      fullName: "",
      email: "",
      phone: "",
      experienceYears: "3",
      portfolioUrl: "",
      resumeUrl: "https://drive.google.com/file/d/sample-resume.pdf",
      coverNote: "",
    });
  };

  const handleCloseApply = () => {
    setActiveJobForApply(null);
    setApplicationResult(null);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!candidateForm.fullName || !candidateForm.email || !candidateForm.phone) {
      toast.error("Please fill in your name, email, and phone number.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        jobId: activeJobForApply.id,
        fullName: candidateForm.fullName,
        email: candidateForm.email,
        phone: candidateForm.phone,
        experienceYears: Number(candidateForm.experienceYears) || 0,
        portfolioUrl: candidateForm.portfolioUrl,
        resumeUrl: candidateForm.resumeUrl,
        coverNote: candidateForm.coverNote,
      };

      const res = await axios.post("/api/public/careers/apply", payload);

      if (res.data?.success) {
        setApplicationResult({
          trackingCode: res.data.tracking_code,
          stage: res.data.stage || "SCREENING",
          candidateName: candidateForm.fullName,
          jobTitle: activeJobForApply.title,
        });
        toast.success("Application successfully submitted!");
      } else {
        toast.error(res.data?.error || "Submission failed");
      }
    } catch (err) {
      console.error("Application submission error:", err);
      const msg = err.response?.data?.error || "Failed to submit application. Please try again.";
      toast.error(msg);
      if (err.response?.status === 409 && err.response?.data?.tracking_code) {
        setApplicationResult({
          trackingCode: err.response.data.tracking_code,
          stage: "SCREENING",
          candidateName: candidateForm.fullName,
          jobTitle: activeJobForApply.title,
          isDuplicate: true,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!trackingCodeInput.trim()) {
      toast.error("Please enter your tracking code.");
      return;
    }

    try {
      setTrackingLoading(true);
      setTrackedApplication(null);
      const code = trackingCodeInput.trim();
      const res = await axios.get(`/api/public/careers/track/${encodeURIComponent(code)}`);
      setTrackedApplication(res.data);
    } catch (err) {
      console.error("Tracking lookup error:", err);
      toast.error(err.response?.data?.error || "No application found for this tracking code.");
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleCopyTrackingCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success("Tracking code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const STAGE_STEPS = [
    { key: "SCREENING", label: "Screening" },
    { key: "TECHNICAL", label: "Technical" },
    { key: "HR", label: "HR Review" },
    { key: "OFFER", label: "Offer" },
    { key: "ONBOARDED", label: "Onboarded" },
  ];

  return (
    <div className="bg-[#F8FAFC] text-slate-900 min-h-screen pb-24 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Banner Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/favicon.svg" alt="Shende Industries" className="w-8 h-8 rounded-lg" />
              <span className="font-bold text-slate-900 tracking-tight text-sm">Shende Industries</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
              Careers Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setTrackModalOpen(true);
                setTrackedApplication(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Track Application Status</span>
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white shadow-2xs transition-colors"
            >
              <span>Employee Portal</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200 py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Engineering, Manufacturing &amp; Enterprise Operations
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Build the software and industrial systems powering enterprise production.
            </h1>
            <p className="text-slate-600 text-base leading-relaxed">
              Explore open engineering, plant management, and corporate roles. We build deterministic payroll engines, distributed telemetry, and precision robotics.
            </p>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-2xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by job code (e.g. JOB-2026-01), role title, or technology..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Layers className="w-3.5 h-3.5" />
              <span>Dept:</span>
            </div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-indigo-500"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === "ALL" ? "All Departments" : d}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-2">
              <MapPin className="w-3.5 h-3.5" />
              <span>Location:</span>
            </div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-indigo-500"
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc === "ALL" ? "All Locations" : loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Job Listings List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
            <span>{filteredJobs.length} Open Positions Available</span>
            <span>Real-time ATS Pipeline</span>
          </div>

          {loading ? (
            <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-medium">Loading open roles from database...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200 space-y-2">
              <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No positions match your filter</h3>
              <p className="text-xs text-slate-500">Try clearing filters or search term.</p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:border-indigo-400 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5 group"
              >
                <div className="space-y-2.5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {job.job_code || "JOB-OPEN"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {job.department || job.department_name || "Operations"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                      {job.employment_type || "FULL_TIME"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {job.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {job.location_name || job.location || "Corporate HQ"}
                    </span>
                    {(job.compensation_band || job.salary_range) && (
                      <span className="inline-flex items-center gap-1.5 font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-[11px]">
                        <DollarSign className="w-3 h-3 text-emerald-600" />
                        {job.compensation_band || job.salary_range}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <button
                    onClick={() => handleOpenApply(job)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Apply for Role</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Slide-over Apply Drawer */}
      {activeJobForApply && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                  {activeJobForApply.job_code || "JOB-OPEN"}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  Apply: {activeJobForApply.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeJobForApply.department || activeJobForApply.department_name} • {activeJobForApply.location_name || activeJobForApply.location}
                </p>
              </div>
              <button
                onClick={handleCloseApply}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 flex-1 space-y-6">
              {applicationResult ? (
                /* Success Confirmation Card with Diagrammatic 5-Step Pipeline */
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900">
                        {applicationResult.isDuplicate ? "Existing Application Found" : "Application Successfully Logged"}
                      </h3>
                      <p className="text-xs text-slate-600">
                        Thank you, <strong className="text-slate-900">{applicationResult.candidateName}</strong>. Your profile has entered our talent pipeline.
                      </p>
                    </div>
                  </div>

                  {/* Copyable Tracking Code */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Your Application Tracking Code
                    </span>
                    <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <span className="font-mono text-base font-extrabold text-indigo-700 tracking-wider">
                        {applicationResult.trackingCode}
                      </span>
                      <button
                        onClick={() => handleCopyTrackingCode(applicationResult.trackingCode)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Save this code to check your screening, interview, and payroll onboarding stage anytime without logging in.
                    </p>
                  </div>

                  {/* 5-Step Visual Pipeline */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Live Recruitment &amp; Onboarding Pipeline
                    </span>
                    <div className="grid grid-cols-5 gap-1 text-center">
                      {STAGE_STEPS.map((step, idx) => {
                        const isCurrent = step.key === applicationResult.stage;
                        return (
                          <div
                            key={step.key}
                            className={`p-2 rounded-lg border text-[11px] font-bold transition-all ${
                              isCurrent
                                ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs"
                                : "bg-white text-slate-400 border-slate-200"
                            }`}
                          >
                            <div className="text-[9px] opacity-75">0{idx + 1}</div>
                            <div className="truncate mt-0.5">{step.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleCloseApply}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Application Input Form */
                <form onSubmit={handleSubmitApplication} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Aarav Kulkarni"
                        value={candidateForm.fullName}
                        onChange={(e) => setCandidateForm({ ...candidateForm, fullName: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          placeholder="aarav.candidate@example.com"
                          value={candidateForm.email}
                          onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          placeholder="+91 98765 43210"
                          value={candidateForm.phone}
                          onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={candidateForm.experienceYears}
                        onChange={(e) => setCandidateForm({ ...candidateForm, experienceYears: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Portfolio / GitHub Profile URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/username"
                        value={candidateForm.portfolioUrl}
                        onChange={(e) => setCandidateForm({ ...candidateForm, portfolioUrl: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Resume Link / File Attachment *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://drive.google.com/file/... or resume.pdf"
                      value={candidateForm.resumeUrl}
                      onChange={(e) => setCandidateForm({ ...candidateForm, resumeUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cover Note / Relevant Highlights
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Share a brief overview of relevant engineering or operations experience..."
                      value={candidateForm.coverNote}
                      onChange={(e) => setCandidateForm({ ...candidateForm, coverNote: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseApply}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Application</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Track Application Status Modal */}
      {trackModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Track Your Application</h3>
              </div>
              <button
                onClick={() => setTrackModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTrackSubmit} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Enter code e.g. APP-2026-1001"
                value={trackingCodeInput}
                onChange={(e) => setTrackingCodeInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={trackingLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                {trackingLoading ? "Looking up..." : "Lookup"}
              </button>
            </form>

            {trackedApplication && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {trackedApplication.candidate_name}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {trackedApplication.job_title} • {trackedApplication.department}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    trackedApplication.is_rejected 
                      ? "bg-rose-100 text-rose-700 border border-rose-200" 
                      : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                  }`}>
                    {trackedApplication.stage}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold uppercase">
                    <span>Progress</span>
                    <span>Step {trackedApplication.current_step} of {trackedApplication.total_steps}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {STAGE_STEPS.map((step, idx) => {
                      const isCompleted = idx < trackedApplication.current_step;
                      const isCurrent = step.key === trackedApplication.stage;
                      return (
                        <div
                          key={step.key}
                          className={`p-1.5 rounded border text-[10px] font-bold ${
                            isCurrent
                              ? "bg-indigo-600 text-white border-indigo-700"
                              : isCompleted
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-white text-slate-300 border-slate-200"
                          }`}
                        >
                          {step.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  Last updated: {new Date(trackedApplication.updated_at || trackedApplication.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
