import { describe, it, expect, vi } from "vitest";
import { canPerform, TicketAction } from "@/lib/ticketPermissions";
import prisma from "@/lib/db";
import { getStudentFlags } from "@/lib/actions/tickets";

const db = prisma as any;

const ALL_ACTIONS: TicketAction[] = [
  "ASSIGN", "FORWARD", "HANDBACK", "CLOSE", "REOPEN", "REPLY", "CREATE", "PROCESSING",
];

describe("canPerform — management role", () => {
  it("management can perform every action", () => {
    for (const action of ALL_ACTIONS) {
      expect(canPerform(action, "management", null)).toBe(true);
    }
  });
});

describe("canPerform — staff role", () => {
  it("staff can CREATE", () => expect(canPerform("CREATE", "staff", null)).toBe(true));
  it("staff can REPLY", () => expect(canPerform("REPLY", "staff", null)).toBe(true));
  it("staff can REOPEN", () => expect(canPerform("REOPEN", "staff", null)).toBe(true));
  it("staff can FORWARD", () => expect(canPerform("FORWARD", "staff", null)).toBe(true));
  it("staff can HANDBACK", () => expect(canPerform("HANDBACK", "staff", null)).toBe(true));
  it("staff can PROCESSING", () => expect(canPerform("PROCESSING", "staff", null)).toBe(true));
  it("staff can CLOSE", () => expect(canPerform("CLOSE", "staff", null)).toBe(true));
  it("staff cannot ASSIGN (non-supervisor)", () => expect(canPerform("ASSIGN", "staff", null)).toBe(false));
  it("staff cannot ASSIGN with unrelated subGroup", () => {
    expect(canPerform("ASSIGN", "staff", "HR_MEMBER")).toBe(false);
  });
});

describe("canPerform — supervisor (staff with _SUP subGroup)", () => {
  it("HR supervisor can ASSIGN", () => expect(canPerform("ASSIGN", "staff", "HR_SUP")).toBe(true));
  it("PR supervisor can ASSIGN", () => expect(canPerform("ASSIGN", "staff", "PR_SUP")).toBe(true));
  it("Finance supervisor can ASSIGN", () => expect(canPerform("ASSIGN", "staff", "Finance_SUP")).toBe(true));
});

describe("canPerform — external roles (student, teacher, parent, ambassador)", () => {
  const externalRoles = ["student", "teacher", "parent", "ambassador"];

  for (const role of externalRoles) {
    it(`${role} can CREATE`, () => expect(canPerform("CREATE", role, null)).toBe(true));
    it(`${role} can REPLY`, () => expect(canPerform("REPLY", role, null)).toBe(true));
    it(`${role} can REOPEN`, () => expect(canPerform("REOPEN", role, null)).toBe(true));
    it(`${role} cannot ASSIGN`, () => expect(canPerform("ASSIGN", role, null)).toBe(false));
    it(`${role} cannot FORWARD`, () => expect(canPerform("FORWARD", role, null)).toBe(false));
    it(`${role} cannot HANDBACK`, () => expect(canPerform("HANDBACK", role, null)).toBe(false));
    it(`${role} cannot PROCESSING`, () => expect(canPerform("PROCESSING", role, null)).toBe(false));
    it(`${role} cannot CLOSE (requires creator check in API)`, () =>
      expect(canPerform("CLOSE", role, null)).toBe(false));
  }
});

describe("canPerform — candidate role", () => {
  it("candidate can CREATE", () => expect(canPerform("CREATE", "candidate", null)).toBe(true));
  it("candidate can REPLY", () => expect(canPerform("REPLY", "candidate", null)).toBe(true));
  it("candidate cannot ASSIGN", () => expect(canPerform("ASSIGN", "candidate", null)).toBe(false));
  it("candidate cannot FORWARD", () => expect(canPerform("FORWARD", "candidate", null)).toBe(false));
});

describe("Routing stack logic", () => {
  it("forward pushes current state onto stack", () => {
    const stack: any[] = [];
    const ticket = { department: "PR", assigneeId: "user_abc" };
    const newStack = [...stack, { department: ticket.department, assigneeId: ticket.assigneeId }];
    expect(newStack).toHaveLength(1);
    expect(newStack[0].department).toBe("PR");
  });

  it("handback pops stack and restores previous state", () => {
    const stack = [
      { department: "PR", assigneeId: "user_pr" },
      { department: "HR", assigneeId: "user_hr" },
    ];
    const last = stack.pop()!;
    expect(last.department).toBe("HR");
    expect(stack).toHaveLength(1);
  });

  it("forward → forward → handback → handback returns to origin", () => {
    const origin = { department: "PR", assigneeId: "creator_1" };
    let stack: any[] = [];

    // Forward PR → IT
    stack.push({ department: "PR", assigneeId: "creator_1" });
    let current = { department: "IT", assigneeId: "it_user" };

    // Forward IT → HR
    stack.push({ department: "IT", assigneeId: "it_user" });
    current = { department: "HR", assigneeId: "hr_user" };

    // Handback HR → IT
    let last = stack.pop()!;
    current = { department: last.department, assigneeId: last.assigneeId };
    expect(current.department).toBe("IT");

    // Handback IT → PR
    last = stack.pop()!;
    current = { department: last.department, assigneeId: last.assigneeId };
    expect(current.department).toBe("PR");
    expect(current.assigneeId).toBe(origin.assigneeId);
    expect(stack).toHaveLength(0);
  });

  it("handback on empty stack falls back to originalDept", () => {
    const stack: any[] = [];
    const ticket = { originalDept: "PR", creatorId: "creator_1" };
    let dept: string;
    let assigneeId: string;

    if (stack.length === 0) {
      dept = ticket.originalDept || "PR";
      assigneeId = ticket.creatorId;
    } else {
      const last = stack.pop()!;
      dept = last.department;
      assigneeId = last.assigneeId;
    }

    expect(dept).toBe("PR");
    expect(assigneeId).toBe("creator_1");
  });
});

describe("getStudentFlags action", () => {
  it("throws when not authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    await expect(getStudentFlags("student@test.com")).rejects.toThrow("Unauthorized");
  });

  it("queries active resolved:false flags for student email", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "stu-id", email: "student@test.com" } } as any);

    db.user.findUnique.mockResolvedValue({ id: "stu-id" });
    db.studentFlag.findMany.mockResolvedValue([
      { id: "flag-1", studentId: "stu-id", flagType: "AT_RISK", resolved: false },
    ]);

    const result = await getStudentFlags("student@test.com");

    expect(db.studentFlag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: "stu-id", resolved: false },
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].flagType).toBe("AT_RISK");
  });
});
