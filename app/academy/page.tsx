import { DashboardShell } from "@/components/layout/shell"
import { AcademyWorkspace } from "@/components/academy/academy-workspace"

export default function AcademyPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1800px]">
        <AcademyWorkspace />
      </div>
    </DashboardShell>
  )
}
