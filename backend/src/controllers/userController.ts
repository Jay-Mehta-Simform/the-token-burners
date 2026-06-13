import { Request, Response, NextFunction } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export const githubAuth = (req: Request, res: Response) => {
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email%20repo`;
  res.redirect(redirectUri);
};

export const githubCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "No code provided" });
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: "application/json" },
      },
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      return res.status(401).json({ error: "Failed to obtain access token" });
    }

    // Get user info from GitHub
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const {
      id: githubId,
      email,
      name,
      avatar_url: avatarUrl,
    } = userResponse.data;

    // GitHub might not return email if it's private, even with scope.
    // Need to fetch emails separately if missing.
    let userEmail = email;
    if (!userEmail) {
      const emailsResponse = await axios.get(
        "https://api.github.com/user/emails",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const primaryEmail = emailsResponse.data.find((e: any) => e.primary);
      userEmail = primaryEmail ? primaryEmail.email : null;
    }

    if (!userEmail) {
      return res.status(400).json({ error: "Email not found from GitHub" });
    }

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        githubId: String(githubId),
        avatarUrl,
        name: name || userEmail.split("@")[0],
      },
      create: {
        email: userEmail,
        githubId: String(githubId),
        avatarUrl,
        name: name || userEmail.split("@")[0],
      },
    });

    // Fetch the user's repos from GitHub and store them in the Project table
    const reposResponse = await axios.get(
      "https://api.github.com/user/repos",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { per_page: 100, sort: "updated" },
      },
    );

    const repoNames: string[] = reposResponse.data.map(
      (repo: any) => repo.name,
    );

    if (repoNames.length > 0) {
      // Only create projects for repos we haven't stored yet for this user
      const existingProjects = await prisma.project.findMany({
        where: { userId: user.id, name: { in: repoNames } },
        select: { name: true },
      });
      const existingNames = new Set(existingProjects.map((p) => p.name));
      const newRepoNames = repoNames.filter(
        (name) => !existingNames.has(name),
      );

      if (newRepoNames.length > 0) {
        await prisma.project.createMany({
          data: newRepoNames.map((name) => ({ name, userId: user.id })),
        });
      }
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      message: "Authentication successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserProjects = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        files: true,
      },
    });

    res.json(projects);
  } catch (error) {
    next(error);
  }
};
