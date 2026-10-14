// Backend/src/routes/attendanceRoutes.js
import express from "express";
import attendanceController from "../controllers/attendanceController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

// Employee Self-Service Punch & Breaks
router.get("/today", (req, res) => attendanceController.getTodayStatus(req, res));
router.post("/check-in", (req, res) => attendanceController.checkIn(req, res));
router.post("/check-out", (req, res) => attendanceController.checkOut(req, res));
router.post("/break/start", (req, res) => attendanceController.startBreak(req, res));
router.post("/break/end", (req, res) => attendanceController.endBreak(req, res));
router.get("/my-history", (req, res) => attendanceController.getMyAttendanceHistory(req, res));

// Regularization Requests
router.post("/regularization", (req, res) => attendanceController.requestRegularization(req, res));
router.get("/regularizations", (req, res) => attendanceController.getRegularizations(req, res));
router.put(
  "/regularizations/:id/review",
  authorizeRoles("ADMIN", "HR", "MANAGER"),
  (req, res) => attendanceController.reviewRegularization(req, res)
);

// Master Register (Management)
router.get(
  "/master",
  authorizeRoles("ADMIN", "HR", "MANAGER"),
  (req, res) => attendanceController.getAttendanceMasterRegister(req, res)
);

export default router;
