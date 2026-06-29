import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";

export interface AuthPayload {
  userId: string;
  email: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      organizationId?: string;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ||
    req.cookies?.access_token;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireOrg(req: Request, res: Response, next: NextFunction): void {
  const orgId = req.params.orgId as string || req.headers["x-organization-id"] as string;

  if (!orgId) {
    res.status(400).json({ error: "Organization ID is required" });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  prisma.membership
    .findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.userId,
          organizationId: orgId,
        },
      },
    })
    .then((membership) => {
      if (!membership) {
        res.status(403).json({ error: "Not a member of this organization" });
        return;
      }
      req.organizationId = orgId;
      next();
    })
    .catch(next);

}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.organizationId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    prisma.membership
      .findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId: req.organizationId,
          },
        },
      })
      .then((membership) => {
        if (!membership || !roles.includes(membership.role)) {
          res.status(403).json({ error: "Insufficient permissions" });
          return;
        }
        next();
      })
      .catch(next);
  };
}
