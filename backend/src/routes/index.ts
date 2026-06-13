import { Router } from "express";
import fileRoutes from "./fileRoutes.js";
import userRoutes from "./userRoutes.js";
import { analysisController } from "../controllers/analysisController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/files", fileRoutes);
router.use("/", userRoutes);

// Intent Drift — trigger full analysis pipeline: PR diff → reverse spec → S3 upload → DB record.
router.post("/analyses", authenticate, analysisController);

export default router;
