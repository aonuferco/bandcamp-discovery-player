import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ApiErrorResponse } from "../types.js";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response<ApiErrorResponse>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    category: "UnhandledError",
    message: err.message,
    stack: err.stack
  }));
  res.status(500).json({
    error: "Internal server error",
    details:
      process.env['NODE_ENV'] === "development"
        ? err.message
        : "Something went wrong",
  });
};
