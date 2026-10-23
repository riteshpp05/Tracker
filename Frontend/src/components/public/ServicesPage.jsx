import React from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Clock,
  Briefcase,
  UserPlus,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Layers,
  FileText,
} from "lucide-react";

export const ServicesPage = () => {
  const modules = [
    {
      id: "timesheets",
      icon: Clock,
      title: "Timesheets & Time Tracking",
      subtitle: "Weekly calendar tracking with mandatory compliance gating",
      description:
        "Enable employees to track work against assigned client projects, billable tasks, and internal activities with minute-level precision.",
      capabilities: [
        "Interactive weekly calendar grid with daily cards",
        "Mandatory 8-hour workday validation with auto-checks",
        "Billable vs. non-billable client hour classification",
        "Direct routing to managers for multi-stage approvals",
      ],
    },
    {
      id: "projects",
      icon: Briefcase,
      title: "Client & Project Management",
      subtitle: "End-to-end delivery tracking across departments and teams",
      description:
        "Centralize client accounts, project milestones, deliverables, and team allocations in a structured, searchable registry.",
      capabilities: [
        "Granular project and task status workflows",
        "Role-based ticket assignments with priority indicators",
        "Cross-department team assignment matrices",
        "Real-time hours logged vs. allocated budget telemetry",
      ],
    },
    {
      id: "recruitment",
      icon: UserPlus,
      title: "Recruitment & ATS Pipeline",
      subtitle: "From public job listings to 1-click employee onboarding",
      description:
        "Manage candidates from initial application through screening, technical interview stages, offer letters, and instant system provisioning.",
      capabilities: [
        "Integrated public job board with resume uploads",
        "Multi-stage hiring pipeline (Screening, Interview, Offer)",
        "Automated candidate-to-employee account provisioning",
        "Audit-logged onboarding decisions with employee code generation",
      ],
    },
    {
      id: "hr-ops",
      icon: Users,
      title: "HR Governance & Employee Self-Service",
      subtitle: "Leave requests, expense claims, and organizational directory",
      description:
        "Empower employees with self-service requests while giving HR administrators and managers structured review queues.",
      capabilities: [
        "Annual, sick, and casual leave balance management",
        "Expense claim filing with receipt tracking",
        "Travel requests with multi-city itinerary support",
        "Comprehensive employee directory with role and department filters",
      ],
    },
  ];

  return (
    <div className="bg-[#F7F8FA] text-[#172033] min-h-screen pb-24">
      {/* Header */}
      <section className="bg-white border-b border-[#E5E7EB] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6558D9]">
            Shende Industries Platform
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#172033] tracking-tight">
            Integrated Enterprise Solutions
          </h1>
          <p className="text-[#667085] text-lg max-w-2xl leading-relaxed">
            Discover the comprehensive modules powering modern enterprise operations,
            project delivery, talent recruitment, and employee self-service.
          </p>
        </div>
      </section>

      {/* Modules List */}
      <section className="max-w-5xl mx-auto px-6 py-16 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 shadow-xs hover:border-[#6558D9]/40 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#6558D9]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#172033]">{m.title}</h3>
                    <p className="text-xs text-[#6558D9] font-medium mt-0.5">{m.subtitle}</p>
                    <p className="text-xs text-[#667085] mt-2 leading-relaxed">{m.description}</p>
                  </div>
                  <ul className="space-y-1.5 pt-2 border-t border-[#F7F8FA]">
                    {m.capabilities.map((cap, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[#172033]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-[#E5E7EB]">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6558D9] hover:underline"
                  >
                    Access in Employee Portal &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center space-y-3">
          <h3 className="text-xl font-bold text-[#172033]">Ready to streamline operations?</h3>
          <p className="text-[#667085] text-xs max-w-md mx-auto">
            Log in to the Shende Industries employee portal or browse current openings on our careers page.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#111827] hover:bg-[#1f2937] transition-colors"
            >
              Sign In to Portal
            </Link>
            <Link
              to="/careers"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#172033] bg-[#F7F8FA] border border-[#E5E7EB] hover:bg-white transition-colors"
            >
              View Open Roles
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
