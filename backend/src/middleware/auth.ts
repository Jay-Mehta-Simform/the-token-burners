import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export interface AuthRequest extends Request {
    userId?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Prefer the httpOnly session cookie (SPA flow); fall back to a Bearer
    // header (API clients / tests).
    const cookieToken = (req as Request & { cookies?: Record<string, string> })
        .cookies?.session;
    const authHeader = req.headers.authorization;
    const headerToken =
        authHeader && authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : undefined;

    const token = cookieToken || headerToken;

    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};
