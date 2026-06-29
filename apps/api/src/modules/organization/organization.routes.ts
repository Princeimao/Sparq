import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, requireOrg, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";

const router = Router();

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

router.post(
  "/",
  authenticate,
  validateBody(createOrgSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = req.body;

      const org = await prisma.organization.create({
        data: {
          name,
          memberships: {
            create: {
              userId: req.user!.userId,
              role: "OWNER",
            },
          },
        },
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  avatarUrl: true
                }
              },
            },
          },
        },
      });

      res.status(201).json({ organization: org });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user!.userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: { select: { memberships: true, campaigns: true } },
          },
        },
      },
    });

    const organizations = memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }));

    res.json({ organizations });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:orgId",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: req.organizationId },
        include: {
          memberships: {
            include: {
              user: { select: { id: true, email: true, name: true, avatarUrl: true } },
            },
          },
          _count: {
            select: { campaigns: true, integrations: true, customers: true, orders: true },
          },
        },
      });

      res.json({ organization: org });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:orgId/members",
  authenticate,
  requireOrg,
  requireRole("OWNER", "ADMIN"),
  validateBody(inviteMemberSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, role } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.status(404).json({ error: "User not found. They must sign up first." });
        return;
      }

      // Check if already a member
      const existing = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: req.organizationId!,
          },
        },
      });

      if (existing) {
        res.status(409).json({ error: "User is already a member" });
        return;
      }

      const membership = await prisma.membership.create({
        data: {
          userId: user.id,
          organizationId: req.organizationId!,
          role,
        },
        include: {
          user: { select: { id: true, email: true, name: true, avatarUrl: true } },
        },
      });

      res.status(201).json({ membership });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:orgId/members/:memberId",
  authenticate,
  requireOrg,
  requireRole("OWNER"),
  validateBody(updateMemberRoleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const memberId = req.params.memberId as string;
      const membership = await prisma.membership.update({
        where: { id: memberId },
        data: { role: req.body.role },
        include: {
          user: { select: { id: true, email: true, name: true, avatarUrl: true } },
        },
      });

      res.json({ membership });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:orgId/members/:memberId",
  authenticate,
  requireOrg,
  requireRole("OWNER", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const memberId = req.params.memberId as string;
      // Prevent removing the owner
      const member = await prisma.membership.findUnique({
        where: { id: memberId },
      });

      if (member?.role === "OWNER") {
        res.status(400).json({ error: "Cannot remove the organization owner" });
        return;
      }

      await prisma.membership.delete({ where: { id: memberId } });
      res.json({ message: "Member removed" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
