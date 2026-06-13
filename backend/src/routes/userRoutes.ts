import { Router } from "express";
import {
    githubAuth,
    githubCallback,
    logout,
} from "../controllers/userController.js";

// Mounted at /auth in index.ts.
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
router.get("/github", githubAuth);

/**
 * @swagger
 * /auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback — sets a session cookie and redirects to the SPA
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Session cookie set; redirect back to the frontend
 */
router.get("/github/callback", githubCallback);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Clear the session cookie
 *     tags: [Auth]
 *     responses:
 *       204:
 *         description: Logged out
 */
router.post("/logout", logout);

export default router;
