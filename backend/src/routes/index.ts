import { Router } from "express";
import fileRoutes from "./fileRoutes.js";
import userRoutes from "./userRoutes.js";
import projectRoutes from "./projectRoutes.js";
import analysisRoutes from "./analysisRoutes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/files", fileRoutes);
router.use("/", userRoutes);
router.use("/projects", projectRoutes);
router.use("/analyses", analysisRoutes);

export default router;
