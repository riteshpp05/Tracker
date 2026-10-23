import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { Lock, Mail, Eye, EyeOff, Shield, Users, Briefcase, UserCheck, MapPin, Navigation } from "lucide-react";
import enterpriseService from "../services/enterpriseService";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState("detecting");
  const [nearestOfficeName, setNearestOfficeName] = useState("");

  useEffect(() => {
    let isMounted = true;
    const detectLocation = async () => {
      try {
        const geoRes = await enterpriseService.getGeofences();
        const geofences = geoRes.data || [];

        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!isMounted) return;
              const coords = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              };
              sessionStorage.setItem("pendingLoginLocation", JSON.stringify(coords));

              let foundOffice = null;
              for (const geo of geofences) {
                const rad = Math.PI / 180;
                const dLat = (parseFloat(geo.latitude) - coords.latitude) * rad;
                const dLon = (parseFloat(geo.longitude) - coords.longitude) * rad;
                const a =
                  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(coords.latitude * rad) *
                    Math.cos(parseFloat(geo.latitude) * rad) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const d = 6371e3 * c;
                if (d <= geo.radius_meters) {
                  foundOffice = geo.name;
                  break;
                }
              }

              if (foundOffice) {
                setNearestOfficeName(foundOffice);
                setLocationStatus("in-office");
              } else {
                setLocationStatus("remote");
              }
            },
            () => {
              if (isMounted) setLocationStatus("denied");
            },
            { timeout: 8000 }
          );
        } else {
          if (isMounted) setLocationStatus("denied");
        }
      } catch (e) {
        if (isMounted) setLocationStatus("remote");
      }
    };
    detectLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  const DEMO_ACCOUNTS = [
    {
      role: "Admin",
      email: "admin@shendeindustries.com",
      password: "password123",
      icon: Shield,
      color: "bg-[#F7F8FA] hover:bg-[#eef2ff] border-[#E5E7EB] text-[#172033]",
    },
    {
      role: "HR",
      email: "hr@shendeindustries.com",
      password: "password123",
      icon: Users,
      color: "bg-[#F7F8FA] hover:bg-[#eef2ff] border-[#E5E7EB] text-[#172033]",
    },
    {
      role: "Manager",
      email: "manager@shendeindustries.com",
      password: "password123",
      icon: Briefcase,
      color: "bg-[#F7F8FA] hover:bg-[#eef2ff] border-[#E5E7EB] text-[#172033]",
    },
    {
      role: "Employee",
      email: "employee@shendeindustries.com",
      password: "password123",
      icon: UserCheck,
      color: "bg-[#F7F8FA] hover:bg-[#eef2ff] border-[#E5E7EB] text-[#172033]",
    },
  ];

  const handleQuickLogin = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    try {
      setIsLoading(true);
      const user = await login({ email, password });
      toast.success(`Welcome back, ${user.first_name || user.email}`);

      const from = location.state?.from?.pathname;
      if (from && from !== "/" && from !== "/login") {
        navigate(from, { replace: true });
        return;
      }

      const redirectPath =
        user.role === "ADMIN" ? "/admin/dashboard"
        : user.role === "HR" ? "/hr/dashboard"
        : user.role === "MANAGER" ? "/manager/dashboard"
        : "/employee/dashboard";
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const errData = err?.response?.data;
      const rawMsg =
        (typeof errData?.error === "string" ? errData.error : null) ||
        (typeof errData?.message === "string" ? errData.message : null) ||
        (typeof err?.message === "string" ? err.message : null) ||
        "Login failed. Please check credentials or database connection.";
      toast.error(rawMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo + wordmark */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img src="/favicon.svg" alt="Shende Industries" className="w-10 h-10 rounded-xl" />
          </div>
          <h1 className="text-[22px] font-bold text-[#172033] tracking-tight">
            Shende Industries Portal
          </h1>
          <p className="text-[13px] text-[#667085]">
            Enter your corporate credentials to access your operations &amp; payroll workspace.
          </p>
        </div>

        {/* Main card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-5">
          {/* Demo quick-fill */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
              Test accounts — click to fill
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickLogin(acc)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${acc.color}`}
                  >
                    <Icon className="w-3.5 h-3.5 text-[#6558D9] shrink-0" />
                    <div>
                      <p className="text-[12px] font-semibold leading-tight">{acc.role}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#E5E7EB]" />

          {/* Cloudstine-inspired Geolocation Verification Status */}
          <div className="py-1">
            {locationStatus === "detecting" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/80 border border-amber-200/60 text-amber-700 text-xs">
                <Navigation className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>Checking network & office location...</span>
              </div>
            )}
            {locationStatus === "in-office" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Verified in-office: {nearestOfficeName}</span>
              </div>
            )}
            {locationStatus === "remote" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Remote / External Network Access</span>
              </div>
            )}
            {locationStatus === "denied" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Location access denied — standard sign-in active</span>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[12px] font-semibold text-[#172033] block">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#667085] pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-9 text-[13px] bg-[#F7F8FA] border-[#E5E7EB] focus:bg-white focus:border-[#6558D9] focus:ring-1 focus:ring-[#6558D9] rounded-lg"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[12px] font-semibold text-[#172033] block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#667085] pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 h-9 text-[13px] bg-[#F7F8FA] border-[#E5E7EB] focus:bg-white focus:border-[#6558D9] focus:ring-1 focus:ring-[#6558D9] rounded-lg"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#172033] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-[#111827] hover:bg-[#1f2937] disabled:opacity-60 transition-colors"
            >
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1">
          <p className="text-[11px] text-[#667085]">
            Authorized personnel only. Unauthorized access is prohibited.
          </p>
          <Link to="/" className="text-[12px] text-[#6558D9] hover:underline">
            ← Back to Shende Industries website
          </Link>
        </div>
      </div>
    </div>
  );
}
