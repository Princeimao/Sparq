import { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction): void {
  console.error("Error:", err.message);

  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
  }
}
