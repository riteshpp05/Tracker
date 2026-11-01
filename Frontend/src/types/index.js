/**
 * @file Frontend Domain Types & Constants
 * Unified domain models and enumeration types for Shende Industries Enterprise Platform.
 */

/**
 * Primary user operational personas
 */
export const UserRoles = {
  ADMIN: "ADMIN",
  HR: "HR",
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
};

/**
 * Weekly Timesheet Submission & Approval Statuses
 */
export const TimesheetStatuses = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  MANAGER_APPROVED: "Manager_Approved",
  MANAGER_REJECTED: "Manager_Rejected",
  ADMIN_APPROVED: "Admin_Approved",
  ADMIN_REJECTED: "Admin_Rejected",
  PARTIALLY_APPROVED: "Partially_Approved",
  APPROVED: "Approved",
  LOCKED: "Locked",
};

/**
 * Monthly Payroll Maker-Checker Governance Statuses
 */
export const PayrollStatuses = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  FINALIZED: "FINALIZED",
  PAID: "PAID",
  REJECTED: "REJECTED",
};

/**
 * Recruitment ATS Application Pipeline Stages
 */
export const ApplicationStages = {
  APPLIED: "APPLIED",
  REVIEWING: "REVIEWING",
  SHORTLISTED: "SHORTLISTED",
  INTERVIEW_SCHEDULED: "INTERVIEW_SCHEDULED",
  INTERVIEWED: "INTERVIEWED",
  OFFERED: "OFFERED",
  HIRED: "HIRED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
};

/**
 * Project Delivery Lifecycle Statuses
 */
export const ProjectStatuses = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
};

/**
 * Task & Ticket Operational Statuses
 */
export const TicketStatuses = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  CLOSED: "Closed",
};

/**
 * Indian Statutory Regimes (FY 2026-27 / AY 2026-27)
 */
export const StatutoryRegimes = {
  NEW_REGIME_FY2627: "NEW_REGIME_FY2627",
  OLD_REGIME: "OLD_REGIME",
};
