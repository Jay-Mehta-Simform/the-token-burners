import { Router } from "express";
import {
    githubAuth,
    githubCallback,
    getUserProjects,
} from "../controllers/userController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

/**
 * @swagger
 * /auth/github:
 *   get:
 *     summary: Redirect to GitHub for authentication
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to GitHub OAuth page
 */
router.get("/auth/github", githubAuth);

/**
 * @swagger
 * /auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Authentication successful, returns JWT and user info
 */
router.get("/auth/github/callback", githubCallback);

/**
 * @swagger
 * /users/projects:
 *   get:
 *     summary: Get all projects for the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 *       401:
 *         description: Unauthorized
 */
router.get("/projects", authenticate, getUserProjects);

export default router;
