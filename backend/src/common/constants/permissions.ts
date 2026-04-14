export const Permissions = {
  // Team Management
  MANAGE_TEAMS: 'MANAGE_TEAMS', // Global Admin only
  VIEW_TEAMS: 'VIEW_TEAMS',
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

  // Tech Support
  TECH_SUPPORT: 'TECH_SUPPORT',

  // Tasks
  CREATE_TASK: 'CREATE_TASK',
  EDIT_TASK: 'EDIT_TASK',
  DELETE_TASK: 'DELETE_TASK',
  ASSIGN_TASK: 'ASSIGN_TASK',
  VIEW_TASKS: 'VIEW_TASKS',
} as const;

export type PermissionType = typeof Permissions[keyof typeof Permissions];
export const ALL_PERMISSIONS = Object.values(Permissions);
