import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

export type AuthenticatedRequest = Parameters<Extract<RequestHandler, (...args: any[]) => any>>[0] & {
  userId: string;
};

export const requireAuth: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  (req as AuthenticatedRequest).userId = userId;
  next();
};