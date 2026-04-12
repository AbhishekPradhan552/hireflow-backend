import express from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

const ALLOWED_INVITE_ROLES = ["RECRUITER", "VIEWER"];

router.post(
  "/org/invites",
  authMiddleware,
  requirePermission("org:invite"),
  async (req, res) => {
    try {
      const orgId = req.user.orgId;

      const { email, role, expiresInDays } = req.body;

      const normalizedEmail = email ? String(email).toLowerCase().trim() : null;

      const inviteRole = ALLOWED_INVITE_ROLES.includes(role)
        ? role
        : "RECRUITER";

      const days = Number.isFinite(Number(expiresInDays))
        ? Number(expiresInDays)
        : 7;

      const safeDays = Math.min(Math.max(days, 1), 30); // 1..30 days

      const token = crypto.randomBytes(32).toString("hex");

      const expiresAt = new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);

      const invite = await prisma.organizationInvite.create({
        data: {
          orgId,
          token,
          email: normalizedEmail,
          role: inviteRole,
          expiresAt,
        },
      });

      const inviteUrl = process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL.replace(/\/$/, "")}/accept-invite?token=${invite.token}`
        : null;

      return res.status(201).json({
        token: invite.token,
        expiresAt: invite.expiresAt,
        role: invite.role,
        email: invite.email,
        inviteUrl,
      });
    } catch (err) {
      console.error("POST /org/invites error:", err);
      return res.status(500).json({ error: "Failed to create invite" });
    }
  },
);

export default router;
