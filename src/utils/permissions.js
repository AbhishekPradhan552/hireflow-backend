const ROLE_PERMISSIONS_MAP = {
  OWNER: ["*"],

  ADMIN: [
    "job:create",
    "job:read",
    "job:update",
    "job:delete",

    "candidate:create",
    "candidate:read",
    "candidate:update",
    "candidate:delete",

    "billing:read",
    "billing:update",
    "org:invite",
  ],

  RECRUITER: [
    "job:create",
    "job:read",

    "candidate:create",
    "candidate:read",
    "candidate:update",
  ],

  VIEWER: ["job:read", "candidate:read"],
};

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS_MAP[role] || [];
}

export function normalizePermission(permission) {
  return permission.replace(/\s+/g, "");
}

export function hasPermission(role, permission) {
  const perms = getRolePermissions(role).map(normalizePermission);

  return perms.includes("*") || perms.includes(normalizePermission(permission));
}
