import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ChevronLeft } from "lucide-react";

export const PrivacyTermsPage = ({ mode = "privacy" }) => {
  const isPrivacy = mode === "privacy";

  return (
    <div className="bg-slate-50 text-slate-900 pb-24">
      <div className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#635BFF]"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#635BFF]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {isPrivacy ? "Corporate Privacy Policy" : "Standard Terms of Service"}
              </h1>
              <p className="text-xs text-slate-500">Effective Date: January 1, 2026 | Shende Industries Inc.</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none text-sm text-slate-600 leading-relaxed space-y-4 pt-4 border-t border-slate-100">
            {isPrivacy ? (
              <>
                <p>
                  At <strong>Shende Industries Inc.</strong>, we are committed to safeguarding corporate data, candidate submissions, and engineering trade secrets. This Privacy Policy details how we collect, store, and process data across our public web properties and applicant tracking systems.
                </p>
                <h3 className="text-base font-bold text-slate-900 pt-2">1. Technical & Engineering Data</h3>
                <p>
                  Any CAD drawings, specifications, bills of materials (BOM), or requirements uploaded via technical inquiry forms are treated as proprietary client information under our mutual non-disclosure agreement guidelines.
                </p>
                <h3 className="text-base font-bold text-slate-900 pt-2">2. Candidate & Recruitment Information</h3>
                <p>
                  Resumes, contact details, and application materials submitted via the Shende Industries Careers Portal are accessed strictly by authorized Human Resources personnel and hiring managers. Candidate information is retained only as long as necessary for recruitment evaluations.
                </p>
                <h3 className="text-base font-bold text-slate-900 pt-2">3. Cookies and Session Analytics</h3>
                <p>
                  We utilize standard, secure session cookies strictly for authenticated employee portal logins and platform security. We do not sell user analytics to third-party advertising networks.
                </p>
              </>
            ) : (
              <>
                <p>
                  Welcome to <strong>Shende Industries Inc.</strong> By accessing our corporate website, engineering portals, or submitting requests for proposal, you agree to comply with and be bound by the following Terms of Service.
                </p>
                <h3 className="text-base font-bold text-slate-900 pt-2">1. Intellectual Property & Patents</h3>
                <p>
                  All manufacturing processes, PLC architectures, tooling models, and content published on this portal are the exclusive intellectual property of Shende Industries Inc. Unauthorized extraction or reverse engineering is prohibited.
                </p>
                <h3 className="text-base font-bold text-slate-900 pt-2">2. Employee & Client Portal Access</h3>
                <p>
                  Authorized employees, managers, and clients must maintain the confidentiality of their credentials. Any suspicious access or token anomalies must be immediately reported to our corporate IT security desk.
                </p>
                <h3 className="text-base font-bold text-slate-900 pt-2">3. Limitation of Liability</h3>
                <p>
                  Technical specifications provided on marketing pages are for general evaluation. Specific machining tolerances and delivery schedules are governed by formal statements of work (SOW) executed with Shende Industries.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
