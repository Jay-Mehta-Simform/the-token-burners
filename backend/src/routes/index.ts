import { Router } from "express";
import { reverseSpecController } from "../controllers/reverseSpecController.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Intent Drift — pipeline step 1: Reverse Spec Generation from a GitHub PR diff.
router.post("/reverse-spec", reverseSpecController);

export default router;
