// src/routes.jsx
import React from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import { Login } from "./components/Login";

// Public Website Components
import { PublicLayout } from "./components/public/PublicLayout";
import { HomePage } from "./components/public/HomePage";
import { AboutPage } from "./components/public/AboutPage";
import { ServicesPage } from "./components/public/ServicesPage";
import { CareersPage } from "./components/public/CareersPage";
import { JobDetailPage } from "./components/public/JobDetailPage";
import { ContactPage } from "./components/public/ContactPage";
import { PrivacyTermsPage } from "./components/public/PrivacyTermsPage";

// Dashboards
import AdminDashboard from "./components/dashboards/AdminDashboard";
import { ManagerDashboard } from "./components/dashboards/ManagerDashboard";
import { EmployeeDashboard } from "./components/dashboards/EmployeeDashboard";
import { HRDashboard } from "./components/dashboards/HRDashboard";

// Admin Management Components
import { UserManagement } from "./components/admin/UserManagement";
import { ClientManagement } from "./components/admin/ClientManagement";
import { ProjectManagement } from "./components/admin/ProjectManagement";
import { AdminTicketManagement } from "./components/admin/AdminTicketManagement";
import { TaskManagement } from "./components/admin/TaskManagement";
import TicketAssignmentPage from "./components/admin/TicketAssignmentPage";
import { AdminTimesheetApproval } from "./components/admin/AdminTimesheetApproval";
import { AdminReports } from "./components/admin/AdminReports";
import { SystemSettings } from "./components/admin/SystemSettings";
import AuditLogsPage from "./components/admin/AuditLogsPage";

// HR Components
import HRRecruitmentPage from "./components/hr/HRRecruitmentPage";

// Manager Components
import ManagerTicketManagement from "./components/manager/ManagerTicketManagement";
import ManagerTicketAssignment from "./components/manager/ManagerTicketAssignment";
import { ManagerTimesheetEntry } from "./components/manager/ManagerTimesheetEntry";
import { TimesheetApproval } from "./components/manager/TimesheetApproval";

// Employee & Shared Self-Service Components
import MyTickets from "./components/employee/MyTickets";
import { EmployeeTimesheetEntry } from "./components/employee/EmployeeTimesheetEntry";
import { TimesheetHistory } from "./components/employee/TimesheetHistory";
import LeaveManagementPage from "./components/employee/LeaveManagementPage";
import ExpenseTravelPage from "./components/employee/ExpenseTravelPage";

// Common Components
import { Profile } from "./components/common/Profile";
import { Notifications } from "./components/common/Notifications";
import { NotFound } from "./components/common/NotFound";
import { useAuth } from "./hooks/useAuth";

const getDashboardPath = (role) => {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "HR":
      return "/hr/dashboard";
    case "MANAGER":
      return "/manager/dashboard";
    case "EMPLOYEE":
    default:
      return "/employee/dashboard";
  }
};

/**
 * PUBLIC ROUTE COMPONENT
 * - Redirects authenticated users away from login page to their role dashboard
 */
function PublicRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">
          Authenticating Shende Industries Portal...
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <>{children}</>;
}

/**
 * PROTECTED ROUTE COMPONENT
 * - Handles authentication and role-based authorization
 */
function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">
          Validating Security Credentials...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <>{children}</>;
}

/**
 * Layout wrapper that renders nested protected routes with <Outlet />
 */
function LayoutWrapper() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* ============================================ */}
      {/* PUBLIC CORPORATE WEBSITE */}
      {/* ============================================ */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<Navigate to="/" replace />} />
        <Route path="/services" element={<Navigate to="/" replace />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/careers/:slug" element={<JobDetailPage />} />
        <Route path="/contact" element={<Navigate to="/" replace />} />
        <Route path="/privacy" element={<PrivacyTermsPage />} />
        <Route path="/terms" element={<PrivacyTermsPage />} />
      </Route>

      {/* ============================================ */}
      {/* EMPLOYEE PORTAL AUTHENTICATION */}
      {/* ============================================ */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* ============================================ */}
      {/* ALL PROTECTED WORKSPACE ROUTES */}
      {/* ============================================ */}
      <Route element={<LayoutWrapper />}>
        {/* ============================================ */}
        {/* EMPLOYEE ROUTES */}
        {/* ============================================ */}
        <Route
          path="/employee/dashboard"
          element={
            <ProtectedRoute roles={["EMPLOYEE"]}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/my-tickets"
          element={
            <ProtectedRoute roles={["EMPLOYEE"]}>
              <MyTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/timesheet"
          element={
            <ProtectedRoute roles={["EMPLOYEE"]}>
              <EmployeeTimesheetEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/history"
          element={
            <ProtectedRoute roles={["EMPLOYEE"]}>
              <TimesheetHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/leaves"
          element={
            <ProtectedRoute roles={["EMPLOYEE"]}>
              <LeaveManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/expenses"
          element={
            <ProtectedRoute roles={["EMPLOYEE"]}>
              <ExpenseTravelPage />
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* MANAGER ROUTES */}
        {/* ============================================ */}
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/my-tickets"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <MyTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/tickets"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <ManagerTicketManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/assignments"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <ManagerTicketAssignment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/timesheet"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <ManagerTimesheetEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/approvals"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <TimesheetApproval />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/leaves"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <LeaveManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/expenses"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <ExpenseTravelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/history"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <TimesheetHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/reports"
          element={
            <ProtectedRoute roles={["MANAGER"]}>
              <AdminReports />
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* HR ROUTES */}
        {/* ============================================ */}
        <Route
          path="/hr/dashboard"
          element={
            <ProtectedRoute roles={["HR", "ADMIN"]}>
              <HRDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/recruitment"
          element={
            <ProtectedRoute roles={["HR", "ADMIN"]}>
              <HRRecruitmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/leaves"
          element={
            <ProtectedRoute roles={["HR", "ADMIN"]}>
              <LeaveManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/expenses"
          element={
            <ProtectedRoute roles={["HR", "ADMIN"]}>
              <ExpenseTravelPage />
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* ADMIN ROUTES */}
        {/* ============================================ */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={["ADMIN", "HR"]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/clients"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <ClientManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/projects"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <ProjectManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tickets"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminTicketManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tasks"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <TaskManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/assignments"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <TicketAssignmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/timesheet-approval"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminTimesheetApproval />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/leaves"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <LeaveManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/expenses"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <ExpenseTravelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute roles={["ADMIN", "MANAGER", "HR"]}>
              <AdminReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <SystemSettings />
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* COMMON AUTHENTICATED ROUTES */}
        {/* ============================================ */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ============================================ */}
      {/* 404 CATCH ALL */}
      {/* ============================================ */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
