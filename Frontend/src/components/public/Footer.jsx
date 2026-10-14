import React from "react";
import { Link } from "react-router-dom";

export const PublicFooter = () => {
  return (
    <footer className="bg-white border-t border-[#E5E7EB]">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#667085]">
          {/* Brand + Copyright */}
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="PatilOne" className="w-5 h-5 rounded-md" />
            <span className="font-bold text-[#172033] tracking-tight">PatilOne</span>
            <span>·</span>
            <span>© {new Date().getFullYear()} PatilOne. All rights reserved.</span>
          </div>

          {/* Minimal Links */}
          <div className="flex items-center gap-5">
            <Link to="/careers" className="hover:text-[#172033] transition-colors">
              Careers
            </Link>
            <Link to="/privacy" className="hover:text-[#172033] transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-[#172033] transition-colors">
              Terms
            </Link>
            <Link
              to="/login"
              className="text-[#6558D9] font-semibold hover:text-indigo-800 transition-colors"
            >
              Employee Portal →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
