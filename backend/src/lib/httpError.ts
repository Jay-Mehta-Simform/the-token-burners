/**
 * Helper to create an Error carrying an HTTP status code, matching the
 * `AppError` shape consumed by the global error handler
 * (src/middleware/errorHandler.ts). Throw the result; the handler turns it into
 * a JSON response with the given status.
 */

import type { AppError } from "../middleware/errorHandler.js";

export function httpError(statusCode: number, message: string): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  return err;
}
