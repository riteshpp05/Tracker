import express from "express";
import {
  getCompanyInfo,
  getPublicJobs,
  getPublicJobDetail,
  submitJobApplication,
  submitContactInquiry,
} from "../controllers/publicController.js";

const router = express.Router();

router.get("/company-info", getCompanyInfo);
router.get("/jobs", getPublicJobs);
router.get("/jobs/:slug", getPublicJobDetail);
router.post("/applications", submitJobApplication);
router.post("/contact", submitContactInquiry);

export default router;
