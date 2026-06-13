import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  triggerAnalysis,
  getAnalysis,
  provideSpecController,
  saveAnswer,
  submitAnalysis,
  exportAnalysis,
  retriggerController,
} from "../controllers/analysisController.js";

const router = Router();

/**
 * @swagger
 * /analyses:
 *   post:
 *     summary: Trigger a new analysis for a PR (async — returns immediately)
 *     tags: [Analyses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [project_id, pr_number]
 *             properties:
 *               project_id: { type: string, format: uuid }
 *               pr_number:  { type: integer, minimum: 1 }
 *               original_spec: { type: string }
 *     responses:
 *       201:
 *         description: Analysis created — poll GET /analyses/:id for status
 *       409:
 *         description: Analysis already in progress for this PR
 */
router.post("/", authenticate, triggerAnalysis);

/**
 * @swagger
 * /analyses/{id}:
 *   get:
 *     summary: Poll analysis status and retrieve full result
 *     tags: [Analyses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full analysis with status, reverse_spec, gaps, questions
 *       404:
 *         description: Analysis not found
 */
router.get("/:id", authenticate, getAnalysis);

/**
 * @swagger
 * /analyses/{id}/spec:
 *   patch:
 *     summary: Provide the original spec to trigger gap analysis
 *     tags: [Analyses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [spec]
 *             properties:
 *               spec: { type: string }
 *     responses:
 *       202:
 *         description: Spec accepted — gap analysis running in background
 */
router.patch("/:id/spec", authenticate, provideSpecController);

/**
 * @swagger
 * /analyses/{id}/answers:
 *   patch:
 *     summary: Save an answer to one question (Respondent only)
 *     tags: [Analyses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question_id, answer]
 *             properties:
 *               question_id: { type: string, format: uuid }
 *               answer:      { type: string }
 *     responses:
 *       200:
 *         description: Answer saved
 *       403:
 *         description: Not the Respondent
 */
router.patch("/:id/answers", authenticate, saveAnswer);

/**
 * @swagger
 * /analyses/{id}/submit:
 *   post:
 *     summary: Submit the completed analysis (all questions must be answered; Respondent only)
 *     tags: [Analyses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Analysis submitted
 *       422:
 *         description: Unanswered questions remain
 */
router.post("/:id/submit", authenticate, submitAnalysis);

/**
 * @swagger
 * /analyses/{id}/export:
 *   get:
 *     summary: Download the Decision Record as a Markdown file
 *     tags: [Analyses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Markdown file
 *         content:
 *           text/markdown:
 *             schema:
 *               type: string
 */
router.get("/:id/export", authenticate, exportAnalysis);

/**
 * @swagger
 * /analyses/{id}/retrigger:
 *   post:
 *     summary: Re-run the analysis on the latest commit (Respondent only)
 *     tags: [Analyses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       202:
 *         description: Retrigger accepted
 */
router.post("/:id/retrigger", authenticate, retriggerController);

export default router;
