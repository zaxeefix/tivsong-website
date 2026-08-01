import pino from "pino";

const level=process.env.LOG_LEVEL|| (process.env.NODE_ENV==="production"?"info":"debug");
export const logger=pino({
  level,
  base:{service:"tiv-songs-api",environment:process.env.NODE_ENV||"development"},
  timestamp:pino.stdTimeFunctions.isoTime,
  redact:{paths:["password","passwordHash","token","refreshToken","req.headers.authorization","req.headers.cookie","*.password","*.token"],censor:"[REDACTED]"}
});

export const apiLogger=logger.child({category:"api"});
export const securityLogger=logger.child({category:"security"});
export const authLogger=logger.child({category:"authentication"});
export const uploadLogger=logger.child({category:"uploads"});
export const adminLogger=logger.child({category:"admin"});
export const errorLogger=logger.child({category:"errors"});
