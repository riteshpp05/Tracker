import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Award,
  Layers,
  Building,
  Target,
  Users,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const AboutPage = () => {
  return (
    <div className="bg-[#F7F8FA] text-[#172033] min-h-screen pb-24">
      {/* Header */}
      <section className="bg-white border-b border-[#E5E7EB] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6 space-y-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6558D9]">
            About Shende Industries
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#172033] tracking-tight">
            Innovative Packaging. Teams in Sync.
          </h1>
          <p className="text-[#667085] text-lg max-w-2xl leading-relaxed">
            Shende Industries Pvt. Ltd. is a premier industrial packaging solutions and machinery
            automation company headquartered in Baner, Pune. Our enterprise portal coordinates
            workforce operations, plant engineering, field installations, and compliant payroll.
          </p>
        </div>
      </section>

      {/* Narrative & Values */}
      <section className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#172033]">
              Unified Enterprise Governance
            </h2>
            <p className="text-[#667085] text-sm leading-relaxed">
              Modern enterprises operate across distributed engineering teams, remote consultants,
              and multi-tier project portfolios. Disconnected spreadsheets and fragmented tools
              create administrative friction and lack compliance tracking.
            </p>
            <p className="text-[#667085] text-sm leading-relaxed">
              Shende Industries Enterprise Portal bridges the operational gap between packaging plant management, daily time logging,
              manager approvals, HR talent acquisition, and executive auditing.
            </p>

            <div className="pt-2 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#E5E7EB]">
                <div className="font-bold text-lg text-[#172033]">100% RBAC</div>
                <div className="text-xs text-[#667085]">Strict Role-Governed Access</div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[#E5E7EB]">
                <div className="font-bold text-lg text-[#172033]">Real-time</div>
                <div className="text-xs text-[#667085]">Telemetry & Audit Logs</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-5 shadow-xs">
            <h3 className="font-bold text-lg text-[#172033]">Core Platform Tenets</h3>
            <div className="space-y-4">
              {[
                {
                  title: "Single Source of Truth",
                  desc: "All client projects, internal tasks, and employee assignments converge in one verifiable database.",
                },
                {
                  title: "Transparent Approval Chains",
                  desc: "Two-stage verification by managers and HR administrators prevents payroll discrepancies and unbilled hours.",
                },
                {
                  title: "Enterprise Security First",
                  desc: "Audited session authentication, zero credential leakage, and strict tenant isolation.",
                },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 text-[#6558D9] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-[#172033]">{item.title}</h4>
                    <p className="text-xs text-[#667085] mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-[#172033]">
            Experience the Shende Industries Platform
          </h3>
          <p className="text-[#667085] text-sm max-w-lg mx-auto">
            Ready to explore our open roles or access your internal employee workspace?
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              to="/careers"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#111827] hover:bg-[#1f2937] transition-colors"
            >
              Explore Careers
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#172033] bg-[#F7F8FA] border border-[#E5E7EB] hover:bg-white transition-colors"
            >
              Employee Sign In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
