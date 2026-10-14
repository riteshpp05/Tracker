import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  MapPin,
  Clock,
  Search,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import axios from "axios";

export const CareersPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");

  const fallbackJobs = [
    {
      id: "b4000000-0000-0000-0000-000000000001",
      slug: "senior-full-stack-engineer",
      title: "Senior Full-Stack Engineer",
      department_name: "Engineering",
      location: "Remote / Hybrid",
      employment_type: "Full-time",
      experience_level: "Senior",
      salary_range: "$130,000 - $160,000 / year",
      description:
        "Architect and build core platform features across our distributed Node.js/PostgreSQL backend and modern React frontend.",
    },
    {
      id: "b4000000-0000-0000-0000-000000000002",
      slug: "product-designer",
      title: "Principal Product Designer",
      department_name: "Design",
      location: "Remote",
      employment_type: "Full-time",
      experience_level: "Senior",
      salary_range: "$120,000 - $150,000 / year",
      description:
        "Design minimal, ultra-usable enterprise SaaS interfaces, design systems, and workflow experiences for PatilOne customers.",
    },
    {
      id: "b4000000-0000-0000-0000-000000000003",
      slug: "solutions-architect",
      title: "Enterprise Solutions Architect",
      department_name: "Customer Operations",
      location: "Chicago, IL (Hybrid)",
      employment_type: "Full-time",
      experience_level: "Lead",
      salary_range: "$140,000 - $175,000 / year",
      description:
        "Guide enterprise clients through custom integrations, workflow configuration, and secure workforce migration.",
    },
  ];

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/public/jobs");
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setJobs(res.data);
        } else {
          setJobs(fallbackJobs);
        }
      } catch (err) {
        console.warn("Using fallback jobs:", err);
        setJobs(fallbackJobs);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept =
      selectedDept === "ALL" || job.department_name === selectedDept;
    const matchesType =
      selectedType === "ALL" || job.employment_type === selectedType;
    return matchesSearch && matchesDept && matchesType;
  });

  return (
    <div className="bg-[#F7F8FA] text-[#172033] min-h-screen pb-24">
      {/* Header */}
      <section className="bg-white border-b border-[#E5E7EB] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[#6558D9] text-[11px] font-semibold tracking-wide uppercase">
            Careers at PatilOne
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#172033] tracking-tight">
            Build the platform that keeps teams in sync.
          </h1>
          <p className="text-[#667085] text-lg max-w-2xl leading-relaxed">
            We are looking for engineers, designers, and operators who care about craft,
            clarity, and solving enterprise complexity.
          </p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search roles by title, keyword, or technology..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#6558D9] bg-[#F7F8FA] focus:bg-white transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-medium text-[#172033] bg-white focus:outline-none focus:border-[#6558D9]"
            >
              <option value="ALL">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Design">Design</option>
              <option value="Customer Operations">Customer Operations</option>
              <option value="Industrial Automation">Industrial Automation</option>
              <option value="Quality Assurance">Quality Assurance</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-medium text-[#172033] bg-white focus:outline-none focus:border-[#6558D9]"
            >
              <option value="ALL">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Contract">Contract</option>
            </select>
          </div>
        </div>

        {/* Listings */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-[11px] font-semibold uppercase tracking-wider text-[#667085] px-1">
            <span>{filteredJobs.length} Open Positions</span>
          </div>

          {filteredJobs.map((job) => (
            <Link
              key={job.id}
              to={`/careers/${job.slug || job.id}`}
              className="block bg-white rounded-2xl border border-[#E5E7EB] p-6 hover:border-[#6558D9] transition-all group shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-[#6558D9]">
                      {job.department_name || "Platform"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F7F8FA] text-[#667085] border border-[#E5E7EB]">
                      {job.experience_level || "Mid-Level"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F7F8FA] text-[#667085] border border-[#E5E7EB]">
                      {job.employment_type || "Full-time"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#172033] group-hover:text-[#6558D9] transition-colors">
                    {job.title}
                  </h3>

                  <p className="text-xs text-[#667085] line-clamp-2 max-w-3xl">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#667085] pt-1">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#667085]" />
                      {job.location || "Remote"}
                    </span>
                    {job.salary_range && (
                      <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                        <DollarSign className="w-3.5 h-3.5" />
                        {job.salary_range}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6558D9] group-hover:translate-x-1 transition-transform self-start sm:self-center shrink-0">
                  View Role & Apply <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}

          {filteredJobs.length === 0 && !loading && (
            <div className="text-center py-12 bg-white rounded-2xl border border-[#E5E7EB]">
              <Briefcase className="w-8 h-8 text-[#667085] mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-[#172033]">No positions found</p>
              <p className="text-xs text-[#667085] mt-1">Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
