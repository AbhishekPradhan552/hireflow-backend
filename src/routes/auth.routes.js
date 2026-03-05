import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { createOrganizationWithSubscription } from "../services/org/org.service.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });
    // 3️⃣ Create org + membership + FREE subscription (service layer)
    console.log("👉 REGISTER: calling createOrganizationWithSubscription");

    const org = await createOrganizationWithSubscription(
      `${email}'s Org`,
      user.id,
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
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { org: true },
        },
      },
    });

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
    const membership = user.memberships[0];

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
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
