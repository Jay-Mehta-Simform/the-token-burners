-- AlterTable: add GitHub-sync fields to Project
ALTER TABLE "Project" ADD COLUMN "defaultBranch" TEXT,
ADD COLUMN "githubRepoId" TEXT,
ADD COLUMN "lang" TEXT,
ADD COLUMN "owner" TEXT;

-- AlterTable: add OAuth token + github fields to User (avatarUrl/githubId were in schema but never migrated)
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "githubId" TEXT,
ADD COLUMN "githubLogin" TEXT,
ADD COLUMN "oauthToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_githubRepoId_key" ON "Project"("githubRepoId");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");
