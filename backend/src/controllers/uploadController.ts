import { Request, Response, NextFunction } from "express";
import { getPresignedUploadUrl } from "../services/uploadService.js";
import { prisma } from "../lib/prisma.js";

export const getPresignedUrl = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fileName, contentType, projectId } = req.body;

    if (!fileName || !contentType || !projectId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const key = `projects/${projectId}/${Date.now()}-${fileName}`;
    const { url, key: s3Key } = await getPresignedUploadUrl(key, contentType);

    res.json({
      url,
      key: s3Key,
    });
  } catch (error) {
    next(error);
  }
};

export const saveFileRecord = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fileName, s3Key, projectId } = req.body;

    if (!fileName || !s3Key || !projectId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;

    const fileRecord = await prisma.file.create({
      data: {
        name: fileName,
        s3Key,
        s3Url,
        projectId,
      },
    });

    res.status(201).json({
      message: "File record saved successfully",
      file: fileRecord,
    });
  } catch (error) {
    next(error);
  }
};
