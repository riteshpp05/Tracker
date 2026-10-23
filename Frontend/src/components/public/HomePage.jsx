import React from "react";
import { Link } from "react-router-dom";

export const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* Hero — centered, minimal, two CTAs */}
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="text-center max-w-xl space-y-6">
          {/* Category pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[#6558D9] text-[11px] font-semibold tracking-wide uppercase">
            Enterprise Workforce &amp; Operations Platform
          </div>

          {/* Headline */}
          <h1 className="text-[42px] sm:text-[52px] font-bold text-[#172033] leading-[1.1] tracking-tight">
            Work smarter.{" "}
            <span className="text-[#6558D9]">Teams in sync.</span>
          </h1>

          {/* Sub-copy */}
          <p className="text-[16px] text-[#667085] leading-relaxed max-w-md mx-auto">
            Shende Industries enterprise operations platform: packaging engineering projects,
            shift tracking, timesheets, and statutory Indian payroll — all in one connected system.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/careers"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold text-white bg-[#111827] hover:bg-[#1f2937] transition-colors shadow-sm"
            >
              View Open Roles →
            </Link>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold text-[#172033] bg-white border border-[#E5E7EB] hover:bg-[#F7F8FA] transition-colors"
            >
              Employee Sign In →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
