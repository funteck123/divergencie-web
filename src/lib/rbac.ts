import prisma from "@/lib/db";

export type RoleType = "STUDENT" | "PARENT" | "TEACHER" | "STAFF" | "AMBASSADOR" | "MANAGEMENT";

export type ResourceType =
  | "INVOICES"
  | "SCHEDULES"
  | "CURRICULUM"
  | "CLAIMS"
  | "REPORTS"
  | "CANDIDATES"
  | "TICKETS"
  | "CONTENT_BANK"
  | "KNOWLEDGE_BANK"
  | "BACKLOG"
  | "CAMPAIGNS"
  | "ANALYTICS"
  | "ADMIN_LOOKUPS"
  | "PAYROLL"
  | "BUDGET";

export type ActionType = "view" | "create" | "edit" | "delete" | "approve";

// Hardcoded code-defined defaults
const DEFAULT_PERMISSIONS: Record<RoleType, Partial<Record<ResourceType, Record<ActionType, boolean>>>> = {
  MANAGEMENT: {}, // Management has full access (bypasses check)
  STUDENT: {
    SCHEDULES: { view: true, create: false, edit: false, delete: false, approve: false },
    CURRICULUM: { view: true, create: false, edit: false, delete: false, approve: false },
    INVOICES: { view: true, create: false, edit: false, delete: false, approve: false },
    REPORTS: { view: true, create: false, edit: false, delete: false, approve: false },
    TICKETS: { view: true, create: true, edit: true, delete: false, approve: false },
  },
  PARENT: {
    SCHEDULES: { view: true, create: false, edit: false, delete: false, approve: false },
    INVOICES: { view: true, create: false, edit: false, delete: false, approve: false },
    REPORTS: { view: true, create: false, edit: false, delete: false, approve: false },
    TICKETS: { view: true, create: true, edit: true, delete: false, approve: false },
  },
  TEACHER: {
    SCHEDULES: { view: true, create: false, edit: true, delete: false, approve: false },
    CURRICULUM: { view: true, create: false, edit: true, delete: false, approve: false },
    CLAIMS: { view: true, create: true, edit: true, delete: false, approve: false },
    TICKETS: { view: true, create: true, edit: true, delete: false, approve: false },
  },
  AMBASSADOR: {
    CAMPAIGNS: { view: true, create: true, edit: false, delete: false, approve: false },
    CLAIMS: { view: true, create: true, edit: true, delete: false, approve: false },
    SCHEDULES: { view: true, create: false, edit: false, delete: false, approve: false },
    TICKETS: { view: true, create: true, edit: true, delete: false, approve: false },
  },
  STAFF: {},
};

// Staff department-specific defaults
const STAFF_DEPT_DEFAULTS: Record<string, Partial<Record<ResourceType, Record<ActionType, boolean>>>> = {
  FINANCE: {
    INVOICES: { view: true, create: true, edit: true, delete: true, approve: true },
    PAYROLL: { view: true, create: true, edit: true, delete: true, approve: true },
    BUDGET: { view: true, create: true, edit: true, delete: true, approve: true },
    CLAIMS: { view: true, create: true, edit: true, delete: true, approve: true },
    TICKETS: { view: true, create: true, edit: true, delete: false, approve: false },
  },
  HR: {
    CANDIDATES: { view: true, create: true, edit: true, delete: true, approve: true },
    PAYROLL: { view: true, create: false, edit: false, delete: false, approve: false },
    TICKETS: { view: true, create: true, edit: true, delete: false, approve: false },
  },
  PR: {
    TICKETS: { view: true, create: true, edit: true, delete: true, approve: true },
    SCHEDULES: { view: true, create: true, edit: true, delete: true, approve: false },
    KNOWLEDGE_BANK: { view: true, create: true, edit: true, delete: false, approve: false },
  },
  MARKETING: {
    CAMPAIGNS: { view: true, create: true, edit: true, delete: true, approve: false },
    TICKETS: { view: true, create: true, edit: true, delete: false, approve: false },
  },
  IT: {
    ADMIN_LOOKUPS: { view: true, create: true, edit: true, delete: true, approve: true },
    BACKLOG: { view: true, create: true, edit: true, delete: true, approve: true },
    TICKETS: { view: true, create: true, edit: true, delete: false, approve: false },
  },
};

export async function hasPermission(
  userId: string,
  userRole: string,
  userDept: string | null,
  resource: ResourceType,
  action: ActionType
): Promise<boolean> {
  const role = userRole.toUpperCase() as RoleType;
  if (role === "MANAGEMENT") return true;

  const dept = userDept?.toUpperCase() || null;

  // 1. Individual user override (userId set)
  const userOverride = await prisma.portalPermission.findFirst({
    where: {
      userId,
      resource,
    },
  });
  if (userOverride) {
    return getActionValue(userOverride, action);
  }

  // 2. Dept-level override (deptId matches, userId is null)
  if (dept) {
    const deptOverride = await prisma.portalPermission.findFirst({
      where: {
        userId: null,
        dept: { name: { equals: dept, mode: "insensitive" } },
        resource,
      },
    });
    if (deptOverride) {
      return getActionValue(deptOverride, action);
    }
  }

  // 3. Role-level override (staffRoleId matches, userId & deptId are null)
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      staffProfile: {
        select: {
          staffRoleId: true,
        },
      },
    },
  });
  const staffRoleId = userRecord?.staffProfile?.staffRoleId;
  if (staffRoleId) {
    const roleOverride = await prisma.portalPermission.findFirst({
      where: {
        userId: null,
        deptId: null,
        staffRoleId,
        resource,
      },
    });
    if (roleOverride) {
      return getActionValue(roleOverride, action);
    }
  }

  // 4. Code default
  if (role === "STAFF" && dept) {
    const deptDefault = STAFF_DEPT_DEFAULTS[dept]?.[resource]?.[action];
    if (deptDefault !== undefined) return deptDefault;
  }

  const roleDefault = DEFAULT_PERMISSIONS[role]?.[resource]?.[action];
  if (roleDefault !== undefined) return roleDefault;

  return false; // Deny by default
}

function getActionValue(permission: any, action: ActionType): boolean {
  switch (action) {
    case "view":
      return permission.canView;
    case "create":
      return permission.canCreate;
    case "edit":
      return permission.canEdit;
    case "delete":
      return permission.canDelete;
    case "approve":
      return permission.canApprove;
    default:
      return false;
  }
}
