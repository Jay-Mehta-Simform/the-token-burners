import { Router } from "express";
import fileRoutes from "./fileRoutes.js";
import userRoutes from "./userRoutes.js";
import { analysisController } from "../controllers/analysisController.js";
import { compareController } from "../controllers/compareController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/files", fileRoutes);
router.use("/", userRoutes);

// Intent Drift — trigger full analysis pipeline: PR diff → reverse spec → S3 upload → DB record.
router.post("/analyses", authenticate, analysisController);

// Intent Drift — stateless step 2+3: original spec (+ reverse spec) → gaps + questions JSON.
// Latest of any timestamped spec versions is treated as authoritative.
router.post("/compare-spec", compareController);

export default router;
