import { Router } from "express";
import fileRoutes from "./fileRoutes.js";
import projectRoutes from "./projectRoutes.js";
import analysisRoutes from "./analysisRoutes.js";
import { compareController } from "../controllers/compareController.js";
import { getMe } from "../controllers/userController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Current authenticated user (sidebar identity + Settings).
router.get("/me", authenticate, getMe);

router.use("/files", fileRoutes);
router.use("/projects", projectRoutes);
router.use("/analyses", analysisRoutes);

// Intent Drift — stateless step 2+3: original spec (+ reverse spec) → gaps + questions JSON.
// Latest of any timestamped spec versions is treated as authoritative.
router.post("/compare-spec", compareController);

export default router;
