import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  listProjects,
  syncProjectsController,
  getProjectPullsController,
} from "../controllers/projectController.js";

const router = Router();

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: List the authenticated user's GitHub-synced repositories
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of projects
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticate, listProjects);

/**
 * @swagger
 * /projects/sync:
 *   post:
 *     summary: Re-sync repositories from GitHub and upsert into the DB
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Number of repos synced and the project list
 *       401:
 *         description: Unauthorized or missing OAuth token
 */
router.post("/sync", authenticate, syncProjectsController);

/**
 * @swagger
 * /projects/{id}/pulls:
 *   get:
 *     summary: List open pull requests for a project (live from GitHub)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Array of open PRs with number, title, author, branch, add, del, files
 *       400:
 *         description: Invalid project ID
 *       404:
 *         description: Project not found
 */
router.get("/:id/pulls", authenticate, getProjectPullsController);

export default router;
