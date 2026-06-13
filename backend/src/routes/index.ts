import { Router } from "express";
import uploadRouter from "./upload.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/upload", uploadRouter);

export default router;
