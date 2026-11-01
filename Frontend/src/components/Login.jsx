import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Input } from "./ui/input";
import { toast } from "sonner";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  Users,
  Briefcase,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  Building2,
  Scale,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("hr@shendeindustries.com");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activePersona, setActivePersona] = useState("HR");

  const DEMO_PERSONAS = [
    {
      role: "HR",
      label: "HR Specialist",
      email: "hr@shendeindustries.com",
      password: "password123",
      icon: Users,
      badge: "Maker / Payroll Ops",
      description: "Recruitment, Attendance, Holiday Sync & Draft Payroll Calculation",
    },
    {
      role: "Admin",
      label: "Super Admin",
      email: "admin@shendeindustries.com",
      password: "password123",
      icon: Shield,
      badge: "Checker / Finalizer",
      description: "Payroll Approval, Finalization, Bank CSV & Location Policy Studio",
    },
    {
      role: "Manager",
      label: "Module Lead",
      email: "manager@shendeindustries.com",
      password: "password123",
      icon: Briefcase,
      badge: "Line Management",
      description: "Team Timesheet Approval, Leave Reviews & Resource Allocation",
    },
    {
      role: "Employee",
      label: "Staff Member",
      email: "employee@shendeindustries.com",
      password: "password123",
      icon: UserCheck,
      badge: "Self-Service",
      description: "Personal Payslips, Statutory Tax Breakdowns & Attendance Logs",
    },
  ];

  const handleSelectPersona = (persona) => {
    setActivePersona(persona.role);
    setEmail(persona.email);
    setPassword(persona.password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both corporate email and password");
      return;
    }
    try {
      setIsLoading(true);
      const user = await login({ email, password });
      toast.success(`Authenticated as ${user.first_name || user.email}`);

      const from = location.state?.from?.pathname;
      if (from && from !== "/" && from !== "/login") {
        navigate(from, { replace: true });
        return;
      }

      const redirectPath =
        user.role === "ADMIN"
          ? "/admin/dashboard"
          : user.role === "HR"
          ? "/hr/dashboard"
          : user.role === "MANAGER"
          ? "/manager/dashboard"
          : "/employee/dashboard";
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const errData = err?.response?.data;
      const rawMsg =
        (typeof errData?.detail === "string" ? `${errData.error || "Login failed"}: ${errData.detail}` : null) ||
        (typeof errData?.error === "string" ? errData.error : null) ||
        (typeof errData?.message === "string" ? errData.message : null) ||
        (typeof err?.message === "string" ? err.message : null) ||
        "Login failed. Please verify credentials or cloud database connectivity.";
      toast.error(rawMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-white selection:bg-indigo-500 selection:text-white font-sans">
      {/* ─────────────────────────────────────────────────────────────
          LEFT PANE: High-Precision Enterprise Authentication Console
          ───────────────────────────────────────────────────────────── */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-white z-10 border-r border-slate-200/80">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900 tracking-tight">
                  Shende Industries
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded">
                  v3.2
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium tracking-tight">
                PatilOne Enterprise Payroll &amp; Operations
              </p>
            </div>
          </Link>

          <Link
            to="/careers"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 px-3 py-1.5 rounded-full border border-indigo-200/60 transition-colors"
          >
            <span>View Open Positions &amp; Apply</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Form Container */}
        <div className="py-6 sm:py-8 space-y-6 max-w-md w-full mx-auto">
          {/* Welcome Title */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Sign In to Workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Access real-time statutory calculations, multi-facility payroll, and workforce operations.
            </p>
          </div>

          {/* Interactive Persona Sandbox Switcher */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Select Persona (1-Click Fill)
              </span>
              <span className="text-[10px] font-mono text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/50">
                Sandbox Mode
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_PERSONAS.map((p) => {
                const Icon = p.icon;
                const isSelected = activePersona === p.role;
                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleSelectPersona(p)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? "bg-white border-indigo-600 shadow-xs ring-1 ring-indigo-600/20 text-slate-900"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold leading-tight truncate">{p.label}</p>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium leading-tight truncate mt-0.5">
                        {p.badge}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-slate-800 block">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@shendeindustries.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 text-xs sm:text-sm bg-white border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl font-medium"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-bold text-slate-800 block">
                  Password
                </label>
                <span className="text-[11px] font-medium text-slate-600">Default: password123</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 text-xs sm:text-sm bg-white border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 rounded-xl font-medium"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800 transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Authenticating with Session Token...</span>
              ) : (
                <>
                  <span>Sign In as {activePersona}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Careers Banner Pill */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>External Candidate or Non-Company Visitor?</span>
            </div>
            <Link
              to="/careers"
              className="text-xs font-bold text-indigo-700 hover:text-indigo-800 hover:underline shrink-0"
            >
              Careers Portal &rarr;
            </Link>
          </div>
        </div>

        {/* Security & Statutory Trust Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              AY 2026-27 Slabs
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 font-medium">
              <Scale className="w-3.5 h-3.5 text-indigo-600" />
              Zero-Rupee Invariant
            </span>
          </div>
          <span>Enterprise Cloud 256-bit TLS</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANE: Sleek Dark High-Impact Enterprise Showcase
          ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 bg-[#0b0f19] relative overflow-hidden flex-col justify-between p-10 xl:p-14 text-white">
        {/* Ambient Gradient Glows */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `radial-gradient(at 15% 20%, rgba(99, 102, 241, 0.35) 0px, transparent 50%), radial-gradient(at 85% 80%, rgba(139, 92, 246, 0.25) 0px, transparent 50%)`,
          }}
        />

        {/* Ambient Background Dotted Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Top Header Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-indigo-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Multi-Facility Production Architecture Active</span>
          </div>
          <span className="text-xs font-mono text-slate-400">PatilOne v3.2 Engine</span>
        </div>

        {/* Central Visual Telemetry Showcase */}
        <div className="relative z-10 my-auto py-8 space-y-6 max-w-xl">
          <div className="space-y-2">
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Industrial Payroll &amp; Operations. Engineered with <span className="text-indigo-400">Zero Statutory Drift.</span>
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Real-time matching engine reconciling Net-to-CTC and CTC-to-Net across factory plants and corporate hubs with point-in-time audit immutability.
            </p>
          </div>

          {/* Metric Widget 1: Zero-Rupee Reconciliation Card */}
          <div className="p-5 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Continuous Zero-Rupee Reconciliation
                  </h4>
                  <p className="text-[11px] text-slate-400">Exact penny verification on every calculation pass</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
                Variance: ₹0.00
              </span>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-xs text-indigo-200 flex items-center justify-between">
              <span>Gross Pay + Employer Contribs</span>
              <span className="text-slate-400">===</span>
              <span className="text-emerald-400 font-bold">Monthly Loaded CTC</span>
            </div>
          </div>

          {/* Metric Widget 2: 3 Active Facility Policies */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold">
                <Building2 className="w-3.5 h-3.5" />
                <span>Branch Alpha</span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">Plant Standard</p>
              <p className="text-[10px] text-slate-400 font-mono">Mode A &bull; 50% Net &bull; Fixed DA</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Branch Beta</span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">Tech Centre</p>
              <p className="text-[10px] text-slate-400 font-mono">Mode B &bull; 40% CTC &bull; PF Cap</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold">
                <Building2 className="w-3.5 h-3.5" />
                <span>Branch Gamma</span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">Logistics Hub</p>
              <p className="text-[10px] text-slate-400 font-mono">Mode A &bull; Multi-State PT</p>
            </div>
          </div>

          {/* Metric Widget 3: Maker-Checker Governance Stepper */}
          <div className="p-4 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 space-y-2">
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Maker-Checker Two-Man Governance Rule
            </p>
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
              <div className="py-1 px-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                1. Draft Run
              </div>
              <div className="py-1 px-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                2. Maker Submit
              </div>
              <div className="py-1 px-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                3. Checker Approve
              </div>
              <div className="py-1 px-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                4. Finalize
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Architectural Credits */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Shende Industries Enterprise Portal</span>
          <span className="font-mono text-indigo-300 font-semibold">Ready for Commercial Deployment</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
