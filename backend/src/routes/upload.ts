import { Router } from "express";
import multer from "multer";
import {
    testUpload,
    getPresignedUrl,
    saveFileRecord,
} from "../controllers/uploadController.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/test-upload", upload.single("file"), testUpload);
router.post("/presigned-url", getPresignedUrl);
router.post("/record", saveFileRecord);

export default router;
