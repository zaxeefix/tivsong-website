import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import multer from "multer";
import {errorLogger} from "../platform/logger.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) return void res.status(422).json({error:"Validation failed",details:error.flatten()});
  if (error instanceof multer.MulterError) {
    const message=error.code==="LIMIT_FILE_SIZE"?"The selected file exceeds the configured upload limit":error.message;
    return void res.status(413).json({error:message});
  }
  if (error instanceof Error && error.name === "PrismaClientInitializationError") {
    return void res.status(503).json({error:"Database is unavailable. Run npm.cmd run db:local:setup for local development."});
  }
  if (typeof error === "object" && error && "statusCode" in error) {
    const status=Number((error as {statusCode:unknown}).statusCode);
    if(Number.isInteger(status)&&status>=400&&status<600){
      return void res.status(status).json({error:error instanceof Error?error.message:"Request failed"});
    }
  }
  errorLogger.error({err:error,method:_req.method,path:_req.path,ip:_req.ip},"unhandled request error");
  res.status(500).json({error:"Internal server error"});
};
