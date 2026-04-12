import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { createOrganizationWithSubscription } from "../services/org/org.service.js";
import { dbRetry } from "../utils/dbRetry.js";
import { getRolePermissions } from "../utils/permissions.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();
const OWNER_EMAIL = process.env.OWNER_EMAIL;
const ALLOWED_INVITE_ROLES = ["RECRUITER", "VIEWER"];

router.post("/register", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const normalizedEmail = email.toLowerCase();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
      },
    });
    // 🔥 RBAC ROLE LOGIC
    const allowedRoles = ["RECRUITER", "VIEWER"];
    let assignedRole;

    if (OWNER_EMAIL && normalizedEmail === OWNER_EMAIL.toLowerCase()) {
      assignedRole = "OWNER";
    } else if (allowedRoles.includes(role)) {
      assignedRole = role;
    } else {
      assignedRole = "RECRUITER";
    }

    //  Create org + membership + FREE subscription (service layer)
    console.log("👉 REGISTER: calling createOrganizationWithSubscription");

    const org = await createOrganizationWithSubscription(
      `${normalizedEmail}'s Org`,
      user.id,
      assignedRole,
    );
    res.status(201).json({
      id: user.id,
      email: user.email,
      orgId: org.id,
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Email already exists" });
    }

    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const user = await dbRetry(() =>
      prisma.user.findUnique({
        where: { email },
        include: {
          memberships: {
            include: { org: true },
          },
        },
      }),
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    //Assume first org for now(later user can switch orgs)
    if (!user.memberships || user.memberships.length === 0) {
      return res
        .status(403)
        .json({ error: "User not assigned to any organization" });
    }
    const membership = user.memberships[user.memberships.length - 1];

    const token = jwt.sign(
      { userId: user.id, orgId: membership.orgId, role: membership.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
        issuer: "hireflow",
        audience: "hireflow-user",
      },
    );
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        orgId: membership.orgId,
        role: membership.role,
        orgName: membership.org.name,
        permissions: getRolePermissions(membership.role),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/accept-invite", async (req, res) => {
  const { token, email, password } = req.body;

  if (!token || !email || !password) {
    return res
      .status(400)
      .json({ error: "token, email, password are required" });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
    });

    if (!invite) return res.status(404).json({ error: "INVITE_NOT_FOUND" });
    if (invite.usedAt)
      return res.status(409).json({ error: "INVITE_ALREADY_USED" });
    if (invite.expiresAt <= new Date())
      return res.status(410).json({ error: "INVITE_EXPIRED" });

    if (invite.email && invite.email.toLowerCase() !== normalizedEmail) {
      return res.status(403).json({ error: "INVITE_EMAIL_MISMATCH" });
    }

    if (!ALLOWED_INVITE_ROLES.includes(invite.role)) {
      return res.status(403).json({ error: "INVITE_ROLE_NOT_ALLOWED" });
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res
        .status(409)
        .json({ error: "USER_EXISTS_PLEASE_LOGIN_TO_ACCEPT_INVITE" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // re-check inside tx to avoid race
      const inv = await tx.organizationInvite.findUnique({ where: { token } });
      if (!inv) throw new Error("INVITE_NOT_FOUND");
      if (inv.usedAt) throw new Error("INVITE_ALREADY_USED");
      if (inv.expiresAt <= new Date()) throw new Error("INVITE_EXPIRED");

      const user = await tx.user.create({
        data: { email: normalizedEmail, password: hashedPassword },
      });

      const membership = await tx.organizationMember.create({
        data: {
          userId: user.id,
          orgId: inv.orgId,
          role: inv.role,
        },
      });

      await tx.organizationInvite.update({
        where: { token },
        data: { usedAt: new Date(), usedBy: user.id },
      });

      const org = await tx.organization.findUnique({
        where: { id: inv.orgId },
        select: { name: true },
      });

      return { user, membership, orgId: inv.orgId, org };
    });

    const jwtToken = jwt.sign(
      {
        userId: result.user.id,
        orgId: result.orgId,
        role: result.membership.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d", issuer: "hireflow", audience: "hireflow-user" },
    );

    return res.json({
      token: jwtToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        orgId: result.orgId,
        orgName: result.org?.name || "Organization",
        role: result.membership.role,
        permissions: getRolePermissions(result.membership.role),
      },
    });
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg === "INVITE_NOT_FOUND") return res.status(404).json({ error: msg });
    if (msg === "INVITE_ALREADY_USED")
      return res.status(409).json({ error: msg });
    if (msg === "INVITE_EXPIRED") return res.status(410).json({ error: msg });

    // Prisma unique constraint
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res.status(409).json({ error: "Duplicate constraint" });
    }

    console.error("POST /auth/accept-invite error:", err);
    return res.status(500).json({ error: "ACCEPT_INVITE_FAILED" });
  }
});

router.post(
  "/auth/accept-invite/authenticated",
  authMiddleware,
  async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    try {
      const invite = await prisma.organizationInvite.findUnique({
        where: { token },
      });

      if (!invite) return res.status(404).json({ error: "INVITE_NOT_FOUND" });
      if (invite.usedAt)
        return res.status(409).json({ error: "INVITE_ALREADY_USED" });
      if (invite.expiresAt <= new Date())
        return res.status(410).json({ error: "INVITE_EXPIRED" });

      if (!ALLOWED_INVITE_ROLES.includes(invite.role)) {
        return res.status(403).json({ error: "INVITE_ROLE_NOT_ALLOWED" });
      }

      const result = await prisma.$transaction(async (tx) => {
        // re-check inside tx to avoid race
        const inv = await tx.organizationInvite.findUnique({
          where: { token },
        });

        if (!inv) throw new Error("INVITE_NOT_FOUND");
        if (inv.usedAt) throw new Error("INVITE_ALREADY_USED");
        if (inv.expiresAt <= new Date()) throw new Error("INVITE_EXPIRED");

        // Create membership; if already member, treat as success
        const existingMember = await tx.organizationMember.findUnique({
          where: {
            userId_orgId: {
              userId: req.user.id,
              orgId: inv.orgId,
            },
          },
        });

        let membership;

        if (existingMember) {
          membership = existingMember;
        } else {
          membership = await tx.organizationMember.create({
            data: {
              userId: req.user.id,
              orgId: inv.orgId,
              role: inv.role,
            },
          });
        }

        await tx.organizationInvite.update({
          where: { token },
          data: { usedAt: new Date(), usedBy: req.user.id },
        });

        const org = await tx.organization.findUnique({
          where: { id: inv.orgId },
          select: { name: true },
        });

        return { membership, orgId: inv.orgId, org };
      });

      const jwtToken = jwt.sign(
        {
          userId: req.user.id,
          orgId: result.orgId,
          role: result.membership.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d", issuer: "hireflow", audience: "hireflow-user" },
      );

      return res.json({
        token: jwtToken,
        user: {
          id: req.user.id,
          email: req.user.email,
          orgId: result.orgId,
          orgName: result.org?.name || "Organization",
          role: result.membership.role,
          permissions: getRolePermissions(result.membership.role),
        },
      });
    } catch (err) {
      const msg = String(err?.message || "");

      if (msg === "INVITE_NOT_FOUND")
        return res.status(404).json({ error: msg });
      if (msg === "INVITE_ALREADY_USED")
        return res.status(409).json({ error: msg });
      if (msg === "INVITE_EXPIRED") return res.status(410).json({ error: msg });

      console.error("POST /auth/accept-invite/authenticated error:", err);
      return res.status(500).json({ error: "ACCEPT_INVITE_FAILED" });
    }
  },
);

export default router;
