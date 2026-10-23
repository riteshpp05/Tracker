import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Lenis from "lenis";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { NotificationPopover } from "./common/NotificationPopover";
import {
  LayoutDashboard,
  Clock,
  FolderOpen,
  Ticket as TicketIcon,
  ListChecks,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  ChevronDown,
  CalendarDays,
  Receipt,
  UserPlus,
  ShieldAlert,
  Globe,
  Users,
  Briefcase,
  ListTodo,
  ClipboardList,
  Wrench,
  ExternalLink,
  Banknote,
  CreditCard,
  FileSpreadsheet,
  Layers,
  Calculator,
  Megaphone,
  BookOpen,
  MapPin,
} from "lucide-react";

const BRAND_NAV = "#111827"; // SIPL Brand navy
const BRAND_ACTIVE = "#6558D9"; // violet accent

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Lenis smooth scroll on main content area (per Lenis rules)
  useEffect(() => {
    const wrapper = document.querySelector(".main-scroll-area");
    if (!wrapper) return;
    const lenis = new Lenis({
      wrapper,
      content: wrapper.firstElementChild || wrapper,
      lerp: 0.1,
      duration: 1.1,
      smoothWheel: true,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);
    return () => {
      lenis.destroy();
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const onResize = () => setSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getUserInitials = (name) => {
    if (!name) return "SI";
    const parts = name.trim().split(" ");
    return parts.length === 1
      ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const navigation = {
    ADMIN: [
      {
        section: "Core Operations",
        items: [
          { name: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
          { name: "Employees", href: "/admin/users", icon: Users },
          { name: "Clients", href: "/admin/clients", icon: Briefcase },
          { name: "Projects", href: "/admin/projects", icon: FolderOpen },
        ],
      },
      {
        section: "Delivery & Timesheets",
        items: [
          { name: "Tickets", href: "/admin/tickets", icon: TicketIcon },
          { name: "Tasks", href: "/admin/tasks", icon: ListTodo },
          { name: "Assignments", href: "/admin/assignments", icon: ListChecks },
          { name: "Timesheet Approvals", href: "/admin/timesheet-approval", icon: Clock },
        ],
      },
      {
        section: "Attendance & Leaves",
        items: [
          { name: "Attendance Master", href: "/admin/attendance", icon: MapPin },
          { name: "Leaves", href: "/admin/leaves", icon: CalendarDays },
          { name: "Travel & Expenses", href: "/admin/expenses", icon: Receipt },
        ],
      },
      {
        section: "Payroll & Statutory",
        items: [
          { name: "Payroll Dashboard", href: "/admin/payroll", icon: Banknote },
          { name: "Monthly Payroll", href: "/admin/payroll/process", icon: Calculator },
          { name: "Employee Salaries", href: "/admin/payroll/salaries", icon: CreditCard },
          { name: "Salary Structures", href: "/admin/payroll/structures", icon: Layers },
          { name: "Statutory Reports", href: "/admin/payroll/reports", icon: FileSpreadsheet },
        ],
      },
      {
        section: "Enterprise Portal",
        items: [
          { name: "Recruitment (ATS)", href: "/hr/recruitment", icon: UserPlus },
          { name: "Holidays", href: "/holidays", icon: CalendarDays },
          { name: "Notice Board", href: "/announcements", icon: Megaphone },
          { name: "Policy Center", href: "/documents", icon: BookOpen },
        ],
      },
      {
        section: "Administration",
        items: [
          { name: "Audit Trail", href: "/admin/audit-logs", icon: ShieldAlert },
          { name: "Reports", href: "/admin/reports", icon: BarChart3 },
          { name: "System Settings", href: "/admin/settings", icon: Settings },
        ],
      },
    ],
    HR: [
      {
        section: "Core Operations",
        items: [
          { name: "Dashboard", href: "/hr/dashboard", icon: LayoutDashboard },
          { name: "Employees", href: "/admin/users", icon: Users },
          { name: "Recruitment (ATS)", href: "/hr/recruitment", icon: UserPlus },
        ],
      },
      {
        section: "Attendance & Leaves",
        items: [
          { name: "Attendance Master", href: "/admin/attendance", icon: MapPin },
          { name: "Leaves", href: "/hr/leaves", icon: CalendarDays },
          { name: "Travel & Expenses", href: "/hr/expenses", icon: Receipt },
        ],
      },
      {
        section: "Payroll Suite",
        items: [
          { name: "Payroll Dashboard", href: "/admin/payroll", icon: Banknote },
          { name: "Monthly Payroll", href: "/admin/payroll/process", icon: Calculator },
          { name: "Employee Salaries", href: "/admin/payroll/salaries", icon: CreditCard },
          { name: "Salary Structures", href: "/admin/payroll/structures", icon: Layers },
          { name: "Statutory Reports", href: "/admin/payroll/reports", icon: FileSpreadsheet },
        ],
      },
      {
        section: "Enterprise Portal",
        items: [
          { name: "Holidays", href: "/holidays", icon: CalendarDays },
          { name: "Notice Board", href: "/announcements", icon: Megaphone },
          { name: "Policy Center", href: "/documents", icon: BookOpen },
          { name: "Reports", href: "/admin/reports", icon: BarChart3 },
        ],
      },
    ],
    MANAGER: [
      {
        section: "Overview & Team",
        items: [
          { name: "Dashboard", href: "/manager/dashboard", icon: LayoutDashboard },
          { name: "Attendance Desk", href: "/employee/attendance", icon: MapPin },
          { name: "Team Attendance", href: "/admin/attendance", icon: Clock },
        ],
      },
      {
        section: "Project & Tickets",
        items: [
          { name: "My Tickets", href: "/manager/my-tickets", icon: TicketIcon },
          { name: "Project Tickets", href: "/manager/tickets", icon: TicketIcon },
          { name: "Assign Tickets", href: "/manager/assignments", icon: ListChecks },
        ],
      },
      {
        section: "Timesheets & Approvals",
        items: [
          { name: "Timesheet Entry", href: "/manager/timesheet", icon: Clock },
          { name: "Timesheet Approvals", href: "/manager/approvals", icon: ListChecks },
          { name: "Leave Approvals", href: "/manager/leaves", icon: CalendarDays },
          { name: "Travel & Expenses", href: "/manager/expenses", icon: Receipt },
        ],
      },
      {
        section: "Company & Reports",
        items: [
          { name: "Holidays", href: "/holidays", icon: CalendarDays },
          { name: "Notice Board", href: "/announcements", icon: Megaphone },
          { name: "Policy Center", href: "/documents", icon: BookOpen },
          { name: "Reports", href: "/manager/reports", icon: BarChart3 },
        ],
      },
    ],
    EMPLOYEE: [
      {
        section: "Daily Workspace",
        items: [
          { name: "Dashboard", href: "/employee/dashboard", icon: LayoutDashboard },
          { name: "Attendance Desk", href: "/employee/attendance", icon: MapPin },
          { name: "Timesheet", href: "/employee/timesheet", icon: Clock },
          { name: "Tasks/Tickets", href: "/employee/my-tickets", icon: TicketIcon },
        ],
      },
      {
        section: "Self-Service",
        items: [
          { name: "Leaves", href: "/employee/leaves", icon: CalendarDays },
          { name: "Travel & Expenses", href: "/employee/expenses", icon: Receipt },
          { name: "My Payslips", href: "/employee/payslips", icon: Receipt },
          { name: "Timesheet History", href: "/employee/history", icon: ClipboardList },
        ],
      },
      {
        section: "Company Portal",
        items: [
          { name: "Holidays", href: "/holidays", icon: CalendarDays },
          { name: "Notice Board", href: "/announcements", icon: Megaphone },
          { name: "Policy Center", href: "/documents", icon: BookOpen },
        ],
      },
    ],
  };

  const currentSections = user ? navigation[user.role] || [] : [];
  const allNavItems = currentSections.flatMap((s) => s.items || []);

  // Find page title from current path
  const pageTitle =
    allNavItems.find((item) => item.href === location.pathname)?.name ||
    "Workspace";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F7F8FA] font-sans text-[#172033]">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── Matches enterprise SaaS standard: 256px width, icons, 40px active pill */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } bg-white border-r border-[#E5E7EB] w-64 flex flex-col`}
      >
        {/* Brand header — h-14 aligned with top bar */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#E5E7EB]">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Shende Industries" className="w-7 h-7 rounded-lg" />
            <div className="flex flex-col">
              <span className="font-bold text-[14px] text-[#172033] tracking-tight leading-none">
                Shende Industries
              </span>
              <span className="text-[10px] text-[#667085] mt-0.5 font-medium tracking-wide">
                Operations &amp; Payroll
              </span>
            </div>
          </Link>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EEEDFB] text-[#6558D9] border border-[#6558D9]/20 uppercase tracking-wide">
            {user?.role || "PORTAL"}
          </span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-3" data-lenis-prevent="true">
          {currentSections.map((group, groupIdx) => (
            <div key={group.section || groupIdx} className="space-y-0.5">
              <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#98A2B3]">
                {group.section}
              </div>
              {group.items.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center gap-2.5 h-9 px-3 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-[#111827] text-white shadow-xs font-semibold"
                        : "text-[#667085] hover:text-[#172033] hover:bg-[#F7F8FA]"
                    }`}
                  >
                    {Icon && (
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? "text-white" : "text-[#667085] group-hover:text-[#172033]"
                        }`}
                      />
                    )}
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Support section at sidebar bottom */}
        <div className="p-3 border-t border-[#E5E7EB] mt-auto">
          <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#98A2B3]">
            Platform
          </p>
          <Link
            to="/"
            className="flex items-center justify-between px-3 py-2 text-[12px] font-medium text-[#667085] hover:text-[#172033] hover:bg-[#F7F8FA] rounded-xl transition-colors"
          >
            <span className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              Public Portal
            </span>
            <ExternalLink className="w-3 h-3 text-[#98A2B3]" />
          </Link>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 overflow-hidden ${
          sidebarOpen ? "lg:ml-64" : ""
        }`}
      >
        {/* Top bar */}
        <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 rounded-md text-[#667085] hover:bg-[#F7F8FA] transition-colors"
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            {/* Brand visible on mobile */}
            <span className="lg:hidden font-bold text-[14px] text-[#172033]">Shende Industries</span>

            {/* Search bar — matches Cloudstine */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg w-72">
              <svg className="w-3.5 h-3.5 text-[#667085]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-[13px] text-[#667085]">Search projects, tasks, users…</span>
            </div>
          </div>

          {/* Right: notification popover + single unified user menu */}
          <div className="flex items-center gap-2">
            <NotificationPopover />

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg hover:bg-[#F7F8FA] border border-transparent hover:border-[#E5E7EB] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6558D9]"
                aria-expanded={userMenuOpen}
              >
                <div className="w-7 h-7 rounded-full bg-[#6558D9] text-white flex items-center justify-center font-semibold text-[11px] shrink-0">
                  {getUserInitials(user?.name)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[12px] font-semibold text-[#172033] leading-tight">{user?.name || "User"}</p>
                  <p className="text-[10px] text-[#667085] leading-tight uppercase tracking-wide">
                    {user?.role || ""}
                  </p>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#667085] shrink-0 transition-transform ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {userMenuOpen && (
                <div
                  data-lenis-prevent="true"
                  className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-[#E5E7EB] rounded-xl shadow-lg overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3.5 py-2.5 border-b border-[#E5E7EB] bg-[#FAFBFC]">
                    <p className="text-xs font-semibold text-[#172033] truncate">
                      {user?.name || "User"}
                    </p>
                    <p className="text-[11px] text-[#667085] truncate">
                      {user?.email || ""}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-[#6558D9] border border-indigo-100 uppercase">
                      {user?.role || "PORTAL"}
                    </span>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => {
                        navigate("/profile");
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center px-3 py-2 text-[12px] text-[#172033] hover:bg-[#F7F8FA] rounded-md transition-colors gap-2.5 text-left"
                    >
                      <User className="w-3.5 h-3.5 text-[#667085]" />
                      My Profile & Settings
                    </button>
                    <button
                      onClick={() => {
                        navigate("/notifications");
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center px-3 py-2 text-[12px] text-[#172033] hover:bg-[#F7F8FA] rounded-md transition-colors gap-2.5 text-left"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#667085]" />
                      All Notifications
                    </button>
                  </div>

                  <div className="p-1 border-t border-[#E5E7EB]">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 rounded-md transition-colors gap-2.5 text-left font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto main-scroll-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Layout;
