import { Router } from "express";
import fileRoutes from "./fileRoutes.js";
import userRoutes from "./userRoutes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/files", fileRoutes);
router.use("/", userRoutes); // Handles /auth and /projects (via /users or directly)

export default router;
