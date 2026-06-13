import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../lib/s3.js";

/**
 * Upload a raw Buffer to S3. Used by the analysis pipeline to save
 * generated Markdown files without going through multer.
 */
export const uploadBuffer = async (
    buffer: Buffer,
    key: string,
    contentType: string
): Promise<string> => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) throw new Error("AWS_S3_BUCKET_NAME is not defined");

    await s3Client.send(
        new PutObjectCommand({ Bucket: bucketName, Key: key, Body: buffer, ContentType: contentType })
    );

    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export const getPresignedUploadUrl = async (
    key: string,
    contentType: string
): Promise<{ url: string; key: string }> => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!bucketName) {
        throw new Error("AWS_S3_BUCKET_NAME is not defined");
    }

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return { url, key };
};

export const uploadFile = async (
    file: Express.Multer.File,
    key: string
): Promise<string> => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!bucketName) {
        throw new Error("AWS_S3_BUCKET_NAME is not defined");
    }

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    });

    await s3Client.send(command);

    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};
