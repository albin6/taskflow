export const Permissions = {
  // Team Management
  MANAGE_TEAMS: 'MANAGE_TEAMS', // Global Admin only
  ASSIGN_HEAD: 'ASSIGN_HEAD',

  // Role Management
  MANAGE_ROLES: 'MANAGE_ROLES',
  REORDER_ROLES: 'REORDER_ROLES',

  // User Management
  MANAGE_USERS: 'MANAGE_USERS',
  APPROVE_REGISTRATIONS: 'APPROVE_REGISTRATIONS',

  // Audit Log
  VIEW_GLOBAL_AUDIT: 'VIEW_GLOBAL_AUDIT',
  VIEW_TEAM_AUDIT: 'VIEW_TEAM_AUDIT',

  // Tasks
  CREATE_TASK: 'CREATE_TASK',
  EDIT_TASK: 'EDIT_TASK',
  DELETE_TASK: 'DELETE_TASK',
  ASSIGN_TASK: 'ASSIGN_TASK',
} as const;

export type PermissionType = typeof Permissions[keyof typeof Permissions];
export const ALL_PERMISSIONS = Object.values(Permissions);
