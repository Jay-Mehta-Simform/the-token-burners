import { Response, NextFunction } from "express";
import Joi from "joi";
import { AuthRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { syncProjects, getProjectPulls } from "../services/projectService.js";
import { httpError } from "../lib/httpError.js";

const uuidParam = Joi.object({ id: Joi.string().uuid().required() });

/**
 * GET /api/projects
 * Returns the DB-mirrored GitHub repos belonging to the user.
 * Sync first with POST /api/projects/sync.
 */
export const listProjects = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        owner: true,
        lang: true,
        defaultBranch: true,
        githubRepoId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(projects);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/projects/sync
 * Fetches the user's GitHub repos and upserts them as Project rows.
 */
export const syncProjectsController = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.oauthToken) {
      throw httpError(401, "GitHub OAuth token missing — please re-authenticate via /auth/github.");
    }

    const projects = await syncProjects(userId, user.oauthToken);

    // Contract (client.js#resyncProjects) expects the refreshed array directly.
    res.setHeader("X-Synced-Count", String(projects.length));
    res.json(projects);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/projects/:id/pulls
 * Lists open PRs for the given project, fetched live from GitHub.
 */
export const getProjectPullsController = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { error, value } = uuidParam.validate(req.params);
    if (error) throw httpError(400, error.message);

    const pulls = await getProjectPulls(value.id, req.userId!);

    res.json(pulls);
  } catch (err) {
    next(err);
  }
};
