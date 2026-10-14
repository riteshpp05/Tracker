// Backend/src/routes/enterpriseRoutes.js
import express from "express";
import enterpriseController from "../controllers/enterpriseController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Geofence configuration (Public for login screen + authenticated)
router.get("/geofences", (req, res) => enterpriseController.getOfficeGeofences(req, res));

// Authenticated enterprise portal services
router.use(authenticateToken);

// Holidays
router.get("/holidays", (req, res) => enterpriseController.getHolidays(req, res));
router.post(
  "/holidays",
  authorizeRoles("ADMIN", "HR"),
  (req, res) => enterpriseController.addHoliday(req, res)
);

// Announcements
router.get("/announcements", (req, res) => enterpriseController.getAnnouncements(req, res));
router.post(
  "/announcements",
  authorizeRoles("ADMIN", "HR"),
  (req, res) => enterpriseController.createAnnouncement(req, res)
);

// Documents & Policies
router.get("/documents", (req, res) => enterpriseController.getDocuments(req, res));

export default router;
