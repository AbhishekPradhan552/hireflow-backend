/*
  Usage:
   requirePermission("job:create")
  requirePermission("candidate:delete")
 */
import { hasPermission } from "../utils/permissions.js";

export function requirePermission(permission) {
  return (req, res, next) => {
    //authMiddleware must run before this
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    if (!req.user.orgId) {
      return res.status(403).json({ error: "NO_ORG_CONTEXT" });
    }
    const { role } = req.user;

    // future:permission role based
    if (!hasPermission(role, permission)) {
      return res.status(403).json({
        error: "Forbidden",
        requiredPermission: permission,
      });
    }
    next();
  };
}
