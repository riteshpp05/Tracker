import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogIn } from "lucide-react";

export const PublicNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: "Careers", href: "/careers" },
  ];

  const isActive = (path) =>
    path !== "/" && location.pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Wordmark */}
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/favicon.svg"
              alt="Shende Industries"
              className="w-7 h-7 rounded-md"
            />
            <span className="font-bold text-[15px] text-[#172033] tracking-tight">
              Shende Industries
            </span>
          </Link>

          {/* Desktop nav: Careers and Employee Sign In */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/careers"
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                isActive("/careers")
                  ? "text-[#6558D9] bg-indigo-50 font-semibold"
                  : "text-[#667085] hover:text-[#172033] hover:bg-[#F7F8FA]"
              }`}
            >
              Careers & Open Roles
            </Link>

            <Link
              to="/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-[#111827] hover:bg-[#1f2937] transition-colors"
            >
              Employee Sign In
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-[#667085] hover:bg-[#F7F8FA]"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E5E7EB] bg-white px-6 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                isActive(link.href)
                  ? "text-[#6558D9] bg-indigo-50"
                  : "text-[#667085] hover:bg-[#F7F8FA]"
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-3 border-t border-[#E5E7EB]">
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#111827]"
            >
              <LogIn className="w-4 h-4" />
              Employee Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
