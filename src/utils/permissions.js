const ROLE_PERMISSIONS_MAP ={
    OWNER: ["*"],

    ADMIN: [
        "job: create",
        "job: read",
        "job: update",
        "job: delete",

        "candidate: create",
        "candidate: read",
        "candidate: update",
        "candidate: delete",

        "billing:read",
        "billing:update"    
        
    ],

    RECRUITER: [
        "job:read",

        "candidate:create",
        "candidate:read",
        "candidate:update",
    ],

    VIEWER:[
        "job: read",
        "candidate: read"
    ]
}

export function getRolePermissions(role){
    return ROLE_PERMISSIONS_MAP[role] || []
}

export function hasPermission(role,permission){
    const perms = getRolePermissions(role)

    return perms.includes("*") || perms.includes(permission)
}

