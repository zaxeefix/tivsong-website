import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) return void res.status(422).json({error:"Validation failed",details:error.flatten()});
  console.error(error);
  res.status(500).json({error:"Internal server error"});
};
