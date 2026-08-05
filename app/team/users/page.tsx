import { DashboardShell } from "@/components/layout/shell"
import { UsersAdminWorkspace } from "@/components/team/users-admin-workspace"
import { requireRole } from "@/lib/auth"

export default async function TeamUsersPage() {
  await requireRole(["owner"])

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1800px]">
        <UsersAdminWorkspace />
      </div>
    </DashboardShell>
  )
}
