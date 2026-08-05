import { DashboardShell } from "@/components/layout/shell"
import { TeamWorkspace } from "@/components/team/team-workspace"
import { requireUser } from "@/lib/auth"

export default async function TeamPage() {
  const user = await requireUser()

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1800px]">
        <TeamWorkspace canManageRoles={user.role === "owner"} />
      </div>
    </DashboardShell>
  )
}
