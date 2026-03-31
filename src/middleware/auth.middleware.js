import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { getRolePermissions } from "../utils/permissions.js";

//middleware to authenticate JWT token
export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ error: "Missing or invalid token " });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //claims check
    if (!decoded.userId || !decoded.orgId || !decoded.role) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    // database verifies membership still exists
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_orgId: {
          userId: decoded.userId,
          orgId: decoded.orgId,
        },
      },
    });
    if (!membership) {
      return res.status(403).json({ error: "Access revoked" });
    }
    // Attach to request
    req.user = {
      id: decoded.userId,
      orgId: decoded.orgId,
      role: decoded.role,
      permissions: getRolePermissions(decoded.role),
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
