# Backend - The Token Burners

This is the backend service for the hackathon project.

## Tech Stack
- **Node.js** with **Express**
- **TypeScript**
- **Prisma ORM** (PostgreSQL)
- **AWS S3** (File Uploads via Presigned URLs)
- **Docker** (Postgres)

## Prerequisites
- Node.js (v18+)
- Docker and Docker Compose
- AWS Account (S3 Bucket)

## Setup Instructions

### 1. Environment Variables
Copy `.env.example` to `.env` and fill in the required values:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` matches your Docker setup (default is provided).

### 2. Start PostgreSQL Database
Run the following command to start the database using Docker Compose:
```bash
docker compose up -d
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Migrations and Prisma Client
Run the migrations to create the database schema and generate the Prisma Client:
```bash
npx prisma migrate dev
```
Note: This will also run `prisma generate` automatically.

### 5. Start the Development Server
```bash
npm run dev
```
The server will be running on `http://localhost:3000`.

## API Endpoints

### Uploads
- `POST /api/upload/presigned-url`: Generate a presigned URL for S3 upload.
- `POST /api/upload/record`: Save file metadata to the database.

## Notes
- The `generated/` folder is excluded from version control as it contains environment-specific Prisma code.
- Always run `npx prisma generate` after changing the schema.
