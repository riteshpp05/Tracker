import jwt from "jsonwebtoken";
import pool from "../config/database.js";

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    const jwtSecret = process.env.JWT_SECRET || "shende_industries_jwt_secret_enterprise_2026_super_key";
    const decoded = jwt.verify(token, jwtSecret);

    let user = null;
    try {
      // Join user_roles to get role name
      const result = await pool.query(
        `SELECT 
           e.employee_id, 
           e.employee_code, 
           e.email,
           e.role AS role_id,
           ur.name AS role_name,
           e.is_active,
           e.department AS department_id,
           d.name AS department_name
         FROM employees e
         LEFT JOIN user_roles ur ON ur.id = e.role
         LEFT JOIN departments d ON d.id = e.department
         WHERE e.employee_id = $1`,
        [decoded.id]
      );

      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    } catch (dbErr) {
      console.warn("⚠️ Database query failed in authMiddleware, falling back to token payload:", dbErr.message);
    }

    if (user && !user.is_active) {
      return res.status(403).json({ error: "Account is inactive" });
    }

    // Map DB columns or decoded token payload to req.user object
    const fallbackRole = decoded.role || (decoded.email?.includes("admin") ? "ADMIN" : decoded.email?.includes("hr") ? "HR" : decoded.email?.includes("manager") ? "MANAGER" : "EMPLOYEE");

    req.user = {
      id: user?.employee_id || decoded.id || "e0000000-0000-0000-0000-000000000001", // UUID PK
      employeeId: user?.employee_id || decoded.id || "e0000000-0000-0000-0000-000000000001", // UUID alias
      employeeCode: user?.employee_code || decoded.employeeCode || "SH-001",
      email: user?.email || decoded.email || "admin@shendeindustries.com",
      role: user?.role_name || fallbackRole, // string, e.g. "ADMIN"
      roleId: user?.role_id || decoded.roleId || (fallbackRole === "ADMIN" ? 1 : fallbackRole === "HR" ? 2 : fallbackRole === "MANAGER" ? 3 : 4),
      department: user?.department_name || decoded.department || "Operations",
      departmentId: user?.department_id || decoded.departmentId || 1,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token", code: "INVALID_TOKEN" });
    }

    return res.status(500).json({ error: "Authentication error" });
  }
};

// Middleware to authorize roles (supports array or spread arguments)
const authorizeRoles = (...roles) => {
  const allowedRoles = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // allowedRoles should be string names, e.g. ["ADMIN", "MANAGER"]
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        message: `This action requires one of the following roles: ${allowedRoles.join(
          ", "
        )}`,
      });
    }

    next();
  };
};
// Export both middleware functions
export { authenticateToken, authorizeRoles };
