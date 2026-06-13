import { prisma } from "../lib/prisma.js";
import { listUserRepos, listOpenPulls, GitHubPR } from "./githubService.js";
import { httpError } from "../lib/httpError.js";

/** Fetch GitHub repos for the user and upsert them into the Project table. */
export async function syncProjects(userId: string, oauthToken: string) {
  const repos = await listUserRepos(oauthToken);

  const upserted = await Promise.all(
    repos.map((repo) =>
      prisma.project.upsert({
        where: { githubRepoId: repo.githubRepoId },
        update: {
          name: repo.name,
          owner: repo.owner,
          defaultBranch: repo.defaultBranch,
          lang: repo.lang,
        },
        create: {
          name: repo.name,
          githubRepoId: repo.githubRepoId,
          owner: repo.owner,
          defaultBranch: repo.defaultBranch,
          lang: repo.lang,
          userId,
        },
      })
    )
  );

  return upserted;
}

/** Return open PRs for a project, fetched live from GitHub. */
export async function getProjectPulls(
  projectId: string,
  userId: string
): Promise<GitHubPR[]> {
  const [project, user] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!project) throw httpError(404, "Project not found.");
  if (!user?.oauthToken) throw httpError(401, "GitHub OAuth token missing — please re-authenticate.");
  if (!project.owner) throw httpError(422, "Project has no owner set. Run POST /api/projects/sync first.");

  return listOpenPulls(user.oauthToken, project.owner, project.name);
}
