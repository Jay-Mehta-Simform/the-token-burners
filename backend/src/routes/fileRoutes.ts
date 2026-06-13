import { Router } from "express";
import {
    getPresignedUrl,
    saveFileRecord,
} from "../controllers/uploadController.js";

const router = Router();

/**
 * @swagger
 * /files/presigned-url:
 *   post:
 *     summary: Generate an S3 presigned URL for upload
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - contentType
 *               - projectId
 *             properties:
 *               fileName:
 *                 type: string
 *               contentType:
 *                 type: string
 *               projectId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns the presigned URL and S3 key
 */
router.post("/presigned-url", getPresignedUrl);

/**
 * @swagger
 * /files/register:
 *   post:
 *     summary: Register a file record in the database after S3 upload
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - s3Key
 *               - projectId
 *             properties:
 *               fileName:
 *                 type: string
 *               s3Key:
 *                 type: string
 *               projectId:
 *                 type: string
 *     responses:
 *       201:
 *         description: File record created successfully
 */
router.post("/register", saveFileRecord);

export default router;
