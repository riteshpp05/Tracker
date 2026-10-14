import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  ChevronLeft,
  CheckCircle2,
  Send,
  Upload,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

export const JobDetailPage = () => {
  const { slug } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  // Application form state
  const [candidateName, setCandidateName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fallbackJob = {
    id: "b4000000-0000-0000-0000-000000000001",
    title: "Senior Full-Stack Engineer",
    department_name: "Engineering",
    location: "Remote / Hybrid",
    employment_type: "Full-time",
    experience_level: "Senior",
    salary_range: "$130,000 - $160,000 / year",
    description:
      "We are seeking a Senior Full-Stack Engineer to architect and build mission-critical features across our distributed platform, connecting timesheet telemetry, ATS pipelines, and enterprise security.",
    requirements:
      "• 5+ years building production web applications with React, Node.js, and PostgreSQL\n• Experience designing scalable RESTful APIs and real-time state synchronization\n• Strong grasp of role-based access control (RBAC) and security engineering\n• Experience with modern CSS design systems, Tailwind, and component architectures",
    responsibilities:
      "• Design and implement performant frontend interfaces and backend controllers\n• Collaborate with product and design to craft unified enterprise experiences\n• Optimize database queries and execution plans for high concurrency\n• Participate in code reviews and architectural discussions",
  };

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/public/jobs/${slug}`);
        if (res.data) {
          setJob(res.data);
        } else {
          setJob(fallbackJob);
        }
      } catch (err) {
        console.warn("Using fallback job detail:", err);
        setJob(fallbackJob);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consent) {
      toast.error("Please agree to the privacy policy to submit your application.");
      return;
    }

    try {
      setSubmitting(true);
      await axios.post("/api/public/applications", {
        jobId: job?.id || fallbackJob.id,
        candidateName,
        email,
        phone,
        portfolioUrl,
        resumeUrl: resumeUrl || "Resume-Attached-Digital.pdf",
        coverLetter,
      });

      setSubmitted(true);
      toast.success("Application submitted successfully! Our talent team will be in touch.");
    } catch (err) {
      console.error("Application error:", err);
      toast.error(err.response?.data?.error || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center bg-[#F7F8FA] min-h-screen">
        <div className="text-xs text-[#667085]">Loading position details...</div>
      </div>
    );
  }

  const currentJob = job || fallbackJob;

  return (
    <div className="bg-[#F7F8FA] text-[#172033] min-h-screen pb-24">
      {/* Back breadcrumb */}
      <div className="bg-white border-b border-[#E5E7EB] py-3">
        <div className="max-w-5xl mx-auto px-6">
          <Link
            to="/careers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] hover:text-[#6558D9] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to open roles
          </Link>
        </div>
      </div>

      {/* Hero Header */}
      <section className="bg-white border-b border-[#E5E7EB] py-12">
        <div className="max-w-5xl mx-auto px-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-[#6558D9]">
              {currentJob.department_name || "Platform"}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F7F8FA] text-[#667085] border border-[#E5E7EB]">
              {currentJob.experience_level || "Senior"}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F7F8FA] text-[#667085] border border-[#E5E7EB]">
              {currentJob.employment_type || "Full-time"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
            {currentJob.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#667085] font-medium pt-1">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#667085]" />
              {currentJob.location || "Remote"}
            </span>
            {currentJob.salary_range && (
              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <DollarSign className="w-3.5 h-3.5" />
                {currentJob.salary_range}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Main Content & Application Form */}
      <section className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Job Description & Requirements */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8 space-y-6 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-[#172033]">About the Role</h3>
                <p className="text-xs text-[#667085] leading-relaxed mt-2 whitespace-pre-line">
                  {currentJob.description}
                </p>
              </div>

              {currentJob.responsibilities && (
                <div className="pt-4 border-t border-[#F7F8FA]">
                  <h3 className="text-base font-bold text-[#172033]">Key Responsibilities</h3>
                  <div className="text-xs text-[#667085] leading-relaxed mt-2 whitespace-pre-line">
                    {currentJob.responsibilities}
                  </div>
                </div>
              )}

              {currentJob.requirements && (
                <div className="pt-4 border-t border-[#F7F8FA]">
                  <h3 className="text-base font-bold text-[#172033]">Requirements & Qualifications</h3>
                  <div className="text-xs text-[#667085] leading-relaxed mt-2 whitespace-pre-line">
                    {currentJob.requirements}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Application Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[#172033]">Apply for this Position</h3>
              <p className="text-[11px] text-[#667085]">
                Submit your credentials directly to the PatilOne talent acquisition team.
              </p>

              {submitted ? (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-emerald-900 text-sm">Application Received</h4>
                  <p className="text-[11px] text-emerald-700">
                    Thank you, {candidateName}. Our recruiting team will review your application and reach out.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-xs font-semibold text-emerald-800 underline mt-2 block mx-auto"
                  >
                    Submit another application
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maya Deshmukh"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:border-[#6558D9]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="maya@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:border-[#6558D9]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:border-[#6558D9]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      LinkedIn or Portfolio URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://linkedin.com/in/..."
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:border-[#6558D9]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      Resume Link / Attachment Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Resume-Maya-2026.pdf"
                      value={resumeUrl}
                      onChange={(e) => setResumeUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:border-[#6558D9]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      Cover Letter or Note
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Brief note on your background..."
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[#E5E7EB] text-xs bg-[#F7F8FA] focus:bg-white focus:outline-none focus:border-[#6558D9]"
                    />
                  </div>

                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 rounded border-[#E5E7EB] text-[#6558D9] focus:ring-[#6558D9]"
                    />
                    <label htmlFor="consent" className="text-[11px] text-[#667085]">
                      I agree to PatilOne processing my application per the privacy policy.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-[#111827] hover:bg-[#1f2937] transition-colors disabled:opacity-50 mt-2"
                  >
                    {submitting ? "Submitting…" : "Submit Application"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
