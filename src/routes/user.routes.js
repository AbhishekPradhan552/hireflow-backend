import express from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();
// user route
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, createdAt: true },
    });
    res.json({
      ...dbUser,
      orgId: req.user.orgId,
      role: req.user.role,
      permissions: req.user.permissions,
    });
  } catch (err) {
    console.error("GET/me error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
