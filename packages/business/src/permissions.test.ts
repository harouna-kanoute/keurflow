import { describe, expect, it } from "vitest";
import {
  canApproveExpense,
  canManageMembers,
  hasOrgRoleAtLeast,
  hasProjectRoleAtLeast,
} from "./permissions";

describe("hasOrgRoleAtLeast", () => {
  it("ranks owner above admin, and viewer below owner", () => {
    expect(hasOrgRoleAtLeast("owner", "admin")).toBe(true);
    expect(hasOrgRoleAtLeast("viewer", "owner")).toBe(false);
  });

  it("is inclusive of the exact role", () => {
    expect(hasOrgRoleAtLeast("manager", "manager")).toBe(true);
  });
});

describe("hasProjectRoleAtLeast", () => {
  it("ranks project_owner above project_viewer", () => {
    expect(hasProjectRoleAtLeast("project_owner", "project_viewer")).toBe(true);
    expect(hasProjectRoleAtLeast("project_viewer", "project_manager")).toBe(false);
  });

  it("ranks project_approver below project_manager — it must not inherit member-management/project-edit rights", () => {
    expect(hasProjectRoleAtLeast("project_approver", "project_manager")).toBe(false);
    expect(hasProjectRoleAtLeast("project_approver", "project_member")).toBe(true);
  });
});

describe("canApproveExpense", () => {
  it("requires at least project_manager, plus project_approver — this is UI-only, RLS is authoritative (§69/§83)", () => {
    expect(canApproveExpense("project_manager")).toBe(true);
    expect(canApproveExpense("project_owner")).toBe(true);
    expect(canApproveExpense("project_approver")).toBe(true);
    expect(canApproveExpense("project_member")).toBe(false);
    expect(canApproveExpense("project_viewer")).toBe(false);
  });
});

describe("canManageMembers", () => {
  it("requires at least admin", () => {
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("manager")).toBe(false);
    expect(canManageMembers("member")).toBe(false);
  });
});
