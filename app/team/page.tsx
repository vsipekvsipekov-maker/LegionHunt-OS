import { DashboardShell } from "@/components/layout/shell"
import { TeamWorkspace } from "@/components/team/team-workspace"

export default function TeamPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1800px]">
        <TeamWorkspace />
      </div>
    </DashboardShell>
  )
}
