import express from "express";
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getManagers,
  getEmployeesByManager,
  getDepartments,
  reactivateEmployee, // ✅ NEW: Import reactivate function
} from "../controllers/employeeController.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import protectSuperAdmin from "../middleware/protectSuperAdmin.js"; // ✅ NEW LINE

const router = express.Router();

// All employee routes require auth
router.use(authenticateToken);

// ========================================
// SPECIFIC ROUTES FIRST (before /:id)
// ========================================

// ✅ Get all departments (for dropdowns)
// Must be before /:id routes
router.get(
  "/departments",
  authorizeRoles(["ADMIN", "HR", "MANAGER"]),
  getDepartments
);

// Get all managers
router.get("/managers", authorizeRoles(["ADMIN", "HR", "MANAGER"]), getManagers);

// Get employees under a specific manager (TEAM MEMBERS)
router.get(
  "/manager/:managerId",
  authorizeRoles(["ADMIN", "HR", "MANAGER"]),
  getEmployeesByManager
);

// ✅ NEW: Reactivate employee (ADMIN & HR)
// Must be before /:id routes to avoid conflict
router.patch("/:id/reactivate", authorizeRoles(["ADMIN", "HR"]), reactivateEmployee);

router.patch(
  "/:id/deactivate",
  authorizeRoles(["ADMIN", "HR"]),
  protectSuperAdmin, // ✅ Protection middleware
  deleteEmployee
);

// ========================================
// GENERAL ROUTES
// ========================================

// List employees (ADMIN, HR, MANAGER)
router.get("/", authorizeRoles(["ADMIN", "HR", "MANAGER"]), getAllEmployees);

// Get employees by id (any authenticated)
router.get("/:id", getEmployeeById);

// Create employee (ADMIN, HR)
router.post("/", authorizeRoles(["ADMIN", "HR"]), createEmployee);

// Update employee (ADMIN, HR)
router.put("/:id", authorizeRoles(["ADMIN", "HR"]), updateEmployee);

// Deactivate employee (ADMIN, HR)
router.delete(
  "/:id",
  authorizeRoles(["ADMIN", "HR"]),
  protectSuperAdmin, // ✅ ADD THIS LINE
  deleteEmployee
);

export default router;
